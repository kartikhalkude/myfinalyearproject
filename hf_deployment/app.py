import os
import io
import json
import base64
import pickle
import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

app = FastAPI(title="Dr.AssistAI ML API")

# --- Global Paths ---
MODELS_DIR = "models"
os.makedirs(MODELS_DIR, exist_ok=True)

# --- Architecture Definitions ---

def build_pneumonia_model():
    net = models.resnet18(weights=None)
    in_features = net.fc.in_features
    net.fc = nn.Sequential(
        nn.Dropout(p=0.5),
        nn.Linear(in_features, 2),
    )
    return net

def build_tumor_model():
    m = models.efficientnet_b0(weights=None)
    in_features = m.classifier[1].in_features
    m.classifier = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(in_features, 4)
    )
    return m

# --- Helpers ---

def load_image(base64_str):
    try:
        image_bytes = base64.b64decode(base64_str)
        return Image.open(io.BytesIO(image_bytes)).convert('RGB')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

# --- Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Dr.AssistAI ML API is running on Hugging Face Spaces"}

@app.post("/predict/diabetes")
async def predict_diabetes(data: Dict[str, Any]):
    try:
        model_path = os.path.join(MODELS_DIR, "diabetes_model.pkl")
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        
        features = np.array([
            float(data['pregnancies']), float(data['glucose']), float(data['bloodPressure']),
            float(data['skinThickness']), float(data['insulin']), float(data['bmi']),
            float(data['diabetesPedigreeFunction']), float(data['age'])
        ]).reshape(1, -1)

        prediction = int(model.predict(features)[0])
        probabilities = model.predict_proba(features)[0]
        prob_positive = float(probabilities[1]) if len(probabilities) > 1 else float(prediction)

        risk = 'High' if prob_positive >= 0.6 else 'Moderate' if prob_positive >= 0.3 else 'Low'
        
        return {
            "prediction": prediction,
            "probability": prob_positive,
            "risk_level": risk,
            "label": "Diabetic" if prediction == 1 else "Non-Diabetic"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/heart")
async def predict_heart(data: Dict[str, Any]):
    try:
        model_path = os.path.join(MODELS_DIR, "heart_model.pkl")
        model_data = joblib.load(model_path)
        model = model_data['model']
        feature_cols = model_data.get('feature_cols')

        # Map frontend keys to model keys
        field_map = {
            'chestPainType': 'cp', 'restingBP': 'trestbps', 'cholesterol': 'chol',
            'fastingBS': 'fbs', 'restingECG': 'restecg', 'maxHeartRate': 'thalach',
            'exerciseAngina': 'exang', 'stSlope': 'slope'
        }
        
        row = {}
        for k, v in data.items():
            model_key = field_map.get(k, k)
            row[model_key] = float(v)

        df = pd.DataFrame([row])[feature_cols]
        prediction = int(model.predict(df)[0])
        probs = model.predict_proba(df)[0]
        prob_disease = float(probs[1])

        risk = 'High' if prob_disease >= 0.6 else 'Moderate' if prob_disease >= 0.3 else 'Low'

        return {
            "prediction": prediction,
            "probability": prob_disease,
            "risk_level": risk,
            "label": "Heart Disease" if prediction == 1 else "No Heart Disease"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/pneumonia")
async def predict_pneumonia(data: Dict[str, str]):
    try:
        model_path = os.path.join(MODELS_DIR, "pneumonia_best.pth")
        model = build_pneumonia_model()
        
        # Load state dict
        checkpoint = torch.load(model_path, map_location='cpu')
        state_dict = checkpoint.get('model_state_dict', checkpoint.get('state_dict', checkpoint))
        # Strip module prefix
        state_dict = {(k[7:] if k.startswith('module.') else k): v for k, v in state_dict.items()}
        model.load_state_dict(state_dict)
        model.eval()

        img = load_image(data['image'])
        transform = transforms.Compose([
            transforms.Resize(256), transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
        tensor = transform(img).unsqueeze(0)

        with torch.no_grad():
            logits = model(tensor)
            probs = torch.softmax(logits, dim=1)[0].numpy()

        idx = int(np.argmax(probs))
        classes = ['NORMAL', 'PNEUMONIA']
        
        return {
            "prediction": classes[idx],
            "probability": float(probs[idx]),
            "risk": "High Risk" if idx == 1 and probs[1] > 0.8 else "Moderate Risk" if idx == 1 else "Low Risk"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/tumor")
async def predict_tumor(data: Dict[str, str]):
    try:
        model_path = os.path.join(MODELS_DIR, "brain_tumor_best.pth")
        model = build_tumor_model()
        
        checkpoint = torch.load(model_path, map_location='cpu')
        state_dict = checkpoint.get('model_state_dict', checkpoint.get('state_dict', checkpoint))
        state_dict = {(k[7:] if k.startswith('module.') else k): v for k, v in state_dict.items()}
        model.load_state_dict(state_dict)
        model.eval()

        img = load_image(data['image'])
        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
        tensor = transform(img).unsqueeze(0)

        with torch.no_grad():
            logits = model(tensor)
            probs = torch.softmax(logits, dim=1)[0].numpy()

        classes = ['glioma', 'meningioma', 'notumor', 'pituitary']
        idx = int(np.argmax(probs))
        
        return {
            "prediction": classes[idx].capitalize(),
            "probability": float(probs[idx]),
            "risk": "Normal" if classes[idx] == 'notumor' else "High Risk" if probs[idx] > 0.85 else "Moderate Risk"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
