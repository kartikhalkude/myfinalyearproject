const axios = require('axios');
const { spawn }              = require('child_process');
const path                   = require('path');
const DiabetesPrediction     = require('../models/DiabetesPrediction');
const HeartDiseasePrediction = require('../models/HeartDiseasePrediction');
const PneumoniaPrediction    = require('../models/PneumoniaPrediction');
const BrainTumorPrediction   = require('../models/BrainTumorPrediction');

// Absolute paths — work regardless of where Node is started from
const ML_DIR          = path.join(__dirname, '..', 'ml_model');
const DIABETES_SCRIPT = path.join(ML_DIR, 'predict.py');
const HEART_SCRIPT    = path.join(ML_DIR, 'heart_predict.py');
const PNEUMONIA_SCRIPT = path.join(ML_DIR, 'pneumonia_predict.py');
const BRAIN_TUMOR_SCRIPT = path.join(ML_DIR, 'brain_tumor_predict.py');
const OCR_SCRIPT      = path.join(ML_DIR, 'ocr_extract.py');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const callHuggingFace = async (endpoint, data) => {
  const hfUrl = process.env.HF_API_URL;
  if (!hfUrl) {
    console.warn("[ML] HF_API_URL not set in .env");
    return null;
  }

  const sanitizedUrl = hfUrl.replace(/\/$/, '');
  const sanitizedEndpoint = endpoint.replace(/^\//, '');
  const fullUrl = `${sanitizedUrl}/${sanitizedEndpoint}`;
  console.log(`[ML] Calling Hugging Face: ${fullUrl}`);

  try {
    const response = await axios.post(fullUrl, data, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`[ML] HF Success: ${endpoint}`);
    return response.data;
  } catch (error) {
    console.error(`[ML] HF API Error (${endpoint}):`, error.response?.data || error.message);
    return null; // Fallback to local if HF fails
  }
};

const runPythonScript = async (scriptPath, inputData, hfEndpoint = null) => {
  // 1. Try Hugging Face first if endpoint is provided
  if (hfEndpoint) {
    const hfResult = await callHuggingFace(hfEndpoint, inputData);
    if (hfResult) return hfResult;
    console.log(`[ML] HF failed or not configured, falling back to local Python for ${hfEndpoint}`);
  }

  // 2. Local Fallback
  return new Promise((resolve, reject) => {
    const pythonCmd = process.env.PYTHON_CMD || 'python3';
    const python = spawn(pythonCmd, [scriptPath]);

    let stdout = '';
    let stderr = '';

    python.stdin.write(JSON.stringify(inputData));
    python.stdin.end();

    python.stdout.on('data', (d) => { stdout += d.toString(); });
    python.stderr.on('data', (d) => { stderr += d.toString(); });

    python.on('error', (err) => {
      reject(new Error(`Failed to start Python (${pythonCmd}): ${err.message}`));
    });

    python.on('close', (code) => {
      if (stderr.trim()) {
        // Only log real errors, not sklearn UserWarnings
        const isOnlyWarnings = stderr.trim().split('\n')
          .every((l) => l.includes('UserWarning') || l.includes('warnings.warn') || l.includes('[pneumonia]') || !l.trim());
        if (!isOnlyWarnings) console.error('[ML stderr]', stderr.trim());
      }

      if (code !== 0) {
        return reject(new Error(stderr.trim() || `Python exited with code ${code}`));
      }

      const raw = stdout.trim();
      if (!raw) return reject(new Error('Python script produced no output'));

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error(`Could not parse output: ${raw.slice(0, 300)}`));
      }
    });
  });
};

const validateFields = (body, fields) => {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null) return field;
  }
  return null;
};

// ─── Diabetes ─────────────────────────────────────────────────────────────────

const DIABETES_FIELDS = [
  'pregnancies', 'glucose', 'bloodPressure', 'skinThickness',
  'insulin', 'bmi', 'diabetesPedigreeFunction', 'age'
];

