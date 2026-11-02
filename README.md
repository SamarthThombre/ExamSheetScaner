# ExamScanWeb — Full-Stack Examination Marks Management Platform

ExamScanWeb is a complete MERN stack web platform designed to streamline the evaluation, digitisation, and management of physical exam answer sheets. It bridges an automated Python FastAPI OCR engine with role-based evaluation workflows for teachers, institutional oversight for college and university administrators, and a public results portal for students.

---

## 🏛️ System Architecture

```
[React 18 + Vite :5173]
       │
       ▼  REST API (JSON + httpOnly JWT Cookie)
[Express Server :5000]
       │
       ├──► [Python FastAPI OCR :8000] (Internal Microservice)
       │
       ▼
[MongoDB Database] (Mongoose ODM)
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (tested on v24)
- **MongoDB**: Running locally on port `27017` or via MongoDB Atlas URI
- **Python OCR Service**: (Optional for mock testing; runs on port `8000`)

### 1. Backend Setup
```bash
cd server
npm install
cp .env.example .env
npm run dev
```
*Backend runs on `http://localhost:5000`.*

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 👥 Role-Based Access Control

| Role | Permissions & Access Scope |
|---|---|
| `super_admin` | Global platform governance, institution network registration, system KPI tracking |
| `college_admin` | Department & faculty management, student CSV roster uploads, access request reviews |
| `teacher` | Exam batch creation, multi-sheet scan uploads, OCR evaluation, grievance resolution |
| `student` | Roster-locked registration, Google login, protected marksheet access, grievances |

---

## 📚 Documentation

Detailed documentation is available in the [`docs/`](docs/) directory:
* **[Unified Single-Server Deployment Guide](docs/DEPLOYMENT_GUIDE.md)**: Step-by-step instructions on what to deploy, server setup, PM2 process management, and production configuration.
* **[Developer Architecture & Engineering Guide](docs/DEVELOPER_GUIDE.md)**: System topology, microservices, database models, security architecture, environment configuration, and complete REST API reference.
* **[Comprehensive User Manual & Operations Guide](docs/USER_MANUAL.md)**: Step-by-step role guides for Students, Teachers, College Administrators, and Super Administrators.

---

## 🔒 Key Security & Administrative Features

- **Strict Student Roster & Email Locking**: College Administrators upload student rosters via CSV (`Student Name, Enrollment No, Email`). Students are strictly restricted to registering only with their assigned official email.
- **Self-Service Access & Roster Dispute Requests**: Students not found in the roster or with email discrepancies can submit access requests from the login/register screens. College Admins review and approve them with one-click automatic roster synchronization.
- **Zero-Trust Google OAuth**: One-click Google Sign-in verifies credentials server-side with `google-auth-library` and enforces roster checks without requiring an institutional domain.
- **Protected Marksheets & Digital Answer Sheets**: Student grades are strictly guarded behind authentication; students can inspect their scanned physical answer sheets and raise question-level grievances.

---

## 📋 Comprehensive Stage Roadmap Completed

- **Stage 1 — Auth Skeleton & Infrastructure** (`report.txt`)
  - Express server, Mongoose connection, User & College models, JWT httpOnly cookie auth, role middleware, error handler, OCR health ping.
- **Stage 2 — Core Data Models & CRUD** (`result2.txt`)
  - Batch & Sheet schemas, role-scoped batch queries, question state tracking, aggregation stats pipeline.
- **Stage 3 — Python OCR Integration & Upload Pipeline** (`plan3.txt` · `result3.txt`)
  - Multer upload filtering, Node.js native FormData bridge to Python FastAPI `POST /v2/predict`, automated status derivation, temp file cleanup.
- **Stage 4 — React Authentication UI** (`plan4.txt` · `result4.txt`)
  - React 18, Vite, TailwindCSS, Axios with `withCredentials: true`, AuthContext session restore, ProtectedRoute, Login & Register views.
- **Stage 5 — Teacher Dashboard & Evaluation Workflow** (`plan5.txt` · `result5.txt`)
  - Batch management cards, drag-and-drop scan uploader, evaluated sheets table with filters, manual mark correction modal.
- **Stage 6 — Batch Performance Analytics** (`plan6.txt` · `result6.txt`)
  - Recharts integration: Q1–Q5 comparative bar charts, Pass/Fail donut chart, marks distribution histogram, sequential score trendline.
- **Stage 7 — Student Portal, PDF Marksheets & Admin Panels** (`plan7.txt` · `result7.txt`)
  - Public roll number lookup, jsPDF official statement of marks generator, CSV exporter, College Admin console, Super Admin console.

---

## 🧪 Automated Testing & Verification

All stages have undergone automated integration tests:
- `server/test_stage2.js`: Batch and sheet CRUD scoping tests (11/11 passed).
- `server/test_stage3.js`: OCR upload pipeline and cleanup tests (5/5 passed).
- `server/test_stage7.js`: Public student lookup and admin management tests (5/5 passed).
- `client`: Production build (`npm run build`) compiles with zero errors.
