# ExamScanWeb — Comprehensive User Manual & Operations Guide

Welcome to the **ExamScanWeb** operations guide. This manual provides detailed, step-by-step instructions for all platform roles: **Students**, **Teachers / Evaluators**, **College Administrators**, and **Super Administrators**.

---

## 📑 Table of Contents
1. [For Students](#1-for-students)
   - [Account Registration & Roster Verification](#11-account-registration--roster-verification)
   - [One-Click Google Sign-In](#12-one-click-google-sign-in)
   - [Requesting Access / Fixing Roster Discrepancies](#13-requesting-access--fixing-roster-discrepancies)
   - [Viewing Protected Marksheets & Answer Papers](#14-viewing-protected-marksheets--answer-papers)
   - [Raising a Marksheet Grievance / Re-evaluation](#15-raising-a-marksheet-grievance--re-evaluation)
2. [For Teachers & Evaluators](#2-for-teachers--evaluators)
   - [Logging in & Teacher Dashboard](#21-logging-in--teacher-dashboard)
   - [Creating an Exam Batch](#22-creating-an-exam-batch)
   - [Uploading Physical Answer Sheets for OCR](#23-uploading-physical-answer-sheets-for-ocr)
   - [Reviewing OCR Scores & Manual Adjustments](#24-reviewing-ocr-scores--manual-adjustments)
   - [Resolving Student Grievances](#25-resolving-student-grievances)
   - [Publishing Batches & Exporting Analytics](#26-publishing-batches--exporting-analytics)
3. [For College Administrators](#3-for-college-administrators)
   - [College Profile & Institution Code](#31-college-profile--institution-code)
   - [Departments & Subject Curriculum](#32-departments--subject-curriculum)
   - [Bulk Importing Student Roster (CSV)](#33-bulk-importing-student-roster-csv)
   - [Managing Student Access & Roster Dispute Requests](#34-managing-student-access--roster-dispute-requests)
   - [Faculty Onboarding & Subject Assignment](#35-faculty-onboarding--subject-assignment)
   - [Compliance Audit Log](#36-compliance-audit-log)
4. [For Super Administrators](#4-for-super-administrators)

---

## 1. For Students

### 1.1 Account Registration & Roster Verification
To protect examination privacy, students can only register if their official email address has been uploaded by their College Administrator.

1. Navigate to `/register` or click **Register** on the top navigation bar.
2. Under **I am Registering As**, select **Student**.
3. Enter your **College Code** (e.g. `SGS`) and click **Verify College**. The system will load your institution and available branches.
4. Select your **Academic Branch / Department** and type your **University Enrolment Number** (e.g. `0801CA231001`).
5. Enter your full name and official email address.
6. Click **Verify Email**:
   - ✅ **Success**: A green badge will display: *"Email verified! Matches official college roster for [Name]"*.
   - ❌ **Mismatch / Missing**: If the email doesn't match the college roster or your roll number is not found, an alert will appear with an action button: **"Request Access / Fix"**.
7. Create a secure password and submit the form.

---

### 1.2 One-Click Google Sign-In
If your email address is on the official college roster, you can activate and log into your account using Google:
1. Go to `/login` or `/register`.
2. Click **Continue with Google**.
3. Choose your Google account in the popup.
4. The system cryptographically confirms your email and automatically links your account to your student enrollment number and branch.

---

### 1.3 Requesting Access / Fixing Roster Discrepancies
If your roll number was omitted from the roster or your official email was updated:
1. Click **"Request Access"** on the registration page or in the error alert.
2. In the popup modal, fill in:
   - College Code
   - Enrolment Number
   - Full Student Name
   - Email you wish to bind to your account
   - Issue Type (*Not on roster*, *Email mismatch*, *Branch change*)
   - Any notes or transfer admission context.
3. Click **Submit Request**.
4. Your College Administrator will be immediately notified in their admin portal. Once approved, you can register or sign in instantly.

---

### 1.4 Viewing Protected Marksheets & Answer Papers
1. Sign in to your student account.
2. Click **My Marksheets** in the top navigation bar.
3. Your official statement of marks displays all completed subjects, question-wise score breakdown (Q1–Q5), total marks, and letter grades.
4. Click **View Scanned Paper** to inspect the high-resolution scanned physical answer book with marked evaluation scores.
5. Click **Download Official PDF** to generate an jsPDF certified marksheet certificate for your records.

---

### 1.5 Raising a Marksheet Grievance / Re-evaluation
If you spot an addition error or discrepancy on your scanned paper:
1. Navigate to **Grievance Portal** (`/student/portal`).
2. Click **Raise Grievance**.
3. Select the subject and specific question (e.g. Q3), and explain the issue with supporting remarks.
4. Your subject teacher will review your request and can adjust your verified score.

---

## 2. For Teachers & Evaluators

### 2.1 Logging in & Teacher Dashboard
1. Log in at `/login` with your faculty credentials.
2. Your home dashboard displays:
   - Your assigned academic departments and subjects.
   - Ongoing and past examination batches.
   - Pending student grievance alerts.

---

### 2.2 Creating an Exam Batch
1. Click **New Batch** (`/batches/new`).
2. Enter the **Batch Name** (e.g. `MCA Sem 1 Mid-Term 2026`).
3. Select your assigned **Subject** and specify the **Academic Session**.
4. Configure exam scoring rubric:
   - Maximum Marks (e.g. `50`)
   - Pass Threshold (e.g. `20`)
   - Question count and individual weightings (Q1–Q5).
5. Click **Create Batch**.

---

### 2.3 Uploading Physical Answer Sheets for OCR
1. Open your newly created batch.
2. Click **Upload Scans**.
3. Drag and drop scanned answer book front sheets (JPG, PNG, or PDF).
4. The backend streams the files to the Python FastAPI OCR service, detecting:
   - Handwritten Enrollment IDs
   - Marks table grids
   - Question scores and totals.
5. As sheets complete evaluation, they appear in your **Evaluated Sheets** table with confidence ratings.

---

### 2.4 Reviewing OCR Scores & Manual Adjustments
1. In the batch sheets table, click **Review / Edit** on any paper.
2. A split-screen modal displays:
   - **Left**: Scanned physical answer sheet with zoom and pan controls.
   - **Right**: Extracted question marks (Q1–Q5) and total score.
3. If handwriting was ambiguous, manually correct any question score. Total score recalculates in real-time.
4. Click **Verify Sheet**. The paper status updates to **Verified**.

---

### 2.5 Resolving Student Grievances
1. Click **Grievances** in the navbar to open pending student review requests.
2. Inspect the student's remarks side-by-side with the scanned answer paper.
3. Click **Accept & Adjust Score** to update their marks, or **Reject Grievance** with feedback.

---

### 2.6 Publishing Batches & Exporting Analytics
1. When all sheets are verified, click **Publish Batch**.
2. Results become visible to verified students.
3. Export comprehensive reports:
   - **Download Excel / CSV**: Complete tabular roll-wise marks listing.
   - **Performance Charts**: Pass/fail ratio, score distribution bell curve, and question difficulty comparison.

---

## 3. For College Administrators

### 3.1 College Profile & Institution Code
Under the **College Profile & Code** tab in the College Admin Console (`/admin`):
- View your institution's assigned unique **College Code** (e.g. `SGS`). Students and teachers use this code during registration.
- Update institutional details (name, campus address).

---

### 3.2 Departments & Subject Curriculum
1. Click **Departments & Subjects**.
2. Add academic departments (e.g. `Computer Applications`, `Civil Engineering`).
3. Add subjects under each department with their course codes, maximum marks, and passing criteria.

---

### 3.3 Bulk Importing Student Roster (CSV)
To allow students to register and sign in:
1. Open the **Student Roster** tab.
2. Click **CSV Template** to download the recommended template:
   ```csv
   Student Name,Enrollment No,Email,Department,Session
   Aanand Kushwah,0801CA231001,aanand@college.edu,MCA,2023-24
   Aashish Chouhan,0801CA231002,aashish@college.edu,MCA,2023-24
   ```
   *(Department and Session columns are optional; Student Name, Enrollment No, and Email are required).*
3. Click **Import Student CSV** and select your file.
4. The system validates and registers the students. Students will strictly only be able to register with these emails.

---

### 3.4 Managing Student Access & Roster Dispute Requests
When students encounter roster mismatches or missing admission entries, their submissions appear under **Access Requests**:
1. Open the **Access Requests** tab.
2. Review pending requests showing student name, roll number, requested email, and reason.
3. Actions:
   - **Approve**: With one click, the system approves the request and **automatically upserts the student into the active roster**. The student can now register or use Google login immediately.
   - **Reject**: Rejects the request with an optional administrator note.

---

### 3.5 Faculty Onboarding & Subject Assignment
1. Open the **Teachers & Faculty** tab.
2. Click **Add Teacher** to pre-register faculty email and initial credentials.
3. Click **Assign Subjects** to link instructors to their departmental subjects.

---

### 3.6 Compliance Audit Log
Click **Audit Log** to inspect an immutable timeline of system activities, including sheet mark modifications, grievance settlements, batch publications, and roster approvals with exact timestamps and administrator IDs.

---

## 4. For Super Administrators

Super Administrators have platform-wide authority:
- **Institutions Network**: Register new universities and colleges, generating their institutional codes.
- **Global Health Monitoring**: Review uptime of the Node backend, Python OCR microservice, and MongoDB connection.
- **Platform Analytics**: Total evaluated sheets, active examination sessions, and cross-college performance metrics.
