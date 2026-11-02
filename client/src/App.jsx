import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/teacher/DashboardPage';
import NewBatchPage from './pages/teacher/NewBatchPage';
import BatchDetailPage from './pages/teacher/BatchDetailPage';
import AnalyticsPage from './pages/teacher/AnalyticsPage';
import IssuesPage from './pages/teacher/IssuesPage';
import ResultLookupPage from './pages/student/ResultLookupPage';
import MarksheetPage from './pages/student/MarksheetPage';
import StudentPortalPage from './pages/student/StudentPortalPage';
import CollegeAdminPanel from './pages/admin/CollegeAdminPanel';
import CollegeAnalyticsPage from './pages/admin/CollegeAnalyticsPage';
import SuperAdminPanel from './pages/admin/SuperAdminPanel';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Home & Informational Landing Page */}
              <Route path="/" element={<HomePage />} />

              {/* Authentication Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Marks & Marksheet Routes (Protected / Login Required) */}
              <Route path="/results" element={<ResultLookupPage />} />
              <Route path="/results/:sheetId" element={<MarksheetPage />} />

              {/* Student Portal & Grievances */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['student']} />
                }
              >
                <Route path="/student/portal" element={<StudentPortalPage />} />
              </Route>

              {/* Teacher & Academic Staff Routes */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['teacher', 'college_admin', 'super_admin']} />
                }
              >
                <Route path="/batches" element={<DashboardPage />} />
                <Route path="/batches/new" element={<NewBatchPage />} />
                <Route path="/batches/:id" element={<BatchDetailPage />} />
                <Route path="/batches/:id/analytics" element={<AnalyticsPage />} />
                <Route path="/teacher/issues" element={<IssuesPage />} />
              </Route>

              {/* College Admin Panel */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['college_admin', 'super_admin']} />
                }
              >
                <Route path="/admin/college" element={<CollegeAdminPanel />} />
                <Route path="/admin/analytics" element={<CollegeAnalyticsPage />} />
              </Route>

              {/* Super Admin Panel */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['super_admin']} />
                }
              >
                <Route path="/admin/super" element={<SuperAdminPanel />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
