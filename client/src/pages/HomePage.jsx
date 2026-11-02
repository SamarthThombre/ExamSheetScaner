import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FileScan,
  ShieldCheck,
  Award,
  Zap,
  BarChart3,
  Layers,
  CheckCircle2,
  Lock,
  ArrowRight,
  BookOpen,
  School,
  GraduationCap,
  Users,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Sparkles,
  Search,
  LogIn
} from 'lucide-react';

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Role Switcher for "How to Use" Guide
  const [selectedRole, setSelectedRole] = useState('teacher'); // 'teacher' | 'admin' | 'student'
  
  // Interactive FAQ state
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const roleWorkflows = {
    teacher: {
      title: 'Subject Evaluator & Teacher Workflow',
      badge: 'Grading & Outcome Governance',
      description: 'Streamline post-exam grading from physical paper bundles to NBA-compliant Course Outcome exports in minutes.',
      steps: [
        {
          number: '01',
          title: 'Create an Examination Batch',
          desc: 'Select your assigned subject code (e.g. CS101, MFCS), enter exam metadata, and specify target question marks (default 14 per question).',
          icon: Layers,
          color: 'text-indigo-600 bg-indigo-50 border-indigo-200'
        },
        {
          number: '02',
          title: 'Upload Multi-Page Exam Scans',
          desc: 'Scan the cover pages of your physical answer booklets into a single PDF or image package. The Python FastAPI OCR microservice isolates table cells and extracts Q1–Q5 marks automatically.',
          icon: FileScan,
          color: 'text-blue-600 bg-blue-50 border-blue-200'
        },
        {
          number: '03',
          title: 'Human-in-the-Loop "Save & Next" Console',
          desc: 'Open the dual-pane review console to audit optical scans against extracted marks side-by-side. Use keyboard-driven "Save & Next" to confirm marks and transition sheets into "Verified" status.',
          icon: Zap,
          color: 'text-amber-600 bg-amber-50 border-amber-200'
        },
        {
          number: '04',
          title: 'Reconcile Roster & Catch Missing Sheets',
          desc: 'Click "Student List" to cross-reference evaluated sheets against the official college roster. Immediately identify any absent or uncollected booklets before publishing.',
          icon: Search,
          color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
        },
        {
          number: '05',
          title: 'Publish Batch & Export Registrar Reports',
          desc: 'Click "Publish Batch" to trigger automated CO1–CO5 attainment formulas. Export registrar-ready CSV score sheets and multi-sheet SheetJS Excel reports with 1 click.',
          icon: FileSpreadsheet,
          color: 'text-purple-600 bg-purple-50 border-purple-200'
        }
      ]
    },
    admin: {
      title: 'College & Department Administrator Workflow',
      badge: 'Institutional Administration',
      description: 'Manage departmental academic structures, faculty subject assignments, and bulk student enrollment rosters.',
      steps: [
        {
          number: '01',
          title: 'Configure Departmental Subjects',
          desc: 'Define academic branches (MCA, CS, IT), session years (2023–24), and create standardized course subject codes for your institution.',
          icon: School,
          color: 'text-blue-600 bg-blue-50 border-blue-200'
        },
        {
          number: '02',
          title: 'Bulk Ingest Student Rosters (CSV)',
          desc: 'Upload class rosters in CSV format (Name, EnrolmentNo, Email) to pre-register students. Students can only register using their official assigned email.',
          icon: Users,
          color: 'text-indigo-600 bg-indigo-50 border-indigo-200'
        },
        {
          number: '03',
          title: 'Assign Authorized Faculty Evaluators',
          desc: 'Map course teachers to specific department subjects, ensuring strict multi-tenant evaluation boundaries and data integrity.',
          icon: BookOpen,
          color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
        },
        {
          number: '04',
          title: 'Monitor Institutional Attainment & Logs',
          desc: 'Access college-wide dashboards to monitor batch progression, passing percentages, faculty activity audit logs, and accreditation portfolios.',
          icon: BarChart3,
          color: 'text-purple-600 bg-purple-50 border-purple-200'
        }
      ]
    },
    student: {
      title: 'Student Marksheet & Grievance Workflow',
      badge: 'Protected Academic Records',
      description: 'Sign in with your enrollment credentials to inspect verified question breakdowns and submit transparent re-evaluation claims.',
      steps: [
        {
          number: '01',
          title: 'Register Student Account',
          desc: 'Create your account using your institutional email and assigned university enrolment number (e.g. 0801CA231001).',
          icon: GraduationCap,
          color: 'text-amber-600 bg-amber-50 border-amber-200'
        },
        {
          number: '02',
          title: 'Verify Official Roster Email',
          desc: 'Click "Verify Email" during registration to confirm your enrolment number matches the official college roster email uploaded by the administrator.',
          icon: CheckCircle2,
          color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
        },
        {
          number: '03',
          title: 'Inspect Detailed Question-Wise Marks',
          desc: 'Log in to view your sub-question scores (Q1 through Q5), grand total, passing status, and download official institutional PDF marksheets.',
          icon: Award,
          color: 'text-indigo-600 bg-indigo-50 border-indigo-200'
        },
        {
          number: '04',
          title: 'Raise Transparent Re-Evaluation Grievances',
          desc: 'If you notice a grading discrepancy or addition error, file a grievance directly to the subject evaluator. Track resolution status in real time.',
          icon: AlertCircle,
          color: 'text-purple-600 bg-purple-50 border-purple-200'
        }
      ]
    }
  };

  const faqs = [
    {
      q: 'How does official student email verification work?',
      a: 'The College Administrator uploads an official student CSV containing Student Name, Enrolment Number, and Email Address. During student registration, the system verifies that the student is using the exact official email registered on the college roster. Registration is strictly blocked for any other email.'
    },
    {
      q: 'Why is access to marks locked behind authentication?',
      a: 'In traditional portals, anyone with a roll number can snoop on another student\'s grades. ExamScanWeb treats examination marks as confidential student records. Unauthenticated access is blocked at both the frontend and backend levels. Each student can only view their own personal marksheets after logging in.'
    },
    {
      q: 'How does optical cover-page extraction work?',
      a: 'When an evaluator uploads a scanned PDF, our asynchronous Python FastAPI microservice renders the pages using PyMuPDF, applies OpenCV adaptive thresholding to detect the marks table grid, and runs Tesseract OCR to extract enrollment IDs and scores for Q1 through Q5 in seconds.'
    },
    {
      q: 'What is the Human-in-the-Loop "Save & Next" console?',
      a: 'Pure OCR alone is prone to misreading handwritten digits (e.g. mistaking 3 for 8). ExamScanWeb displays the actual physical scan on the left and editable fields on the right. Evaluators verify or adjust marks with instant total recalculation. Clicking "Save & Next" commits the score as "Verified" and immediately loads the next sheet in sequence.'
    },
    {
      q: 'How is Outcome-Based Education (OBE) / Course Outcome (CO) attainment computed?',
      a: 'Questions Q1–Q5 map directly to Course Outcomes CO1–CO5. For each student, percentage is calculated as (Marks / Max Marks) × 100. Attainment levels are assigned: Level 3 (≥65%), Level 2 (50%–64%), Level 1 (<50%). When a batch is published, class-wide averages are saved automatically and can be exported into multi-sheet Excel files.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-900 via-slate-900 to-slate-950 text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-indigo-500/10 blur-3xl pointer-events-none rounded-full" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Institutional Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-6 backdrop-blur-sm shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI-Assisted Exam Paper Evaluation & Outcome Governance</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight sm:leading-tight mb-6">
            Digitize Paper Exams.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-blue-200 to-indigo-400">
              Automate Outcome Attainment.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed mb-10">
            ExamScanWeb bridges physical descriptive answer sheets and institutional accreditation. 
            Extract handwritten marks with computer vision, guarantee 100% data fidelity with human-in-the-loop review, 
            automate NBA Course Outcome calculations, and protect student marks behind secure authentication.
          </p>

          {/* Unified Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
            {user ? (
              <button
                onClick={() => {
                  if (user.role === 'student') navigate('/student/portal');
                  else if (['college_admin', 'super_admin'].includes(user.role)) navigate('/admin/college');
                  else navigate('/batches');
                }}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5"
              >
                <span>Go to Dashboard ({user.name})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </Link>

                <a
                  href="#how-to-use"
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white font-bold rounded-2xl border border-white/20 transition backdrop-blur-sm"
                >
                  <BookOpen className="w-4 h-4 text-indigo-300" />
                  <span>How to Use the Site</span>
                </a>
              </>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto pt-6 border-t border-slate-800/80 text-left">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <span className="text-2xl font-black text-indigo-400 block">93.6%</span>
              <span className="text-xs text-slate-400 font-medium">Faster Tabulation (4.5h → 17m)</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <span className="text-2xl font-black text-emerald-400 block">100%</span>
              <span className="text-xs text-slate-400 font-medium">Verified Transcript Accuracy</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <span className="text-2xl font-black text-amber-400 block">CO1–CO5</span>
              <span className="text-xs text-slate-400 font-medium">Instant NBA Attainment Levels</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <span className="text-2xl font-black text-blue-400 block">Verified Email</span>
              <span className="text-xs text-slate-400 font-medium">College Roster Bound Registration</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SECURITY NOTICE: MARKS ARE PROTECTED */}
      <section className="max-w-6xl mx-auto px-4 -mt-8 relative z-20">
        <div className="bg-white border border-amber-200/80 shadow-md rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-slate-800">
            <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Examination Marks Are Strictly Protected</span>
                <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full uppercase">
                  Login Required
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Public unauthenticated marks lookup has been blocked. Sign in to your account to inspect verified marks.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/login"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. CORE USE CASES & PILLARS */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            Platform Capabilities
          </span>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-3">
            Built for Academic Evaluation Integrity
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Four specialized engines designed to handle every phase of the descriptive exam evaluation lifecycle.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pillar 1 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-5">
              <FileScan className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              1. Optical Cover-Page Digitisation
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Upload multi-page exam scans directly as PDF or image bundles. Our Python microservice uses PyMuPDF, OpenCV adaptive binarization, and Tesseract OCR to extract enrollment IDs and Q1–Q5 sub-question marks in memory without disk clutter.
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
              <span className="px-2.5 py-1 bg-slate-100 rounded-lg">PyMuPDF 300 DPI</span>
              <span className="px-2.5 py-1 bg-slate-100 rounded-lg">OpenCV Morphological Filtering</span>
              <span className="px-2.5 py-1 bg-slate-100 rounded-lg">Tesseract PSM 6</span>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-5">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              2. Human-in-the-Loop "Save & Next" Console
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Never gamble on unverified OCR results. Evaluators inspect high-resolution optical scans alongside editable inputs. Scores recalculate live, and clicking "Save & Next" atomically commits scores and marks the sheet as "Verified".
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
              <span className="px-2.5 py-1 bg-slate-100 rounded-lg">Side-by-Side Zoom View</span>
              <span className="px-2.5 py-1 bg-slate-100 rounded-lg">Keyboard Shortcuts (Enter)</span>
              <span className="px-2.5 py-1 bg-slate-100 rounded-lg">Atomic Verified Status</span>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 mb-5">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              3. Automated OBE Course Outcome (CO) Engine
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Eliminate weeks of tedious spreadsheet calculations. The platform automatically maps Q1–Q5 to CO1–CO5, applies attainment thresholds (Level 3 for ≥65%, Level 2 for ≥50%), and generates two-sheet SheetJS Excel reports for NBA audits.
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
              <span className="px-2.5 py-1 bg-slate-100 rounded-lg">NBA / OBE Compliant</span>
              <span className="px-2.5 py-1 bg-slate-100 rounded-lg">Student & Class Averages</span>
              <span className="px-2.5 py-1 bg-slate-100 rounded-lg">Multi-Sheet Excel Export</span>
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              4. Verified Roster Security & Grievances
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              College administrators upload official student rosters with name, enrolment number, and email. Students can only register with their official email, and marks are strictly isolated per student.
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
              <span className="px-2.5 py-1 bg-slate-100 rounded-lg">Roster Bound Emails</span>
              <span className="px-2.5 py-1 bg-slate-100 rounded-lg">Re-Evaluation Ticketing</span>
              <span className="px-2.5 py-1 bg-slate-100 rounded-lg">PDF Statement of Marks</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE "HOW TO USE" ROLE-BASED GUIDE */}
      <section id="how-to-use" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-20">
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
          {/* Subtle decoration */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-300 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-400/30">
              Interactive Guide
            </span>
            <h2 className="text-3xl font-black tracking-tight mt-3">
              How to Use ExamScanWeb
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2">
              Select your role below to explore the exact creative step-by-step workflow tailored for your tasks.
            </p>

            {/* Role Switcher Tabs */}
            <div className="inline-flex p-1.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 mt-6 shadow-inner">
              <button
                onClick={() => setSelectedRole('teacher')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  selectedRole === 'teacher'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Teacher / Evaluator</span>
              </button>

              <button
                onClick={() => setSelectedRole('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  selectedRole === 'admin'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <School className="w-3.5 h-3.5" />
                <span>College Admin</span>
              </button>

              <button
                onClick={() => setSelectedRole('student')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  selectedRole === 'student'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Student</span>
              </button>
            </div>
          </div>

          {/* Workflow Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 bg-indigo-500/30 text-indigo-300 rounded border border-indigo-400/40">
                  {roleWorkflows[selectedRole].badge}
                </span>
                <h3 className="text-lg font-bold text-white">
                  {roleWorkflows[selectedRole].title}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {roleWorkflows[selectedRole].description}
              </p>
            </div>

            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition"
            >
              <span>Login to continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Workflow Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roleWorkflows[selectedRole].steps.map((st, idx) => {
              const IconComp = st.icon;
              return (
                <div
                  key={idx}
                  className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 hover:bg-slate-800 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-black text-indigo-400">
                        {st.number}
                      </span>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${st.color}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1.5">
                      {st.title}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {st.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. COMPARISON TABLE: TRADITIONAL VS EXAMSCANWEB */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Why ExamScanWeb is Better
          </h2>
          <p className="text-xs text-slate-500 mt-1.5">
            A direct comparison between traditional clerical grading and our modern automated pipeline.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-6">Evaluation Feature</th>
                  <th className="py-4 px-6 text-slate-400">Traditional / Paper Grading</th>
                  <th className="py-4 px-6 text-indigo-600 bg-indigo-50/50">ExamScanWeb Pipeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-4 px-6 font-bold text-slate-900">Marks Extraction Speed</td>
                  <td className="py-4 px-6 text-slate-500">4.5 hours per 100 booklets (manual entry)</td>
                  <td className="py-4 px-6 font-bold text-indigo-600 bg-indigo-50/20">
                    17.2 minutes with OCR + Save & Next (93.6% faster)
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-bold text-slate-900">Clerical Transcription Errors</td>
                  <td className="py-4 px-6 text-red-600">5.2% error rate in manual entry</td>
                  <td className="py-4 px-6 font-bold text-emerald-600 bg-indigo-50/20">
                    0.0% (100% verified fidelity post review)
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-bold text-slate-900">NBA / OBE CO Attainment</td>
                  <td className="py-4 px-6 text-slate-500">Days of manual Excel formula crafting</td>
                  <td className="py-4 px-6 font-bold text-indigo-600 bg-indigo-50/20">
                    Instant automated computation upon batch publish
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-bold text-slate-900">Missing Scripts Accounting</td>
                  <td className="py-4 px-6 text-slate-500">Discovered late at semester end</td>
                  <td className="py-4 px-6 font-bold text-indigo-600 bg-indigo-50/20">
                    1-Click Roster Reconciliation catches missing scripts
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-bold text-slate-900">Marks Privacy & Student Access</td>
                  <td className="py-4 px-6 text-slate-500">Public notice boards or unauthenticated lookups</td>
                  <td className="py-4 px-6 font-bold text-indigo-600 bg-indigo-50/20">
                    Strict student authentication required (zero leakage)
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-bold text-slate-900">Registrar Export Compliance</td>
                  <td className="py-4 px-6 text-slate-500">Fragmented manual CSV spreadsheets</td>
                  <td className="py-4 px-6 font-bold text-indigo-600 bg-indigo-50/20">
                    Single-click registrar CSV + formatted multi-sheet Excel
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 6. INTERACTIVE FAQ SECTION */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center mb-10">
          <div className="inline-flex w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 items-center justify-center mb-3">
            <HelpCircle className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Common questions regarding optical processing, privacy, and accreditation.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition shadow-sm"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full py-4 px-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900 hover:text-indigo-600 transition"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                    openFaq === idx ? 'rotate-180 text-indigo-600' : ''
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 7. BOTTOM CTA SECTION */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-3xl p-8 sm:p-12 text-white text-center shadow-lg">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">
            Ready to Digitize Your Institution's Exams?
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100 max-w-xl mx-auto mb-8 leading-relaxed">
            Experience fast optical evaluation, automated Course Outcome calculations, and confidential student marks governance today.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login"
              className="px-8 py-3.5 bg-white text-indigo-700 font-bold rounded-2xl text-xs shadow hover:bg-indigo-50 transition transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </Link>
            <Link
              to="/register"
              className="px-8 py-3.5 bg-indigo-700/60 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs border border-indigo-400/40 transition"
            >
              Register
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
