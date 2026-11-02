import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { generateMarksheetPDF } from '../../utils/pdfGenerator';
import {
  ArrowLeft,
  Download,
  School,
  Award,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

const MarksheetPage = () => {
  const { sheetId } = useParams();
  const { user, loading: authLoading } = useAuth();

  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSheet = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/results/${sheetId}`);
        if (res.data?.success) {
          setSheet(res.data.data);
        }
      } catch (err) {
        setError(err.message || 'Unable to retrieve published marksheet.');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchSheet();
    }
  }, [sheetId, user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Retrieving confidential marksheet...</p>
      </div>
    );
  }

  // 1. UNPROTECTED / NOT LOGGED IN STATE
  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">
            Student Login Required
          </h2>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            This examination statement contains private academic records. Please sign in with your student account to inspect or download this marksheet.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link
              to="/login"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>Sign In to View Marksheet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/"
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. ERROR / ACCESS DENIED STATE
  if (error || !sheet) {
    const isAccessDenied = error?.toLowerCase().includes('access denied') || error?.toLowerCase().includes('not authorized');

    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-red-200 p-8 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">
            {isAccessDenied ? 'Confidential Marksheet Access Restricted' : 'Marksheet Not Available'}
          </h2>
          <p className="text-xs text-red-600 mb-6 leading-relaxed">
            {error || 'This result has not been published or does not exist.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/results"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to My Results</span>
            </Link>
            <Link
              to="/student/portal"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <span>Go to Student Portal</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const batch = sheet.batch || {};
  const college = batch.college || {};
  const totalScore = parseFloat(sheet.totalMarks) || 0;
  const isPass = totalScore >= 20;

  const qMarks = [
    { label: 'Question 1', max: '14.0', val: sheet.q1, co: 'CO1' },
    { label: 'Question 2', max: '14.0', val: sheet.q2, co: 'CO2' },
    { label: 'Question 3', max: '14.0', val: sheet.q3, co: 'CO3' },
    { label: 'Question 4', max: '14.0', val: sheet.q4, co: 'CO4' },
    { label: 'Question 5', max: '14.0', val: sheet.q5, co: 'CO5' }
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/results"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Results</span>
        </Link>

        <button
          onClick={() => generateMarksheetPDF(sheet, batch)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
        >
          <Download className="w-4 h-4" />
          <span>Download PDF Marksheet</span>
        </button>
      </div>

      {/* Official Marksheet Document Card */}
      <div className="bg-white rounded-2xl border-2 border-indigo-100 shadow-xl overflow-hidden p-8 sm:p-12 relative">
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-full pointer-events-none" />

        {/* Institution Title */}
        <div className="text-center pb-6 border-b border-slate-200">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            {college.name || 'University Examination Division'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {college.address || 'Central Academic Office'} &bull; Institution Code:{' '}
            <span className="font-mono font-bold text-slate-700">{college.code || 'INST'}</span>
          </p>
          <div className="inline-block mt-3 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-full">
            Official Statement of Marks
          </div>
        </div>

        {/* Student Metadata Box */}
        <div className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block">
              Student Roll / Enrolment
            </span>
            <span className="font-mono font-bold text-slate-900 text-base">
              {sheet.enrolment}
            </span>
          </div>

          <div>
            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block">
              Subject Code & Title
            </span>
            <span className="font-bold text-slate-900 text-base">
              {batch.subjectCode} &bull; {batch.examName}
            </span>
          </div>

          <div>
            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block">
              Verification Status
            </span>
            <span className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified & Digitally Audited</span>
            </span>
          </div>

          <div>
            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block">
              Result Published Date
            </span>
            <span className="font-medium text-slate-700">
              {batch.publishedAt
                ? new Date(batch.publishedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                : 'Confirmed'}
            </span>
          </div>
        </div>

        {/* Question-Wise Marks Breakdown Table */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
            Question-Wise Evaluation Breakdown
          </h2>

          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Question</th>
                  <th className="py-3 px-4 text-center">OBE Rubric</th>
                  <th className="py-3 px-4 text-center">Maximum Marks</th>
                  <th className="py-3 px-4 text-right">Marks Obtained</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {qMarks.map((q, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-slate-800 font-bold">{q.label}</td>
                    <td className="py-3 px-4 text-center font-mono text-indigo-600 font-bold">{q.co}</td>
                    <td className="py-3 px-4 text-center text-slate-400">{q.max}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {q.val != null ? q.val : '0.0'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-indigo-50/50 border-t-2 border-indigo-200 font-bold text-slate-900">
                <tr>
                  <td colSpan="2" className="py-3 px-4 uppercase tracking-wider text-xs font-black">
                    Grand Total
                  </td>
                  <td className="py-3 px-4 text-center text-slate-500">70.0</td>
                  <td className="py-3 px-4 text-right text-indigo-700 text-base font-black">
                    {sheet.totalMarks}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Final Grade / Status Result Callout */}
        <div
          className={`p-5 rounded-xl border flex items-center justify-between mb-8 ${
            isPass
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
              Official Assessment Result
            </span>
            <span className="text-xl font-black">
              {isPass ? 'PASSED / SATISFACTORY' : 'UNSATISFACTORY / RE-APPEAR'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold block opacity-75">Percentage</span>
            <span className="text-lg font-black font-mono">
              {((totalScore / 70) * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Student Grievance Option */}
        {user?.role === 'student' && (
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Notice any marks discrepancy or evaluation issue?</span>
            <Link
              to="/student/portal"
              className="text-indigo-600 hover:text-indigo-700 font-bold underline transition"
            >
              Raise a Re-Evaluation Grievance &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarksheetPage;
