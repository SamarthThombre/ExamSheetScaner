import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  X,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  School,
  User,
  Hash,
  Mail,
  HelpCircle,
  FileText
} from 'lucide-react';

const AccessRequestModal = ({
  isOpen,
  onClose,
  initialCollegeCode = '',
  initialEnrolmentNo = '',
  initialEmail = '',
  initialName = '',
  initialReasonType = 'missing_roster'
}) => {
  const [formData, setFormData] = useState({
    collegeCode: initialCollegeCode || '',
    name: initialName || '',
    enrolmentNo: initialEnrolmentNo || '',
    email: initialEmail || '',
    requestType: initialReasonType || 'missing_roster',
    departmentName: '',
    reason: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        collegeCode: initialCollegeCode || '',
        name: initialName || '',
        enrolmentNo: initialEnrolmentNo || '',
        email: initialEmail || '',
        requestType: initialReasonType || 'missing_roster',
        departmentName: '',
        reason: ''
      });
      setError(null);
      setSuccessData(null);
    }
  }, [isOpen, initialCollegeCode, initialEnrolmentNo, initialEmail, initialName, initialReasonType]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.collegeCode || !formData.name || !formData.enrolmentNo || !formData.email) {
      setError('Please fill in all required fields (College Code, Name, Enrolment ID, and Email).');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/access-requests', formData);
      if (res.data?.success) {
        setSuccessData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit access request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-indigo-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h3 className="text-base font-bold">Request Roster Access / Correction</h3>
              <p className="text-xs text-indigo-200">
                Submit an issue to your College Administrator to update your roster details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {successData ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Access Request Submitted!</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto mt-1">
                  {successData.message ||
                    'Your request has been forwarded to your College Administrator. Once approved, you will be able to register or sign in immediately.'}
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-1.5 font-mono">
                <div>
                  <span className="text-slate-400">Enrolment ID:</span>{' '}
                  <strong className="text-slate-800">{formData.enrolmentNo.toUpperCase()}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Target Email:</span>{' '}
                  <strong className="text-slate-800">{formData.email.toLowerCase()}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>{' '}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    PENDING ADMIN APPROVAL
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-sm"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* College Code & Enrolment No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    College Code <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <School className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      name="collegeCode"
                      value={formData.collegeCode}
                      onChange={handleChange}
                      placeholder="e.g. SGS"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs uppercase font-mono font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enrolment / Roll No <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      name="enrolmentNo"
                      value={formData.enrolmentNo}
                      onChange={handleChange}
                      placeholder="e.g. 0801CA231001"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs uppercase font-mono font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Student Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Student Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name as per college records"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address To Bind <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter the email you want to register / sign in with"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Once approved, your enrollment ID will be strictly locked to this email address.
                </p>
              </div>

              {/* Issue Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  What is the issue? <span className="text-red-500">*</span>
                </label>
                <select
                  name="requestType"
                  value={formData.requestType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="missing_roster">I am not found in the official college roster</option>
                  <option value="email_mismatch">My email is mismatched with the roster record</option>
                  <option value="department_change">My branch / department details are incorrect</option>
                  <option value="other">Other issue</option>
                </select>
              </div>

              {/* Branch / Department Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Branch / Department (Optional)
                </label>
                <input
                  type="text"
                  name="departmentName"
                  value={formData.departmentName}
                  onChange={handleChange}
                  placeholder="e.g. Computer Applications (MCA) or CSE"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Additional Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Message / Remarks to College Administrator
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    rows="2"
                    placeholder="Provide admission year, transfer context, or details to help admin verify you quickly..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccessRequestModal;
