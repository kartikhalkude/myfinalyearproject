import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';

function PneumoniaPrediction() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await apiClient.get('/pneumonia-predictions');
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch prediction history:', err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setPrediction(null);
    setError('');

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a chest X-ray image first.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await apiClient.post('/predict-pneumonia', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setPrediction(response.data);
      fetchHistory();
    } catch (err) {
      setError(
        err.response?.data?.details ||
        err.response?.data?.error ||
        'Prediction failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setPrediction(null);
    setError('');
  };

  const hasPrediction = Boolean(prediction);
  const isPneumonia = prediction?.prediction === 'PNEUMONIA';

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Pneumonia Detection</h2>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Upload a chest X-ray image</p>
            <p>The model analyzes an uploaded X-ray and estimates the likelihood of pneumonia.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800">Upload X-ray Image</h3>
              {file && (
                <span className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg">
                  {file.name}
                </span>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer block">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-700">Click to upload chest X-ray</p>
                      <p className="text-sm text-gray-500">PNG, JPG, JPEG, or WEBP</p>
                    </div>
                  </div>
                </label>
              </div>

              {preview && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-700">Image Preview</h4>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <img
                      src={preview}
                      alt="Chest X-ray preview"
                      className="max-w-xs max-h-72 rounded-lg shadow-sm border border-gray-200"
                    />
                  </div>
                </div>
              )}

              <div className="flex space-x-4 pt-2">
                <button
                  type="submit"
                  disabled={!file || loading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Analyzing...' : 'Analyze X-ray'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>

        <div>
          {hasPrediction ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Prediction Result</h3>

              <div className={`p-6 rounded-lg mb-4 ${isPneumonia ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border-2 border-green-200'}`}>
                <div className="text-center">
                  <h4 className={`text-2xl font-bold mb-2 ${isPneumonia ? 'text-red-700' : 'text-green-700'}`}>
                    {prediction.prediction}
                  </h4>
                  <p className={`text-lg font-semibold mb-1 ${isPneumonia ? 'text-red-600' : 'text-green-600'}`}>
                    {prediction.risk}
                  </p>
                  {prediction.warning && (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-3">
                      {prediction.warning}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Confidence</span>
                  <span className="text-sm font-bold text-gray-900">{prediction.probability}%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Normal Probability</span>
                  <span className="text-sm font-bold text-gray-900">{prediction.probabilities?.NORMAL ?? 0}%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Pneumonia Probability</span>
                  <span className="text-sm font-bold text-gray-900">{prediction.probabilities?.PNEUMONIA ?? 0}%</span>
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> This prediction should support screening only and not replace a clinician&apos;s diagnosis.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center py-16">
              <p className="text-gray-500 text-sm">Upload an X-ray image to see the model&apos;s prediction</p>
            </div>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Predictions</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'Result', 'Confidence', 'Risk'].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.prediction === 'PNEUMONIA' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {item.prediction}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.probability}%</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default PneumoniaPrediction;