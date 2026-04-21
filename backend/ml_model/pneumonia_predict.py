"""
Pneumonia Prediction Script
Loads the trained PyTorch checkpoint (pneumonia_best.pth) with a robust
multi-strategy loader that handles common ways Kaggle notebooks save models:

  1. Raw state_dict  →  torch.save(model.state_dict(), path)
  2. Full model obj  →  torch.save(model, path)
  3. Wrapped dict    →  torch.save({'model_state_dict': ..., 'epoch': ...}, path)
  4. DataParallel    →  keys prefixed with 'module.'

Falls back to an image-statistics heuristic when the checkpoint cannot be loaded.
"""

import base64
import io
import json
import os
import sys

import numpy as np
from PIL import Image

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH  = os.path.join(SCRIPT_DIR, 'pneumonia_best.pth')
CLASS_NAMES = ['NORMAL', 'PNEUMONIA']

_PYTORCH_MODEL = None


# ─── Model architecture ───────────────────────────────────────────────────────

def _build_model(num_classes: int = 2):
    """ResNet-18 with a dropout + linear head — same as typical Kaggle training."""
    import torch.nn as nn
    from torchvision import models

    net = models.resnet18(weights=None)
    in_features = net.fc.in_features
    net.fc = nn.Sequential(
        nn.Dropout(p=0.5),
        nn.Linear(in_features, num_classes),
    )
    return net


def _strip_module_prefix(state_dict: dict) -> dict:
    """Remove 'module.' prefix left by DataParallel training."""
    return {
        (k[7:] if k.startswith('module.') else k): v
        for k, v in state_dict.items()
    }


def _try_load_state_dict(net, state_dict: dict, strict: bool = True) -> bool:
    """Attempt to load state_dict into net; returns True on success."""
    try:
        net.load_state_dict(state_dict, strict=strict)
        return True
    except Exception:
        return False


def _infer_num_classes(state_dict: dict) -> int:
    """
    Guess the number of output classes from the last Linear layer in the dict.
    Falls back to 2 (binary) if not determinable.
    """
    for key in reversed(list(state_dict.keys())):
        if 'weight' in key:
            shape = state_dict[key].shape
            if len(shape) == 2:          # Linear weight: (out, in)
                return int(shape[0])
    return 2


# ─── Robust checkpoint loader ─────────────────────────────────────────────────

def load_pytorch_model():
    """
    Load pneumonia_best.pth regardless of how it was saved on Kaggle.
    Tries five strategies in order:
      A. state_dict saved directly
      B. wrapped dict  (common keys: model_state_dict, state_dict, model)
      C. DataParallel state_dict (strip 'module.' prefix)
      D. full model object saved with torch.save(model, ...)
      E. strict=False load (tolerates minor architecture differences)
    """
    global _PYTORCH_MODEL
    if _PYTORCH_MODEL is not None:
        return _PYTORCH_MODEL

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f'Checkpoint not found: {MODEL_PATH}')

    import torch

    # Load raw checkpoint — try weights_only first (safer), fall back for
    # older checkpoints that contain non-tensor objects.
    try:
        raw = torch.load(MODEL_PATH, map_location='cpu', weights_only=True)
    except Exception:
        raw = torch.load(MODEL_PATH, map_location='cpu', weights_only=False)

    print(f'[pneumonia] checkpoint type: {type(raw).__name__}', file=sys.stderr)

    # ── Strategy D: full model object ────────────────────────────────────────
    if isinstance(raw, torch.nn.Module):
        raw.eval()
        _PYTORCH_MODEL = raw
        print('[pneumonia] loaded as full model object', file=sys.stderr)
        return _PYTORCH_MODEL

    # ── Strategies A / B / C / E: state_dict (possibly wrapped) ─────────────
    if isinstance(raw, dict):
        CANDIDATE_KEYS = ['model_state_dict', 'state_dict', 'model',
                          'net', 'network', 'weights']
        state_dict = None

        # Strategy B: wrapped checkpoint
        for key in CANDIDATE_KEYS:
            if key in raw and isinstance(raw[key], dict):
                state_dict = raw[key]
                print(f'[pneumonia] extracted state_dict from key "{key}"',
                      file=sys.stderr)
                break

        # Strategy A: dict IS the state_dict
        if state_dict is None:
            first_val = next(iter(raw.values()), None)
            if hasattr(first_val, 'shape'):
                state_dict = raw
                print('[pneumonia] treating checkpoint as raw state_dict',
                      file=sys.stderr)

        if state_dict is not None:
            # Strategy C: strip DataParallel prefix
            state_dict = _strip_module_prefix(state_dict)

            num_classes = _infer_num_classes(state_dict)
            print(f'[pneumonia] inferred num_classes={num_classes}', file=sys.stderr)

            net = _build_model(num_classes=num_classes)

            # Strategy A/B/C: strict load
            if _try_load_state_dict(net, state_dict, strict=True):
                net.eval()
                _PYTORCH_MODEL = net
                print('[pneumonia] loaded via strict state_dict', file=sys.stderr)
                return _PYTORCH_MODEL

            # Strategy E: non-strict load
            if _try_load_state_dict(net, state_dict, strict=False):
                net.eval()
                _PYTORCH_MODEL = net
                print('[pneumonia] loaded via non-strict state_dict '
                      '(some keys ignored)', file=sys.stderr)
                return _PYTORCH_MODEL

    raise RuntimeError(
        'Could not load pneumonia_best.pth with any supported strategy.\n'
        'Supported save formats:\n'
        '  torch.save(model.state_dict(), path)\n'
        '  torch.save(model, path)\n'
        '  torch.save({"model_state_dict": model.state_dict(), ...}, path)'
    )


