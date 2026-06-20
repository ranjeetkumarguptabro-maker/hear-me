"""
Step 3 — Train a BiLSTM model on extracted WLASL landmarks.

BiLSTM generalises better than Transformer at small data sizes (~10 samples/class).
Features are scale-normalised (wrist-relative + divided by wrist→mid-MCP distance).

Saves:
  ../asl_project/asl_word_transformer.keras   (best model)
  asl_training/label_map.json                  (updated to reflect trained classes)
  asl_training/training_history.json

Usage:
  python asl_training/step3_train_model.py              # top 30 classes (default)
  python asl_training/step3_train_model.py --subset 20  # fewer classes, more accuracy
  python asl_training/step3_train_model.py --subset 50
"""

import argparse
import json
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
LANDMARKS_DIR = SCRIPT_DIR / "landmarks"
LABEL_MAP_PATH = SCRIPT_DIR / "label_map.json"
HISTORY_PATH = SCRIPT_DIR / "training_history.json"
MODEL_OUT_PATH = PROJECT_ROOT / "asl_project" / "asl_word_transformer.keras"

SEQ_LEN = 30
FEAT_DIM = 258      # pose(132) + left_hand(63) + right_hand(63) — Holistic layout
MIN_SAMPLES_PER_CLASS = 5


# ---------------------------------------------------------------------------
def check_requirements():
    print("Checking requirements...")
    ok = True
    for module, install_name in [("numpy", "numpy"), ("tensorflow", "tensorflow"), ("sklearn", "scikit-learn")]:
        try:
            mod = __import__(module)
            print(f"  ✓ {module} {getattr(mod, '__version__', '?')}")
        except ImportError:
            print(f"  ✗ Missing: pip install {install_name}")
            ok = False
    if not ok:
        sys.exit(1)
    print()


# ---------------------------------------------------------------------------
def load_dataset(subset_size: int):
    """Load .npy files. Selects the top `subset_size` classes by sample count."""
    import numpy as np

    if not LANDMARKS_DIR.exists():
        print(f"Landmarks directory not found: {LANDMARKS_DIR}")
        print("Run step2_extract_landmarks.py first.")
        sys.exit(1)

    # High-priority communication / sentence words always included first
    PRIORITY_WORDS = {
        'hello', 'you', 'i', 'me', 'we', 'they', 'what', 'where', 'when',
        'how', 'who', 'why', 'want', 'need', 'like', 'love', 'go', 'come',
        'see', 'know', 'good', 'bad', 'name', 'my', 'your', 'please', 'sorry',
        'help', 'yes', 'no', 'not', 'stop', 'wait', 'ready', 'more', 'again',
        'understand', 'food', 'water', 'home', 'friend', 'work', 'school',
        'time', 'day', 'now', 'already', 'eat', 'drink', 'thank', 'what',
    }

    gloss_dirs = sorted(LANDMARKS_DIR.iterdir())
    counts = {}
    for d in gloss_dirs:
        if d.is_dir():
            n = len(list(d.glob("*.npy")))
            if n >= MIN_SAMPLES_PER_CLASS:
                counts[d.name] = n

    if not counts:
        print(f"No classes with >= {MIN_SAMPLES_PER_CLASS} samples found.")
        sys.exit(1)

    # Priority words first (if they have enough samples), then top by count
    priority = sorted([g for g in counts if g in PRIORITY_WORDS], key=counts.get, reverse=True)
    others = sorted([g for g in counts if g not in PRIORITY_WORDS], key=counts.get, reverse=True)
    combined = priority + others
    top_glosses = sorted(combined[:subset_size])  # alphabetical for label indices
    gloss_to_idx = {g: i for i, g in enumerate(top_glosses)}

    X, y = [], []
    for gloss in top_glosses:
        gloss_dir = LANDMARKS_DIR / gloss
        for npy_path in sorted(gloss_dir.glob("*.npy")):
            arr = np.load(npy_path)
            if arr.shape == (SEQ_LEN, FEAT_DIM):
                X.append(arr)
                y.append(gloss_to_idx[gloss])

    X = np.stack(X).astype(np.float32)
    y = np.array(y, dtype=np.int32)
    return X, y, gloss_to_idx


