import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  FileScan,
  LogOut,
  Layers,
  Plus,
  Award,
  Shield,
  School,
  AlertCircle,
  BarChart2,
  Home,
  Lock,
  BookOpen
} from 'lucide-react';

const roleLabels = {
  super_admin: 'Super Admin',
  college_admin: 'College Admin',
  teacher: 'Teacher',
  student: 'Student'
};

const roleColors = {
  super_admin: 'bg-purple-100 text-purple-700 border-purple-200',
  college_admin: 'bg-blue-100 text-blue-700 border-blue-200',
  teacher: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  student: 'bg-amber-100 text-amber-700 border-amber-200'
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingIssuesCount, setPendingIssuesCount] = useState(0);

  useEffect(() => {
    if (user && ['teacher', 'college_admin', 'super_admin'].includes(user.role)) {
      api.get('/issues/teacher')
        .then((res) => {
          const list = res.data?.data || res.data || [];
          const count = list.filter((i) => i.status === 'pending' || i.status === 'in_review').length;
          setPendingIssuesCount(count);
        })
        .catch(() => {});
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo / Brand & Main Nav */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm group-hover:bg-indigo-700 transition">
                <FileScan className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-lg text-slate-900 tracking-tight">ExamScan</span>
                <span className="font-bold text-lg text-indigo-600">Web</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1.5">
              {/* Home Navigation */}
              <Link
                to="/"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition"
              >
                <Home className="w-4 h-4 text-slate-400" />
                <span>Home</span>
              </Link>

              {/* For Unauthenticated Visitors */}
              {!user && (
                <a
                  href="/#how-to-use"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition"
                >
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  <span>How to Use</span>
                </a>
              )}

              {/* Student Portal Links (Authenticated) */}
              {user && user.role === 'student' && (
                <>
                  <Link
                    to="/results"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition"
                  >
                    <Award className="w-4 h-4 text-indigo-600" />
                    <span>My Marksheets</span>
                  </Link>

                  <Link
                    to="/student/portal"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition"
                  >
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                    <span>Grievance Portal</span>
                  </Link>
                </>
              )}

              {/* Teacher / Admin Batches */}
              {user && ['teacher', 'college_admin', 'super_admin'].includes(user.role) && (
                <>
                  <Link
                    to="/batches"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition"
                  >
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <span>Batches</span>
                  </Link>

                  <Link
                    to="/batches/new"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Batch</span>
                  </Link>

                  <Link
                    to="/teacher/issues"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-amber-600 hover:bg-amber-50/50 transition"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span>Grievances</span>
                    {pendingIssuesCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                        {pendingIssuesCount}
                      </span>
                    )}
                  </Link>
                </>
              )}

              {/* College Admin Panel */}
              {user && ['college_admin', 'super_admin'].includes(user.role) && (
                <>
                  <Link
                    to="/admin/college"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 transition"
                  >
                    <School className="w-4 h-4 text-blue-500" />
                    <span>College Admin</span>
                  </Link>

                  <Link
                    to="/admin/analytics"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 transition"
                  >
                    <BarChart2 className="w-4 h-4 text-indigo-500" />
                    <span>Analytics</span>
                  </Link>
                </>
              )}

              {/* Super Admin Panel */}
              {user && user.role === 'super_admin' && (
                <Link
                  to="/admin/super"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition"
                >
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span>Super Admin</span>
                </Link>
              )}
            </nav>
          </div>

          {/* User Controls */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{user.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                        roleColors[user.role] || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {roleLabels[user.role] || user.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    {user.department && (
                      <span className="font-medium text-slate-600">
                        {user.department.name || user.department.code}
                      </span>
                    )}
                    {user.department && user.college && <span>&bull;</span>}
                    {user.college?.code && (
                      <span className="font-mono font-bold text-indigo-600">
                        {user.college.code}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 hover:text-slate-900 transition"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden md:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  to="/login"
                  className="text-xs font-bold text-slate-700 hover:text-indigo-600 px-3 py-2 transition"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl shadow-sm transition"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
