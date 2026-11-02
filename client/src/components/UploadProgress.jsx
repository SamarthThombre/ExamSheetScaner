import React, { useState, useRef } from 'react';
import api from '../api/axios';
import { UploadCloud, FileImage, FileText, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const UploadProgress = ({ batchId, onUploadComplete }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const fileInputRef = useRef(null);

  const isAcceptedFile = (f) => {
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
    const isPdfExt = f.name && f.name.toLowerCase().endsWith('.pdf');
    return validMimes.includes(f.type) || isPdfExt;
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const valid = files.filter(isAcceptedFile);
      if (valid.length < files.length) {
        setError('Some files were ignored because only JPEG, PNG, WebP, and PDF files are allowed.');
      }
      setSelectedFiles((prev) => [...prev, ...valid]);
      setError(null);
      setSuccessMsg(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    const validFiles = files.filter(isAcceptedFile);

    if (validFiles.length < files.length) {
      setError('Some files were ignored because only JPEG, PNG, WebP, and PDF documents are allowed.');
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      setError(null);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one sheet image or PDF document to upload.');
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    console.log(`[Upload Pipeline] Starting upload of ${selectedFiles.length} file(s) for Batch ${batchId}:`, selectedFiles.map(f => ({ name: f.name, size: `${(f.size / 1024).toFixed(1)} KB`, type: f.type })));

    try {
      setUploading(true);
      setError(null);
      setProgress(15);

      const res = await api.post(`/batches/${batchId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          console.log(`[Upload Pipeline] Transfer progress: ${percentCompleted}%`);
          setProgress(Math.min(percentCompleted, 90));
        }
      });

      console.log(`[Upload Pipeline] Server response received:`, res.data);
      setProgress(100);
      setSuccessMsg(`Successfully processed and evaluated ${res.data?.count || selectedFiles.length} answer sheets!`);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (onUploadComplete) {
        onUploadComplete(res.data);
      }
    } catch (err) {
      console.error(`[Upload Pipeline ERROR] Upload failed:`, err);
      const errMsg = err.response?.data?.message || err.message || 'Upload and OCR evaluation failed. Please try again.';
      setError(errMsg);
    } finally {
      setUploading(false);
    }
  };

  const pdfCount = selectedFiles.filter((f) => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf').length;
  const imgCount = selectedFiles.length - pdfCount;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-base font-bold text-slate-900 mb-1">Upload Answer Sheet Scans & PDFs</h3>
      <p className="text-xs text-slate-500 mb-4">
        Upload scanned front covers (A/B format) or multi-page exam sheet PDFs to automatically extract enrolment numbers, question marks, and run sum-checks.
      </p>

      {error && (
        <div className="mb-4 flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/50 rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
      >
        <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">
            Click to browse or drag and drop scans or PDF here
          </p>
          <p className="text-xs text-slate-500 mt-0.5">JPEG, PNG, WebP, or multi-page PDF up to 50MB</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Selected File List */}
      {selectedFiles.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Selected Files ({selectedFiles.length})
            </span>
            <button
              type="button"
              onClick={() => setSelectedFiles([])}
              className="text-xs text-slate-500 hover:text-red-600 transition"
            >
              Clear all
            </button>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {selectedFiles.map((file, idx) => {
              const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
              return (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    {isPdf ? (
                      <span className="flex items-center gap-1 shrink-0">
                        <FileText className="w-4 h-4 text-rose-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 px-1 py-0.2 rounded">PDF</span>
                      </span>
                    ) : (
                      <FileImage className="w-4 h-4 text-indigo-500 shrink-0" />
                    )}
                    <span className="truncate text-slate-700 font-medium">{file.name}</span>
                    <span className="text-slate-400 text-[11px] shrink-0">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-slate-400 hover:text-red-500 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  Extracting pages & analyzing with OCR pipeline...
                </span>
                <span className="font-semibold">{progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={uploading}
              onClick={handleUpload}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-xl text-xs shadow-sm transition flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Files & OCR...</span>
                </>
              ) : (
                `Process ${
                  pdfCount > 0 && imgCount > 0
                    ? `${pdfCount} PDF & ${imgCount} Scan${imgCount > 1 ? 's' : ''}`
                    : pdfCount > 0
                    ? `${pdfCount} PDF Document${pdfCount > 1 ? 's' : ''}`
                    : `${selectedFiles.length} Scan${selectedFiles.length > 1 ? 's' : ''}`
                }`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadProgress;
