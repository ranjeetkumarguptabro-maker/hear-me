import cv2
import numpy as np
import mediapipe as mp
import tensorflow as tf
from collections import deque, Counter

# ---------------- CONFIG ----------------
SEQUENCE_LENGTH = 30
MODEL_PATH = "asl_dynamic_word_lstm.h5"
LABELS_PATH = "labels.txt"

# ---------------- LOAD LABELS ----------------
with open(LABELS_PATH, "r") as f:
    labels = [line.strip() for line in f.readlines()]

# ---------------- LOAD MODEL ----------------
model = tf.keras.models.load_model(MODEL_PATH)

# ---------------- MEDIAPIPE ----------------
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1)
mp_draw = mp.solutions.drawing_utils

# ---------------- BUFFERS ----------------
sequence = deque(maxlen=SEQUENCE_LENGTH)
prediction_buffer = deque(maxlen=15)

# ---------------- CAMERA ----------------
cap = cv2.VideoCapture(1)  # internal MacBook camera

while True:
    ret, frame = cap.read()
    if not ret:
        break

    img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = hands.process(img_rgb)

    if result.multi_hand_landmarks:
        hand_landmarks = result.multi_hand_landmarks[0]
        landmarks = []

        for lm in hand_landmarks.landmark:
            landmarks.extend([lm.x, lm.y, lm.z])

        sequence.append(landmarks)
        mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

        if len(sequence) == SEQUENCE_LENGTH:
            input_data = np.array(sequence).reshape(1, SEQUENCE_LENGTH, 63)
            prediction = model.predict(input_data, verbose=0)
            predicted_word = labels[np.argmax(prediction)]

            prediction_buffer.append(predicted_word)
            final_word = Counter(prediction_buffer).most_common(1)[0][0]

            cv2.putText(
                frame,
                f"Word: {final_word}",
                (30, 50),
                cv2.FONT_HERSHEY_SIMPLEX,
                1.3,
                (0, 255, 0),
                3
            )

    cv2.imshow("Dynamic ASL Word Recognition", frame)

    if cv2.waitKey(1) & 0xFF == 27:  # ESC
        break

cap.release()
cv2.destroyAllWindows()
