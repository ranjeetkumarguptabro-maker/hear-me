import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout

# Load dataset
df = pd.read_csv("asl_landmarks.csv")

X = df.drop("label", axis=1)
y = df["label"]

# Encode labels (A-Z → 0-25)
encoder = LabelEncoder()
y = encoder.fit_transform(y)

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Model
model = Sequential([
    Dense(256, activation="relu", input_shape=(63,)),
    Dropout(0.3),
    Dense(128, activation="relu"),
    Dropout(0.3),
    Dense(26, activation="softmax")
])

model.compile(
    optimizer="adam",
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)

print("Training script ready.")
# ---------------- TRAIN MODEL ----------------

history = model.fit(
    X_train,
    y_train,
    epochs=30,
    batch_size=32,
    validation_split=0.2
)

# ---------------- EVALUATION ----------------

loss, acc = model.evaluate(X_test, y_test)
print("Test Accuracy:", acc)

# ---------------- SAVE MODEL ----------------

model.save("asl_alphabet_model.h5")
print("Model saved as asl_alphabet_model.h5")
