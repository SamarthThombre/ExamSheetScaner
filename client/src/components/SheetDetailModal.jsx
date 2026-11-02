import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import StatusChip from './StatusChip';
import {
  X,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Trash2,
  FileImage,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

const SheetDetailModal = ({
  sheet,
  batchId,
  isOpen,
  onClose,
  onSheetUpdated,
  onSheetDeleted,
  onNextSheet,
  onPrevSheet,
  hasNext = false,
  hasPrev = false,
  currentIndex = 0,
  totalCount = 0
}) => {
  const [formData, setFormData] = useState({
    enrolment: '',
    totalMarks: '',
    q1: '',
    q2: '',
    q3: '',
    q4: '',
    q5: ''
  });
  const [saving, setSaving] = useState(false);
  const [saveAction, setSaveAction] = useState(null); // 'verify' | 'next'
  const [error, setError] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (sheet) {
      setFormData({
        enrolment: sheet.enrolment || '',
        totalMarks: sheet.totalMarks != null ? String(sheet.totalMarks) : '',
        q1: sheet.q1 != null ? String(sheet.q1) : '',
        q2: sheet.q2 != null ? String(sheet.q2) : '',
        q3: sheet.q3 != null ? String(sheet.q3) : '',
        q4: sheet.q4 != null ? String(sheet.q4) : '',
        q5: sheet.q5 != null ? String(sheet.q5) : ''
      });
      setError(null);
      setIsZoomed(false);
    }
  }, [sheet]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input unless with modifier key
      const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);

      if (e.key === 'Escape') {
        onClose();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        if (hasNext && onNextSheet) onNextSheet();
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        if (hasPrev && onPrevSheet) onPrevSheet();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave(e, true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasNext, hasPrev, onNextSheet, onPrevSheet, formData, sheet]);

  if (!isOpen || !sheet) return null;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async (e, andNext = false) => {
    if (e && e.preventDefault) e.preventDefault();
    setError(null);

    try {
      setSaving(true);
      setSaveAction(andNext ? 'next' : 'verify');

      const payload = {
        enrolment: formData.enrolment.trim(),
        totalMarks: formData.totalMarks !== '' ? formData.totalMarks : null,
        q1: formData.q1 !== '' ? formData.q1 : null,
        q2: formData.q2 !== '' ? formData.q2 : null,
        q3: formData.q3 !== '' ? formData.q3 : null,
        q4: formData.q4 !== '' ? formData.q4 : null,
        q5: formData.q5 !== '' ? formData.q5 : null,
        statusLabel: 'OK' // Mark as verified upon saving / confirming
      };

      const res = await api.put(`/batches/${batchId}/sheets/${sheet._id}`, payload);
      if (res.data?.success) {
        const updated = res.data.data;
        if (onSheetUpdated) {
          onSheetUpdated(updated, andNext);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to update sheet details.');
    } finally {
      setSaving(false);
      setSaveAction(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete sheet #${sheet.orderIndex} (${sheet.enrolment || 'Unread'})?`)) return;
    try {
      setSaving(true);
      const res = await api.delete(`/batches/${batchId}/sheets/${sheet._id}`);
      if (res.data?.success) {
        if (onSheetDeleted) onSheetDeleted(sheet._id);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to delete sheet.');
    } finally {
      setSaving(false);
    }
  };

  // Live Q sum calculation
  const qSum = ['q1', 'q2', 'q3', 'q4', 'q5'].reduce((sum, key) => {
    const val = parseFloat(formData[key]);
    return !isNaN(val) ? sum + val : sum;
  }, 0);
  const totalNum = parseFloat(formData.totalMarks);
  const hasTotal = formData.totalMarks !== '' && !isNaN(totalNum);
  const isSumMatching = hasTotal && Math.abs(qSum - totalNum) < 0.01;

  const confidencePct = Math.round((sheet.enrolmentConf || 0) * 100);

  // Construct image URL (relative to server origin)
  const imageRawPath = sheet.imageUrl || sheet.localImagePath;
  const imageSrc = imageRawPath
    ? (imageRawPath.startsWith('http') ? imageRawPath : `http://localhost:5000${imageRawPath}`)
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
              Sheet #{sheet.orderIndex}
            </span>
            <StatusChip status={sheet.statusLabel} size="xs" />
            {totalCount > 0 && (
              <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full shadow-2xs">
                {currentIndex + 1} of {totalCount}
              </span>
            )}
            <h3 className="text-sm font-bold text-slate-900 hidden md:inline ml-1">
              Evaluate Answer Sheet
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Navigation in Header */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={onPrevSheet}
                disabled={!hasPrev || saving}
                title="Previous Sheet (Alt + Left)"
                className="p-1 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono font-bold text-slate-600 px-1.5 select-none">
                {currentIndex + 1}/{totalCount || '—'}
              </span>
              <button
                type="button"
                onClick={onNextSheet}
                disabled={!hasNext || saving}
                title="Next Sheet (Alt + Right)"
                className="p-1 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - 2 Columns (Image Preview Left, Form Right) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Left Column: Physical Scanned Paper Image */}
          <div className="p-4 sm:p-5 bg-slate-900/5 flex flex-col items-center justify-start overflow-hidden min-h-[380px]">
            <div className="w-full flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <FileImage className="w-4 h-4 text-indigo-600" />
                <span>Physical Exam Sheet Scan</span>
              </span>
              <div className="flex items-center gap-2">
                {imageSrc && (
                  <button
                    type="button"
                    onClick={() => setIsZoomed(!isZoomed)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs transition"
                  >
                    {isZoomed ? <ZoomOut className="w-3 h-3" /> : <ZoomIn className="w-3 h-3" />}
                    <span>{isZoomed ? 'Reset Zoom' : 'Zoom'}</span>
                  </button>
                )}
                {imageSrc && (
                  <a
                    href={imageSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>Full Size</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {imageSrc ? (
              <div className="w-full flex-1 flex items-center justify-center bg-slate-950/5 rounded-xl border border-slate-200 p-2 overflow-auto max-h-[500px]">
                <img
                  src={imageSrc}
                  alt={`Sheet scan ${sheet.orderIndex}`}
                  onClick={() => setIsZoomed(!isZoomed)}
                  className={`w-auto object-contain rounded shadow-sm transition-transform duration-200 cursor-pointer ${
                    isZoomed ? 'scale-150 my-16' : 'max-h-[480px] hover:scale-[1.02]'
                  }`}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div style={{ display: 'none' }} className="flex-col items-center justify-center p-8 text-slate-400 text-center">
                  <FileImage className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold">Image file not accessible on server</p>
                </div>
              </div>
            ) : (
              <div className="w-full flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
                <FileImage className="w-12 h-12 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">Scan Image Archived</p>
                <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                  The original scan was processed. Scanned papers are displayed side-by-side for instant verification.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: OCR Extraction & Correction Form */}
          <div className="p-4 sm:p-5 flex flex-col justify-between">
            <form onSubmit={(e) => handleSave(e, false)} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* OCR Context Banner */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    OCR Confidence
                  </span>
                  <span className="text-xs font-black text-slate-800">{confidencePct}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Sum Agreement
                  </span>
                  <span
                    className={`text-xs font-black ${
                      isSumMatching || sheet.sumCheck === 'AGREE'
                        ? 'text-emerald-600'
                        : sheet.sumCheck === 'MISMATCH'
                        ? 'text-red-600'
                        : 'text-slate-500'
                    }`}
                  >
                    {isSumMatching ? 'AGREE' : sheet.sumCheck || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Layout
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    Type {sheet.formatId || 'Standard'}
                  </span>
                </div>
              </div>

              {sheet.reviewReasons?.length > 0 && (
                <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <span className="text-[11px] font-bold text-amber-800 block mb-1">
                    Review Flags:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {sheet.reviewReasons.map((reason, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 font-mono rounded font-semibold"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Editable Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student Enrolment / Roll #
                  </label>
                  <input
                    type="text"
                    name="enrolment"
                    value={formData.enrolment}
                    onChange={handleChange}
                    placeholder="e.g. 0801CA251001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Total Marks Awarded
                    </label>
                    {hasTotal && (
                      <span
                        className={`text-[10px] font-mono font-bold ${
                          isSumMatching ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        Sum: {qSum}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    name="totalMarks"
                    value={formData.totalMarks}
                    onChange={handleChange}
                    placeholder="e.g. 54"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Question Marks Breakdown Q1 - Q5 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Question-Wise Marks (Q1 – Q5)
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {['q1', 'q2', 'q3', 'q4', 'q5'].map((qKey, index) => (
                    <div key={qKey} className="text-center">
                      <span className="block text-[11px] font-bold text-slate-400 mb-1">
                        Q{index + 1}
                      </span>
                      <input
                        type="text"
                        name={qKey}
                        value={formData[qKey]}
                        onChange={handleChange}
                        placeholder="—"
                        className="w-full px-1 py-1.5 text-center bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span>Leave blank for unattempted. Decimals supported (e.g. 8.5).</span>
                  <span className="font-mono font-semibold text-slate-600">Q Sum = {qSum}</span>
                </div>
              </div>

              {/* Verification Hint */}
              <div className="p-2.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-center gap-2 text-emerald-800 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Saving or confirming marks finalizes evaluation and automatically transitions status to <strong>Verified</strong>.
                </span>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>

                  {hasNext && (
                    <button
                      type="button"
                      onClick={onNextSheet}
                      disabled={saving}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition"
                      title="Skip to next sheet without saving changes"
                    >
                      <span>Next Sheet</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleSave(e, false)}
                    disabled={saving}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                    title="Save changes and mark as Verified"
                  >
                    {saving && saveAction === 'verify' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>Save & Verify</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleSave(e, true)}
                    disabled={saving}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                    title="Save changes, mark Verified, and move to next sheet (Ctrl + Enter)"
                  >
                    {saving && saveAction === 'next' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                    <span>{hasNext ? 'Save & Next' : 'Save & Finish'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SheetDetailModal;
