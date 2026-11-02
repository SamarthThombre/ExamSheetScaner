import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import QMarksBarChart from '../../components/charts/QMarksBarChart';
import PassFailPieChart from '../../components/charts/PassFailPieChart';
import MarksDistributionChart from '../../components/charts/MarksDistributionChart';
import TrendLineChart from '../../components/charts/TrendLineChart';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Award,
  AlertCircle,
  CheckCircle2,
  Users,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';

const AnalyticsPage = () => {
  const { id } = useParams();

  const [batch, setBatch] = useState(null);
  const [stats, setStats] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [batchRes, statsRes, sheetsRes] = await Promise.all([
          api.get(`/batches/${id}`),
          api.get(`/batches/${id}/stats`),
          api.get(`/batches/${id}/sheets`, { params: { limit: 100 } })
        ]);

        if (batchRes.data?.success) setBatch(batchRes.data.data);
        if (statsRes.data?.success) setStats(statsRes.data.data);
        if (sheetsRes.data?.success) setSheets(sheetsRes.data.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load batch analytics.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Calculating batch analytics...</p>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200 inline-block mb-4">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
          <h2 className="text-base font-bold">Failed to Load Analytics</h2>
          <p className="text-xs text-red-600 mt-1">{error || 'Batch not found'}</p>
        </div>
        <div>
          <Link
            to="/batches"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate detailed mark statistics
  const validScores = sheets
    .map((s) => parseFloat(s.totalMarks))
    .filter((v) => !isNaN(v));

  const highestScore = validScores.length > 0 ? Math.max(...validScores) : 0;
  const lowestScore = validScores.length > 0 ? Math.min(...validScores) : 0;
  const passCount = validScores.filter((s) => s >= 20).length;
  const passRate = validScores.length > 0 ? Math.round((passCount / validScores.length) * 100) : 0;
  const averageMarks = stats?.avgTotalMarks || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Breadcrumb */}
      <Link
        to={`/batches/${id}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-5 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Batch Details</span>
      </Link>

      {/* Analytics Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-xs font-bold rounded-md">
              {batch.subjectCode}
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-semibold text-slate-500 uppercase">Performance Intelligence</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {batch.examName} — Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated performance metrics based on {sheets.length} evaluated student answer sheets
          </p>
        </div>

        <Link
          to={`/batches/${id}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <FileSpreadsheet className="w-4 h-4 text-slate-500" />
          <span>View Answer Sheets Table</span>
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Class Average
            </span>
            <span className="text-xl font-black text-slate-900">{averageMarks}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block">
              Highest Score
            </span>
            <span className="text-xl font-black text-emerald-600">{highestScore}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Lowest Score
            </span>
            <span className="text-xl font-black text-slate-800">{lowestScore}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block">
              Pass Rate
            </span>
            <span className="text-xl font-black text-slate-900">{passRate}%</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider block">
              Total Students
            </span>
            <span className="text-xl font-black text-slate-900">{sheets.length}</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      {sheets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No Analytics Data Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            Upload exam answer sheet scans to generate performance charts, question statistics, and distributions.
          </p>
          <Link
            to={`/batches/${id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-indigo-700 transition"
          >
            <span>Go to Batch Upload</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QMarksBarChart sheets={sheets} />
          <PassFailPieChart sheets={sheets} passingThreshold={20} />
          <MarksDistributionChart sheets={sheets} />
          <TrendLineChart sheets={sheets} averageMarks={averageMarks} />
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
