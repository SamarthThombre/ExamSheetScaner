import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import BatchCard from '../../components/BatchCard';
import {
  Plus,
  Search,
  Filter,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  MessageSquare,
  Send,
  ExternalLink,
  Edit2,
  School,
  FolderTree,
  BookOpen
} from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('batches'); // 'batches' | 'issues'

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Grievances State
  const [issues, setIssues] = useState([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [replyText, setReplyText] = useState({});
  const [statusChoice, setStatusChoice] = useState({});
  const [updatingIssueId, setUpdatingIssueId] = useState(null);

  // Filters & Pagination for Batches
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: 12
      };
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/batches', { params });
      if (res.data?.success) {
        setBatches(res.data.data || []);
        setTotal(res.data.total || 0);
        setPages(res.data.pages || 1);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch batches');
    } finally {
      setLoading(false);
    }
  };

  const fetchIssues = async () => {
    try {
      setLoadingIssues(true);
      const res = await api.get('/issues/teacher');
      if (res.data?.success) {
        setIssues(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch teacher issues:', err);
    } finally {
      setLoadingIssues(false);
    }
  };

  useEffect(() => {
    fetchBatches();
    fetchIssues();
  }, [page, statusFilter]);

  const handleDelete = async (batchId, examName) => {
    if (!window.confirm(`Are you sure you want to delete "${examName}" and all its evaluated sheets?`)) {
      return;
    }

    try {
      await api.delete(`/batches/${batchId}`);
      setBatches((prev) => prev.filter((b) => b._id !== batchId));
      setTotal((prev) => Math.max(prev - 1, 0));
    } catch (err) {
      alert(`Error deleting batch: ${err.message}`);
    }
  };

  const handleUpdateIssue = async (issueId) => {
    try {
      setUpdatingIssueId(issueId);
      const status = statusChoice[issueId] || 'resolved';
      const teacherResponse = replyText[issueId] || '';

      const res = await api.put(`/issues/${issueId}`, {
        status,
        teacherResponse
      });

      if (res.data?.success) {
        setIssues((prev) =>
          prev.map((i) => (i._id === issueId ? res.data.data : i))
        );
      }
    } catch (err) {
      alert(`Failed to update issue: ${err.message}`);
    } finally {
      setUpdatingIssueId(null);
    }
  };

  // Client search filter on current page
  const filteredBatches = batches.filter((b) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.examName?.toLowerCase().includes(term) ||
      b.subjectCode?.toLowerCase().includes(term)
    );
  });

  const totalSheetsEvaluated = batches.reduce((acc, b) => acc + (b.totalSheets || 0), 0);
  const totalFlaggedForReview = batches.reduce(
    (acc, b) => acc + (b.checkCount || 0) + (b.rescanCount || 0),
    0
  );

  const pendingIssuesCount = issues.filter((i) => i.status === 'pending').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Institutional Banner: College & Department */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
            <School className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-mono text-xs font-bold rounded-md uppercase">
                {user?.college?.code || 'INSTITUTION'}
              </span>
              <span className="text-xs font-bold text-slate-800">
                {user?.college?.name || 'Institution Campus'}
              </span>
              <span className="text-slate-300">&bull;</span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md flex items-center gap-1">
                <FolderTree className="w-3.5 h-3.5" />
                <span>
                  Branch: {user?.department?.name || user?.department?.code || 'General Department'}
                </span>
              </span>
            </div>

            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {user?.name || 'Faculty Evaluation Dashboard'}
            </h1>

            <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-600 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>Assigned Subjects:</span>
              </span>
              {(user?.assignedSubjects || []).length > 0 ? (
                user.assignedSubjects.map((sub) => (
                  <span
                    key={sub}
                    className="px-2 py-0.5 bg-indigo-50/70 border border-indigo-200 text-indigo-700 font-mono font-bold text-[11px] rounded"
                  >
                    {sub}
                  </span>
                ))
              ) : (
                <span className="text-amber-600 font-medium italic">
                  No subjects assigned yet (Contact College Admin)
                </span>
              )}
            </div>
          </div>
        </div>

        <Link
          to="/batches/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-100 transition self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Batch</span>
        </Link>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Total Batches
            </span>
            <span className="text-2xl font-black text-slate-900">{total}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">
              Sheets Processed
            </span>
            <span className="text-2xl font-black text-slate-900">{totalSheetsEvaluated}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider block">
              Flagged Sheets
            </span>
            <span className="text-2xl font-black text-slate-900">{totalFlaggedForReview}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider block">
              Student Grievances
            </span>
            <span className="text-2xl font-black text-purple-600">{issues.length}</span>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-4">
        <button
          onClick={() => setActiveTab('batches')}
          className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'batches'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>My Evaluation Batches ({batches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('issues')}
          className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'issues'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Student Inquiries & Grievances</span>
          {pendingIssuesCount > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 font-bold rounded-full text-[10px]">
              {pendingIssuesCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'batches' ? (
        <>
          {/* Filter and Search Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Status Filters */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: '', label: 'All' },
                { id: 'draft', label: 'Draft' },
                { id: 'processing', label: 'Processing' },
                { id: 'done', label: 'Ready' },
                { id: 'published', label: 'Published' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                    statusFilter === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by exam or subject..."
                className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          {/* Batch Cards Grid */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-500">Loading your evaluation batches...</p>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900">No evaluation batches found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
                {searchTerm || statusFilter
                  ? 'No batches match your search or filter criteria.'
                  : 'Create your first exam batch to begin uploading student answer sheets for OCR processing.'}
              </p>
              <Link
                to="/batches/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-indigo-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Batch</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBatches.map((batch) => (
                <BatchCard key={batch._id} batch={batch} onDelete={handleDelete} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: pages }).map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                    page === i + 1
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Grievances Panel */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Student Inquiries & Mark Discrepancies</h2>
              <p className="text-xs text-slate-500">
                Review complaints submitted by students on evaluated answer sheets.
              </p>
            </div>
          </div>

          {loadingIssues ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : issues.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No grievances filed by students under your batches.
            </div>
          ) : (
            <div className="space-y-4">
              {issues.map((iss) => (
                <div
                  key={iss._id}
                  className="p-5 border border-slate-200 rounded-2xl bg-white hover:border-slate-300 transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-xs font-bold rounded">
                        {iss.subjectCode}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {iss.student?.name} (Roll: {iss.studentRoll})
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize self-start sm:self-auto ${
                        iss.status === 'resolved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : iss.status === 'rejected'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {iss.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <span className="font-bold text-slate-700 block mb-1">
                      Student Remarks ({iss.issueType.replace('_', ' ')}):
                    </span>
                    <p className="text-slate-600">{iss.description}</p>
                    {iss.sheet && (
                      <p className="text-slate-500 text-[11px] mt-2">
                        Recorded Marks: <strong>{iss.sheet.totalMarks}</strong> &bull; Q1: {iss.sheet.q1 || 0}, Q2: {iss.sheet.q2 || 0}, Q3: {iss.sheet.q3 || 0}, Q4: {iss.sheet.q4 || 0}, Q5: {iss.sheet.q5 || 0}
                      </p>
                    )}
                  </div>

                  {/* Reply and Resolution Box */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add teacher resolution comments or explanation..."
                      value={replyText[iss._id] !== undefined ? replyText[iss._id] : iss.teacherResponse || ''}
                      onChange={(e) =>
                        setReplyText({ ...replyText, [iss._id]: e.target.value })
                      }
                      className="flex-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                    <select
                      value={statusChoice[iss._id] || iss.status}
                      onChange={(e) =>
                        setStatusChoice({ ...statusChoice, [iss._id]: e.target.value })
                      }
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_review">In Review</option>
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                    </select>

                    <button
                      onClick={() => handleUpdateIssue(iss._id)}
                      disabled={updatingIssueId === iss._id}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1 shrink-0"
                    >
                      {updatingIssueId === iss._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Save Resolution</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