const predictDiabetes = async (req, res) => {
  try {
    const missing = validateFields(req.body, DIABETES_FIELDS);
    if (missing) return res.status(400).json({ error: `Missing field: ${missing}` });

    const result = await runPythonScript(DIABETES_SCRIPT, req.body, '/predict/diabetes');
    
    // Standardize response for frontend
    const prediction = {
      prediction: result.prediction,
      probability: result.probability,
      risk_level: result.risk_level,
      message: result.message || (result.prediction === 1 ? "High probability of diabetes detected." : "Low probability of diabetes detected.")
    };

    await new DiabetesPrediction({
      userId: req.userId, ...req.body,
      prediction: prediction.prediction, probability: prediction.probability
    }).save();

    res.json(prediction);
  } catch (error) {
    console.error('[predictDiabetes]', error.message);
    res.status(500).json({ error: 'Prediction failed', details: error.message });
  }
};

const getDiabetesPredictions = async (req, res) => {
  try {
    res.json(await DiabetesPrediction.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(10));
  } catch {
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
};

// ─── Heart Disease ────────────────────────────────────────────────────────────

const HEART_FIELDS = [
  'age', 'sex', 'chestPainType', 'restingBP', 'cholesterol', 'fastingBS',
  'restingECG', 'maxHeartRate', 'exerciseAngina', 'oldpeak', 'stSlope', 'ca', 'thal'
];

const predictHeartDisease = async (req, res) => {
  try {
    const missing = validateFields(req.body, HEART_FIELDS);
    if (missing) return res.status(400).json({ error: `Missing field: ${missing}` });

    const result = await runPythonScript(HEART_SCRIPT, req.body, '/predict/heart');
    
    // Standardize response for frontend (expects prediction_label, probability_disease, etc.)
    const prediction = {
      prediction: result.prediction,
      prediction_label: result.label,
      risk_level: result.risk_level,
      probability_disease: result.probability,
      probability_no_disease: 1 - result.probability,
      message: result.message || (result.prediction === 1 ? "Elevated heart disease risk detected." : "Cardiovascular health appears normal.")
    };

    await new HeartDiseasePrediction({
      userId: req.userId, ...req.body,
      prediction: prediction.prediction, probability: prediction.probability_disease
    }).save();

    res.json(prediction);
  } catch (error) {
    console.error('[predictHeartDisease]', error.message);
    res.status(500).json({ error: 'Prediction failed', details: error.message });
  }
};

const getHeartPredictions = async (req, res) => {
  try {
    res.json(await HeartDiseasePrediction.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(10));
  } catch {
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
};

// ─── Pneumonia ───────────────────────────────────────────────────────────────

const PNEUMONIA_ALLOWED_MIMETYPES = ['image/png', 'image/jpeg', 'image/webp'];
const PNEUMONIA_MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const predictPneumonia = async (req, res) => {
  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    // Validate MIME type
    if (!PNEUMONIA_ALLOWED_MIMETYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        error: `Invalid file type. Allowed: PNG, JPEG, WEBP. Got: ${req.file.mimetype}` 
      });
    }

    // Validate file size
    if (req.file.size > PNEUMONIA_MAX_SIZE) {
      return res.status(400).json({ 
        error: `File too large. Maximum size: 10 MB. Got: ${(req.file.size / 1024 / 1024).toFixed(2)} MB` 
      });
    }

    // Convert image buffer to base64
    const imageBase64 = req.file.buffer.toString('base64');
    const inputData = { image: imageBase64 };

    const result = await runPythonScript(PNEUMONIA_SCRIPT, inputData, '/predict/pneumonia');

    // Standardize response for frontend
    const prediction = {
      prediction: result.prediction,
      probability: result.probability,
      risk: result.risk_level,
      message: result.message || (result.prediction === "Pneumonia" ? "Signs of pneumonia detected in the scan." : "Lung scan appears normal."),
      model_source: result.model_source || "HuggingFace Cloud"
    };

    // Save to database
    await new PneumoniaPrediction({
      userId: req.userId,
      filename: req.file.originalname,
      filesize: req.file.size,
      mimetype: req.file.mimetype,
      prediction: prediction.prediction,
      probability: prediction.probability,
      risk: prediction.risk,
      modelSource: prediction.model_source
    }).save();

    res.json(prediction);
  } catch (error) {
    console.error('[predictPneumonia]', error.message);
    res.status(500).json({ 
      error: 'Prediction failed', 
      details: error.message 
    });
  }
};

