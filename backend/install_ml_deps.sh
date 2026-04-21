#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# install_ml_deps.sh
# One-shot ML dependency installer for Dr.AssistAI (Linux / macOS)
#
# Usage:
#   cd backend
#   bash install_ml_deps.sh
#
# Requires Python 3.9, 3.10, or 3.11  (torch 2.1 does NOT support 3.12+)
# ─────────────────────────────────────────────────────────────────────────────

set -e

PYTHON="${PYTHON_CMD:-python3}"

echo "=== Dr.AssistAI ML dependency installer ==="
echo "Python: $($PYTHON --version)"
echo ""

# 1 ── Core ML packages (from PyPI)
echo ">>> Installing core ML packages..."
"$PYTHON" -m pip install --upgrade pip
"$PYTHON" -m pip install \
    "pandas==2.1.4" \
    "numpy==1.26.4" \
    "scikit-learn==1.3.2" \
    "joblib>=1.3.2" \
    "Pillow>=10.1.0"

# 2 ── PyTorch CPU builds (must come from PyTorch's own wheel index)
echo ""
echo ">>> Installing PyTorch (CPU)..."
"$PYTHON" -m pip install \
    torch==2.1.2 \
    torchvision==0.16.2 \
    --index-url https://download.pytorch.org/whl/cpu

echo ""
echo "=== Installation complete ==="
echo "You can now run: node server.js"
