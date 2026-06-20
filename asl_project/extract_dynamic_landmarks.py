import os
import cv2
import numpy as np
import mediapipe as mp

# ---------------- CONFIG ----------------
DATASET_PATH = "dynamic_words"
SEQUENCE_LENGTH = 30
OUTPUT_X = "X_dynamic.npy"
OUTPUT_Y = "y_dynamic.npy"
LABEL_FILE = "labels.txt"

# ---------------- MEDIAPIPE ----------------
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(static_image_mode=True, max_num_hands=1)

# ---------------- HELPERS ----------------
def extract_landmarks(image):
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    result = hands.process(image_rgb)

    if result.multi_hand_landmarks:
        landmarks = []
        for lm in result.multi_hand_landmarks[0].landmark:
            landmarks.extend([lm.x, lm.y, lm.z])
        return np.array(landmarks)
    else:
        return np.zeros(63)


def load_frames(folder):
    return sorted([
        os.path.join(folder, f)
        for f in os.listdir(folder)
        if f.endswith(".jpg")
    ])


def sample_frames(frames, target_len):
    if len(frames) >= target_len:
        idx = np.linspace(0, len(frames) - 1, target_len).astype(int)
        return [frames[i] for i in idx]
    else:
        return frames + [frames[-1]] * (target_len - len(frames))


# ---------------- MAIN ----------------
X, y = [], []

labels = sorted([
    d for d in os.listdir(DATASET_PATH)
    if os.path.isdir(os.path.join(DATASET_PATH, d)) and not d.startswith(".")
])

label_map = {label: i for i, label in enumerate(labels)}
print("Labels:", label_map)

for label in labels:
    label_path = os.path.join(DATASET_PATH, label)

    for clip in os.listdir(label_path):
        if not clip.endswith("_frames"):
            continue

        clip_path = os.path.join(label_path, clip)
        frames = load_frames(clip_path)

        if len(frames) < 5:
            continue

        frames = sample_frames(frames, SEQUENCE_LENGTH)

        sequence = []
        for frame_path in frames:
            img = cv2.imread(frame_path)
            if img is None:
                sequence.append(np.zeros(63))
            else:
                sequence.append(extract_landmarks(img))

        X.append(sequence)
        y.append(label_map[label])

X = np.array(X)
y = np.array(y)

np.save(OUTPUT_X, X)
np.save(OUTPUT_Y, y)

with open(LABEL_FILE, "w") as f:
    for label in labels:
        f.write(label + "\n")

print("Total samples:", len(X))
print("Saved:")
print(" -", OUTPUT_X, X.shape)
print(" -", OUTPUT_Y, y.shape)
print(" -", LABEL_FILE)
