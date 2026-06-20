import cv2
import mediapipe as mp
import numpy as np
import pandas as pd
import time
from tensorflow.keras.models import load_model
from sklearn.preprocessing import LabelEncoder
from collections import deque, Counter

# ---------------- LOAD MODEL ----------------
model = load_model("asl_alphabet_model.h5")

# ---------------- LABEL ENCODER ----------------
df = pd.read_csv("asl_landmarks.csv")
encoder = LabelEncoder()
encoder.fit(df["label"])

# ---------------- MEDIAPIPE ----------------
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1)
mp_draw = mp.solutions.drawing_utils

# ---------------- BUFFERS ----------------
prediction_buffer = deque(maxlen=15)

current_word = ""
last_letter = ""
last_time = time.time()
LETTER_DELAY = 1.2  # seconds between letters

# ---------------- CAMERA (INTERNAL) ----------------
cap = cv2.VideoCapture(1)  # MacBook camera

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

        prediction = model.predict(np.array([landmarks]), verbose=0)
        predicted = encoder.inverse_transform([np.argmax(prediction)])[0]

        prediction_buffer.append(predicted)
        final_letter = Counter(prediction_buffer).most_common(1)[0][0]

        current_time = time.time()
        if final_letter != last_letter and (current_time - last_time) > LETTER_DELAY:
            current_word += final_letter
            last_letter = final_letter
            last_time = current_time

        mp_draw.draw_landmarks(
            frame,
            hand_landmarks,
            mp_hands.HAND_CONNECTIONS
        )

    cv2.putText(
        frame,
        f"Word: {current_word}",
        (30, 50),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.2,
        (0, 255, 0),
        3
    )

    cv2.imshow("ASL Word Recognition", frame)

    key = cv2.waitKey(1) & 0xFF

    if key == 27:  # ESC
        break
    elif key == 8:  # BACKSPACE
        current_word = current_word[:-1]
    elif key == 32:  # SPACE
        current_word += " "

cap.release()
cv2.destroyAllWindows()
