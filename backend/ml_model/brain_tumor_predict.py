import base64
import io
import json
import os
import sys

import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, 'brain_tumor_best.pth')
DEVICE     = torch.device('cpu')

CLASS_NAMES = ['glioma', 'meningioma', 'notumor', 'pituitary']
NUM_CLASSES = len(CLASS_NAMES)

CLASS_INFO = {
    'glioma':     {'display': 'Glioma',      'icon': '🔴', 'color': 'glioma',
                   'desc': 'A tumor originating in the glial cells of the brain or spine.'},
    'meningioma': {'display': 'Meningioma',  'icon': '🟠', 'color': 'meningioma',
                   'desc': 'A tumor arising from the meninges surrounding the brain and spinal cord.'},
    'notumor':    {'display': 'No Tumor',    'icon': '✅', 'color': 'notumor',
                   'desc': 'No tumor detected in the MRI scan.'},
    'pituitary':  {'display': 'Pituitary',   'icon': '🟡', 'color': 'pituitary',
                   'desc': 'A tumor located in the pituitary gland at the base of the brain.'},
}

_PYTORCH_MODEL = None

def build_model():
    m = models.efficientnet_b0(weights=None)
    in_features = m.classifier[1].in_features
    m.classifier = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(in_features, NUM_CLASSES)
    )
    return m

def load_model():
    global _PYTORCH_MODEL
    if _PYTORCH_MODEL is not None:
        return _PYTORCH_MODEL

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"'{MODEL_PATH}' not found.")
    
    _PYTORCH_MODEL = build_model()
    _PYTORCH_MODEL.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE, weights_only=True))
    _PYTORCH_MODEL.eval()
    return _PYTORCH_MODEL

preprocess = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

def predict(image_bytes: bytes) -> dict:
    model = load_model()
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    tensor = preprocess(img).unsqueeze(0).to(DEVICE)
    
    with torch.no_grad():
        logits = model(tensor)
        probs  = torch.softmax(logits, dim=1)[0]
        
    idx   = probs.argmax().item()
    label = CLASS_NAMES[idx]
    info  = CLASS_INFO[label]
    
    probability = probs[idx].item()
    
    return {
        'prediction': label,
        'display': info['display'],
        'icon': info['icon'],
        'color': info['color'],
        'description': info['desc'],
        'probability': probability,
        'probabilities': {
            CLASS_INFO[n]['display']: p.item()
            for n, p in zip(CLASS_NAMES, probs)
        }
    }

if __name__ == '__main__':
    try:
        raw = sys.stdin.read().strip()
        if not raw:
            print(json.dumps({'error': 'No input provided'}), file=sys.stderr)
            sys.exit(1)

        input_data = json.loads(raw)
        image_b64  = input_data.get('image')
        if not image_b64:
            print(json.dumps({'error': 'No image data provided'}), file=sys.stderr)
            sys.exit(1)

        image_bytes = base64.b64decode(image_b64)

        try:
            img = Image.open(io.BytesIO(image_bytes))
            img.load()
        except Exception as img_err:
            print(json.dumps({'error': f'Invalid or unreadable image: {img_err}'}), file=sys.stderr)
            sys.exit(1)

        result = predict(image_bytes)
        print(json.dumps(result))

    except json.JSONDecodeError as exc:
        print(json.dumps({'error': 'Invalid JSON input', 'details': str(exc)}), file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        print(json.dumps({'error': str(exc)}), file=sys.stderr)
        sys.exit(1)
