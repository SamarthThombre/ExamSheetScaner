import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import StatusChip from '../../components/StatusChip';
import {
  Users,
  Layers,
  FileSpreadsheet,
  Plus,
  Mail,
  Lock,
  User,
  Loader2,
  AlertCircle,
  CheckCircle2,
  School,
  BookOpen,
  FolderTree,
  Edit2,
  Trash2,
  Save,
  X,
  ChevronRight,
  ShieldCheck,
  Download,
  UploadCloud,
  GraduationCap,
  Clock,
  History,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Search
} from 'lucide-react';

const CollegeAdminPanel = () => {
  const { user, checkAuth } = useAuth();

  const [activeTab, setActiveTab] = useState('departments'); // 'departments' | 'faculty' | 'batches' | 'roster' | 'audit' | 'college'
  const [stats, setStats] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // College details edit state
  const [collegeForm, setCollegeForm] = useState({
    name: user?.college?.name || '',
    code: user?.college?.code || '',
    address: user?.college?.address || ''
  });
  const [savingCollege, setSavingCollege] = useState(false);

  // Department modal state
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null); // null for add, object for edit
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });
  const [deptSubmitting, setDeptSubmitting] = useState(false);

  // Subject modal state
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [selectedDeptForSubject, setSelectedDeptForSubject] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null); // null for add, object for edit
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', maxMarks: 100 });
  const [subjectSubmitting, setSubjectSubmitting] = useState(false);

  // Teacher modal state
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ name: '', email: '', password: '', departmentId: '' });
  const [creatingTeacher, setCreatingTeacher] = useState(false);

  // Assign Teacher modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTeacherForAssign, setSelectedTeacherForAssign] = useState(null);
  const [assignForm, setAssignForm] = useState({ departmentId: '', assignedSubjects: [] });
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Student Roster State
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterDeptFilter, setRosterDeptFilter] = useState('');
  const [importingRoster, setImportingRoster] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditTargetFilter, setAuditTargetFilter] = useState('');
  const [expandedAuditRows, setExpandedAuditRows] = useState({});

  const fetchRoster = async () => {
    try {
      setRosterLoading(true);
      const params = {};
      if (rosterDeptFilter) params.department = rosterDeptFilter;
      const res = await api.get('/admin/roster', { params });
      if (res.data?.success) {
        setRoster(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load roster:', err.message);
    } finally {
      setRosterLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const params = { limit: 50 };
      if (auditTargetFilter) params.target = auditTargetFilter;
      const res = await api.get('/admin/audit', { params });
      if (res.data?.success) {
        setAuditLogs(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err.message);
    } finally {
      setAuditLoading(false);
    }
  };

  // Access Requests State
  const [accessRequests, setAccessRequests] = useState([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessStatusFilter, setAccessStatusFilter] = useState('');
  const [accessSearch, setAccessSearch] = useState('');
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const fetchAccessRequests = async () => {
    try {
      setAccessLoading(true);
      const params = {};
      if (accessStatusFilter) params.status = accessStatusFilter;
      if (accessSearch) params.search = accessSearch;
      const res = await api.get('/access-requests/admin', { params });
      if (res.data?.success) {
        setAccessRequests(res.data.data || []);
        setPendingRequestsCount(res.data.pendingCount || 0);
      }
    } catch (err) {
      console.error('Failed to load access requests:', err.message);
    } finally {
      setAccessLoading(false);
    }
  };

  const handleApproveAccessRequest = async (id, name, roll) => {
    if (!window.confirm(`Approve access request for ${name} (${roll})? This will update the official student roster immediately.`)) return;
    try {
      const res = await api.patch(`/access-requests/admin/${id}/approve`);
      if (res.data?.success) {
        notifySuccess(res.data.message || 'Access request approved & student roster updated!');
        fetchAccessRequests();
        fetchRoster();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to approve request.');
    }
  };

  const handleRejectAccessRequest = async (id, roll) => {
    const remark = window.prompt(`Reject access request for ${roll}? Enter reason for rejection:`, 'Roster details could not be verified by College Admin.');
    if (remark === null) return;
    try {
      const res = await api.patch(`/access-requests/admin/${id}/reject`, { adminRemarks: remark });
      if (res.data?.success) {
        notifySuccess(res.data.message || 'Access request rejected.');
        fetchAccessRequests();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to reject request.');
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, teachersRes, batchesRes, deptsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/teachers'),
        api.get('/batches', { params: { limit: 50 } }),
        api.get('/admin/departments')
      ]);

      if (statsRes.data?.success) setStats(statsRes.data.data);
      if (teachersRes.data?.success) setTeachers(teachersRes.data.data || []);
      if (batchesRes.data?.success) setBatches(batchesRes.data.data || []);
      if (deptsRes.data?.success) setDepartments(deptsRes.data.data || []);

      if (user?.college) {
        setCollegeForm({
          name: user.college.name || '',
          code: user.college.code || '',
          address: user.college.address || ''
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load college administration records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    fetchAccessRequests();
  }, []);

  useEffect(() => {
    if (activeTab === 'roster') fetchRoster();
    if (activeTab === 'audit') fetchAuditLogs();
    if (activeTab === 'access-requests') fetchAccessRequests();
  }, [activeTab, rosterDeptFilter, auditTargetFilter, accessStatusFilter, accessSearch]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportingRoster(true);
      setImportResult(null);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/admin/roster/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success) {
        setImportResult(res.data.data);
        notifySuccess(`Import finished: ${res.data.data.inserted} inserted, ${res.data.data.updated} updated.`);
        fetchRoster();
      }
    } catch (err) {
      setError(err.message || 'Failed to import student CSV.');
    } finally {
      setImportingRoster(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const sampleDept = departments[0]?.code || 'CS';
    const csvContent = `Student Name,Enrollment No,Email,Department,Session\nAanand Kushwah,0801CA231001,aanand@college.edu,${sampleDept},2023-24\nAashish Chouhan,0801CA231002,aashish@college.edu,${sampleDept},2023-24\nTest Student,0801CA239999,teststudent@college.edu,${sampleDept},2023-24\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'student_roster_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeleteRosterEntry = async (id) => {
    if (!window.confirm('Are you sure you want to remove this student from the roster?')) return;
    try {
      await api.delete(`/admin/roster/${id}`);
      setRoster((prev) => prev.filter((r) => r._id !== id));
      notifySuccess('Student roster entry removed.');
    } catch (err) {
      setError(err.message || 'Failed to delete roster entry.');
    }
  };

  const toggleAuditRow = (id) => {
    setExpandedAuditRows((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const notifySuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // 1. College Details Update
  const handleUpdateCollege = async (e) => {
    e.preventDefault();
    try {
      setSavingCollege(true);
      setError(null);
      const res = await api.put('/admin/college', collegeForm);
      if (res.data?.success) {
        notifySuccess('College details updated successfully!');
        if (checkAuth) checkAuth();
      }
    } catch (err) {
      setError(err.message || 'Failed to update college details.');
    } finally {
      setSavingCollege(false);
    }
  };

  // 2. Department Actions (Add / Edit / Delete)
  const handleOpenAddDept = () => {
    setEditingDept(null);
    setDeptForm({ name: '', code: '' });
    setShowDeptModal(true);
  };

  const handleOpenEditDept = (dept) => {
    setEditingDept(dept);
    setDeptForm({ name: dept.name, code: dept.code });
    setShowDeptModal(true);
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    try {
      setDeptSubmitting(true);
      setError(null);
      if (editingDept) {
        const res = await api.put(`/admin/departments/${editingDept._id}`, deptForm);
        if (res.data?.success) {
          setDepartments((prev) =>
            prev.map((d) => (d._id === editingDept._id ? res.data.data : d))
          );
          notifySuccess('Department updated successfully.');
        }
      } else {
        const res = await api.post('/admin/departments', deptForm);
        if (res.data?.success) {
          setDepartments((prev) => [...prev, res.data.data]);
          notifySuccess('Department created successfully.');
        }
      }
      setShowDeptModal(false);
    } catch (err) {
      setError(err.message || 'Failed to save department.');
    } finally {
      setDeptSubmitting(false);
    }
  };

  const handleDeleteDept = async (deptId) => {
    if (!window.confirm('Are you sure you want to delete this department and all its subjects?')) return;
    try {
      setError(null);
      await api.delete(`/admin/departments/${deptId}`);
      setDepartments((prev) => prev.filter((d) => d._id !== deptId));
      notifySuccess('Department deleted successfully.');
    } catch (err) {
      setError(err.message || 'Failed to delete department.');
    }
  };

  // 3. Subject Actions (Add / Edit / Delete)
  const handleOpenAddSubject = (dept) => {
    setSelectedDeptForSubject(dept);
    setEditingSubject(null);
    setSubjectForm({ name: '', code: '', maxMarks: 100 });
    setShowSubjectModal(true);
  };

  const handleOpenEditSubject = (dept, sub) => {
    setSelectedDeptForSubject(dept);
    setEditingSubject(sub);
    setSubjectForm({ name: sub.name, code: sub.code, maxMarks: sub.maxMarks || 100 });
    setShowSubjectModal(true);
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    if (!selectedDeptForSubject) return;
    try {
      setSubjectSubmitting(true);
      setError(null);
      if (editingSubject) {
        const res = await api.put(
          `/admin/departments/${selectedDeptForSubject._id}/subjects/${editingSubject._id}`,
          subjectForm
        );
        if (res.data?.success) {
          setDepartments((prev) =>
            prev.map((d) => (d._id === selectedDeptForSubject._id ? res.data.data : d))
          );
          notifySuccess('Subject updated successfully.');
        }
      } else {
        const res = await api.post(
          `/admin/departments/${selectedDeptForSubject._id}/subjects`,
          subjectForm
        );
        if (res.data?.success) {
          setDepartments((prev) =>
            prev.map((d) => (d._id === selectedDeptForSubject._id ? res.data.data : d))
          );
          notifySuccess('Subject added successfully.');
        }
      }
      setShowSubjectModal(false);
    } catch (err) {
      setError(err.message || 'Failed to save subject.');
    } finally {
      setSubjectSubmitting(false);
    }
  };

  const handleDeleteSubject = async (deptId, subjectId) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    try {
      setError(null);
      const res = await api.delete(`/admin/departments/${deptId}/subjects/${subjectId}`);
      if (res.data?.success) {
        setDepartments((prev) =>
          prev.map((d) => (d._id === deptId ? res.data.data : d))
        );
        notifySuccess('Subject deleted successfully.');
      }
    } catch (err) {
      setError(err.message || 'Failed to delete subject.');
    }
  };

  // 4. Teacher Actions (Add / Assign / Delete)
  const handleDeleteTeacher = async (teacherId, teacherName) => {
    if (!window.confirm(`Are you sure you want to remove faculty member "${teacherName}" from this college?`)) return;
    try {
      setError(null);
      await api.delete(`/admin/teachers/${teacherId}`);
      setTeachers((prev) => prev.filter((t) => t._id !== teacherId));
      notifySuccess(`Teacher ${teacherName} removed.`);
    } catch (err) {
      setError(err.message || 'Failed to remove teacher.');
    }
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    try {
      setCreatingTeacher(true);
      setError(null);
      const res = await api.post('/admin/teachers', newTeacher);
      if (res.data?.success) {
        setTeachers((prev) => [res.data.data, ...prev]);
        setShowAddTeacherModal(false);
        setNewTeacher({ name: '', email: '', password: '', departmentId: '' });
        notifySuccess('Teacher registered successfully.');
      }
    } catch (err) {
      setError(err.message || 'Failed to register teacher.');
    } finally {
      setCreatingTeacher(false);
    }
  };

  const handleOpenAssign = (teacher) => {
    setSelectedTeacherForAssign(teacher);
    setAssignForm({
      departmentId: teacher.department?._id || teacher.department || '',
      assignedSubjects: teacher.assignedSubjects || []
    });
    setShowAssignModal(true);
  };

  const handleToggleSubjectAssign = (code) => {
    const upper = code.toUpperCase().trim();
    setAssignForm((prev) => {
      const exists = prev.assignedSubjects.includes(upper);
      return {
        ...prev,
        assignedSubjects: exists
          ? prev.assignedSubjects.filter((s) => s !== upper)
          : [...prev.assignedSubjects, upper]
      };
    });
  };

  const handleSaveAssign = async (e) => {
    e.preventDefault();
    if (!selectedTeacherForAssign) return;
    try {
      setAssignSubmitting(true);
      setError(null);
      const res = await api.put(
        `/admin/teachers/${selectedTeacherForAssign._id}/assign`,
        assignForm
      );
      if (res.data?.success) {
        setTeachers((prev) =>
          prev.map((t) => (t._id === selectedTeacherForAssign._id ? res.data.data : t))
        );
        setShowAssignModal(false);
        notifySuccess(`Assigned subjects for ${selectedTeacherForAssign.name} updated!`);
      }
    } catch (err) {
      setError(err.message || 'Failed to assign teacher.');
    } finally {
      setAssignSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading institutional admin dashboard...</p>
      </div>
    );
  }

  // Helper to gather all subject codes across departments
  const allAvailableSubjects = departments.flatMap((d) =>
    (d.subjects || []).map((s) => ({ ...s, departmentName: d.name, departmentCode: d.code }))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-mono text-xs font-bold rounded-md uppercase">
              {collegeForm.code || user?.college?.code || 'INSTITUTE'}
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              College Admin Console
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {collegeForm.name || user?.college?.name || 'College Administration'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure branches, subjects, assign faculty roles, and track digital evaluations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAddDept}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition"
          >
            <FolderTree className="w-4 h-4" />
            <span>Add Branch</span>
          </button>
          <button
            onClick={() => setShowAddTeacherModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Faculty</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Branches
            </span>
            <span className="text-xl font-black text-slate-900">{departments.length}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block">
              Faculty Members
            </span>
            <span className="text-xl font-black text-slate-900">{teachers.length}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider block">
              Exam Batches
            </span>
            <span className="text-xl font-black text-purple-600">{batches.length}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block">
              Published Batches
            </span>
            <span className="text-xl font-black text-emerald-600">{stats?.publishedBatches || 0}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 mb-6 gap-2 sm:gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'departments'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          <span>Departments & Subjects ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('faculty')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'faculty'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Faculty & Subject Assignments ({teachers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('batches')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'batches'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Exam Batches ({batches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'roster'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Student Roster</span>
        </button>

        <button
          onClick={() => setActiveTab('access-requests')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'access-requests'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Access Requests</span>
          {pendingRequestsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
              {pendingRequestsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Log</span>
        </button>

        <button
          onClick={() => setActiveTab('college')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'college'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <School className="w-4 h-4" />
          <span>College Profile & Code</span>
        </button>
      </div>

      {/* TAB 1: Departments & Subjects */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Academic Branches & Subjects</h2>
              <p className="text-xs text-slate-500">
                Organize academic departments and assign official subject codes.
              </p>
            </div>
            <button
              onClick={handleOpenAddDept}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Department</span>
            </button>
          </div>

          {departments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <FolderTree className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No departments configured yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-4">
                Create your first department (e.g. Computer Science) and add subjects under it.
              </p>
              <button
                onClick={handleOpenAddDept}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-indigo-700"
              >
                Create Branch
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {departments.map((dept) => (
                <div
                  key={dept._id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-slate-300 transition flex flex-col justify-between"
                >
                  <div>
                    {/* Dept Header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-[11px] font-bold rounded-md">
                            {dept.code}
                          </span>
                          <span className="text-[11px] text-slate-400 font-semibold">
                            {(dept.subjects || []).length} Subjects
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">{dept.name}</h3>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditDept(dept)}
                          title="Edit Department"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDept(dept._id)}
                          title="Delete Department"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Subjects List */}
                    <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Curriculum Subjects
                        </span>
                        <button
                          onClick={() => handleOpenAddSubject(dept)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Subject</span>
                        </button>
                      </div>

                      {(dept.subjects || []).length === 0 ? (
                        <p className="text-[11px] text-slate-400 py-3 text-center">
                          No subjects listed under this department.
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {dept.subjects.map((sub) => (
                            <div
                              key={sub._id || sub.code}
                              className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/60 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="font-mono font-bold text-indigo-600 text-[11px]">
                                  {sub.code}
                                </span>
                                <span className="text-slate-700 truncate font-medium">{sub.name}</span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleOpenEditSubject(dept, sub)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSubject(dept._id, sub._id)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Faculty & Subject Assignments */}
      {activeTab === 'faculty' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Faculty Roster & Subject Allotment</h2>
              <p className="text-xs text-slate-500">
                Only subjects assigned to a teacher can be evaluated and have batches created by them.
              </p>
            </div>
            <button
              onClick={() => setShowAddTeacherModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Teacher</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-2.5 px-3">Faculty Name</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Assigned Subjects</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-xs text-slate-400">
                      No teachers registered yet under this college.
                    </td>
                  </tr>
                ) : (
                  teachers.map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px]">
                            {t.name ? t.name[0].toUpperCase() : 'T'}
                          </div>
                          <span>{t.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{t.email}</td>
                      <td className="py-3 px-3">
                        {t.department ? (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-semibold">
                            {t.department.name || t.department.code || 'Assigned'}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {(t.assignedSubjects || []).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {t.assignedSubjects.map((sub) => (
                              <span
                                key={sub}
                                className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-bold text-[10px] rounded"
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-amber-600 font-medium text-[11px]">No subjects assigned</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenAssign(t)}
                            className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-lg transition"
                          >
                            Assign Subjects
                          </button>
                          <button
                            onClick={() => handleDeleteTeacher(t._id, t.name)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Remove Teacher"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Exam Batches */}
      {activeTab === 'batches' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Institutional Exam Batches</h2>
            <span className="text-xs text-slate-500">Real-time status across all faculty</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Exam Name</th>
                  <th className="py-2.5 px-3">Teacher</th>
                  <th className="py-2.5 px-3 text-center">Sheets</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-xs text-slate-400">
                      No exam batches found in this college.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">
                        {b.subjectCode}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 truncate max-w-xs">
                        {b.examName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 truncate">{b.teacher?.name || 'Faculty'}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                        {b.totalSheets}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StatusChip status={b.status} size="xs" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Student Roster (Feature 1) */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <span>Student Enrolment Roster</span>
              </h2>
              <p className="text-xs text-slate-500">
                Upload student CSV containing <strong className="text-slate-700">Student Name, Enrollment No, and Email</strong>. Students will be strictly locked to register only using their assigned official email address.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv"
                className="hidden"
              />

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition"
                title="Download CSV format template"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>CSV Template</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                disabled={importingRoster}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                {importingRoster ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                <span>Import Student CSV</span>
              </button>
            </div>
          </div>

          {/* Import Result Feedback Banner */}
          {importResult && (
            <div className="mb-6 p-4 rounded-xl border bg-emerald-50 border-emerald-200 text-xs text-emerald-900">
              <div className="flex items-center gap-2 font-bold mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>CSV Import Completed</span>
              </div>
              <p className="text-emerald-800">
                ✅ <strong>{importResult.inserted}</strong> students imported, <strong>{importResult.updated}</strong> updated, <strong>{importResult.skipped}</strong> skipped.
              </p>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-emerald-200/60">
                  <span className="font-bold text-red-700 block mb-1">
                    Encountered {importResult.errors.length} issue(s):
                  </span>
                  <div className="max-h-32 overflow-y-auto space-y-1 text-[11px] text-red-600">
                    {importResult.errors.map((e, idx) => (
                      <div key={idx} className="bg-red-50/80 px-2 py-1 rounded">
                        Row {e.row}: {e.enrolmentNo || 'N/A'} - {e.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Department Filter & Search Bar */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Filter Branch:</span>
              <select
                value={rosterDeptFilter}
                onChange={(e) => setRosterDeptFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Branches</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs font-semibold text-slate-500">
              {roster.length} {roster.length === 1 ? 'Student' : 'Students'}
            </span>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-2.5 px-3">Enrolment No</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3 text-center">Session</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rosterLoading ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-xs text-slate-400">
                      <Loader2 className="w-5 h-5 text-indigo-600 animate-spin mx-auto mb-1" />
                      <span>Loading roster...</span>
                    </td>
                  </tr>
                ) : roster.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-xs text-slate-400">
                      No student roster records found. Click "Import Student CSV" to bulk import.
                    </td>
                  </tr>
                ) : (
                  roster.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">
                        {r.enrolmentNo}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {r.name || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {r.email || '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {r.department?.code || r.department?.name || '-'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 font-mono text-[11px]">
                        {r.session || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {r.isRegistered ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Registered</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleDeleteRosterEntry(r._id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Remove from roster"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Student Access & Roster Dispute Requests */}
      {activeTab === 'access-requests' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                <span>Student Access & Roster Dispute Requests</span>
                {pendingRequestsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                    {pendingRequestsCount} Pending
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Review and resolve student requests for missing roster records, email corrections, or branch updates. Approving a request automatically updates the official roster.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={fetchAccessRequests}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition"
              >
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              {[
                { label: 'All', val: '' },
                { label: 'Pending', val: 'pending' },
                { label: 'Approved', val: 'approved' },
                { label: 'Rejected', val: 'rejected' }
              ].map((tab) => (
                <button
                  key={tab.val}
                  onClick={() => setAccessStatusFilter(tab.val)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    accessStatusFilter === tab.val
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={accessSearch}
                onChange={(e) => setAccessSearch(e.target.value)}
                placeholder="Search by name, roll, or email..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Requests Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-2.5 px-3">Enrolment No</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Target Email</th>
                  <th className="py-2.5 px-3">Branch / Dept</th>
                  <th className="py-2.5 px-3">Issue Type</th>
                  <th className="py-2.5 px-3">Reason / Remarks</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accessLoading ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-xs text-slate-400">
                      <Loader2 className="w-5 h-5 text-indigo-600 animate-spin mx-auto mb-1" />
                      <span>Loading access requests...</span>
                    </td>
                  </tr>
                ) : accessRequests.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-xs text-slate-400">
                      No access requests found matching the filter.
                    </td>
                  </tr>
                ) : (
                  accessRequests.map((req) => (
                    <tr key={req._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">
                        {req.enrolmentNo}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {req.name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-indigo-700 bg-indigo-50/40 px-1.5 py-0.5 rounded text-[11px]">
                        {req.email}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {req.department?.name || req.departmentName || <span className="text-slate-400">-</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        {req.requestType === 'missing_roster' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            Not in Roster
                          </span>
                        )}
                        {req.requestType === 'email_mismatch' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Email Mismatch
                          </span>
                        )}
                        {req.requestType === 'department_change' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Branch Change
                          </span>
                        )}
                        {req.requestType === 'other' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            Other
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 max-w-xs text-slate-600 truncate" title={req.reason}>
                        {req.reason || <span className="text-slate-400 italic">No notes</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {req.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        )}
                        {req.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approved</span>
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            <X className="w-3 h-3" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {req.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApproveAccessRequest(req._id, req.name, req.enrolmentNo)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition shadow-xs"
                              title="Approve and auto-add to roster"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectAccessRequest(req._id, req.enrolmentNo)}
                              className="px-2 py-1 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded-lg font-bold text-[11px] transition border border-slate-200"
                              title="Reject request"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Resolved
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Audit Trail Log (Feature 2) */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <span>Institutional Audit Trail</span>
              </h2>
              <p className="text-xs text-slate-500">
                Compliance log tracking sheet mark edits, grievance decisions, and publishing activities.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Filter Target:</span>
              <select
                value={auditTargetFilter}
                onChange={(e) => setAuditTargetFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Activities</option>
                <option value="Sheet">Sheet Edits</option>
                <option value="Issue">Grievances</option>
                <option value="Batch">Batches</option>
              </select>
            </div>
          </div>

          {/* Audit Timeline / List */}
          {auditLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
              <span>Loading audit logs...</span>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No audit logs recorded yet. Changes will appear here as teachers edit sheets and update grievances.
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => {
                const actionStyles = {
                  SHEET_EDIT: 'bg-blue-50 text-blue-700 border-blue-200',
                  GRIEVANCE_UPDATED: 'bg-amber-50 text-amber-700 border-amber-200',
                  BATCH_PUBLISHED: 'bg-emerald-50 text-emerald-700 border-emerald-200'
                };
                const isExpanded = !!expandedAuditRows[log._id];

                return (
                  <div
                    key={log._id}
                    className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition bg-white"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            actionStyles[log.action] || 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {log.action}
                        </span>

                        <span className="text-xs font-bold text-slate-900">
                          {log.actor?.name || 'Academic Staff'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          ({log.actorRole || 'staff'})
                        </span>
                      </div>

                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium mb-2">{log.detail}</p>

                    {/* Expandable Before & After Diff Snapshot */}
                    {(log.before || log.after) && (
                      <div>
                        <button
                          onClick={() => toggleAuditRow(log._id)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          <span>{isExpanded ? 'Hide Snapshot Diff' : 'View Snapshot Diff'}</span>
                        </button>

                        {isExpanded && (
                          <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono">
                            <div>
                              <span className="text-slate-500 font-bold block mb-1 uppercase text-[10px]">
                                Before Snapshot:
                              </span>
                              <pre className="p-2 bg-white border border-slate-200 rounded text-slate-700 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(log.before, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <span className="text-emerald-700 font-bold block mb-1 uppercase text-[10px]">
                                After Snapshot:
                              </span>
                              <pre className="p-2 bg-white border border-slate-200 rounded text-slate-700 overflow-x-auto whitespace-pre-wrap">
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
      )}

      {/* TAB 4: College Details & Code */}
      {activeTab === 'college' && (
        <div className="max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <School className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">College Profile & Institution Code</h2>
              <p className="text-xs text-slate-500">
                Update college name and code. Teachers require this exact code during self-registration.
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateCollege} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                College Name
              </label>
              <input
                type="text"
                value={collegeForm.name}
                onChange={(e) => setCollegeForm({ ...collegeForm, name: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                College Code (Unique ID)
              </label>
              <input
                type="text"
                value={collegeForm.code}
                onChange={(e) => setCollegeForm({ ...collegeForm, code: e.target.value.toUpperCase() })}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Share this code with faculty so they can register under this institution.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Campus Address
              </label>
              <input
                type="text"
                value={collegeForm.address}
                onChange={(e) => setCollegeForm({ ...collegeForm, address: e.target.value })}
                placeholder="City, State"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={savingCollege}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
              >
                {savingCollege ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save College Information</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 1: Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingDept ? 'Edit Branch / Department' : 'Add New Branch / Department'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter the academic department name and branch code.
            </p>

            <form onSubmit={handleSaveDept} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Name
                </label>
                <input
                  type="text"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  placeholder="e.g. Computer Science & Engineering"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department / Branch Code
                </label>
                <input
                  type="text"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. CSE or test_branch"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deptSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {deptSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{editingDept ? 'Update Department' : 'Create Department'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingSubject ? 'Edit Subject' : 'Add Subject to Branch'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Department:{' '}
              <span className="font-semibold text-slate-800">
                {selectedDeptForSubject?.name} ({selectedDeptForSubject?.code})
              </span>
            </p>

            <form onSubmit={handleSaveSubject} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  placeholder="e.g. Object Oriented Programming or test_subject"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject Code
                </label>
                <input
                  type="text"
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. CT10718"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Maximum Marks
                </label>
                <input
                  type="number"
                  value={subjectForm.maxMarks}
                  onChange={(e) => setSubjectForm({ ...subjectForm, maxMarks: Number(e.target.value) })}
                  min={1}
                  max={200}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={subjectSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {subjectSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{editingSubject ? 'Update Subject' : 'Add Subject'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Teacher Modal */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Teacher to College</h3>
            <p className="text-xs text-slate-500 mb-4">
              Register a faculty member under your college.
            </p>

            <form onSubmit={handleCreateTeacher} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newTeacher.name}
                  onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                  placeholder="Prof. Jane Smith"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newTeacher.email}
                  onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                  placeholder="janesmith@college.edu"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={newTeacher.password}
                  onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Department (Optional)
                </label>
                <select
                  value={newTeacher.departmentId}
                  onChange={(e) => setNewTeacher({ ...newTeacher, departmentId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Department --</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddTeacherModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTeacher}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {creatingTeacher ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Add Faculty</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Assign Teacher Modal */}
      {showAssignModal && selectedTeacherForAssign && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Assign Department & Subjects
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Faculty: <span className="font-bold text-slate-800">{selectedTeacherForAssign.name}</span> ({selectedTeacherForAssign.email})
            </p>

            <form onSubmit={handleSaveAssign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department / Branch
                </label>
                <select
                  value={assignForm.departmentId}
                  onChange={(e) => setAssignForm({ ...assignForm, departmentId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- No Department Assigned --</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Permitted Subjects to Evaluate
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Check all subject codes this teacher is authorized to create batches for:
                </p>

                {allAvailableSubjects.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl">
                    No subjects exist in any department yet. Please add subjects in the Departments tab first.
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {allAvailableSubjects.map((sub) => {
                      const isChecked = assignForm.assignedSubjects.includes(sub.code.toUpperCase());
                      return (
                        <label
                          key={`${sub.code}-${sub._id}`}
                          className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200/60 cursor-pointer hover:bg-indigo-50/50 transition text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSubjectAssign(sub.code)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex items-center gap-2 flex-1 truncate">
                            <span className="font-mono font-bold text-indigo-700">{sub.code}</span>
                            <span className="text-slate-800 font-medium truncate">{sub.name}</span>
                            <span className="text-[10px] text-slate-400">({sub.departmentCode})</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {assignSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Save Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollegeAdminPanel;
