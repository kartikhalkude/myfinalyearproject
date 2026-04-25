import React, { useState, useRef, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { SectionCard } from './UI';
import {
  Upload,
  CheckCircle,
  AlertTriangle,
  X,
  ScanLine,
  FileText
} from 'lucide-react';

/**
 * ReportScanner — PDF medical report scanner with dark mode support.
 * Only supports PDF reports (no OCR, no image upload).
 * Extracts values from medical PDFs and auto-fills the parent form.
 *
 * Props:
 *  - type: "diabetes" | "heart"
 *  - onExtracted: (extractedValues) => void
 *  - fieldLabels: { fieldKey: "Human Label" }
 */
export default function ReportScanner({
  type = 'diabetes',
  onExtracted,
  fieldLabels = {}
}) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [dark, setDark] = useState(() =>
    document.body.classList.contains('dm')
  );

  const fileInputRef = useRef(null);

  useEffect(() => {
    const syncDark = () =>
      setDark(document.body.classList.contains('dm'));

    window.addEventListener('dm-change', syncDark);
    return () =>
      window.removeEventListener('dm-change', syncDark);
  }, []);

  const ACCEPTED_TYPES = ['application/pdf'];

  const handleFile = (f) => {
    if (!f) return;

    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError(
        'Only PDF files are supported. Please upload a medical PDF report.'
      );
      return;
    }

    if (f.size > 15 * 1024 * 1024) {
      setError('File too large. Maximum size is 15 MB.');
      return;
    }

    setFile(f);
    setError('');
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleScan = async () => {
    if (!file) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('report', file);
      formData.append('type', type);

      const res = await apiClient.post(
        '/extract-report',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 60000
        }
      );

      const data = res.data;
      setResult(data);
      setError('');

      if (
        data.extracted &&
        Object.keys(data.extracted).length > 0
      ) {
        onExtracted(data.extracted);
      }
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        'Failed to extract PDF report. Please try again.';

      setError(msg);

      if (
        err.response?.data?.extracted &&
        Object.keys(err.response.data.extracted).length > 0
      ) {
        setResult(err.response.data);
        onExtracted(err.response.data.extracted);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const confidenceColor = result
    ? result.confidence >= 0.6
      ? '#16a34a'
      : result.confidence >= 0.3
        ? '#ca8a04'
        : '#dc2626'
    : '#94a3b8';

  const confidenceLabel = result
    ? result.confidence >= 0.6
      ? 'High'
      : result.confidence >= 0.3
        ? 'Moderate'
        : 'Low'
    : '';

  const c = {
    headerBg: dark
      ? 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(29,181,133,0.12) 100%)'
      : 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(29,181,133,0.06) 100%)',

    headerBorder: dark ? '#1e293b' : '#f1f5f9',
    titleColor: dark ? '#f8fafc' : '#0f172a',
    subtitleColor: '#94a3b8',

    dropBorder: dark ? '#334155' : '#e2e8f0',
    dropBorderActive: dark ? '#3ecba0' : '#1db585',
    dropBg: dark ? '#0f172a' : '#fafbfc',
    dropBgActive: dark
      ? 'rgba(29,181,133,0.08)'
      : 'rgba(29,181,133,0.04)',

    dropText: dark ? '#e2e8f0' : '#334155',
    dropMuted: dark ? '#64748b' : '#94a3b8',
    dropHint: dark ? '#475569' : '#cbd5e1',
    accentLink: dark ? '#3ecba0' : '#1db585',

    fileBg: dark ? '#1a2236' : '#f8fafc',
    fileBorder: dark ? '#2d3e55' : '#e2e8f0',
    fileText: dark ? '#e2e8f0' : '#334155',
    fileMuted: dark ? '#64748b' : '#94a3b8',

    xColor: dark ? '#64748b' : '#94a3b8',

    scanBtnBg: dark
      ? 'linear-gradient(135deg, #3ecba0, #1db585)'
      : 'linear-gradient(135deg, #1db585, #0e9a6e)',

    successBg: dark ? 'rgba(34,197,94,0.14)' : '#f0fdf4',
    successBorder: dark
      ? 'rgba(134,239,172,0.35)'
      : '#bbf7d0',

    successText: dark ? '#86efac' : '#166534',

    failBg: dark ? 'rgba(239,68,68,0.12)' : '#fef2f2',
    failBorder: dark
      ? 'rgba(248,113,113,0.4)'
      : '#fecaca',

    failText: dark ? '#fca5a5' : '#991b1b',

    tableBg: dark ? '#1a2236' : '#f8fafc',
    tableBorder: dark ? '#2d3e55' : '#e2e8f0',
    tableHeaderBg: dark ? '#0f172a' : '#f1f5f9',
    tableHeaderText: dark ? '#94a3b8' : '#64748b',
    tableRowBorder: dark ? '#1e293b' : '#f1f5f9',
    tableKeyText: dark ? '#cbd5e1' : '#475569',
    tableValueText: dark ? '#f8fafc' : '#0f172a',

    applyBtnBg: '#1db585',

    resetBtnBg: dark ? '#1e293b' : '#f8fafc',
    resetBtnBorder: dark ? '#334155' : '#e2e8f0',
    resetBtnText: dark ? '#cbd5e1' : '#64748b',

    errorBg: dark ? 'rgba(239,68,68,0.12)' : '#fef2f2',
    errorBorder: dark
      ? 'rgba(248,113,113,0.4)'
      : '#fecaca',

    errorText: dark ? '#fca5a5' : '#dc2626',

    pdfIconBg: dark
      ? 'rgba(239,68,68,0.14)'
      : '#fef2f2',

    pdfIconColor: dark ? '#f87171' : '#ef4444'
  };

  return (
    <SectionCard style={{ marginBottom: 20, overflow: 'hidden' }}>
      <div
        style={{
          padding: '16px 20px',
          background: c.headerBg,
          borderBottom: `1px solid ${c.headerBorder}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background:
              'linear-gradient(135deg, #6366f1, #1db585)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ScanLine size={18} color="#fff" />
        </div>

        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: c.titleColor
            }}
          >
            Scan Medical Report
          </div>

          <div
            style={{
              fontSize: 12,
              color: c.subtitleColor,
              marginTop: 2
            }}
          >
            Upload a medical PDF report to auto-fill fields
          </div>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {!file && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() =>
              fileInputRef.current?.click()
            }
            style={{
              border: `2px dashed ${dragActive
                ? c.dropBorderActive
                : c.dropBorder
                }`,
              borderRadius: 14,
              padding: '36px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragActive
                ? c.dropBgActive
                : c.dropBg
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={(e) =>
                handleFile(e.target.files[0])
              }
              style={{ display: 'none' }}
            />

            <Upload
              size={28}
              color={dark ? '#3ecba0' : '#1db585'}
            />

            <div
              style={{
                marginTop: 12,
                fontWeight: 500,
                color: c.dropText
              }}
            >
              Drop your medical PDF report here
            </div>

            <div
              style={{
                fontSize: 12,
                color: c.dropMuted,
                marginTop: 4
              }}
            >
              or click to browse
            </div>

            <div
              style={{
                fontSize: 11,
                color: c.dropHint,
                marginTop: 8
              }}
            >
              Supports: PDF only • Max 15 MB
            </div>
          </div>
        )}

        {file && !result && (
          <>
            <div
              style={{
                display: 'flex',
                gap: 12,
                padding: 14,
                background: c.fileBg,
                border: `1px solid ${c.fileBorder}`,
                borderRadius: 12,
                marginBottom: 14
              }}
            >
              <FileText
                size={24}
                color={c.pdfIconColor}
              />

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: 500,
                    color: c.fileText
                  }}
                >
                  {file.name}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: c.fileMuted
                  }}
                >
                  {(file.size / 1024).toFixed(0)} KB
                </div>
              </div>

              <button
                onClick={handleReset}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer'
                }}
              >
                <X size={16} color={c.xColor} />
              </button>
            </div>

            <button
              onClick={handleScan}
              disabled={loading}
              style={{
                width: '100%',
                padding: 12,
                border: 'none',
                borderRadius: 10,
                background: c.scanBtnBg,
                color: '#fff',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              {loading
                ? 'Extracting from PDF...'
                : 'Extract Data from Report'}
            </button>
          </>

        )}

        {result && (
          <div
            style={{
              marginTop: 14,
              animation: 'fade-in 0.4s ease'
            }}
          >
            {/* Extraction Status */}
            {(() => {
              const isPartial = error && result;
              const isError = error && !result;
              const isSuccess = !error && result;
              
              const statusBg = isError ? c.errorBg : isPartial ? '#fffbeb' : c.successBg;
              const statusBorder = isError ? c.errorBorder : isPartial ? '#fde68a' : c.successBorder;
              const statusText = isError ? c.errorText : isPartial ? '#92400e' : c.successText;
              const StatusIcon = isError ? AlertTriangle : isPartial ? AlertTriangle : CheckCircle;
              const statusTitle = isError ? 'Extraction Failed' : isPartial ? 'Extraction Incomplete' : 'Extraction Successful';

              return (
                <div
                  style={{
                    padding: '12px 16px',
                    background: statusBg,
                    border: `1px solid ${statusBorder}`,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 16
                  }}
                >
                  <StatusIcon size={20} color={statusText} />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: statusText
                      }}
                    >
                      {statusTitle}
                    </div>
                    {result && (
                      <div
                        style={{
                          fontSize: 12,
                          color: statusText,
                          opacity: 0.8
                        }}
                      >
                        {isPartial ? error : `Confidence: ${confidenceLabel} (${Math.round(result.confidence * 100)}%)`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Extracted Metrics Table */}
            {result.extracted && Object.keys(result.extracted).length > 0 && (
              <div
                style={{
                  background: c.tableBg,
                  border: `1px solid ${c.tableBorder}`,
                  borderRadius: 12,
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    padding: '10px 16px',
                    background: c.tableHeaderBg,
                    fontSize: 12,
                    fontWeight: 700,
                    color: c.tableHeaderText,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: `1px solid ${c.tableBorder}`
                  }}
                >
                  Extracted Metrics
                </div>

                <div style={{ padding: '8px 0' }}>
                  {Object.entries(result.extracted).map(([key, val], idx, arr) => (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '10px 16px',
                        borderBottom: idx === arr.length - 1 ? 'none' : `1px solid ${c.tableRowBorder}`
                      }}
                    >
                      <span style={{ fontSize: 13, color: c.tableKeyText, fontWeight: 500 }}>
                        {fieldLabels[key] || key}
                      </span>
                      <span style={{ fontSize: 13, color: c.tableValueText, fontWeight: 700 }}>
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reset Button */}
            <button
              onClick={handleReset}
              style={{
                width: '100%',
                marginTop: 16,
                padding: '10px',
                background: c.resetBtnBg,
                border: `1px solid ${c.resetBtnBorder}`,
                borderRadius: 10,
                color: c.resetBtnText,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Scan Another Report
            </button>
          </div>
        )}

      </div>
    </SectionCard>
  );
}