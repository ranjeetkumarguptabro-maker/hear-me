import pandas as pd
import numpy as np
from tensorflow.keras.models import load_model
from sklearn.preprocessing import LabelEncoder

# Load data
df = pd.read_csv("asl_landmarks.csv")

X = df.drop("label", axis=1)
y = df["label"]

# Encode labels again
encoder = LabelEncoder()
y_encoded = encoder.fit_transform(y)

# Load trained model
model = load_model("asl_alphabet_model.h5")

# Random samples
indices = np.random.choice(len(X), 5, replace=False)

for i in indices:
    sample = np.array([X.iloc[i]])
    prediction = model.predict(sample, verbose=0)
    predicted_label = encoder.inverse_transform([np.argmax(prediction)])[0]
    actual_label = y.iloc[i]

    print(f"Actual: {actual_label} | Predicted: {predicted_label}")

