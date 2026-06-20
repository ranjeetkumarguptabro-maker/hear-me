"""
Example integrations for different AI model frameworks
Copy the relevant code into main.py based on your model type
"""

# ============================================================================
# TENSORFLOW/KERAS EXAMPLE
# ============================================================================

def load_models_tensorflow():
    """Example: Load TensorFlow/Keras models"""
    import tensorflow as tf
    
    global alphabet_model, word_model
    alphabet_model = tf.keras.models.load_model("models/alphabet_model.h5")
    word_model = tf.keras.models.load_model("models/word_model.h5")
    print("✅ TensorFlow models loaded")


def predict_alphabet_tensorflow(landmarks):
    """Example: Predict with TensorFlow model"""
    import numpy as np
    
    # Reshape to match model input (batch_size, 63)
    landmarks_array = np.array(landmarks).reshape(1, 63)
    
    # Normalize if your model expects normalized input
    # landmarks_array = (landmarks_array - mean) / std
    
    # Predict
    prediction = alphabet_model.predict(landmarks_array, verbose=0)
    return int(np.argmax(prediction[0]))


# ============================================================================
# PYTORCH EXAMPLE
# ============================================================================

def load_models_pytorch():
    """Example: Load PyTorch models"""
    import torch
    
    global alphabet_model, word_model
    alphabet_model = torch.load("models/alphabet_model.pth")
    alphabet_model.eval()  # Set to evaluation mode
    word_model = torch.load("models/word_model.pth")
    word_model.eval()
    print("✅ PyTorch models loaded")


def predict_alphabet_pytorch(landmarks):
    """Example: Predict with PyTorch model"""
    import torch
    import numpy as np
    
    # Convert to tensor
    landmarks_tensor = torch.FloatTensor(landmarks).reshape(1, 63)
    
    # Predict (no gradient computation)
    with torch.no_grad():
        output = alphabet_model(landmarks_tensor)
        prediction = torch.argmax(output, dim=1)
    
    return int(prediction.item())


# ============================================================================
# SCIKIT-LEARN EXAMPLE
# ============================================================================

def load_models_sklearn():
    """Example: Load scikit-learn models"""
    import joblib
    
    global alphabet_model, word_model
    alphabet_model = joblib.load("models/alphabet_model.pkl")
    word_model = joblib.load("models/word_model.pkl")
    print("✅ scikit-learn models loaded")


def predict_alphabet_sklearn(landmarks):
    """Example: Predict with scikit-learn model"""
    import numpy as np
    
    # Reshape to 2D array (1 sample, 63 features)
    landmarks_array = np.array(landmarks).reshape(1, -1)
    
    # Predict
    prediction = alphabet_model.predict(landmarks_array)
    return int(prediction[0])


# ============================================================================
# ONNX EXAMPLE
# ============================================================================

def load_models_onnx():
    """Example: Load ONNX models"""
    import onnxruntime as ort
    
    global alphabet_model, word_model
    alphabet_model = ort.InferenceSession("models/alphabet_model.onnx")
    word_model = ort.InferenceSession("models/word_model.onnx")
    print("✅ ONNX models loaded")


def predict_alphabet_onnx(landmarks):
    """Example: Predict with ONNX model"""
    import numpy as np
    
    # Get input name (usually first input)
    input_name = alphabet_model.get_inputs()[0].name
    
    # Prepare input (ONNX expects numpy array)
    landmarks_array = np.array(landmarks, dtype=np.float32).reshape(1, 63)
    
    # Predict
    output = alphabet_model.run(None, {input_name: landmarks_array})
    prediction = np.argmax(output[0])
    
    return int(prediction)


# ============================================================================
# CUSTOM MODEL EXAMPLE (if you have a custom inference function)
# ============================================================================

def predict_alphabet_custom(landmarks):
    """
    Example: Custom prediction function
    Replace with your own model inference code
    """
    import numpy as np
    
    # Your custom preprocessing
    landmarks_array = np.array(landmarks)
    # ... your preprocessing steps ...
    
    # Your custom model inference
    # prediction = your_model_function(landmarks_array)
    
    # Return class index
    return 0  # Replace with actual prediction


# ============================================================================
# WORD MODE EXAMPLES (similar structure, different input shape)
# ============================================================================

def predict_word_tensorflow(landmarks):
    """Example: Predict word with TensorFlow (30 frames × 63 landmarks)"""
    import numpy as np
    
    # Reshape to (batch_size, 30, 63) - sequence of 30 frames
    landmarks_array = np.array(landmarks).reshape(1, 30, 63)
    
    prediction = word_model.predict(landmarks_array, verbose=0)
    return int(np.argmax(prediction[0]))


def predict_word_pytorch(landmarks):
    """Example: Predict word with PyTorch (30 frames × 63 landmarks)"""
    import torch
    import numpy as np
    
    # Reshape to (batch_size, 30, 63)
    landmarks_tensor = torch.FloatTensor(landmarks).reshape(1, 30, 63)
    
    with torch.no_grad():
        output = word_model(landmarks_tensor)
        prediction = torch.argmax(output, dim=1)
    
    return int(prediction.item())


# ============================================================================
# USAGE INSTRUCTIONS
# ============================================================================

"""
To use these examples in main.py:

1. Copy the load function to load_models():
   def load_models():
       load_models_tensorflow()  # or load_models_pytorch(), etc.

2. Copy the predict function to predict_alphabet() and predict_word():
   def predict_alphabet(landmarks: List[float]) -> int:
       return predict_alphabet_tensorflow(landmarks)  # or your chosen method

3. Make sure to install required packages:
   pip install tensorflow  # or torch, scikit-learn, onnxruntime, etc.

4. Update requirements.txt with your dependencies
"""







