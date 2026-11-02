import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import api from '../api/axios';
import {
  X,
  Users,
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Trash2,
  RefreshCw,
  Search,
  FileText
} from 'lucide-react';

const StudentListModal = ({ batch, isOpen, onClose, onRosterUpdated }) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'upload' | 'paste' | 'list'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Reconciliation data
  const [reconciliation, setReconciliation] = useState({
    studentList: [],
    totalRoster: 0,
    evaluatedCount: 0,
    missingCount: 0,
    missingStudents: [],
    unlistedCount: 0,
    unlistedSheets: [],
    reconciliationRate: 0
  });

  // Upload / parsed state
  const [parsedPreview, setParsedPreview] = useState([]);
  const [rawText, setRawText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch current student list and reconciliation on open
  const fetchRoster = async () => {
    if (!batch?._id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/batches/${batch._id}/student-list`);
      if (res.data?.success) {
        setReconciliation(res.data.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load student roster data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && batch?._id) {
      fetchRoster();
      setParsedPreview([]);
      setRawText('');
      setSuccessMsg(null);
      setError(null);
      setActiveTab('overview');
    }
  }, [isOpen, batch?._id]);

  if (!isOpen || !batch) return null;

  // Handle file upload (CSV / Excel)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!json || json.length === 0) {
          setError('No student records found in file.');
          return;
        }

        // Map columns flexibly
        const mapped = json.map((row) => {
          const keys = Object.keys(row);
          const enrolKey = keys.find((k) =>
            /enrol|enroll|roll|reg/i.test(k)
          ) || keys[0];
          const nameKey = keys.find((k) =>
            /name|student/i.test(k)
          ) || keys[1];

          return {
            enrolmentNo: String(row[enrolKey] || '').trim().toUpperCase(),
            name: String(row[nameKey] || '').trim()
          };
        }).filter((item) => item.enrolmentNo !== '');

        if (mapped.length === 0) {
          setError('Could not detect valid Enrollment No in the uploaded file.');
          return;
        }

        setParsedPreview(mapped);
        setSuccessMsg(`Parsed ${mapped.length} students from ${file.name}. Review below and click "Save Roster".`);
      } catch (err) {
        setError(`Failed to read file: ${err.message}`);
      }
    };

    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Parse raw text lines
  const handleParseText = () => {
    setError(null);
    if (!rawText.trim()) {
      setError('Please paste student records (one per line).');
      return;
    }

    const lines = rawText.split('\n');
    const mapped = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Split by comma, tab, or multiple spaces
      let parts = trimmed.split(/,|\t/);
      if (parts.length === 1) {
        // try splitting by whitespace
        parts = trimmed.split(/\s+/);
      }

      const enrol = parts[0]?.trim().toUpperCase();
      const name = parts.slice(1).join(' ').trim();

      if (enrol) {
        mapped.push({
          enrolmentNo: enrol,
          name: name || ''
        });
      }
    });

    if (mapped.length === 0) {
      setError('No valid student entries found in pasted text.');
      return;
    }

    setParsedPreview(mapped);
    setSuccessMsg(`Parsed ${mapped.length} students. Review below and click "Save Roster".`);
  };

  // Save student list to backend
  const handleSaveRoster = async (listToSave) => {
    try {
      setSaving(true);
      setError(null);
      const res = await api.put(`/batches/${batch._id}/student-list`, {
        studentList: listToSave
      });
      if (res.data?.success) {
        setReconciliation(res.data.data);
        setParsedPreview([]);
        setRawText('');
        setSuccessMsg(`Successfully saved ${res.data.data.totalRoster} students to this batch!`);
        if (onRosterUpdated) {
          onRosterUpdated({ ...batch, studentList: res.data.data.studentList }, res.data.data);
        }
        setActiveTab('overview');
      }
    } catch (err) {
      setError(err.message || 'Failed to save student list.');
    } finally {
      setSaving(false);
    }
  };

  // Clear student roster
  const handleClearRoster = async () => {
    if (!window.confirm('Are you sure you want to clear the student list for this batch?')) return;
    try {
      setSaving(true);
      const res = await api.put(`/batches/${batch._id}/student-list`, {
        studentList: []
      });
      if (res.data?.success) {
        setReconciliation(res.data.data);
        setSuccessMsg('Student roster cleared.');
        if (onRosterUpdated) {
          onRosterUpdated({ ...batch, studentList: [] }, res.data.data);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to clear student roster.');
    } finally {
      setSaving(false);
    }
  };

  // Import from College Roster
  const handleImportCollegeRoster = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await api.post(`/batches/${batch._id}/student-list/import-roster`);
      if (res.data?.success) {
        setReconciliation(res.data.data);
        setSuccessMsg(`Imported ${res.data.data.totalRoster} students from college roster!`);
        if (onRosterUpdated) {
          onRosterUpdated({ ...batch, studentList: res.data.data.studentList }, res.data.data);
        }
        setActiveTab('overview');
      }
    } catch (err) {
      setError(err.message || 'Could not import from college roster.');
    } finally {
      setSaving(false);
    }
  };

  // Download sample CSV template
  const handleDownloadTemplate = () => {
    const csv = `Enrollment No,Student Name\n0801CA231001,Aanand Kushwah\n0801CA231002,Aashish Chouhan\n0801CA231003,Abhay Patel\n0801CA231004,Aditi Sharma\n0801CA231005,Akash Verma\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student_list_template_${batch.subjectCode || 'course'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredMissing = reconciliation.missingStudents.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.enrolmentNo?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q);
  });

  const filteredAll = (reconciliation.studentList || []).filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.enrolmentNo?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Course Student Roster & Sheet Reconciliation
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold">
                  {batch.subjectCode}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage enrollment numbers and names for official CO Excel reports and missing exam sheet detection.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-1 -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 border-b-2 text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Overview & Missing Sheets</span>
              {reconciliation.missingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-100 text-rose-700">
                  {reconciliation.missingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-3 border-b-2 text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload CSV / Excel</span>
            </button>

            <button
              onClick={() => setActiveTab('paste')}
              className={`px-4 py-3 border-b-2 text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'paste'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Paste Text</span>
            </button>

            {reconciliation.totalRoster > 0 && (
              <button
                onClick={() => setActiveTab('list')}
                className={`px-4 py-3 border-b-2 text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'list'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Full Roster ({reconciliation.totalRoster})</span>
              </button>
            )}
          </div>

          <button
            onClick={fetchRoster}
            disabled={loading}
            title="Refresh reconciliation"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: OVERVIEW & MISSING SHEETS */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Total in Roster
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-slate-900">
                      {reconciliation.totalRoster}
                    </span>
                    <span className="text-xs text-slate-400">students</span>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                    Evaluated Sheets
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-emerald-700">
                      {reconciliation.evaluatedCount}
                    </span>
                    <span className="text-xs text-emerald-600">scans</span>
                  </div>
                </div>

                <div className={`p-3.5 rounded-xl border ${
                  reconciliation.missingCount > 0
                    ? 'bg-rose-50 border-rose-200'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${
                    reconciliation.missingCount > 0 ? 'text-rose-700' : 'text-slate-500'
                  }`}>
                    Missing Sheets
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-xl font-black ${
                      reconciliation.missingCount > 0 ? 'text-rose-700' : 'text-slate-700'
                    }`}>
                      {reconciliation.missingCount}
                    </span>
                    <span className={`text-xs ${
                      reconciliation.missingCount > 0 ? 'text-rose-500' : 'text-slate-400'
                    }`}>unaccounted</span>
                  </div>
                </div>

                <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">
                    Reconciliation Rate
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-indigo-700">
                      {reconciliation.reconciliationRate}%
                    </span>
                    <span className="text-xs text-indigo-500">coverage</span>
                  </div>
                </div>
              </div>

              {/* Missing Sheets Alert Section */}
              {reconciliation.missingCount > 0 ? (
                <div className="border border-rose-200 rounded-2xl bg-rose-50/30 overflow-hidden">
                  <div className="p-4 bg-rose-100/60 border-b border-rose-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                      <div>
                        <h4 className="text-xs font-bold text-rose-900">
                          Missing Answer Sheets ({reconciliation.missingCount} Students Unaccounted)
                        </h4>
                        <p className="text-[11px] text-rose-700">
                          These students are in your roster but no evaluated answer paper was detected. They will be marked as absent/missing in the CO Excel file.
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search missing..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1 bg-white border border-rose-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-rose-400"
                      />
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-rose-50/80 text-[10px] uppercase font-bold text-rose-800 border-b border-rose-200 sticky top-0">
                        <tr>
                          <th className="py-2 px-3 w-10 text-center">#</th>
                          <th className="py-2 px-3">Enrollment No</th>
                          <th className="py-2 px-3">Student Name</th>
                          <th className="py-2 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100 bg-white">
                        {filteredMissing.map((s, idx) => (
                          <tr key={s.enrolmentNo || idx} className="hover:bg-rose-50/40">
                            <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-800">
                              {s.enrolmentNo}
                            </td>
                            <td className="py-2 px-3 text-slate-700 font-medium">
                              {s.name || <span className="text-slate-400 italic">No name provided</span>}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                Missing Sheet / Absent
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : reconciliation.totalRoster > 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">
                      Roster 100% Reconciled!
                    </h4>
                    <p className="text-[11px] text-emerald-700">
                      All {reconciliation.totalRoster} students in your uploaded course list have evaluated answer sheets.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-slate-700">
                    No Student List Added for this Batch Yet
                  </h4>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1 mb-4">
                    Upload a CSV/Excel file or paste enrollment numbers and names so ExamScanWeb can map candidate names in your CO Excel file and identify any missing answer papers.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload Student File</span>
                    </button>
                    <button
                      onClick={handleImportCollegeRoster}
                      disabled={saving}
                      className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition"
                    >
                      Import from College Roster
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UPLOAD CSV / EXCEL */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Upload Student Roster File (.csv, .xlsx, .xls)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Columns required: <strong>Enrollment No</strong> and <strong>Student Name</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download CSV Template</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/40 rounded-2xl cursor-pointer transition">
                <FileSpreadsheet className="w-10 h-10 text-indigo-500 mb-2" />
                <span className="text-xs font-bold text-indigo-900">
                  Click to select CSV or Excel file
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  or drag and drop here (.csv, .xlsx)
                </span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Parsed Preview Table */}
              {parsedPreview.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Preview of {parsedPreview.length} Students Ready to Save:
                    </span>
                    <button
                      onClick={() => handleSaveRoster(parsedPreview)}
                      disabled={saving}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      {saving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Confirm & Save Roster</span>
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-500 sticky top-0">
                        <tr>
                          <th className="py-2 px-3 w-10 text-center">#</th>
                          <th className="py-2 px-3">Enrollment No</th>
                          <th className="py-2 px-3">Student Name</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedPreview.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-1.5 px-3 font-mono font-bold text-slate-800">
                              {item.enrolmentNo}
                            </td>
                            <td className="py-1.5 px-3 text-slate-700">
                              {item.name || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PASTE TEXT */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 mb-1">
                  Paste Enrollment Numbers and Names
                </h4>
                <p className="text-[11px] text-slate-500 mb-2">
                  Format: <code>ENROLLMENT, STUDENT NAME</code> (one student per line).
                </p>
                <textarea
                  rows={6}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`0801CA231001, Aanand Kushwah\n0801CA231002, Aashish Chouhan\n0801CA231003, Abhay Patel`}
                  className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleParseText}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Parse Text</span>
                </button>
                {parsedPreview.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSaveRoster(parsedPreview)}
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Save {parsedPreview.length} Students</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: FULL ROSTER */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search roster..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleClearRoster}
                  disabled={saving}
                  className="px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Roster</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 w-10 text-center">#</th>
                      <th className="py-2 px-3">Enrollment No</th>
                      <th className="py-2 px-3">Student Name</th>
                      <th className="py-2 px-3 text-right">Evaluation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAll.map((s, idx) => {
                      const isMissing = reconciliation.missingStudents.some(
                        (m) => m.enrolmentNo === s.enrolmentNo
                      );

                      return (
                        <tr key={s.enrolmentNo || idx} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">
                            {s.enrolmentNo}
                          </td>
                          <td className="py-2 px-3 text-slate-700 font-medium">
                            {s.name || '—'}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {isMissing ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                Missing Sheet
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                Evaluated
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <span className="text-xs text-slate-500">
            {reconciliation.totalRoster > 0 ? (
              <span>
                <strong>{reconciliation.totalRoster}</strong> students loaded ({reconciliation.missingCount} missing sheets)
              </span>
            ) : (
              <span>No roster loaded</span>
            )}
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentListModal;
