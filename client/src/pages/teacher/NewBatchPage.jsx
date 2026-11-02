import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Layers, ArrowLeft, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';

const NewBatchPage = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    examName: '',
    subjectCode: '',
    coMaxMarks: 14,
    coThresholdHigh: 65,
    coThresholdMid: 50
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const isTeacher = user?.role === 'teacher';
  const assignedSubjects = user?.assignedSubjects || [];
  const hasNoSubjects = isTeacher && assignedSubjects.length === 0;

  // Set default subject if available
  useEffect(() => {
    if (assignedSubjects.length > 0 && !formData.subjectCode) {
      setFormData((prev) => ({ ...prev, subjectCode: assignedSubjects[0] }));
    }
  }, [assignedSubjects]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.examName.trim() || !formData.subjectCode.trim()) {
      setError('Please provide both an exam name and a subject code.');
      return;
    }

    if (isTeacher && !assignedSubjects.includes(formData.subjectCode.trim().toUpperCase())) {
      setError(`You are not authorized to evaluate subject ${formData.subjectCode}. Only assigned subjects are allowed.`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/batches', {
        examName: formData.examName.trim(),
        subjectCode: formData.subjectCode.trim().toUpperCase(),
        coMaxMarks: Number(formData.coMaxMarks) || 14,
        coThresholdHigh: Number(formData.coThresholdHigh) || 65,
        coThresholdMid: Number(formData.coThresholdMid) || 50
      });

      if (res.data?.success) {
        navigate(`/batches/${res.data.data._id}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to create exam batch.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Link
        to="/batches"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Create New Evaluation Batch
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Set up an exam container to upload and process physical answer sheets
            </p>
          </div>
        </div>

        {hasNoSubjects && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-bold">No Subjects Assigned</p>
              <p className="mt-0.5">
                Your account has not yet been assigned to any subjects by your College Administrator. You cannot create batches until you have been assigned to at least one subject.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Exam Name
            </label>
            <input
              type="text"
              name="examName"
              value={formData.examName}
              onChange={handleChange}
              placeholder="e.g. Midterm Evaluation 2026"
              required
              disabled={hasNoSubjects}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Subject Code
            </label>

            {isTeacher && assignedSubjects.length > 0 ? (
              <select
                name="subjectCode"
                value={formData.subjectCode}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              >
                {assignedSubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                name="subjectCode"
                value={formData.subjectCode}
                onChange={handleChange}
                placeholder="e.g. PHY101 or CT10718"
                required
                disabled={hasNoSubjects}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-60"
              />
            )}

            <p className="text-xs text-slate-500 mt-1">
              Used by the OCR service to verify sheet headers against the exam subject.
            </p>
          </div>

          {/* CO Attainment Configuration */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Course Outcome (CO) Attainment Settings
              </span>
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                Formula: % = (OB / T) × 100
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Target Marks (T)
                </label>
                <input
                  type="number"
                  name="coMaxMarks"
                  min="1"
                  max="100"
                  value={formData.coMaxMarks}
                  onChange={handleChange}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400">Default: 14 marks</span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  High Threshold (%)
                </label>
                <input
                  type="number"
                  name="coThresholdHigh"
                  min="1"
                  max="100"
                  value={formData.coThresholdHigh}
                  onChange={handleChange}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400">Lvl 3 if &gt; {formData.coThresholdHigh}%</span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Mid Threshold (%)
                </label>
                <input
                  type="number"
                  name="coThresholdMid"
                  min="1"
                  max="100"
                  value={formData.coThresholdMid}
                  onChange={handleChange}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400">Lvl 2 if &ge; {formData.coThresholdMid}%, else 1</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              to="/batches"
              className="px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || hasNoSubjects}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-100 transition flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Batch...</span>
                </>
              ) : (
                'Create Batch & Proceed'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewBatchPage;
