# ExamScanWeb — Developer Architecture & Engineering Guide

This document provides a comprehensive technical overview of **ExamScanWeb** for developers, DevOps engineers, and system architects.

---

## 1. System Architecture & Topology

ExamScanWeb operates as a distributed three-tier microservice architecture:

```
[ Client Application ] (React 18 + Vite :5173)
         │
         │  HTTP / REST (JSON + httpOnly Secure Cookies)
         ▼
[ Primary Backend ] (Node.js / Express :5000)
         │
         ├──► [ OCR Engine ] (Python FastAPI :8000) (Internal Microservice)
         │
         ▼
[ Persistence Store ] (MongoDB :27017)
```

### Component Breakdown
1. **Frontend (`client/`)**: Single Page Application (SPA) built with React 18, Vite, Tailwind CSS, Lucide Icons, and Recharts. Connects to backend via Axios with `withCredentials: true`.
2. **Core Backend (`server/`)**: Express.js REST API providing authentication, session management, role-based access control (RBAC), database synchronization, and Multer file streaming.
3. **OCR Engine (`python/exam_paper_extractor/`)**: High-performance Python FastAPI service running OpenCV and OCR models for table detection, handwritten digit recognition, and bounding-box extraction from examination answer books.
4. **Database (`MongoDB`)**: Document database storing institutional records, faculty and student accounts, college rosters, scan sheets, access requests, and audit trails.

---

## 2. Technology Stack & Dependencies

| Layer | Technologies Used | Key Libraries |
|---|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS | `axios`, `react-router-dom`, `recharts`, `lucide-react`, `jspdf`, `xlsx` |
| **Backend** | Node.js (v18+), Express 4 | `mongoose`, `jsonwebtoken`, `bcryptjs`, `cookie-parser`, `csv-parse`, `multer`, `google-auth-library` |
| **AI / OCR** | Python 3.10+, FastAPI | `uvicorn`, `opencv-python`, `numpy`, `pillow`, `pydantic` |
| **Storage** | MongoDB 6+ / 8+ | Mongoose ODM with indexed collections |

---

## 3. Database Schema & Data Dictionary

### Core Collections
* **`Colleges`**: Stores institution name, unique institution code (`code`), and physical address.
* **`Departments`**: Academic branches associated with a college, including assigned subjects (`code`, `name`, `maxMarks`, `passMarks`).
* **`Users`**: Multi-role user accounts (`student`, `teacher`, `college_admin`, `super_admin`). Contains hashed passwords, college reference, department reference, enrollment IDs, and enrolled/assigned subjects.
* **`StudentRoster`**: College admin-managed roster used to strictly pre-verify students prior to account creation (`name`, `enrolmentNo`, `email`, `department`, `session`, `isRegistered`).
* **`AccessRequests`**: Self-service student access and roster dispute requests (`college`, `name`, `enrolmentNo`, `email`, `department`, `requestType`, `reason`, `status: pending/approved/rejected`, `adminRemarks`, `resolvedBy`).
* **`Batches`**: Exam batches created by teachers containing subject details, academic session, status (`draft`, `in_progress`, `evaluated`, `published`), and aggregate analytics.
* **`Sheets`**: Individual scanned student answer papers belonging to a batch, containing OCR confidence, extracted question scores (Q1–Q5), total score, verification status, and student binding.
* **`Issues`**: Student grievances filed against evaluated answer sheets, tracking status (`pending`, `in_review`, `resolved`, `rejected`), proposed mark adjustments, and teacher responses.
* **`AuditLogs`**: Immutable log recording administrative actions, score modifications, and access request approvals.

---

## 4. Authentication & Security Architecture

### 4.1 JWT HttpOnly Cookie Session
Authentication does not expose JWT tokens to JavaScript or localStorage. Upon successful authentication, the server emits a secure, HTTP-only cookie named `jwt`:
* `httpOnly: true` (Blocks cross-site scripting / XSS token exfiltration)
* `sameSite: 'lax'` (Cross-site request forgery / CSRF protection)
* `maxAge: 7 days`

### 4.2 Strict Student Email & Roster Locking
To prevent student identity spoofing or unauthorized marks access:
1. College Admins bulk-upload or approve the student roster via CSV (`Student Name, Enrollment No, Email`).
2. Students can **only** register with the exact official email uploaded by the administrator.
3. Registration queries `StudentRoster` and returns `403 Forbidden` if an email mismatch or missing record is detected.

