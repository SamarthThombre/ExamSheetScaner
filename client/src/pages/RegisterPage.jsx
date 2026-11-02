import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import GoogleLoginButton from '../components/GoogleLoginButton';
import AccessRequestModal from '../components/AccessRequestModal';
import {
  FileScan,
  Lock,
  Mail,
  User,
  School,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FolderTree,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Check,
  HelpCircle
} from 'lucide-react';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student', // default to student for convenience
    collegeCode: '',
    rollNumber: '',
    departmentId: ''
  });

  const [showAccessModal, setShowAccessModal] = useState(false);

  const [verifyingCollege, setVerifyingCollege] = useState(false);
  const [verifiedCollege, setVerifiedCollege] = useState(null);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [selectedDeptSubjects, setSelectedDeptSubjects] = useState([]);
  const [collegeError, setCollegeError] = useState(null);

  // Email verification state for students
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerifySuccess, setEmailVerifySuccess] = useState(null);
  const [emailVerifyError, setEmailVerifyError] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credential) => {
    setLocalError(null);
    try {
      await googleLogin(credential);
      navigate('/', { replace: true });
    } catch (err) {
      setLocalError(err.message || 'Google authentication failed.');
    }
  };

  const isStudent = formData.role === 'student';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    // Reset email verification when email or rollNumber changes
    if (name === 'email' || name === 'rollNumber') {
      setEmailVerified(false);
      setEmailVerifySuccess(null);
      setEmailVerifyError(null);
    }

    if (name === 'collegeCode') {
      setVerifiedCollege(null);
      setAvailableDepartments([]);
      setSelectedDeptSubjects([]);
      setCollegeError(null);
      setEmailVerified(false);
      setEmailVerifySuccess(null);
      setEmailVerifyError(null);
    }

    if (name === 'departmentId') {
      const dept = availableDepartments.find((d) => d._id === value);
      if (dept) {
        setSelectedDeptSubjects(dept.subjects || []);
      } else {
        setSelectedDeptSubjects([]);
      }
    }
  };

  // Verify college code and fetch branches & subjects
  const handleVerifyCollege = async () => {
    if (!formData.collegeCode.trim()) {
      setCollegeError('Please enter a college code to verify.');
      return;
    }

    try {
      setVerifyingCollege(true);
      setCollegeError(null);
      const res = await api.get('/auth/college-branches', {
        params: { code: formData.collegeCode.trim().toUpperCase() }
      });

      if (res.data?.success) {
        setVerifiedCollege(res.data.data.college);
        const depts = res.data.data.departments || [];
        setAvailableDepartments(depts);

        // Preselect first department if available
        if (depts.length > 0) {
          setFormData((prev) => ({ ...prev, departmentId: depts[0]._id }));
          setSelectedDeptSubjects(depts[0].subjects || []);
        }
      }
    } catch (err) {
      setVerifiedCollege(null);
      setAvailableDepartments([]);
      setSelectedDeptSubjects([]);
      setCollegeError(err.message || 'College not found. Please confirm the code with your college administrator.');
    } finally {
      setVerifyingCollege(false);
    }
  };

  // Student Email Verification against College Roster
  const handleVerifyStudentEmail = async () => {
    if (!formData.collegeCode.trim()) {
      setEmailVerifyError('Please enter and verify your College Code first.');
      return;
    }
    if (!formData.rollNumber.trim()) {
      setEmailVerifyError('Please enter your University Enrolment / Roll Number first.');
      return;
    }
    if (!formData.email.trim()) {
      setEmailVerifyError('Please enter your email address to verify.');
      return;
    }

    try {
      setVerifyingEmail(true);
      setEmailVerifyError(null);
      setEmailVerifySuccess(null);

      const res = await api.post('/auth/verify-student-email', {
        collegeCode: formData.collegeCode.trim().toUpperCase(),
        enrolmentNo: formData.rollNumber.trim().toUpperCase(),
        email: formData.email.trim().toLowerCase()
      });

      if (res.data?.success && res.data.verified) {
        setEmailVerified(true);
        setEmailVerifySuccess(res.data.message || 'Email verified with official college roster!');
        
        // Auto-populate name if roster has it and student hasn't entered one
        if (res.data.studentName && !formData.name.trim()) {
          setFormData((prev) => ({ ...prev, name: res.data.studentName }));
        }

        // Auto-select department if roster had it
        if (res.data.department?._id) {
          setFormData((prev) => ({ ...prev, departmentId: res.data.department._id }));
          const dept = availableDepartments.find((d) => d._id === res.data.department._id);
          if (dept) setSelectedDeptSubjects(dept.subjects || []);
        }
      } else {
        setEmailVerified(false);
        setEmailVerifyError(res.data?.message || 'Verification failed. Email does not match college roster.');
      }
    } catch (err) {
      setEmailVerified(false);
      setEmailVerifyError(err.message || 'Verification failed. Please check your enrolment number and email.');
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (!formData.name || !formData.email || !formData.password) {
      setLocalError('Please complete all required fields.');
      return;
    }

    if (formData.role !== 'super_admin' && !formData.collegeCode.trim()) {
      setLocalError('College code is required.');
      return;
    }

    if (isStudent) {
      if (!verifiedCollege) {
        setLocalError('Please verify your college code before continuing.');
        return;
      }
      if (!formData.rollNumber.trim()) {
        setLocalError('Enrolment / Roll Number is required for student registration.');
        return;
      }
      if (!emailVerified) {
        setLocalError('Please click "Verify Email" to verify your enrolment number and official email against the college roster before registering.');
        return;
      }
      if (!formData.departmentId) {
        setLocalError('Please select your academic branch / department.');
        return;
      }
    }

    try {
      setSubmitting(true);
      await register({
        ...formData,
        collegeCode: formData.collegeCode.trim().toUpperCase(),
        rollNumber: formData.rollNumber ? formData.rollNumber.trim().toUpperCase() : undefined,
        enrolmentNo: formData.rollNumber ? formData.rollNumber.trim().toUpperCase() : undefined
      });
      navigate('/', { replace: true });
    } catch (err) {
      setLocalError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-xl bg-indigo-600 items-center justify-center text-white mb-3 shadow-md shadow-indigo-100">
            <FileScan className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Create an Account
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Join the digital examination and evaluation portal
          </p>
        </div>

        {/* Card */}
        <div className="bg-white py-8 px-6 sm:px-8 shadow-sm border border-slate-200 rounded-2xl">
          {localError && (
            <div className="mb-5 flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <span>{localError}</span>
            </div>
          )}

          {/* Quick Google Sign-In / Activation */}
          <div className="mb-5">
            <p className="text-[11px] text-slate-500 mb-2 text-center font-medium">
              Already pre-registered on the college roster?
            </p>
            <GoogleLoginButton
              onAuthSuccess={handleGoogleSuccess}
              onAuthError={(err) => setLocalError(err)}
            />
          </div>

          <div className="relative mb-5 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <span className="relative bg-white px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Or Register Manually
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Role Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                I am Registering As
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData((p) => ({ ...p, role: 'student' }));
                    setEmailVerified(false);
                    setEmailVerifySuccess(null);
                    setEmailVerifyError(null);
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    isStudent
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Student</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData((p) => ({ ...p, role: 'teacher' }));
                    setEmailVerified(false);
                    setEmailVerifySuccess(null);
                    setEmailVerifyError(null);
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    !isStudent
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Teacher / Faculty</span>
                </button>
              </div>

              {!isStudent && (
                <div className="mt-2.5 p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                  <p className="font-bold flex items-center gap-1 text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Faculty Authorization Required</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-blue-700">
                    Faculty emails must be pre-authorized by your College Administrator in the college database.
                  </p>
                </div>
              )}
            </div>

            {/* College Code Verification */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                College Code (Unique ID)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <School className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="collegeCode"
                    value={formData.collegeCode}
                    onChange={handleChange}
                    placeholder="e.g. TEST_COLLAGE or ENG01"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase font-mono font-bold transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleVerifyCollege}
                  disabled={verifyingCollege || !formData.collegeCode.trim()}
                  className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 font-bold rounded-xl text-xs transition flex items-center gap-1.5 shrink-0"
                >
                  {verifyingCollege ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Verify Code</span>
                </button>
              </div>

              {collegeError && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{collegeError}</span>
                </p>
              )}

              {verifiedCollege && (
                <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">{verifiedCollege.name}</span>
                    <span className="text-emerald-600 ml-1 font-mono">({verifiedCollege.code})</span>
                  </div>
                </div>
              )}
            </div>

            {/* Student Specific Fields */}
            {isStudent && verifiedCollege && (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Academic Branch / Department
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <FolderTree className="w-4 h-4" />
                    </div>
                    <select
                      name="departmentId"
                      value={formData.departmentId}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition"
                    >
                      <option value="">-- Select Your Branch --</option>
                      {availableDepartments.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Enrolled Curriculum Subjects Preview */}
                {selectedDeptSubjects.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Enrolled Curriculum ({selectedDeptSubjects.length} Subjects)</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 p-2 bg-slate-50/70 border border-slate-200 rounded-xl max-h-32 overflow-y-auto">
                      {selectedDeptSubjects.map((sub, idx) => (
                        <div
                          key={sub._id || sub.code || idx}
                          className="bg-white p-1.5 px-2.5 rounded-lg border border-slate-200/60 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono font-bold text-indigo-600 text-[11px]">
                              {sub.code}
                            </span>
                            <span className="text-slate-800 font-medium truncate">{sub.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Enrolment Number */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    University Enrolment / Roll Number
                  </label>
                  <input
                    type="text"
                    name="rollNumber"
                    value={formData.rollNumber}
                    onChange={handleChange}
                    placeholder="e.g. 0801CA231001"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold uppercase transition"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Must match your official enrolment number uploaded by your college administrator.
                  </p>
                </div>
              </div>
            )}

            {/* Common Details: Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={isStudent ? 'e.g. Rahul Sharma' : 'Prof. John Doe'}
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            {/* Email Address + Verify Email Button for Students */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="student@college.edu"
                    required
                    className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                      emailVerified ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-300'
                    }`}
                  />
                </div>

                {/* VERIFY EMAIL BUTTON (for Students) */}
                {isStudent && (
                  <button
                    type="button"
                    onClick={handleVerifyStudentEmail}
                    disabled={
                      verifyingEmail ||
                      !formData.collegeCode.trim() ||
                      !formData.rollNumber.trim() ||
                      !formData.email.trim()
                    }
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                      emailVerified
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50'
                    }`}
                    title="Verify email against official college roster"
                  >
                    {verifyingEmail ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : emailVerified ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Verified</span>
                      </>
                    ) : (
                      <span>Verify Email</span>
                    )}
                  </button>
                )}
              </div>

              {/* Email Verification Feedback */}
              {isStudent && emailVerifySuccess && (
                <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{emailVerifySuccess}</span>
                </div>
              )}

              {isStudent && emailVerifyError && (
                <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-xl space-y-1.5 text-xs text-red-700">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{emailVerifyError}</span>
                  </div>
                  <div className="pt-1 border-t border-red-200/60 flex items-center justify-between">
                    <span className="text-[11px] text-red-600 font-medium">Not on roster or wrong email?</span>
                    <button
                      type="button"
                      onClick={() => setShowAccessModal(true)}
                      className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1"
                    >
                      <HelpCircle className="w-3 h-3" />
                      <span>Request Access / Fix</span>
                    </button>
                  </div>
                </div>
              )}

              {isStudent && !emailVerified && !emailVerifyError && (
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Students can only register with their official roster email.</span>
                  <button
                    type="button"
                    onClick={() => setShowAccessModal(true)}
                    className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    Request Access
                  </button>
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || (isStudent && (!verifiedCollege || !emailVerified))}
              className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-sm shadow-sm transition flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                'Create Account & Access Portal'
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-indigo-600 hover:text-indigo-500 transition"
              >
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Access Request / Roster Dispute Modal */}
      <AccessRequestModal
        isOpen={showAccessModal}
        onClose={() => setShowAccessModal(false)}
        initialCollegeCode={formData.collegeCode}
        initialEnrolmentNo={formData.rollNumber}
        initialEmail={formData.email}
        initialName={formData.name}
        initialReasonType={emailVerifyError?.includes('mismatch') ? 'email_mismatch' : 'missing_roster'}
      />
    </div>
  );
};

export default RegisterPage;