# ─── PyTorch inference ────────────────────────────────────────────────────────

def _preprocess(image_bytes: bytes):
    """Standard ImageNet normalisation at 224x224."""
    import torch
    from torchvision import transforms

    image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    tf = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225]),
    ])
    return tf(image).unsqueeze(0)


def predict_with_torch(model, image_bytes: bytes) -> dict:
    import torch

    tensor = _preprocess(image_bytes)
    with torch.no_grad():
        logits = model(tensor)
        probs  = torch.softmax(logits, dim=1)[0].cpu().numpy()

    # If checkpoint has more than 2 classes, keep only first two and renormalise
    if len(probs) > 2:
        probs = probs[:2]
        probs = probs / probs.sum()

    idx = int(np.argmax(probs))
    return {
        'prediction':    CLASS_NAMES[idx],
        'probability':   round(float(probs[idx]) * 100, 2),
        'probabilities': {
            'NORMAL':    round(float(probs[0]) * 100, 2),
            'PNEUMONIA': round(float(probs[1]) * 100, 2),
        },
        'model_source': 'pytorch',
    }


# ─── Image-statistics heuristic fallback ─────────────────────────────────────

def predict_with_heuristic(image_bytes: bytes) -> dict:
    """
    Used ONLY when the trained checkpoint cannot be loaded.
    Analyses pixel-intensity statistics of the lung region.
    For demonstration purposes only — not clinically validated.
    """
    image = Image.open(io.BytesIO(image_bytes)).convert('L')
    image = image.resize((256, 256), Image.LANCZOS)
    arr   = np.array(image, dtype=np.float32) / 255.0

    h, w = arr.shape
    lung = arr[h // 4 : 3 * h // 4, w // 8 : 7 * w // 8]

    mean_val  = float(lung.mean())
    std_val   = float(lung.std())
    score     = float(np.clip(mean_val * 0.65 + (0.40 - std_val) * 0.35 + 0.10, 0.0, 1.0))
    stretched = float(1.0 / (1.0 + np.exp(-10.0 * (score - 0.50))))

    prob_pneu = stretched
    prob_norm = 1.0 - stretched
    idx  = 1 if prob_pneu >= 0.50 else 0
    conf = prob_pneu if idx == 1 else prob_norm

    return {
        'prediction':    CLASS_NAMES[idx],
        'probability':   round(conf * 100, 2),
        'probabilities': {
            'NORMAL':    round(prob_norm * 100, 2),
            'PNEUMONIA': round(prob_pneu * 100, 2),
        },
        'model_source': 'heuristic',
    }


# ─── Risk annotation ──────────────────────────────────────────────────────────

def add_risk_level(result: dict) -> dict:
    prob = result.get('probability', 0.0)
    if result['prediction'] == 'PNEUMONIA':
        result['risk'] = ('High Risk' if prob >= 80
                          else 'Moderate Risk' if prob >= 60
                          else 'Low-Moderate Risk')
    else:
        result['risk'] = 'Low Risk'
    return result


# ─── Public predict entry-point ───────────────────────────────────────────────

def predict(image_bytes: bytes) -> dict:
    warnings_list = []

    try:
        model  = load_pytorch_model()
        result = predict_with_torch(model, image_bytes)
    except FileNotFoundError:
        warnings_list.append(
            'pneumonia_best.pth not found — using heuristic fallback '
            '(demo only, not clinically validated).'
        )
        result = predict_with_heuristic(image_bytes)
    except (ImportError, ModuleNotFoundError) as exc:
        warnings_list.append(
            f'PyTorch/torchvision unavailable ({exc}) — using heuristic fallback '
            '(demo only, not clinically validated).'
        )
        result = predict_with_heuristic(image_bytes)
    except Exception as exc:
        print(f'[pneumonia] model error: {exc}', file=sys.stderr)
        warnings_list.append(
            f'Model error ({exc}) — using heuristic fallback '
            '(demo only, not clinically validated).'
        )
        result = predict_with_heuristic(image_bytes)

    if warnings_list:
        result['warning'] = ' '.join(warnings_list)

    return add_risk_level(result)


# ─── CLI ──────────────────────────────────────────────────────────────────────

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
            print(json.dumps({'error': f'Invalid or unreadable image: {img_err}'}),
                  file=sys.stderr)
            sys.exit(1)

        print(json.dumps(predict(image_bytes)))

    except json.JSONDecodeError as exc:
        print(json.dumps({'error': 'Invalid JSON input', 'details': str(exc)}),
              file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        print(json.dumps({'error': str(exc)}), file=sys.stderr)
        sys.exit(1)