const getPneumoniaPredictions = async (req, res) => {
  try {
    const predictions = await PneumoniaPrediction
      .find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json(predictions);
  } catch (error) {
    console.error('[getPneumoniaPredictions]', error.message);
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
};

// ─── Brain Tumor ──────────────────────────────────────────────────────────────

const BRAIN_TUMOR_ALLOWED_MIMETYPES = ['image/png', 'image/jpeg', 'image/webp'];
const BRAIN_TUMOR_MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const predictBrainTumor = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No MRI image uploaded' });
    if (!BRAIN_TUMOR_ALLOWED_MIMETYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Allowed: PNG, JPEG, WEBP' });
    }
    if (req.file.size > BRAIN_TUMOR_MAX_SIZE) {
      return res.status(400).json({ error: 'File too large. Max 10MB' });
    }

    const imageBase64 = req.file.buffer.toString('base64');
    const inputData = { image: imageBase64 };

    const result = await runPythonScript(BRAIN_TUMOR_SCRIPT, inputData, '/predict/tumor');

    // Standardize response for frontend
    const prediction = {
      prediction: result.prediction,
      probability: result.probability,
      risk: result.risk || result.risk_level,
      message: result.message || (result.prediction !== "No Tumor" ? `Potential ${result.prediction} detected.` : "No tumor detected in the MRI."),
      model_source: result.model_source || "HuggingFace Cloud"
    };

    await new BrainTumorPrediction({
      userId: req.userId,
      filename: req.file.originalname,
      filesize: req.file.size,
      mimetype: req.file.mimetype,
      prediction: prediction.prediction,
      probability: prediction.probability,
      risk: prediction.risk,
      modelSource: prediction.model_source
    }).save();

    res.json(prediction);
  } catch (error) {
    console.error('[predictBrainTumor]', error.message);
    res.status(500).json({ error: 'Prediction failed', details: error.message });
  }
};

const getBrainTumorPredictions = async (req, res) => {
  try {
    const predictions = await BrainTumorPrediction.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(10);
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
};

const clearPredictionHistory = async (req, res) => {
  try {
    const { type } = req.body;
    let model;
    switch (type) {
      case 'diabetes': model = DiabetesPrediction; break;
      case 'heart':    model = HeartDiseasePrediction; break;
      case 'pneumonia': model = PneumoniaPrediction; break;
      case 'tumor':     model = BrainTumorPrediction; break;
      default: return res.status(400).json({ error: 'Invalid prediction type' });
    }

    await model.deleteMany({ userId: req.userId });
    res.json({ message: `${type} history cleared successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear history' });
  }
};

// ─── OCR Report Extraction ───────────────────────────────────────────────────

const OCR_ALLOWED_MIMETYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/tiff', 'application/pdf'];
const OCR_MAX_SIZE = 15 * 1024 * 1024; // 15 MB (PDFs can be larger)

const extractReportData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No report file uploaded' });
    }

    if (!OCR_ALLOWED_MIMETYPES.includes(req.file.mimetype)) {
      return res.status(400).json({
        error: `Invalid file type. Allowed: PNG, JPEG, WEBP, BMP, TIFF, PDF. Got: ${req.file.mimetype}`
      });
    }

    if (req.file.size > OCR_MAX_SIZE) {
      return res.status(400).json({
        error: `File too large. Maximum size: 15 MB. Got: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`
      });
    }

    const reportType = req.body.type || 'diabetes';
    if (!['diabetes', 'heart'].includes(reportType)) {
      return res.status(400).json({ error: 'Invalid report type. Must be "diabetes" or "heart".' });
    }

    const fileBase64 = req.file.buffer.toString('base64');
    const inputData = { image: fileBase64, type: reportType, mimetype: req.file.mimetype };

    const result = await runPythonScript(OCR_SCRIPT, inputData);

    if (result.error) {
      return res.status(422).json({
        error: result.error,
        extracted: result.extracted || {},
        confidence: result.confidence || 0
      });
    }

    res.json(result);
  } catch (error) {
    console.error('[extractReportData]', error.message);
    res.status(500).json({ error: 'Report extraction failed', details: error.message });
  }
};

module.exports = { 
  predictDiabetes, 
  getDiabetesPredictions, 
  predictHeartDisease, 
  getHeartPredictions, 
  predictPneumonia, 
  getPneumoniaPredictions,
  predictBrainTumor,
  getBrainTumorPredictions,
  clearPredictionHistory,
  extractReportData
};