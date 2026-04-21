"""
Brain Tumor Prediction Script (Updated for EfficientNet-B0)
Matches the architecture and classes from the user's provided server.py.
Classes: ['glioma', 'meningioma', 'notumor', 'pituitary']
"""

import base64
import io
import json
import os
import sys

import numpy as np
from PIL import Image

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH  = os.path.join(SCRIPT_DIR, 'brain_tumor_best.pth')

CLASS_NAMES = ['glioma', 'meningioma', 'notumor', 'pituitary']
DISPLAY_NAMES = {
    'glioma':     'Glioma',
    'meningioma': 'Meningioma',
    'notumor':    'No Tumor',
    'pituitary':  'Pituitary'
}

_PYTORCH_MODEL = None


# ─── Model architecture ───────────────────────────────────────────────────────

def _build_model(num_classes: int = 4):
    """EfficientNet-B0 as specified in the provided server.py."""
    import torch.nn as nn
    from torchvision import models

    m = models.efficientnet_b0(weights=None)
    in_features = m.classifier[1].in_features
    m.classifier = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(in_features, num_classes)
    )
    return m


def _strip_module_prefix(state_dict: dict) -> dict:
    return {
        (k[7:] if k.startswith('module.') else k): v
        for k, v in state_dict.items()
    }


# ─── Robust checkpoint loader ─────────────────────────────────────────────────

def load_pytorch_model():
    global _PYTORCH_MODEL
    if _PYTORCH_MODEL is not None:
        return _PYTORCH_MODEL

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f'Checkpoint not found: {MODEL_PATH}')

    import torch

    try:
        raw = torch.load(MODEL_PATH, map_location='cpu', weights_only=False)
    except Exception:
        raw = torch.load(MODEL_PATH, map_location='cpu')

    # Load into the specific architecture
    net = _build_model(num_classes=len(CLASS_NAMES))
    
    if isinstance(raw, dict):
        # Extract state_dict if wrapped
        state_dict = raw.get('model_state_dict', raw.get('state_dict', raw.get('model', raw)))
        state_dict = _strip_module_prefix(state_dict)
        net.load_state_dict(state_dict)
    else:
        # If raw is the model object
        net = raw

    net.eval()
    _PYTORCH_MODEL = net
    return _PYTORCH_MODEL


# ─── PyTorch inference ────────────────────────────────────────────────────────

def predict_with_torch(model, image_bytes: bytes) -> dict:
    import torch
    from torchvision import transforms

    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    
    # Preprocessing exactly as in server.py
    preprocess = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406],
                             [0.229, 0.224, 0.225])
    ])
    
    tensor = preprocess(img).unsqueeze(0)
    
    with torch.no_grad():
        logits = model(tensor)
        probs  = torch.softmax(logits, dim=1)[0].cpu().numpy()

    idx   = int(np.argmax(probs))
    label = CLASS_NAMES[idx]
    
    return {
        'prediction':    DISPLAY_NAMES[label],
        'probability':   round(float(probs[idx]) * 100, 2),
        'probabilities': {
            DISPLAY_NAMES[n]: round(float(p) * 100, 2)
            for n, p in zip(CLASS_NAMES, probs)
        },
        'model_source': 'pytorch',
        'raw_label': label
    }


# ─── Risk annotation ──────────────────────────────────────────────────────────

def add_risk_level(result: dict) -> dict:
    prob = result.get('probability', 0.0)
    label = result.get('raw_label')
    
    if label == 'notumor':
        result['risk'] = 'Normal'
    else:
        result['risk'] = ('High Risk' if prob >= 85
                          else 'Moderate Risk' if prob >= 65
                          else 'Low-Moderate Risk')
    return result


# ─── Public predict entry-point ───────────────────────────────────────────────

def predict(image_bytes: bytes) -> dict:
    try:
        model  = load_pytorch_model()
        result = predict_with_torch(model, image_bytes)
        return add_risk_level(result)
    except Exception as exc:
        print(f'[brain-tumor] model error: {exc}', file=sys.stderr)
        return {
            'prediction': 'Error',
            'probability': 0,
            'risk': 'Unknown',
            'warning': f'Analysis failed: {str(exc)}'
        }


# ─── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    try:
        raw_input = sys.stdin.read().strip()
        if not raw_input: sys.exit(1)
        input_data = json.loads(raw_input)
        image_b64  = input_data.get('image')
        if not image_b64: sys.exit(1)
        image_bytes = base64.b64decode(image_b64)
        print(json.dumps(predict(image_bytes)))
    except Exception as exc:
        print(json.dumps({'error': str(exc)}), file=sys.stderr)
        sys.exit(1)
