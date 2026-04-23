#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "--- Installing Node dependencies ---"
npm install

echo "--- Installing Python dependencies ---"
pip install --upgrade pip
# Install minimal python dependencies for OCR/Report Extraction
pip install -r requirements.txt

# If you have specific torch/torchvision versions from the other script
# bash install_ml_deps.sh 

echo "--- Build Finished ---"
