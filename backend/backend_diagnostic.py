#!/usr/bin/env python3
"""
Backend Environment Diagnostic
Tests if the Python running your backend can access Tesseract
"""

import sys
import os
import json

print("=" * 70)
print("🔍 BACKEND ENVIRONMENT DIAGNOSTIC")
print("=" * 70)
print()

# 1. Python info
print("1️⃣  Python Information")
print("-" * 70)
print(f"   Python executable: {sys.executable}")
print(f"   Python version: {sys.version}")
print(f"   Python path: {sys.prefix}")
print()

# 2. PATH environment
print("2️⃣  System PATH")
print("-" * 70)
path_dirs = os.environ.get('PATH', '').split(os.pathsep)
print(f"   Number of PATH entries: {len(path_dirs)}")
print()

# 3. Check pytesseract
print("3️⃣  Checking pytesseract")
print("-" * 70)
try:
    import pytesseract
    print(f"   ✓ pytesseract imported successfully")
    print(f"   ✓ Location: {pytesseract.__file__}")
    print(f"   ✓ Version: {pytesseract.__version__ if hasattr(pytesseract, '__version__') else 'unknown'}")
    
    # Try to get tesseract command
    try:
        cmd = pytesseract.pytesseract.tesseract_cmd
        if cmd:
            print(f"   ✓ Tesseract command set to: {cmd}")
        else:
            print(f"   ⚠️  Tesseract command not explicitly set (will search PATH)")
    except AttributeError:
        print(f"   ⚠️  Could not check tesseract_cmd")
        
except ImportError as e:
    print(f"   ✗ FAILED: {e}")
    print(f"   → Fix: pip install pytesseract")
print()

# 4. Check for tesseract binary
print("4️⃣  Checking for Tesseract Binary")
print("-" * 70)
import shutil
tesseract_path = shutil.which('tesseract')
if tesseract_path:
    print(f"   ✓ Found at: {tesseract_path}")
    try:
        import subprocess
        result = subprocess.run([tesseract_path, '--version'], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            version = result.stdout.split('\n')[0]
            print(f"   ✓ Version: {version}")
        else:
            print(f"   ⚠️  Could not run tesseract --version")
    except Exception as e:
        print(f"   ⚠️  Error checking version: {e}")
else:
    print(f"   ✗ Tesseract NOT found in PATH")
    print(f"   → Check your system PATH: {os.environ.get('PATH', 'NOT SET')}")
print()

# 5. Test pytesseract functionality
print("5️⃣  Testing pytesseract Functionality")
print("-" * 70)
try:
    import pytesseract
    from PIL import Image
    import io
    import base64
    
    # Create a simple test image (1x1 white pixel)
    test_image = Image.new('RGB', (1, 1), color='white')
    print(f"   ✓ Created test image")
    
    # Try to run OCR
    try:
        text = pytesseract.image_to_string(test_image)
        print(f"   ✓ pytesseract.image_to_string() works!")
        print(f"   ✓ OCR is functional")
    except Exception as e:
        error_msg = str(e)
        print(f"   ✗ pytesseract.image_to_string() failed: {error_msg}")
        if 'tesseract is not installed' in error_msg.lower() or 'TesseractNotFoundError' in str(type(e)):
            print(f"   → The pytesseract module is installed but can't find the Tesseract binary")
            print(f"   → You need to install the Tesseract OCR binary on your system")
        elif 'permission denied' in error_msg.lower():
            print(f"   → Permission denied - check file permissions")
        else:
            print(f"   → Unknown error")
            
except ImportError as e:
    print(f"   ✗ Could not import required modules: {e}")
except Exception as e:
    print(f"   ✗ Unexpected error: {e}")
print()

# 6. Check other dependencies
print("6️⃣  Checking Other Dependencies")
print("-" * 70)
deps = ['PIL', 'pdfplumber', 'PyPDF2']
for dep in deps:
    try:
        __import__(dep)
        print(f"   ✓ {dep}")
    except ImportError:
        print(f"   ✗ {dep} not installed (optional)")
print()

# 7. Summary and recommendation
print("=" * 70)
print("📋 SUMMARY & RECOMMENDATIONS")
print("=" * 70)
print()

if not tesseract_path:
    print("❌ PROBLEM: Tesseract binary is not in PATH")
    print()
    print("SOLUTION: Install Tesseract OCR")
    if sys.platform.startswith('linux'):
        print("  Linux: sudo apt-get install tesseract-ocr")
    elif sys.platform == 'darwin':
        print("  macOS: brew install tesseract")
    elif sys.platform == 'win32':
        print("  Windows: https://github.com/UB-Mannheim/tesseract/wiki")
    print()
    print("  Then restart your backend service!")
else:
    print("✅ Tesseract appears to be installed correctly")
    print()
    print("If you're still getting errors in your backend:")
    print("  1. Restart your backend service: npm start (or python app.py, etc.)")
    print("  2. Check your backend logs for detailed error messages")
    print("  3. Verify the /api/extract-report endpoint is using the fixed OCR script")
print()

# 8. Test with actual OCR script
print("=" * 70)
print("🧪 TESTING WITH OCR SCRIPT")
print("=" * 70)
print()

# Try to import and test ocr_extract
try:
    # Create a simple test input
    from PIL import Image
    import base64
    import io
    
    # Create white image
    img = Image.new('RGB', (100, 50), color='white')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_b64 = base64.b64encode(img_bytes.getvalue()).decode()
    
    # Create test JSON input
    test_input = json.dumps({
        "image": img_b64,
        "type": "diabetes",
        "mimetype": "image/png"
    })
    
    print("Test input created (white test image)")
    print()
    print("If you were to run ocr_extract.py with this input:")
    print("  echo '<test_input>' | python ocr_extract.py")
    print()
    
    # Try to import ocr extraction
    sys.path.insert(0, '/path/to/backend')  # Adjust if needed
    
except Exception as e:
    print(f"Could not create test input: {e}")

print()
print("=" * 70)
print("✅ Diagnostic complete!")
print("=" * 70)