import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import StatusChip from '../../components/StatusChip';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  FileImage,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  User,
  X,
  MessageSquare,
  BookOpen,
  Calendar
} from 'lucide-react';

const issueTypeLabels = {
  marks_mismatch: 'Marks Mismatch',
  missing_question: 'Missing Question',
  incorrect_enrolment: 'Incorrect Enrolment',
  re_evaluation: 'Re-evaluation',
  other: 'Other'
};

const issueTypeBadgeColors = {
  marks_mismatch: 'bg-rose-50 text-rose-700 border-rose-200',
  missing_question: 'bg-amber-50 text-amber-700 border-amber-200',
  incorrect_enrolment: 'bg-purple-50 text-purple-700 border-purple-200',
  re_evaluation: 'bg-blue-50 text-blue-700 border-blue-200',
  other: 'bg-slate-100 text-slate-700 border-slate-200'
};

const IssuesPage = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIssue, setSelectedIssue] = useState(null);

  // Modal form state
  const [modalStatus, setModalStatus] = useState('in_review');
  const [modalResponse, setModalResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalSuccess, setModalSuccess] = useState(null);

  // Auxiliary state for loaded sheet scan
  const [sheetImageLoading, setSheetImageLoading] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState(null);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/issues/teacher');
      const data = res.data?.data || res.data || [];
      setIssues(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load student grievances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  // When an issue is selected for review
  const handleOpenReview = async (issue) => {
    setSelectedIssue(issue);
    setModalStatus(issue.status || 'in_review');
    setModalResponse(issue.teacherResponse || '');
    setModalError(null);
    setModalSuccess(null);

    // Determine sheet image URL
    let imgPath = issue.sheet?.imageUrl || issue.sheet?.localImagePath;
    if (imgPath) {
      setModalImageUrl(imgPath);
    } else if (issue.sheet?._id || (typeof issue.sheet === 'string' && issue.sheet.length > 10)) {
      // Fallback: fetch full sheet details if image URL wasn't projected
      const sheetId = issue.sheet._id || issue.sheet;
      setSheetImageLoading(true);
      try {
        const sheetRes = await api.get(`/results/${sheetId}`);
        const fullSheet = sheetRes.data?.data?.sheet || sheetRes.data?.sheet;
        if (fullSheet?.imageUrl || fullSheet?.localImagePath) {
          setModalImageUrl(fullSheet.imageUrl || fullSheet.localImagePath);
        } else {
          setModalImageUrl(null);
        }
      } catch (e) {
        setModalImageUrl(null);
      } finally {
        setSheetImageLoading(false);
      }
    } else {
      setModalImageUrl(null);
    }
  };

  const handleCloseModal = () => {
    setSelectedIssue(null);
    setModalImageUrl(null);
    setModalError(null);
    setModalSuccess(null);
  };

  const handleSubmitResolution = async (e) => {
    e.preventDefault();
    if (!selectedIssue) return;

    if (
      (modalStatus === 'resolved' || modalStatus === 'rejected') &&
      !modalResponse.trim()
    ) {
      setModalError('Please provide a feedback note explaining your decision before resolving or rejecting.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError(null);

      const res = await api.put(`/issues/${selectedIssue._id}`, {
        status: modalStatus,
        teacherResponse: modalResponse.trim()
      });

      const updated = res.data?.data || res.data;

      // Update in local state
      setIssues((prev) =>
        prev.map((item) => (item._id === selectedIssue._id ? { ...item, ...updated } : item))
      );
      setSelectedIssue((prev) => ({ ...prev, ...updated }));
      setModalSuccess('Grievance status updated successfully!');

      setTimeout(() => {
        handleCloseModal();
      }, 1000);
    } catch (err) {
      setModalError(err.message || 'Failed to update grievance status');
    } finally {
      setSubmitting(false);
    }
  };

  // Metric counts
  const pendingCount = issues.filter((i) => i.status === 'pending').length;
  const inReviewCount = issues.filter((i) => i.status === 'in_review').length;
  const resolvedCount = issues.filter((i) => i.status === 'resolved').length;
  const rejectedCount = issues.filter((i) => i.status === 'rejected').length;
  const openCount = pendingCount + inReviewCount;

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    // Tab filter
    if (activeTab === 'pending' && issue.status !== 'pending') return false;
    if (activeTab === 'in_review' && issue.status !== 'in_review') return false;
    if (activeTab === 'resolved' && issue.status !== 'resolved') return false;
    if (activeTab === 'rejected' && issue.status !== 'rejected') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const studentName = issue.student?.name?.toLowerCase() || '';
      const roll = issue.studentRoll?.toLowerCase() || '';
      const subject = issue.subjectCode?.toLowerCase() || '';
      const desc = issue.description?.toLowerCase() || '';
      return (
        studentName.includes(q) ||
        roll.includes(q) ||
        subject.includes(q) ||
        desc.includes(q)
      );
    }
    return true;
  });

  // Image absolute path resolution
  const resolvedImageSrc = modalImageUrl
    ? modalImageUrl.startsWith('http')
      ? modalImageUrl
      : `http://localhost:5000${modalImageUrl}`
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Student Grievances</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              {openCount} Open Issue{openCount !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review re-evaluation requests, investigate score discrepancies against original answer sheet scans, and submit official corrections.
          </p>
        </div>

        <button
          onClick={fetchIssues}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs & Search Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All', count: issues.length },
            { id: 'pending', label: 'Pending', count: pendingCount },
            { id: 'in_review', label: 'In Review', count: inReviewCount },
            { id: 'resolved', label: 'Resolved', count: resolvedCount },
            { id: 'rejected', label: 'Rejected', count: rejectedCount }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === tab.id ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by student, roll, or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <div>
            <p className="font-bold">Failed to load grievances</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Issues Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-xs font-medium">Loading student grievances...</p>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No grievances filed yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            {activeTab !== 'all' || searchQuery
              ? 'No issues match the selected filter or search term. Try resetting the filters.'
              : 'Students can report score discrepancies directly from their Student Portal. New submissions will appear here.'}
          </p>
          {(activeTab !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setActiveTab('all');
                setSearchQuery('');
              }}
              className="mt-4 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Roll Number</th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">Issue Type</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date Raised</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredIssues.map((issue) => (
                  <tr
                    key={issue._id}
                    className="hover:bg-slate-50/80 transition cursor-pointer group"
                    onClick={() => handleOpenReview(issue)}
                  >
                    {/* Student Name */}
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {issue.student?.name ? issue.student.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div className="truncate max-w-[150px]">
                          <p className="truncate font-semibold">{issue.student?.name || 'Student'}</p>
                          <p className="text-[10px] text-slate-400 truncate">{issue.student?.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Roll No */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      {issue.studentRoll || 'N/A'}
                    </td>

                    {/* Subject */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {issue.subjectCode}
                      </span>
                    </td>

                    {/* Issue Type */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-semibold text-[11px] border ${
                          issueTypeBadgeColors[issue.issueType] || 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {issueTypeLabels[issue.issueType] || issue.issueType}
                      </span>
                    </td>

                    {/* Description (Truncated) */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="line-clamp-2 text-slate-600 font-normal">
                        {issue.description}
                      </p>
                    </td>

                    {/* Status Chip */}
                    <td className="py-3.5 px-4">
                      <StatusChip status={issue.status} size="xs" />
                    </td>

                    {/* Date Raised */}
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(issue.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenReview(issue)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200 transition"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review & Resolve Modal (Split Pane) */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-md">
                  Grievance #{selectedIssue._id.slice(-6).toUpperCase()}
                </span>
                <StatusChip status={selectedIssue.status} size="xs" />
                <h3 className="text-sm font-bold text-slate-900">
                  Review & Resolve Student Grievance
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Split Pane */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 overflow-y-auto flex-1">
              {/* Left Column: Physical Scanned Exam Paper */}
              <div className="p-5 bg-slate-900/5 flex flex-col items-center justify-start overflow-hidden min-h-[380px]">
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <FileImage className="w-4 h-4 text-indigo-600" />
                    <span>Physical Exam Paper Scan</span>
                  </span>
                  {resolvedImageSrc && (
                    <a
                      href={resolvedImageSrc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      <span>Open Full Size</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {sheetImageLoading ? (
                  <div className="w-full flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                    <p className="text-xs">Locating answer paper scan...</p>
                  </div>
                ) : resolvedImageSrc ? (
                  <div className="w-full flex-1 flex items-center justify-center bg-slate-950/5 rounded-xl border border-slate-200 p-2 overflow-auto max-h-[480px]">
                    <img
                      src={resolvedImageSrc}
                      alt="Student Answer Sheet Scan"
                      className="max-h-[460px] w-auto object-contain rounded shadow-sm hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div style={{ display: 'none' }} className="flex-col items-center justify-center p-8 text-slate-400 text-center">
                      <FileImage className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold">Paper scan not stored on server</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
                    <FileImage className="w-12 h-12 text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-700">Scan Image Not Attached</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                      The student submitted a general subject inquiry or the paper was evaluated via batch code without direct image binding.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Grievance Details & Resolution Form */}
              <div className="p-5 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-4">
                  {/* Status Alerts */}
                  {modalError && (
                    <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                      <span>{modalError}</span>
                    </div>
                  )}

                  {modalSuccess && (
                    <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                      <span>{modalSuccess}</span>
                    </div>
                  )}

                  {/* Student & Academic Summary Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Student Name</span>
                        <p className="font-bold text-slate-800">{selectedIssue.student?.name || 'Student'}</p>
                        <p className="text-[11px] text-slate-500">{selectedIssue.student?.email}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Roll Number</span>
                        <p className="font-mono font-bold text-slate-900">{selectedIssue.studentRoll}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Subject Code</span>
                        <p className="font-mono font-bold text-indigo-700">{selectedIssue.subjectCode}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Batch / Exam</span>
                        <p className="font-semibold text-slate-700 truncate">
                          {selectedIssue.batch?.examName || 'Assigned Exam'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Grievance Category</span>
                        <div className="mt-0.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full font-semibold text-[11px] border ${
                              issueTypeBadgeColors[selectedIssue.issueType] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {issueTypeLabels[selectedIssue.issueType] || selectedIssue.issueType}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Filed Date</span>
                        <p className="text-[11px] text-slate-600">
                          {new Date(selectedIssue.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Student's Full Explanation */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Student Explanation
                    </label>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner">
                      {selectedIssue.description}
                    </div>
                  </div>

                  {/* Resolution Form */}
                  <form id="resolution-form" onSubmit={handleSubmitResolution} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Update Status
                      </label>
                      <select
                        value={modalStatus}
                        onChange={(e) => setModalStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="pending">Pending (Unreviewed)</option>
                        <option value="in_review">In Review (Investigating Paper)</option>
                        <option value="resolved">Resolved (Marks Adjusted / Verified)</option>
                        <option value="rejected">Rejected (No Discrepancy Found)</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Teacher Response Note
                        </label>
                        {(modalStatus === 'resolved' || modalStatus === 'rejected') && (
                          <span className="text-[10px] font-bold text-rose-500 uppercase">Required</span>
                        )}
                      </div>
                      <textarea
                        rows={3}
                        value={modalResponse}
                        onChange={(e) => setModalResponse(e.target.value)}
                        placeholder="Provide details of your review (e.g. 'Re-evaluated Q3: marks corrected from 8 to 12. Total updated.')"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>
                  </form>
                </div>

                {/* Modal Footer Controls */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="resolution-form"
                    disabled={submitting}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Update Issue</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssuesPage;
