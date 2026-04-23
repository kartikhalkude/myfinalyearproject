import sys
import json
import base64
import re
import io

# ── PDF dependencies ─────────────────────────────────────────────

_HAS_PDFPLUMBER = False
try:
    import pdfplumber
    _HAS_PDFPLUMBER = True
except ImportError:
    pass

_HAS_PYPDF = False
try:
    from PyPDF2 import PdfReader
    _HAS_PYPDF = True
except ImportError:
    pass


# ── Diabetes Patterns ────────────────────────────────────────────

DIABETES_PATTERNS = {
    "pregnancies": [
        r'(?:pregnancies|gravida|para)\s*[:\-]?\s*(\d+)',
    ],
    "glucose": [
        r'(?:glucose|blood\s*sugar|fasting\s*glucose|FBS|FBG|RBS)\s*[:\-]?\s*(\d+\.?\d*)',
        r'(\d+\.?\d*)\s*mg/?dl\s*.*?glucose',
    ],
    "bloodPressure": [
        r'(?:BP|blood\s*pressure)\s*[:\-]?\s*\d+\s*/\s*(\d+)',
        r'/\s*(\d{2,3})\s*(?:mmhg|mm\s*hg)',
    ],
    "skinThickness": [
        r'(?:skin\s*thickness|TSF)\s*[:\-]?\s*(\d+\.?\d*)',
    ],
    "insulin": [
        r'(?:insulin|serum\s*insulin)\s*[:\-]?\s*(\d+\.?\d*)',
    ],
    "bmi": [
        r'(?:BMI|body\s*mass\s*index)\s*[:\-]?\s*(\d+\.?\d*)',
    ],
    "diabetesPedigreeFunction": [
        r'(?:diabetes\s*pedigree|DPF)\s*[:\-]?\s*(\d+\.?\d*)',
    ],
    "age": [
        r'(?:age)\s*[:\-]?\s*(\d+)',
    ],
}


# ── Heart Patterns ───────────────────────────────────────────────

HEART_PATTERNS = {
    "age": [
        r'(?:age)\s*[:\-]?\s*(\d+)',
    ],
    "sex": [
        r'(?:sex|gender)\s*[:\-]?\s*(male|female|m|f)',
    ],
    "restingBP": [
        r'(?:BP|blood\s*pressure)\s*[:\-]?\s*(\d+)\s*/\s*\d+',
    ],
    "cholesterol": [
        r'(?:cholesterol|total\s*cholesterol)\s*[:\-]?\s*(\d+\.?\d*)',
    ],
    "fastingBS": [
        r'(?:fasting\s*(?:blood\s*sugar|glucose)|FBS|FBG)\s*[:\-]?\s*(\d+\.?\d*)',
    ],
    "maxHeartRate": [
        r'(?:max(?:imum)?\s*(?:heart\s*rate|HR)|MHR)\s*[:\-]?\s*(\d+)',
    ],
    "oldpeak": [
        r'(?:ST\s*depression|oldpeak)\s*[:\-]?\s*(\d+\.?\d*)',
    ],
}


SEX_MAP = {
    "male": "1",
    "m": "1",
    "female": "0",
    "f": "0"
}


# ── PDF Text Extraction ──────────────────────────────────────────

def extract_text_from_pdf(pdf_bytes):
    text = ""

    # Preferred: pdfplumber
    if _HAS_PDFPLUMBER:
        try:
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"

                    # Extract tables too
                    tables = page.extract_tables()
                    for table in tables:
                        for row in table:
                            if row:
                                cleaned = [
                                    str(cell).strip() if cell else ""
                                    for cell in row
                                ]
                                text += " | ".join(cleaned) + "\n"

            if text.strip():
                return text

        except Exception as e:
            sys.stderr.write(f"[pdfplumber failed] {e}\n")

    # Fallback: PyPDF2
    if _HAS_PYPDF:
        try:
            reader = PdfReader(io.BytesIO(pdf_bytes))

            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"

            if text.strip():
                return text

        except Exception as e:
            sys.stderr.write(f"[PyPDF2 failed] {e}\n")

    return text


# ── Value Extraction ─────────────────────────────────────────────

def extract_values(text, patterns_dict, report_type):
    extracted = {}
    matched_count = 0

    text_lower = text.lower()
    text_clean = re.sub(r'\s+', ' ', text_lower)

    for field, patterns in patterns_dict.items():
        for pattern in patterns:
            match = re.search(pattern, text_lower, re.IGNORECASE)

            if not match:
                match = re.search(pattern, text_clean, re.IGNORECASE)

            if match:
                value = match.group(1).strip()

                if field == "sex" and report_type == "heart":
                    value = SEX_MAP.get(value.lower(), value)

                if field == "fastingBS" and report_type == "heart":
                    try:
                        value = "1" if float(value) > 120 else "0"
                    except:
                        pass

                extracted[field] = value
                matched_count += 1
                break

    confidence = matched_count / len(patterns_dict)
    return extracted, round(confidence, 2)


# ── Main ────────────────────────────────────────────────────────

def main():
    try:
        raw_input = sys.stdin.read()
        data = json.loads(raw_input)
    except:
        print(json.dumps({
            "error": "Invalid JSON input",
            "extracted": {},
            "raw_text": "",
            "confidence": 0
        }))
        return

    file_b64 = data.get("image", "")
    report_type = data.get("type", "diabetes")
    mimetype = data.get("mimetype", "application/pdf")

    if not file_b64:
        print(json.dumps({
            "error": "No file provided",
            "extracted": {},
            "raw_text": "",
            "confidence": 0
        }))
        return

    if mimetype != "application/pdf":
        print(json.dumps({
            "error": "Only PDF files supported (OCR removed)",
            "extracted": {},
            "raw_text": "",
            "confidence": 0
        }))
        return

    try:
        file_bytes = base64.b64decode(file_b64)
    except:
        print(json.dumps({
            "error": "Invalid base64 PDF data",
            "extracted": {},
            "raw_text": "",
            "confidence": 0
        }))
        return

    if not _HAS_PDFPLUMBER and not _HAS_PYPDF:
        print(json.dumps({
            "error": "Install pdfplumber or PyPDF2 first",
            "extracted": {},
            "raw_text": "",
            "confidence": 0
        }))
        return

    raw_text = extract_text_from_pdf(file_bytes)

    if not raw_text.strip():
        print(json.dumps({
            "error": "No text found in PDF",
            "extracted": {},
            "raw_text": "",
            "confidence": 0
        }))
        return

    patterns = HEART_PATTERNS if report_type == "heart" else DIABETES_PATTERNS

    extracted, confidence = extract_values(
        raw_text,
        patterns,
        report_type
    )

    print(json.dumps({
        "extracted": extracted,
        "raw_text": raw_text[:2000],
        "confidence": confidence,
        "fields_found": len(extracted),
        "total_fields": len(patterns)
    }))


if __name__ == "__main__":
    main()