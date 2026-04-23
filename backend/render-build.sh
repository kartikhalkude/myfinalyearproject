#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "--- Installing Node dependencies ---"
npm install

echo "--- Installing Python dependencies ---"
pip install --upgrade pip
# Install core dependencies
pip install pandas==2.1.3 numpy==1.26.2 scikit-learn==1.3.2 joblib Pillow pdfplumber typing_extensions

# Install CPU-only PyTorch to save space and memory
pip install torch==2.1.0 torchvision==0.16.0 --index-url https://download.pytorch.org/whl/cpu

# If you have specific torch/torchvision versions from the other script
# bash install_ml_deps.sh 

echo "--- Build Finished ---"
