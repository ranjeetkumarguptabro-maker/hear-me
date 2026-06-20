import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping
from sklearn.model_selection import train_test_split

# ---------------- LOAD DATA ----------------
X = np.load("X_dynamic.npy")   # (samples, 30, 63)
y = np.load("y_dynamic.npy")   # (samples,)

num_classes = len(np.unique(y))
print("X shape:", X.shape)
print("y shape:", y.shape)
print("Classes:", num_classes)

# ---------------- TRAIN / TEST SPLIT ----------------
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.25,
    random_state=42,
    stratify=y
)

# ---------------- MODEL ----------------
model = Sequential([
    LSTM(64, return_sequences=True, input_shape=(30, 63)),
    Dropout(0.3),

    LSTM(64),
    Dropout(0.3),

    Dense(64, activation="relu"),
    Dense(num_classes, activation="softmax")
])

model.compile(
    optimizer="adam",
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)

model.summary()

# ---------------- TRAIN ----------------
early_stop = EarlyStopping(
    monitor="val_loss",
    patience=10,
    restore_best_weights=True
)

history = model.fit(
    X_train,
    y_train,
    epochs=100,
    batch_size=8,
    validation_split=0.2,
    callbacks=[early_stop]
)

# ---------------- EVALUATE ----------------
loss, acc = model.evaluate(X_test, y_test, verbose=0)
print("Test Accuracy:", acc)

# ---------------- SAVE MODEL ----------------
model.save("asl_dynamic_word_lstm.h5")
print("Model saved as asl_dynamic_word_lstm.h5")
