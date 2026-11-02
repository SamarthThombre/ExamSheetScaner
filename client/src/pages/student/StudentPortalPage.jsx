import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import StatusChip from '../../components/StatusChip';
import {
  GraduationCap,
  Award,
  BookOpen,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Plus,
  Send,
  Loader2,
  ExternalLink,
  School,
  FolderTree,
  Calendar,
  Layers
} from 'lucide-react';

const StudentPortalPage = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('results'); // 'results' | 'grievances'
  const [results, setResults] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Raise Issue Modal State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({
    subjectCode: '',
    sheetId: '',
    issueType: 'marks_mismatch',
    description: ''
  });
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState(null);

  const studentRoll = user?.enrolmentNo || user?.rollNumber;

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (studentRoll) {
        const [resultsRes, issuesRes] = await Promise.all([
          api.get('/results/lookup', { params: { enrolment: studentRoll } }),
          api.get('/issues/my')
        ]);

        if (resultsRes.data?.success) setResults(resultsRes.data.data || []);
        if (issuesRes.data?.success) setIssues(issuesRes.data.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load your examination records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [user, studentRoll]);

  const handleOpenRaiseIssue = (sheet = null, subCode = '') => {
    setIssueForm({
      subjectCode: subCode || sheet?.batch?.subjectCode || (user?.enrolledSubjects && user.enrolledSubjects[0]) || '',
      sheetId: sheet?._id || '',
      issueType: 'marks_mismatch',
      description: ''
    });
    setIssueSuccess(null);
    setShowIssueModal(true);
  };

  const handleSendIssue = async (e) => {
    e.preventDefault();
    if (!issueForm.subjectCode || !issueForm.description.trim()) return;

    try {
      setSubmittingIssue(true);
      const res = await api.post('/issues', issueForm);
      if (res.data?.success) {
        setIssues((prev) => [res.data.data, ...prev]);
        setIssueSuccess('Your grievance has been submitted directly to your teacher.');
        setTimeout(() => {
          setShowIssueModal(false);
          setIssueSuccess(null);
          setActiveTab('grievances');
        }, 1200);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit issue.');
    } finally {
      setSubmittingIssue(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading student examination portal...</p>
      </div>
    );
  }

  const enrolledSubjects = user?.enrolledSubjects || [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Student Profile Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-100 shrink-0">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-xs font-bold rounded-md">
                {studentRoll || 'NO_ENROLMENT'}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {user?.college?.name || 'Institution'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{user?.name}</h1>
            <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
              <span>Branch: <strong className="text-slate-700">{user?.department?.name || user?.department?.code || 'General'}</strong></span>
              <span>&bull;</span>
              <span>{user?.email}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => handleOpenRaiseIssue()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm transition self-start sm:self-auto"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Report Grievance</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Portal Tabs Navigation */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('results')}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'results'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>My Results</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
            activeTab === 'results' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
          }`}>
            {results.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('grievances')}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'grievances'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>My Grievances</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
            activeTab === 'grievances' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
          }`}>
            {issues.length}
          </span>
        </button>
      </div>

      {/* TAB 1: MY RESULTS */}
      {activeTab === 'results' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Academic Curriculum */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 self-start">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Curriculum</span>
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                {enrolledSubjects.length} Core Subjects
              </span>
            </div>

            {enrolledSubjects.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No enrolled subjects found.</p>
            ) : (
              <div className="space-y-2">
                {enrolledSubjects.map((sub, idx) => {
                  const evalSheet = results.find(
                    (r) => r.batch?.subjectCode?.toUpperCase() === sub.toUpperCase()
                  );
                  return (
                    <div
                      key={sub}
                      className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="w-5 text-center font-bold text-slate-400 text-[11px]">
                          0{idx + 1}
                        </span>
                        <span className="font-mono font-bold text-indigo-600 text-xs">{sub}</span>
                      </div>

                      {evalSheet ? (
                        <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px] rounded-md">
                          {evalSheet.totalMarks} Marks
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">In Evaluation</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Published Results Cards */}
          <div className="lg:col-span-2 space-y-4">
            {results.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">No published results yet</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Your examination answer sheets are currently being evaluated. Results and CO attainment scores will appear here once published.
                </p>
              </div>
            ) : (
              results.map((item) => {
                const coLevels = [
                  { label: 'CO1', at: item.co1AT },
                  { label: 'CO2', at: item.co2AT },
                  { label: 'CO3', at: item.co3AT },
                  { label: 'CO4', at: item.co4AT },
                  { label: 'CO5', at: item.co5AT }
                ];

                return (
                  <div
                    key={item._id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:border-slate-300 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-xs font-bold rounded-md">
                            {item.batch?.subjectCode}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {item.batch?.publishedAt
                                ? new Date(item.batch.publishedAt).toLocaleDateString()
                                : 'Published'}
                            </span>
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">{item.batch?.examName}</h3>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                            Total Marks
                          </span>
                          <span className="text-2xl font-black text-slate-900 font-mono">
                            {item.totalMarks}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CO Attainment Pills */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Course Outcome (CO) Attainment Levels</span>
                      </span>
                      <div className="grid grid-cols-5 gap-2 mt-1.5">
                        {coLevels.map((co) => {
                          const at = co.at != null ? co.at : '-';
                          const levelColor =
                            at === 3
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : at === 2
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : at === 1
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200';

                          return (
                            <div
                              key={co.label}
                              className={`rounded-lg p-2 text-center border ${levelColor}`}
                            >
                              <span className="text-[10px] font-bold block opacity-75">{co.label}</span>
                              <span className="text-xs font-black">
                                {at !== '-' ? `Lvl ${at}` : '-'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleOpenRaiseIssue(item, item.batch?.subjectCode)}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 transition flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Raise Grievance</span>
                      </button>

                      <Link
                        to={`/results/${item._id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                      >
                        <span>View Marksheet</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MY GRIEVANCES */}
      {activeTab === 'grievances' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">My Grievances & Queries</h2>
              <p className="text-xs text-slate-500">
                Track status updates and faculty feedback on your evaluation queries
              </p>
            </div>
            <button
              onClick={() => handleOpenRaiseIssue()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Grievance</span>
            </button>
          </div>

          {issues.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-xs font-bold text-slate-700">No grievances filed yet</h3>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                If you find any discrepancy in your marks or wish to request re-evaluation, raise a grievance using the button above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {issues.map((iss) => (
                <div
                  key={iss._id}
                  className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono font-bold text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {iss.subjectCode}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border capitalize">
                          {iss.issueType ? iss.issueType.replace('_', ' ') : 'Query'}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(iss.createdAt).toLocaleDateString()}</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 font-medium">{iss.description}</p>
                    </div>

                    <StatusChip status={iss.status} size="sm" />
                  </div>

                  {/* Teacher Feedback / Response */}
                  {iss.teacherResponse ? (
                    <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Teacher Response:</span>
                        </span>
                        {iss.resolvedAt && (
                          <span className="text-[10px] text-slate-400">
                            Resolved: {new Date(iss.resolvedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700">{iss.teacherResponse}</p>
                    </div>
                  ) : (
                    <div className="mt-2 text-[11px] text-slate-400 italic">
                      Awaiting faculty review...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Raise Issue Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Raise Evaluation Grievance</h3>
            <p className="text-xs text-slate-500 mb-4">
              Your inquiry will be logged directly to the evaluating teacher.
            </p>

            {issueSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{issueSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleSendIssue} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subject Code
                  </label>
                  <input
                    type="text"
                    value={issueForm.subjectCode}
                    onChange={(e) =>
                      setIssueForm((prev) => ({ ...prev, subjectCode: e.target.value.toUpperCase() }))
                    }
                    placeholder="e.g. CT10718"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Issue Category
                  </label>
                  <select
                    value={issueForm.issueType}
                    onChange={(e) =>
                      setIssueForm((prev) => ({ ...prev, issueType: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="marks_mismatch">Marks Mismatch / Calculation Error</option>
                    <option value="missing_question">Unchecked / Missing Question Mark</option>
                    <option value="incorrect_enrolment">Incorrect Enrolment Number</option>
                    <option value="re_evaluation">Re-Evaluation Request</option>
                    <option value="other">Other Query</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Description of Discrepancy
                  </label>
                  <textarea
                    rows={3}
                    value={issueForm.description}
                    onChange={(e) =>
                      setIssueForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Explain the specific discrepancy (e.g. Question 3 was marked 12 in the table but shows 8 on the summary)."
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowIssueModal(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingIssue}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {submittingIssue ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Submit Grievance</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPortalPage;
