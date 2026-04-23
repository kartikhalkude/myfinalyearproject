const express        = require('express');
const router         = express.Router();
const multer         = require('multer');
const authMiddleware = require('../middleware/auth');
const {
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
} = require('../controllers/predictionController');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/predict-diabetes',       authMiddleware, predictDiabetes);
router.get('/predictions',             authMiddleware, getDiabetesPredictions);
router.post('/predict-heart-disease',  authMiddleware, predictHeartDisease);
router.get('/heart-predictions',       authMiddleware, getHeartPredictions);
router.delete('/clear',                authMiddleware, clearPredictionHistory);
router.post('/predict-pneumonia',      authMiddleware, upload.single('image'), predictPneumonia);
router.get('/pneumonia-predictions',   authMiddleware, getPneumoniaPredictions);
router.post('/predict-brain-tumor',    authMiddleware, upload.single('image'), predictBrainTumor);
router.get('/brain-tumor-predictions', authMiddleware, getBrainTumorPredictions);
router.post('/extract-report',         authMiddleware, upload.single('report'), extractReportData);


module.exports = router;