# ---------------------------------------------------------------------------
def augment_sequence(seq):
    """Heavy augmentation to prevent overfitting on small datasets."""
    import numpy as np

    seq = seq.copy()

    # Random scale jitter ±30% (most important for camera-distance invariance)
    if np.random.random() < 0.8:
        scale = np.random.uniform(0.7, 1.3)
        seq *= scale

    # Random time warp ±20%
    if np.random.random() < 0.6:
        factor = 1.0 + np.random.uniform(-0.20, 0.20)
        new_len = max(10, int(SEQ_LEN * factor))
        indices = np.linspace(0, SEQ_LEN - 1, new_len)
        warped = np.array([
            seq[int(i)] * (1 - i % 1) + seq[min(int(i) + 1, SEQ_LEN - 1)] * (i % 1)
            for i in indices
        ])
        resample_idx = np.linspace(0, new_len - 1, SEQ_LEN).astype(int)
        seq = warped[resample_idx]

    # Mirror left↔right (negate pose x + swap hand blocks)
    # Pose: 33×4, x at indices 0,4,8,... (every 4th)
    # Left hand: dims 132..194, Right hand: dims 195..257
    if np.random.random() < 0.5:
        seq = seq.copy()
        seq[:, 0::4][:, :33] *= -1   # negate pose x
        lh = seq[:, 132:195].copy()
        rh = seq[:, 195:258].copy()
        lh[:, 0::3] *= -1
        rh[:, 0::3] *= -1
        seq[:, 132:195] = rh
        seq[:, 195:258] = lh

    # Gaussian noise
    if np.random.random() < 0.8:
        seq += np.random.normal(0, 0.02, seq.shape).astype(np.float32)

    # Random translation (shift wrist-relative by small offset)
    if np.random.random() < 0.5:
        offset = np.random.normal(0, 0.05, (1, FEAT_DIM)).astype(np.float32)
        seq += offset

    # Random frame dropout (zero out 1–4 frames)
    n_drop = np.random.randint(1, 5)
    drop_idx = np.random.choice(SEQ_LEN, n_drop, replace=False)
    seq[drop_idx] = 0.0

    return seq


def make_augmented_arrays(X, y, num_classes, copies=8):
    """Expand dataset by generating `copies` augmented versions of each sample."""
    import numpy as np
    import tensorflow as tf  # noqa: F811
    Xout, yout = [X.copy()], [y.copy()]
    for _ in range(copies - 1):
        Xaug = np.stack([augment_sequence(X[i]) for i in range(len(X))])
        Xout.append(Xaug)
        yout.append(y.copy())
    Xfull = np.concatenate(Xout, axis=0)
    yfull = np.concatenate(yout, axis=0)
    # Shuffle
    idx = np.random.permutation(len(Xfull))
    return Xfull[idx], tf.keras.utils.to_categorical(yfull[idx], num_classes)


# ---------------------------------------------------------------------------
def build_bilstm_model(num_classes, seq_len=30, feat_dim=258):
    """
    BiLSTM model. Consistently outperforms Transformer on small gesture datasets.
    ~500K params, strong generalisation with heavy dropout.
    """
    import tensorflow as tf
    from tensorflow.keras import layers, Model

    inputs = layers.Input(shape=(seq_len, feat_dim))

    # Feature embedding
    x = layers.Dense(128, activation="relu")(inputs)
    x = layers.Dropout(0.3)(x)

    # BiLSTM stack
    x = layers.Bidirectional(layers.LSTM(128, return_sequences=True))(x)
    x = layers.Dropout(0.4)(x)
    x = layers.Bidirectional(layers.LSTM(64, return_sequences=False))(x)
    x = layers.Dropout(0.4)(x)

    # Classifier head
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    return Model(inputs, outputs)


# ---------------------------------------------------------------------------
def make_lr_schedule(base_lr, total_epochs, warmup_epochs=10):
    import tensorflow as tf
    import math

    def schedule(epoch):
        if epoch < warmup_epochs:
            return base_lr * (epoch + 1) / warmup_epochs
        progress = (epoch - warmup_epochs) / max(1, total_epochs - warmup_epochs)
        return base_lr * 0.5 * (1 + math.cos(math.pi * progress))

    return tf.keras.callbacks.LearningRateScheduler(schedule, verbose=0)


# ---------------------------------------------------------------------------
def print_top_confused(y_true, y_pred_probs, idx_to_gloss, top_n=15):
    import numpy as np
    y_pred = np.argmax(y_pred_probs, axis=1)
    num_classes = y_pred_probs.shape[1]
    cm = np.zeros((num_classes, num_classes), dtype=int)
    for t, p in zip(y_true, y_pred):
        cm[t, p] += 1
    errors = [(cm[i, j], i, j) for i in range(num_classes) for j in range(num_classes) if i != j and cm[i, j] > 0]
    errors.sort(reverse=True)
    print(f"\nTop-{top_n} confused pairs (true → predicted):")
    for count, tc, pc in errors[:top_n]:
        print(f"  {idx_to_gloss.get(tc, tc):>20} → {idx_to_gloss.get(pc, pc):<20}  ({count}x)")


# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--subset", type=int, default=50,
                        help="Top N classes, priority words first (default 50)")
    args = parser.parse_args()

    check_requirements()

    import numpy as np
    import tensorflow as tf
    from sklearn.model_selection import train_test_split

    print(f"TensorFlow: {tf.__version__}  |  GPUs: {len(tf.config.list_physical_devices('GPU'))}\n")

    # ── Load data ──
    print(f"Loading dataset (top {args.subset} classes by sample count)...")
    X, y, gloss_to_idx = load_dataset(args.subset)
    num_classes = len(gloss_to_idx)
    idx_to_gloss = {v: k for k, v in gloss_to_idx.items()}

    print(f"  Samples: {len(X)}")
    print(f"  Classes: {num_classes}")
    print(f"  Classes: {list(gloss_to_idx.keys())}")
    print()

    # ── Stratified split ──
    min_needed = num_classes + 5
    test_size = max(0.15, min_needed / len(X))
    test_size = min(test_size, 0.30)

    X_tv, X_test, y_tv, y_test = train_test_split(X, y, test_size=test_size, stratify=y, random_state=42)

    val_size = max(0.15, min_needed / len(X_tv))
    val_size = min(val_size, 0.25)
    X_train, X_val, y_train, y_val = train_test_split(X_tv, y_tv, test_size=val_size, stratify=y_tv, random_state=42)

    print(f"Split — train: {len(X_train)}, val: {len(X_val)}, test: {len(X_test)}\n")

    # ── Build & compile ──
    model = build_bilstm_model(num_classes)
    model.summary()
    print()

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss=tf.keras.losses.CategoricalCrossentropy(label_smoothing=0.1),
        metrics=["accuracy"],
    )

    # ── Callbacks ──
    MODEL_OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_accuracy", patience=30, restore_best_weights=True, verbose=1
        ),
        tf.keras.callbacks.ModelCheckpoint(
            str(MODEL_OUT_PATH),
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1,
        ),
        make_lr_schedule(base_lr=1e-3, total_epochs=300, warmup_epochs=10),
    ]

    # ── Augment training set (8× copies) then fit on numpy arrays ──
    print("Augmenting training data (8× copies)...")
    X_train_aug, y_train_aug = make_augmented_arrays(X_train, y_train, num_classes, copies=8)
    y_val_cat = tf.keras.utils.to_categorical(y_val, num_classes)
    print(f"  Training set after augmentation: {len(X_train_aug)} samples\n")

    history = model.fit(
        X_train_aug, y_train_aug,
        validation_data=(X_val, y_val_cat),
        epochs=300,
        batch_size=32,
        callbacks=callbacks,
        verbose=1,
    )

    # Explicit save
    model.save(str(MODEL_OUT_PATH), save_format="keras")

    # Save updated label map (only trained classes)
    with open(LABEL_MAP_PATH, "w") as f:
        json.dump(gloss_to_idx, f, indent=2)
    print(f"\nLabel map updated: {len(gloss_to_idx)} classes → {LABEL_MAP_PATH}")

    # Save history
    hist_dict = {k: [float(v) for v in vals] for k, vals in history.history.items()}
    with open(HISTORY_PATH, "w") as f:
        json.dump(hist_dict, f, indent=2)

    # ── Evaluate ──
    print("\n" + "=" * 60)
    y_test_cat = tf.keras.utils.to_categorical(y_test, num_classes)
    test_loss, test_acc = model.evaluate(X_test, y_test_cat, verbose=0)
    print(f"Top-1 accuracy: {test_acc*100:.2f}%")

    y_pred_probs = model.predict(X_test, verbose=0)
    top5 = sum(1 for i, p in enumerate(y_pred_probs) if y_test[i] in np.argsort(p)[-5:])
    print(f"Top-5 accuracy: {top5/len(y_test)*100:.2f}%")

    print_top_confused(y_test, y_pred_probs, idx_to_gloss)

    print(f"\nModel → {MODEL_OUT_PATH}")
    print("Next: python asl_training/step4_update_backend.py")


if __name__ == "__main__":
    main()
