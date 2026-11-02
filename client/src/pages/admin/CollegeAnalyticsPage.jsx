import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  BarChart2,
  FolderTree,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  Users,
  GraduationCap,
  Layers,
  ArrowUpDown,
  Loader2,
  RefreshCw,
  Award,
  ArrowLeft
} from 'lucide-react';

const CollegeAnalyticsPage = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Table sorting state
  const [sortField, setSortField] = useState('subject');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/admin/stats');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load college analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Generating institutional analytics...</p>
      </div>
    );
  }

  const rawDeptStats = stats?.deptStats || [];

  // Transform rawDeptStats for Recharts CO Bar Chart
  const coChartData = rawDeptStats.map((item) => {
    const roundLevel = (val) => (val != null ? Math.round(val * 100) / 100 : 0);
    return {
      subject: item._id || 'Unknown',
      CO1: roundLevel(item.avgCO1),
      CO2: roundLevel(item.avgCO2),
      CO3: roundLevel(item.avgCO3),
      CO4: roundLevel(item.avgCO4),
      CO5: roundLevel(item.avgCO5)
    };
  });

  // Table data with overall average computation
  const tableData = rawDeptStats.map((item) => {
    const coValues = [item.avgCO1, item.avgCO2, item.avgCO3, item.avgCO4, item.avgCO5].filter(
      (v) => v != null && v > 0
    );
    const overallAvg =
      coValues.length > 0
        ? Math.round((coValues.reduce((a, b) => a + b, 0) / coValues.length) * 100) / 100
        : 0;

    return {
      subject: item._id || 'N/A',
      totalBatches: item.totalBatches || 0,
      publishedBatches: item.publishedBatches || 0,
      totalSheets: item.totalSheets || 0,
      overallAvg
    };
  });

  // Sort table data
  tableData.sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (typeof aVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-xs font-bold rounded-md">
              {user?.college?.code || 'INSTITUTION'}
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Executive Analytics
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Academic Analytics & Attainment Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Departmental throughput, evaluation metrics, and Outcome-Based Education (OBE) trends.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/college"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Admin Console</span>
          </Link>

          <button
            onClick={fetchStats}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Metrics</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* SECTION 1: Summary Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Departments
            </span>
            <span className="text-xl font-black text-slate-900">{stats?.totalDepartments || 0}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block">
              Published Batches
            </span>
            <span className="text-xl font-black text-emerald-600">{stats?.publishedBatches || 0}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block">
              Evaluated Sheets
            </span>
            <span className="text-xl font-black text-slate-900">{stats?.totalSheets || 0}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider block">
              Open Grievances
            </span>
            <span className="text-xl font-black text-amber-600">{stats?.openGrievances || 0}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider block">
              Registered Students
            </span>
            <span className="text-xl font-black text-purple-600">{stats?.totalStudents || 0}</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: CO Attainment by Subject (Bar Chart) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              <span>Course Outcome (CO1–CO5) Attainment by Subject</span>
            </h2>
            <p className="text-xs text-slate-500">
              Average attainment level scale (Level 1: &lt;50% &bull; Level 2: 50–65% &bull; Level 3: &gt;65%)
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>CO1</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              <span>CO2</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
              <span>CO3</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>CO4</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block" />
              <span>CO5</span>
            </span>
          </div>
        </div>

        {coChartData.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No published batches available yet. CO Attainment levels will graph automatically once batches are published.
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="subject"
                  tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  domain={[0, 3]}
                  ticks={[0, 1, 2, 3]}
                  tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <Tooltip
                  formatter={(val) => [`Level ${val}`, '']}
                  contentStyle={{
                    borderRadius: '12px',
                    borderColor: '#e2e8f0',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Bar dataKey="CO1" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="CO2" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="CO3" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="CO4" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="CO5" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* SECTION 3: Batch Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Subject Evaluation & Attainment Matrix</h2>
            <p className="text-xs text-slate-500">Summary table of evaluation activity by curriculum code</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {tableData.length} Subjects
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase text-[11px]">
                <th
                  onClick={() => handleSort('subject')}
                  className="py-3 px-3.5 cursor-pointer hover:text-slate-800 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Subject Code</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('totalBatches')}
                  className="py-3 px-3.5 text-center cursor-pointer hover:text-slate-800 transition"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Total Batches</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('publishedBatches')}
                  className="py-3 px-3.5 text-center cursor-pointer hover:text-slate-800 transition"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Published</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('totalSheets')}
                  className="py-3 px-3.5 text-center cursor-pointer hover:text-slate-800 transition"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Evaluated Sheets</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('overallAvg')}
                  className="py-3 px-3.5 text-center cursor-pointer hover:text-slate-800 transition"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Avg CO Attainment</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-xs text-slate-400">
                    No subject batch data available.
                  </td>
                </tr>
              ) : (
                tableData.map((row) => (
                  <tr key={row.subject} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3.5 font-mono font-bold text-indigo-600 text-xs">
                      {row.subject}
                    </td>
                    <td className="py-3 px-3.5 text-center font-bold text-slate-800">
                      {row.totalBatches}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {row.publishedBatches}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-center font-bold text-slate-800">
                      {row.totalSheets}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      {row.overallAvg > 0 ? (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                          row.overallAvg >= 2.5
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : row.overallAvg >= 1.8
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          Level {row.overallAvg.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CollegeAnalyticsPage;
