import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  FileScan,
  Award,
  ArrowRight,
  Loader2,
  AlertCircle,
  School,
  Calendar,
  Lock,
  ShieldCheck,
  UserCheck,
  ExternalLink,
  GraduationCap
} from 'lucide-react';

const ResultLookupPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [enrolment, setEnrolment] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  // If student is logged in, auto-fill and auto-search their own marks
  useEffect(() => {
    if (user && user.role === 'student') {
      const studentRoll = (user.enrolmentNo || user.rollNumber || '').toUpperCase().trim();
      setEnrolment(studentRoll);
      if (studentRoll) {
        fetchStudentResults(studentRoll);
      }
    }
  }, [user]);

  const fetchStudentResults = async (roll) => {
    try {
      setSearching(true);
      setError(null);
      const res = await api.get('/results/lookup', {
        params: { enrolment: roll }
      });
      if (res.data?.success) {
        setResults(res.data.data || []);
      }
    } catch (err) {
      setError(err.message || 'Error looking up examination records.');
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!enrolment.trim()) return;
    fetchStudentResults(enrolment.trim());
  };

  if (authLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Verifying authentication status...</p>
      </div>
    );
  }

  // 1. BLOCKED STATE: USER IS NOT LOGGED IN
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden text-center p-8 sm:p-12">
          {/* Lock Icon Badge */}
          <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <span className="text-[11px] uppercase font-extrabold tracking-wider px-3 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
            Protected Academic Records
          </span>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-4 mb-3">
            Student Login Required to Access Marks
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto mb-8">
            To ensure academic privacy and data confidentiality, public access to examination marks is restricted. Please sign in with your student account to inspect your verified scores and download official marksheets.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-md mx-auto mb-8 text-left space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2 text-slate-800 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>What is accessible inside the Student Portal:</span>
            </div>
            <p className="pl-6">• Question-wise marks breakdown (Q1 through Q5) and totals.</p>
            <p className="pl-6">• Official institutional PDF statement of marks download.</p>
            <p className="pl-6">• Transparent re-evaluation and marks discrepancy grievance filing.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/login"
              className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2"
            >
              <span>Sign In as Student</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/register"
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition flex items-center justify-center gap-2"
            >
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>New Student Registration</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. AUTHENTICATED STATE: LOGGED IN USER
  const isStudent = user.role === 'student';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header Banner */}
      <div className="text-center mb-10">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-indigo-600 items-center justify-center text-white mb-4 shadow-md shadow-indigo-100">
          <Award className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Examination Marks & Statement Portal
        </h1>

        {isStudent ? (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-semibold">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Authenticated Student: <strong className="font-bold">{user.name}</strong> ({user.enrolmentNo || user.rollNumber})</span>
          </div>
        ) : (
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-2">
            Faculty / Admin Lookup: Enter an enrolled student's roll number to inspect published results.
          </p>
        )}

        {/* Search Bar (Only shown for non-students or to refresh) */}
        {!isStudent && (
          <form onSubmit={handleSearch} className="max-w-xl mx-auto mt-6 flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={enrolment}
                onChange={(e) => setEnrolment(e.target.value)}
                placeholder="e.g. 0801CA231001"
                required
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-2xl text-sm font-mono font-bold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-2xl text-sm shadow-sm transition flex items-center gap-2"
            >
              {searching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                'Search'
              )}
            </button>
          </form>
        )}

        {isStudent && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => fetchStudentResults(user.enrolmentNo || user.rollNumber)}
              disabled={searching}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${searching ? 'animate-spin' : ''}`} />
              <span>Refresh My Results</span>
            </button>
            <Link
              to="/student/portal"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition border border-indigo-200"
            >
              <span>Go to Full Student Grievances Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-8 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm max-w-xl mx-auto">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Section */}
      {results !== null && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-800">
              Published Examination Records ({results.length})
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Enrolment: <span className="font-bold text-slate-900">{enrolment.toUpperCase()}</span>
            </span>
          </div>

          {results.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <FileScan className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900">No Published Results Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                No published exam sheets match enrolment number{' '}
                <span className="font-mono font-bold">{enrolment}</span>. The evaluation batch may still be under review by the subject evaluator.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((res) => {
                const batchInfo = res.batch || {};
                const collegeInfo = batchInfo.college || {};
                const score = parseFloat(res.totalMarks) || 0;
                const isPass = score >= 20;

                const pubDate = batchInfo.publishedAt
                  ? new Date(batchInfo.publishedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  : 'Recent';

                return (
                  <div
                    key={res._id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-xs font-bold rounded-md">
                          {batchInfo.subjectCode}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                            isPass
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {isPass ? 'Passed' : 'Needs Review'}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 mt-1 mb-2">
                        {batchInfo.examName}
                      </h3>

                      <div className="space-y-1 text-xs text-slate-500 mb-4">
                        <div className="flex items-center gap-1.5">
                          <School className="w-3.5 h-3.5 text-slate-400" />
                          <span>{collegeInfo.name || 'University Department'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Published on {pubDate}</span>
                        </div>
                      </div>

                      {/* Sub-question Breakdown Preview */}
                      <div className="grid grid-cols-5 gap-1 text-center py-2 bg-slate-50 rounded-xl border border-slate-100 mb-4">
                        {['q1', 'q2', 'q3', 'q4', 'q5'].map((qKey, i) => (
                          <div key={qKey} className="px-1">
                            <span className="text-[10px] text-slate-400 font-mono block">Q{i+1}</span>
                            <span className="text-xs font-bold text-slate-800">{res[qKey] ?? '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Total Marks
                        </span>
                        <span className="text-xl font-black text-indigo-600">
                          {res.totalMarks != null ? res.totalMarks : '—'}
                        </span>
                      </div>

                      <Link
                        to={`/results/${res._id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                      >
                        <span>View Marksheet</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResultLookupPage;
