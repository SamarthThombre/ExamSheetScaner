import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import {
  School,
  Users,
  Layers,
  FileSpreadsheet,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Trash2
} from 'lucide-react';

const SuperAdminPanel = () => {
  const [stats, setStats] = useState(null);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New College Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCollege, setNewCollege] = useState({ name: '', code: '', address: '' });
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState(null);

  const fetchSuperData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, collegesRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/colleges')
      ]);

      if (statsRes.data?.success) setStats(statsRes.data.data);
      if (collegesRes.data?.success) setColleges(collegesRes.data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load super admin records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuperData();
  }, []);

  const handleCreateCollege = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!newCollege.name || !newCollege.code) {
      setModalError('Please enter college name and code.');
      return;
    }

    try {
      setCreating(true);
      const res = await api.post('/admin/colleges', {
        ...newCollege,
        code: newCollege.code.trim().toUpperCase()
      });

      if (res.data?.success) {
        setColleges((prev) => [...prev, res.data.data]);
        setShowAddModal(false);
        setNewCollege({ name: '', code: '', address: '' });
        fetchSuperData();
      }
    } catch (err) {
      setModalError(err.message || 'Failed to register college.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCollege = async (collegeId, collegeName) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${collegeName}" and all associated departments?`)) {
      return;
    }

    try {
      setError(null);
      await api.delete(`/admin/colleges/${collegeId}`);
      setColleges((prev) => prev.filter((c) => c._id !== collegeId));
      fetchSuperData();
    } catch (err) {
      setError(err.message || 'Failed to delete college.');
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading platform administration console...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Super Admin Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 font-bold text-xs rounded-md">
              System Admin
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Global Platform Governance
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Institutional Network Console
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure partner colleges, monitor platform scale, and govern system-wide evaluation metrics.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Register New College</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Global KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Institutions
            </span>
            <span className="text-xl font-black text-slate-900">{stats?.totalColleges || colleges.length}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider block">
              Active Faculty
            </span>
            <span className="text-xl font-black text-slate-900">{stats?.totalTeachers || 0}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block">
              Platform Batches
            </span>
            <span className="text-xl font-black text-slate-900">{stats?.totalBatches || 0}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block">
              Total Scans Processed
            </span>
            <span className="text-xl font-black text-slate-900">{stats?.totalSheets || 0}</span>
          </div>
        </div>
      </div>

      {/* Colleges Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900">Partner Institutions Network</h2>
          <span className="text-xs text-slate-500">{colleges.length} registered colleges</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase text-[11px]">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">College Name</th>
                <th className="py-3 px-4">Location / Address</th>
                <th className="py-3 px-4 text-center">Faculty</th>
                <th className="py-3 px-4 text-center">Batches</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {colleges.map((col) => (
                <tr key={col._id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-600">{col.code}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{col.name}</td>
                  <td className="py-3 px-4 text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {col.address || 'Central Campus'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-700">
                    {col.teacherCount || 0}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-700">
                    {col.batchCount || 0}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-semibold">
                      Active
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDeleteCollege(col._id, col.name)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete College"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add College Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">Register New College</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a university or partner institution to onboard teachers and evaluate scans.
            </p>

            {modalError && (
              <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCollege} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  College / University Name
                </label>
                <input
                  type="text"
                  value={newCollege.name}
                  onChange={(e) => setNewCollege({ ...newCollege, name: e.target.value })}
                  placeholder="e.g. Stanford Technical Institute"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unique Code (Acronym)
                </label>
                <input
                  type="text"
                  value={newCollege.code}
                  onChange={(e) => setNewCollege({ ...newCollege, code: e.target.value })}
                  placeholder="e.g. STAN01 or MIT"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campus Address
                </label>
                <input
                  type="text"
                  value={newCollege.address}
                  onChange={(e) => setNewCollege({ ...newCollege, address: e.target.value })}
                  placeholder="e.g. 450 Serra Mall, Stanford, CA"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Register Institution</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPanel;
