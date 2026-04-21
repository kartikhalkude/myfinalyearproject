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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const runPythonScript = (scriptPath, inputData) =>
  new Promise((resolve, reject) => {
    const pythonCmd = process.env.PYTHON_CMD || 'python';
    // NOTE: no cwd override — scripts resolve paths via __file__ internally
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

    const prediction = await runPythonScript(DIABETES_SCRIPT, req.body);
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

    const prediction = await runPythonScript(HEART_SCRIPT, req.body);
    await new HeartDiseasePrediction({
      userId: req.userId, ...req.body,
      prediction: prediction.prediction, probability: prediction.probability
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

    const prediction = await runPythonScript(PNEUMONIA_SCRIPT, inputData);

    // Validate Python output
    if (!prediction.prediction || prediction.probability === undefined) {
      throw new Error('Invalid prediction output from model');
    }

    // Save to database
    await new PneumoniaPrediction({
      userId: req.userId,
      filename: req.file.originalname,
      filesize: req.file.size,
      mimetype: req.file.mimetype,
      prediction: prediction.prediction,
      probability: prediction.probability,
      risk: prediction.risk,
      modelSource: prediction.model_source,
      warning: prediction.warning || null
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

// ─── Brain Tumor ─────────────────────────────────────────────────────────────

const BRAIN_TUMOR_ALLOWED_MIMETYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/tiff'];
const BRAIN_TUMOR_MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const predictBrainTumor = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    if (!BRAIN_TUMOR_ALLOWED_MIMETYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        error: `Invalid file type. Allowed: PNG, JPEG, WEBP, BMP, TIFF. Got: ${req.file.mimetype}` 
      });
    }

    if (req.file.size > BRAIN_TUMOR_MAX_SIZE) {
      return res.status(400).json({ 
        error: `File too large. Maximum size: 10 MB. Got: ${(req.file.size / 1024 / 1024).toFixed(2)} MB` 
      });
    }

    const imageBase64 = req.file.buffer.toString('base64');
    const inputData = { image: imageBase64 };

    const prediction = await runPythonScript(BRAIN_TUMOR_SCRIPT, inputData);

    if (!prediction.prediction || prediction.probability === undefined) {
      throw new Error('Invalid prediction output from model');
    }

    await new BrainTumorPrediction({
      userId: req.userId,
      prediction: prediction.prediction,
      probability: prediction.probability
    }).save();

    res.json(prediction);
  } catch (error) {
    console.error('[predictBrainTumor]', error.message);
    res.status(500).json({ 
      error: 'Prediction failed', 
      details: error.message 
    });
  }
};

const getBrainTumorPredictions = async (req, res) => {
  try {
    const predictions = await BrainTumorPrediction
      .find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json(predictions);
  } catch (error) {
    console.error('[getBrainTumorPredictions]', error.message);
    res.status(500).json({ error: 'Failed to fetch predictions' });
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
  getBrainTumorPredictions
};