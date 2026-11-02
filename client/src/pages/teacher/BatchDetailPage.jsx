import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import StatusChip from '../../components/StatusChip';
import SheetTable from '../../components/SheetTable';
import UploadProgress from '../../components/UploadProgress';
import StudentListModal from '../../components/StudentListModal';
import { exportCOAttainmentExcel } from '../../utils/coExport';
import { exportMarksReport, exportMarksCSV } from '../../utils/marksExport';
import {
  ArrowLeft,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  BarChart2,
  Send,
  Loader2,
  AlertCircle,
  Sliders,
  Download,
  Award,
  X,
  History,
  Clock,
  ChevronDown,
  ChevronUp,
  Users
} from 'lucide-react';

const BatchDetailPage = () => {
  const { id } = useParams();

  const [batch, setBatch] = useState(null);
  const [stats, setStats] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Active view tab: 'sheets' or 'upload'
  const [activeTab, setActiveTab] = useState('sheets');

  // Sheet table filters, search, and pagination
  const [sheetFilter, setSheetFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [totalSheets, setTotalSheets] = useState(0);

  // CO Attainment Export & Configuration State
  const [exportingCO, setExportingCO] = useState(false);
  const [exportingMarks, setExportingMarks] = useState(false);
  const [showCOSettings, setShowCOSettings] = useState(false);
  const [showStudentList, setShowStudentList] = useState(false);
  const [savingCOSettings, setSavingCOSettings] = useState(false);
  const [coSettings, setCoSettings] = useState({
    coMaxMarks: 14,
    coThresholdHigh: 65,
    coThresholdMid: 50
  });

  // Batch Audit Log State
  const [batchAuditLogs, setBatchAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [expandedAuditRows, setExpandedAuditRows] = useState({});

  // Fetch Batch Overview
  const fetchBatch = async () => {
    try {
      const res = await api.get(`/batches/${id}`);
      if (res.data?.success) {
        const b = res.data.data;
        setBatch(b);
        setCoSettings({
          coMaxMarks: b.coMaxMarks != null ? b.coMaxMarks : 14,
          coThresholdHigh: b.coThresholdHigh != null ? b.coThresholdHigh : 65,
          coThresholdMid: b.coThresholdMid != null ? b.coThresholdMid : 50
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load batch');
    }
  };

  // Fetch Aggregated Stats
  const fetchStats = async () => {
    try {
      const res = await api.get(`/batches/${id}/stats`);
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err.message);
    }
  };

  // Fetch Sheets List
  const fetchSheets = async () => {
    try {
      setSheetsLoading(true);
      const params = {
        page,
        limit: 20
      };
      if (sheetFilter) params.status = sheetFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.get(`/batches/${id}/sheets`, { params });
      if (res.data?.success) {
        setSheets(res.data.data || []);
        setTotalSheets(res.data.total || 0);
        setPages(res.data.pages || 1);
      }
    } catch (err) {
      console.error('Failed to load sheets:', err.message);
    } finally {
      setSheetsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchBatch(), fetchStats(), fetchSheets()]);
      setLoading(false);
    };
    init();
  }, [id]);

  useEffect(() => {
    fetchSheets();
  }, [page, sheetFilter, searchTerm]);

  const fetchBatchAudit = async () => {
    try {
      setAuditLoading(true);
      const res = await api.get('/admin/audit', { params: { limit: 50 } });
      if (res.data?.success) {
        const allLogs = res.data.data || [];
        const sheetIds = new Set(sheets.map((s) => s._id.toString()));
        const filtered = allLogs.filter((log) => {
          if (log.target === 'Batch' && log.targetId?.toString() === id) return true;
          if (log.target === 'Sheet' && (sheetIds.has(log.targetId?.toString()) || log.detail?.includes(batch?.examName))) return true;
          if (log.detail?.includes(batch?.examName)) return true;
          return false;
        });
        setBatchAuditLogs(filtered);
      }
    } catch (err) {
      console.error('Failed to load batch audit:', err.message);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchBatchAudit();
    }
  }, [activeTab, id]);

  const handlePublish = async () => {
    if (!window.confirm('Are you sure you want to publish this batch? Published results will be visible to students and CO1–CO5 Attainment will be computed.')) {
      return;
    }

    try {
      const res = await api.put(`/batches/${id}`, { status: 'published' });
      if (res.data?.success) {
        setBatch(res.data.data);
        fetchSheets();
      }
    } catch (err) {
      alert(`Publish error: ${err.message}`);
    }
  };

  const handleExportCO = async () => {
    try {
      setExportingCO(true);
      // Fetch full sheets list up to 1000 items to ensure all students are included in export
      const res = await api.get(`/batches/${id}/sheets?limit=1000`);
      const allSheets = res.data?.data || sheets;
      exportCOAttainmentExcel(batch, allSheets);
    } catch (err) {
      alert(`Export error: ${err.message}`);
    } finally {
      setExportingCO(false);
    }
  };

  const handleExportMarks = async (format = 'excel') => {
    try {
      setExportingMarks(true);
      const res = await api.get(`/batches/${id}/export`);
      if (res.data?.success) {
        const { batch: exportBatchData, sheets: exportSheets } = res.data.data;
        if (format === 'csv') {
          exportMarksCSV(exportBatchData || batch, exportSheets);
        } else {
          exportMarksReport(exportBatchData || batch, exportSheets);
        }
      }
    } catch (err) {
      alert(`Marks export failed: ${err.message}`);
    } finally {
      setExportingMarks(false);
    }
  };

  const handleSaveCOSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingCOSettings(true);
      const res = await api.post(`/batches/${id}/compute-co`, {
        coMaxMarks: Number(coSettings.coMaxMarks) || 14,
        coThresholdHigh: Number(coThresholdHigh => coSettings.coThresholdHigh) || 65,
        coThresholdMid: Number(coSettings.coThresholdMid) || 50
      });
      if (res.data?.success) {
        setBatch(res.data.data.batch);
        setSheets(res.data.data.sheets);
        setShowCOSettings(false);
      }
    } catch (err) {
      alert(`Error updating CO settings: ${err.message}`);
    } finally {
      setSavingCOSettings(false);
    }
  };

  const handleUploadComplete = () => {
    fetchBatch();
    fetchStats();
    fetchSheets();
    setActiveTab('sheets');
  };

  const handleSheetUpdated = (updatedSheet) => {
    setSheets((prev) =>
      prev.map((s) => (s._id === updatedSheet._id ? updatedSheet : s))
    );
    fetchBatch();
    fetchStats();
  };

  const handleSheetDeleted = (deletedId) => {
    setSheets((prev) => prev.filter((s) => s._id !== deletedId));
    fetchBatch();
    fetchStats();
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading batch details...</p>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200 inline-block mb-4">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
          <h2 className="text-base font-bold">Unable to Load Batch</h2>
          <p className="text-xs text-red-600 mt-1">{error || 'Batch not found.'}</p>
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Navigation Breadcrumb */}
      <Link
        to="/batches"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-5 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Batches</span>
      </Link>

      {/* Batch Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-mono text-xs font-bold rounded-md">
              {batch.subjectCode}
            </span>
            <StatusChip status={batch.status} size="sm" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{batch.examName}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Teacher: <span className="font-semibold text-slate-700">{batch.teacher?.name}</span> &bull;{' '}
            College: <span className="font-semibold text-slate-700">{batch.college?.name} ({batch.college?.code})</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* CO Settings Button */}
          <button
            onClick={() => setShowCOSettings(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition shadow-sm"
            title="Configure CO Target Marks and Level Thresholds"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>CO Settings</span>
          </button>

          {/* Student List & Missing Sheets Modal Trigger */}
          <button
            onClick={() => setShowStudentList(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition shadow-sm"
            title="Manage course student list (Enrollment & Name) and detect missing answer sheets"
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Student List</span>
            {batch?.studentList?.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                {batch.studentList.length}
              </span>
            )}
          </button>

          {/* Export CO Report Excel */}
          <button
            onClick={handleExportCO}
            disabled={exportingCO || (!sheets.length && !batch.totalSheets)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition shadow-sm disabled:opacity-50"
            title="Export full CO Attainment Excel workbook (Detailed & Summary sheets, with student names & missing sheets)"
          >
            {exportingCO ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            )}
            <span>Export CO Report</span>
          </button>

          {/* Export Marks (Excel & CSV) */}
          {(batch.status === 'published' || batch.totalSheets > 0 || sheets.length > 0) && (
            <>
              <button
                onClick={() => handleExportMarks('excel')}
                disabled={exportingMarks}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl text-xs font-bold border border-indigo-200 transition shadow-sm disabled:opacity-50"
                title="Export registrar-ready Excel marks report with averages and CO levels"
              >
                {exportingMarks ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                )}
                <span>Export Marks (Excel)</span>
              </button>

              <button
                onClick={() => handleExportMarks('csv')}
                disabled={exportingMarks}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition shadow-sm disabled:opacity-50"
                title="Export clean CSV marks report (S.No, Enrollment No, Total, Q1-Q5)"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Export CSV</span>
              </button>
            </>
          )}

          <Link
            to={`/batches/${id}/analytics`}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition border border-indigo-200 shadow-sm"
          >
            <BarChart2 className="w-4 h-4" />
            <span>Analytics</span>
          </Link>

          {batch.status !== 'published' ? (
            <button
              onClick={handlePublish}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
            >
              <Send className="w-4 h-4" />
              <span>Publish Batch Results</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Published</span>
            </div>
          )}
        </div>
      </div>

      {/* Aggregate Stats Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200 text-center shadow-sm">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Sheets
          </span>
          <span className="text-xl font-black text-slate-900">{stats?.totalSheets || batch.totalSheets || 0}</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 text-center shadow-sm">
          <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block">
            Verified (OK)
          </span>
          <span className="text-xl font-black text-emerald-600">{stats?.okCount || batch.okCount || 0}</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 text-center shadow-sm">
          <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider block">
            Needs Review
          </span>
          <span className="text-xl font-black text-amber-600">{stats?.checkCount || batch.checkCount || 0}</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 text-center shadow-sm">
          <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider block">
            Rescan Required
          </span>
          <span className="text-xl font-black text-orange-600">{stats?.rescanCount || batch.rescanCount || 0}</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 text-center shadow-sm">
          <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider block">
            Average Total
          </span>
          <span className="text-xl font-black text-indigo-600">{stats?.avgTotalMarks || 0}</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 text-center shadow-sm">
          <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider block">
            Avg OCR Conf
          </span>
          <span className="text-xl font-black text-purple-600">
            {Math.round((stats?.avgEnrolmentConf || 0) * 100)}%
          </span>
        </div>
      </div>

      {/* Course Outcome (CO) Attainment Summary Widget */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Course Outcome (CO) Attainment</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Accreditation Metrics
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Target Marks (T): <span className="font-semibold text-slate-700">{batch.coMaxMarks || 14}</span> &bull;{' '}
                Level 3: &gt;{batch.coThresholdHigh || 65}% &bull;{' '}
                Level 2: &ge;{batch.coThresholdMid || 50}% &bull;{' '}
                Level 1: &lt;{batch.coThresholdMid || 50}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs text-slate-500 font-medium">Class Attainment Level:</span>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
              {batch.coAttainment?.overallAverage != null
                ? `${batch.coAttainment.overallAverage.toFixed(2)} / 3.0`
                : 'Auto-calculates on Publish'}
            </span>
            <button
              onClick={() => setShowCOSettings(true)}
              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
              title="Configure CO Parameters"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5 CO Column Level Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((num) => {
            const coData = batch.coAttainment ? batch.coAttainment[`co${num}`] : null;
            const level = coData?.attainmentLevel != null ? coData.attainmentLevel.toFixed(2) : '—';
            const avgOB = coData?.classAvgOB != null ? `${coData.classAvgOB} / ${batch.coMaxMarks || 14}` : '—';
            const avgPct = coData?.classAvgPct != null ? `${coData.classAvgPct}%` : '—';

            return (
              <div
                key={`co-${num}`}
                className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 text-center"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-indigo-700 font-mono">CO{num}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">(Q{num})</span>
                </div>
                <div className="text-lg font-black text-slate-900 my-0.5">
                  {level}
                  {coData?.attainmentLevel != null && (
                    <span className="text-[10px] font-normal text-slate-400 ml-0.5">/ 3</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>Avg: {avgOB}</span>
                  <span className="font-bold text-slate-700">{avgPct}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Tabs (Sheets vs Upload) */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('sheets')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition ${
            activeTab === 'sheets'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Evaluated Answer Sheets ({totalSheets})</span>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition ${
            activeTab === 'upload'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Scans to Batch</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Batch Audit Trail ({batchAuditLogs.length})</span>
        </button>
      </div>

      {/* Main Tab Panels */}
      {activeTab === 'upload' ? (
        <div className="max-w-3xl mx-auto">
          <UploadProgress batchId={id} onUploadComplete={handleUploadComplete} />
        </div>
      ) : activeTab === 'audit' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <span>Batch Evaluation Audit History</span>
              </h3>
              <p className="text-xs text-slate-500">
                Logged mark modifications and publish events for this examination batch
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {batchAuditLogs.length} Records
            </span>
          </div>

          {auditLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
              <span>Loading audit logs...</span>
            </div>
          ) : batchAuditLogs.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No audit logs recorded for this batch yet. Edits made to sheets or publishing actions will be logged here.
            </div>
          ) : (
            <div className="space-y-3">
              {batchAuditLogs.map((log) => {
                const isExpanded = !!expandedAuditRows[log._id];
                return (
                  <div
                    key={log._id}
                    className="border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          log.action === 'SHEET_EDIT'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {log.action}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {log.actor?.name || 'Faculty'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 mb-2">{log.detail}</p>

                    {(log.before || log.after) && (
                      <div>
                        <button
                          onClick={() => setExpandedAuditRows((p) => ({ ...p, [log._id]: !p[log._id] }))}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition"
                        >
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          <span>{isExpanded ? 'Hide Marks Diff' : 'View Marks Diff'}</span>
                        </button>

                        {isExpanded && (
                          <div className="mt-2 grid grid-cols-2 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-mono">
                            <div>
                              <span className="font-bold text-slate-500 uppercase block mb-1">Before:</span>
                              <pre className="p-1.5 bg-white border border-slate-200 rounded overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(log.before, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <span className="font-bold text-emerald-700 uppercase block mb-1">After:</span>
                              <pre className="p-1.5 bg-white border border-slate-200 rounded overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(log.after, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <SheetTable
          sheets={sheets}
          batchId={id}
          loading={sheetsLoading}
          total={totalSheets}
          page={page}
          pages={pages}
          activeFilter={sheetFilter}
          searchTerm={searchTerm}
          onFilterChange={(f) => {
            setSheetFilter(f);
            setPage(1);
          }}
          onSearchChange={(term) => {
            setSearchTerm(term);
            setPage(1);
          }}
          onPageChange={(p) => setPage(p)}
          onSheetUpdated={handleSheetUpdated}
          onSheetDeleted={handleSheetDeleted}
        />
      )}

      {/* CO Settings Configuration Modal */}
      {showCOSettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">CO Attainment Parameters</h3>
              </div>
              <button
                onClick={() => setShowCOSettings(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCOSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Marks per CO Question (T)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={coSettings.coMaxMarks}
                  onChange={(e) => setCoSettings({ ...coSettings, coMaxMarks: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  required
                />
                <span className="text-[11px] text-slate-400">Default: 14 marks</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  High Attainment Threshold (%) — Level 3
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={coSettings.coThresholdHigh}
                  onChange={(e) => setCoSettings({ ...coSettings, coThresholdHigh: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  required
                />
                <span className="text-[11px] text-slate-400">Default: &gt; 65% triggers Attainment Level 3</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mid Attainment Threshold (%) — Level 2
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={coSettings.coThresholdMid}
                  onChange={(e) => setCoSettings({ ...coSettings, coThresholdMid: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  required
                />
                <span className="text-[11px] text-slate-400">Default: &ge; 50% triggers Attainment Level 2, else Level 1</span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCOSettings(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCOSettings}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  {savingCOSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Save &amp; Recompute Attainment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Student List & Missing Sheets Modal */}
      {showStudentList && (
        <StudentListModal
          batch={batch}
          isOpen={showStudentList}
          onClose={() => setShowStudentList(false)}
          onRosterUpdated={(updatedBatch) => {
            setBatch(updatedBatch);
          }}
        />
      )}
    </div>
  );
};

export default BatchDetailPage;
