"""
Heart Disease Model — Test Script
Compatible with heart_train_model.py (stacking ensemble, no one-hot encoding).

Run from ml_model/ directory:
    python heart_test_prediction.py
"""

import os
import sys

import joblib
import pandas as pd

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "heart_model.pkl")   # fixed: was heart_predict_model.pkl

FEATURE_COLS = [
    "age", "sex", "cp", "trestbps", "chol", "fbs",
    "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal",
]

print("=" * 60)
print("TESTING HEART DISEASE MODEL (stacking ensemble)")
print("=" * 60)

# ─── Load model ───────────────────────────────────────────────────────────────

if not os.path.exists(MODEL_PATH):
    print(f"\nERROR: {MODEL_PATH} not found.")
    print("Run: python heart_train_model.py")
    sys.exit(1)

data = joblib.load(MODEL_PATH)
if not isinstance(data, dict) or "model" not in data:
    print("ERROR: Unexpected model format. Delete heart_model.pkl and retrain.")
    sys.exit(1)

model        = data["model"]
feature_cols = data.get("feature_cols", FEATURE_COLS)
metadata     = data.get("metadata", {})

print(f"\n✓ Model loaded: {metadata.get('model_type', 'unknown')}")
print(f"  Test accuracy : {metadata.get('test_accuracy', 'N/A'):.4f}")
print(f"  Test AUC      : {metadata.get('test_auc', 'N/A'):.4f}")
print(f"  CV AUC        : {metadata.get('cv_auc_mean', 'N/A'):.4f} ± "
      f"{metadata.get('cv_auc_std', 'N/A'):.4f}")


# ─── Prediction helper ────────────────────────────────────────────────────────

def predict_patient(patient_dict):
    """Raw-feature prediction (integers, no one-hot encoding)."""
    df = pd.DataFrame([patient_dict])[feature_cols].astype(float)
    probs = model.predict_proba(df)[0]
    pred  = int(model.predict(df)[0])
    prob_disease = float(probs[1])
    risk = (
        "Low"      if prob_disease < 0.30 else
        "Moderate" if prob_disease < 0.60 else
        "High"
    )
    return {
        "prediction":    pred,
        "label":         "Disease" if pred == 1 else "No Disease",
        "prob_disease":  prob_disease,
        "prob_no_disease": float(probs[0]),
        "risk":          risk,
    }


# ─── Test cases ───────────────────────────────────────────────────────────────
# Values are raw integers — the stacking pipeline handles scaling internally.
# Key dataset patterns (counterintuitive but real):
#   cp=0 (typical angina)  → often NO disease in this dataset
#   thal=2 (fixed defect)  → often DISEASE
#   thal=3 (reversible)    → often NO disease
#   ca=0 (no vessels)      → often DISEASE (counterintuitive)

TEST_CASES = [
    {
        "label":    "LIKELY NO DISEASE — young male, high max-HR, low ST depression",
        "expected": "No Disease",
        "data": dict(age=40, sex=1, cp=0, trestbps=120, chol=200, fbs=0,
                     restecg=0, thalach=170, exang=0, oldpeak=0.0,
                     slope=2, ca=2, thal=3),
    },
    {
        "label":    "LIKELY DISEASE — female, non-anginal pain, exercise angina, fixed defect",
        "expected": "Disease",
        "data": dict(age=55, sex=0, cp=2, trestbps=140, chol=230, fbs=0,
                     restecg=0, thalach=140, exang=1, oldpeak=1.5,
                     slope=1, ca=0, thal=2),
    },
    {
        "label":    "STRONG DISEASE — older male, low max-HR, high ST depression",
        "expected": "Disease",
        "data": dict(age=60, sex=1, cp=2, trestbps=150, chol=270, fbs=1,
                     restecg=2, thalach=120, exang=1, oldpeak=3.0,
                     slope=0, ca=0, thal=2),
    },
    {
        "label":    "STRONG NO DISEASE — young male, typical angina, reversible defect",
        "expected": "No Disease",
        "data": dict(age=35, sex=1, cp=0, trestbps=118, chol=195, fbs=0,
                     restecg=0, thalach=175, exang=0, oldpeak=0.0,
                     slope=2, ca=0, thal=3),
    },
    {
        "label":    "MIXED SIGNALS — uncertain",
        "expected": "Uncertain",
        "data": dict(age=50, sex=0, cp=1, trestbps=135, chol=220, fbs=0,
                     restecg=1, thalach=150, exang=0, oldpeak=1.0,
                     slope=1, ca=1, thal=1),
    },
]

# ─── Run tests ────────────────────────────────────────────────────────────────

print("\n" + "=" * 60)
print("RUNNING PREDICTIONS")
print("=" * 60)

correct = skipped = wrong = 0

for i, tc in enumerate(TEST_CASES, 1):
    res = predict_patient(tc["data"])

    print(f"\n{'=' * 60}")
    print(f"Test {i}: {tc['label']}")
    print(f"  Age {tc['data']['age']}, Sex {'M' if tc['data']['sex'] else 'F'}, "
          f"CP={tc['data']['cp']}, CA={tc['data']['ca']}, "
          f"Thal={tc['data']['thal']}, Oldpeak={tc['data']['oldpeak']}")
    print(f"  {'Prediction':>20}: {res['label']}")
    print(f"  {'Disease prob':>20}: {res['prob_disease'] * 100:.1f}%")
    print(f"  {'No-disease prob':>20}: {res['prob_no_disease'] * 100:.1f}%")
    print(f"  {'Risk level':>20}: {res['risk']}")
    print(f"  {'Expected':>20}: {tc['expected']}")

    if tc["expected"] == "Uncertain":
        print(f"  {'Status':>20}: ⚠  UNCERTAIN (skipped)")
        skipped += 1
    elif tc["expected"] == res["label"]:
        print(f"  {'Status':>20}: ✅ CORRECT")
        correct += 1
    else:
        print(f"  {'Status':>20}: ❌ MISMATCH")
        wrong += 1

print("\n" + "=" * 60)
print(f"RESULTS  ✅ {correct} correct  ❌ {wrong} wrong  ⚠  {skipped} uncertain")
print("=" * 60)

print("""
NOTE: This UCI Heart Disease dataset has counterintuitive patterns:
  cp=0 (typical angina)   → more common in NO-disease cases
  ca=0 (no vessels)       → more common in DISEASE cases
  thal=2 (fixed defect)   → more common in DISEASE cases
  thal=3 (reversible)     → more common in NO-disease cases

The model learns these from the data. Mismatches on edge cases are expected.
""")