### 4.3 Google OAuth Zero-Trust Implementation
* **Zero Client Forgery**: Client sends only the Google-issued signed ID token (`credential`).
* **Backend Verification**: Server verifies the token signature, audience, and `email_verified: true` using `google-auth-library`.
* **Zero Open Registration**: Unrecognized Google accounts are not permitted to register. The verified Google email must match an entry in `StudentRoster` or a pre-registered faculty record; otherwise, access is refused with `403 Forbidden`.

---

## 5. Microservice Communication: Express & Python OCR

When a teacher uploads answer sheets to an exam batch:
1. Express intercepts files via `multer` (temporary disk buffering).
2. The server builds a multi-part form-data stream forwarded to the FastAPI OCR service:
   `POST http://localhost:8000/v2/predict`
3. Request includes security header: `x-api-key: <OCR_API_KEY>`.
4. FastAPI returns structured JSON containing bounding boxes, detected roll numbers, and question scores.
5. Express maps predictions into `Sheet` documents and deletes temporary files.

---

## 6. Complete API Reference

### 6.1 Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/college-branches?code=...` | Public | Fetches college details and academic branches by college code |
| `POST` | `/verify-student-email` | Public | Validates enrolment ID and email against college roster |
| `GET` | `/google/config` | Public | Returns Google OAuth client ID configuration |
| `POST` | `/google` | Public | Authenticates via Google ID token with roster check |
| `POST` | `/register` | Public | User registration with strict roster validation for students |
| `POST` | `/login` | Public | Email and password sign-in; issues `jwt` cookie |
| `POST` | `/logout` | Public | Clears `jwt` cookie |
| `GET` | `/me` | Private | Returns authenticated user profile |

### 6.2 Access Requests (`/api/access-requests`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/` | Public | Submits access request for missing/mismatched roster record |
| `GET` | `/status` | Public | Checks status of submitted access request |
| `GET` | `/admin` | College Admin | Lists college access requests with status and search filters |
| `PATCH` | `/admin/:id/approve` | College Admin | Approves request & automatically upserts `StudentRoster` |
| `PATCH` | `/admin/:id/reject` | College Admin | Rejects request with administrator remarks |

### 6.3 College Admin Operations (`/api/admin`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/stats` | Admin | Institutional metrics (departments, faculty, batches, scans) |
| `GET` | `/roster` | Admin | Retrieves student roster entries with branch filtering |
| `POST` | `/roster/import` | Admin | Bulk imports student CSV (`Student Name, Enrollment No, Email`) |
| `DELETE` | `/roster/:id` | Admin | Removes entry from student roster |
| `GET` | `/teachers` | Admin | Lists faculty members |
| `POST` | `/teachers` | Admin | Pre-registers faculty member |
| `GET` | `/audit` | Admin | Retrieves compliance audit log records |

### 6.4 Batches & Scans (`/api/batches`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/` | Teacher/Admin | Lists exam batches |
| `POST` | `/` | Teacher | Creates new exam batch |
| `POST` | `/:id/upload` | Teacher | Uploads answer book scans; triggers OCR pipeline |
| `GET` | `/:id/sheets` | Teacher/Admin | Lists evaluated answer sheets in batch |
| `PUT` | `/:batchId/sheets/:sheetId` | Teacher | Corrects extracted marks or question scores |
| `PATCH` | `/:id/publish` | Teacher | Publishes batch results to student portal |

### 6.5 Student Results & Grievances (`/api/results`, `/api/issues`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/results/lookup` | Authenticated Student | Retrieves protected marksheet and answer sheet scans |
| `POST` | `/api/issues` | Authenticated Student | Submits grievance / re-evaluation request for a sheet |
| `GET` | `/api/issues/my` | Authenticated Student | Lists student's submitted grievances |
| `PATCH` | `/api/issues/:id/resolve` | Teacher | Resolves or rejects grievance with score adjustment |

---

## 7. Local Environment Setup

### Environment Files
**`server/.env`**:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/examscanweb
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d
NODE_ENV=development
OCR_BASE_URL=http://localhost:8000
OCR_API_KEY=ep_admin_master_secret_key_deploy2
CLIENT_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

### Running the Services
1. **MongoDB**: `mongod --dbpath <data_dir>` (port 27017)
2. **Python OCR**:
   ```bash
   cd python/exam_paper_extractor
   .venv\Scripts\activate
   uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```
3. **Express Backend**:
   ```bash
   cd server
   node server.js
   ```
4. **Vite Frontend**:
   ```bash
   cd client
   npm run dev
   ```
