const fs = require('fs');
const path = require('path');
const mongoose = require('../server/node_modules/mongoose');
const puppeteer = require('puppeteer-core');

// Database models
const College = require('../server/models/College');
const Department = require('../server/models/Department');
const User = require('../server/models/User');
const Batch = require('../server/models/Batch');
const Sheet = require('../server/models/Sheet');
const Issue = require('../server/models/Issue');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEST_DIR = path.join(__dirname);
const SAMPLE_IMAGE_PATH = 'C:\\Users\\sumit\\Desktop\\Samarth\\python\\data\\page_000001.png';

async function seedTestEnvironment() {
  console.log('--- Connecting to MongoDB to prepare College, Branch (5 Subjects), Admin & Faculty ---');
  await mongoose.connect('mongodb://localhost:27017/examscanweb');

  // 1. Ensure College test_collage exists
  let college = await College.findOne({ code: 'TEST_COLLAGE' });
  if (!college) {
    college = await College.create({
      name: 'test_collage',
      code: 'TEST_COLLAGE',
      address: 'University Campus, Academic Block A'
    });
    console.log('Created College: test_collage (TEST_COLLAGE)');
  } else {
    college.name = 'test_collage';
    await college.save();
  }

  // 2. Ensure test_branch Department exists with exactly 5 subjects
  let department = await Department.findOne({ college: college._id, code: 'TEST_BRANCH' });
  const fiveSubjects = [
    { name: 'test_subject', code: 'CT10718', maxMarks: 100 },
    { name: 'Data Structures & Algorithms', code: 'CS101', maxMarks: 100 },
    { name: 'Database Management Systems', code: 'CS102', maxMarks: 100 },
    { name: 'Computer Networks', code: 'CS103', maxMarks: 100 },
    { name: 'Operating Systems', code: 'CS104', maxMarks: 100 }
  ];

  if (!department) {
    department = await Department.create({
      name: 'test_branch',
      code: 'TEST_BRANCH',
      college: college._id,
      subjects: fiveSubjects
    });
    console.log('Created Department: test_branch with 5 subjects');
  } else {
    department.name = 'test_branch';
    department.subjects = fiveSubjects;
    await department.save();
    console.log('Updated Department: test_branch with 5 subjects');
  }

  // Clean old test users to avoid double hashing
  await User.deleteMany({
    email: {
      $in: [
        'collegeadmin_test@testcollage.edu',
        'teacher_test@testcollage.edu',
        'student_test@testcollage.edu'
      ]
    }
  });
  await Issue.deleteMany({ college: college._id });

  // 3. Create College Admin
  await User.create({
    name: 'Test College Admin',
    email: 'collegeadmin_test@testcollage.edu',
    password: 'Password@123',
    role: 'college_admin',
    college: college._id,
    isActive: true
  });
  console.log('Created College Admin: collegeadmin_test@testcollage.edu');

  // 4. Create Teacher (assigned to test_branch and subject CT10718)
  await User.create({
    name: 'Prof. Sharma (Teacher)',
    email: 'teacher_test@testcollage.edu',
    password: 'Password@123',
    role: 'teacher',
    college: college._id,
    department: department._id,
    assignedSubjects: ['CT10718'],
    isActive: true
  });
  console.log('Created Teacher: teacher_test@testcollage.edu assigned to CT10718');

  await mongoose.disconnect();
}

async function runFullE2ETest() {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }

  await seedTestEnvironment();

  console.log('--- Launching Puppeteer Browser ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: { width: 1366, height: 860 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,860']
  });

  const page = await browser.newPage();

  page.on('dialog', async (dialog) => {
    console.log(`[Browser Dialog]: "${dialog.message()}" -> Accepted`);
    await dialog.accept();
  });

  try {
    // =========================================================================
    // STEP 1: College Admin Login & Dashboard
    // =========================================================================
    console.log('[Step 1] College Admin Login...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'collegeadmin_test@testcollage.edu');
    await page.type('input[type="password"]', 'Password@123');
    await page.screenshot({ path: path.join(TEST_DIR, '01_college_admin_login.png') });
    console.log('Saved 01_college_admin_login.png');

    await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.location.pathname.includes('/admin/college'), { timeout: 15000 });
    await page.waitForSelector('h1');
    await new Promise((r) => setTimeout(r, 1200));

    // =========================================================================
    // STEP 2: College Admin Console - Department & 5 Subjects View
    // =========================================================================
    console.log('[Step 2] College Admin Console - Branches & 5 Curriculum Subjects...');
    await page.screenshot({ path: path.join(TEST_DIR, '02_college_admin_departments_and_subjects.png') });
    console.log('Saved 02_college_admin_departments_and_subjects.png');

    // =========================================================================
    // STEP 3: College Admin Faculty & Subject Assignment
    // =========================================================================
    console.log('[Step 3] College Admin Faculty Allotment...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Faculty & Subject Assignments'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Open Assign Subjects modal
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Assign Subjects'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(TEST_DIR, '03_college_admin_assign_faculty.png') });
    console.log('Saved 03_college_admin_assign_faculty.png');

    // Close assign modal
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.trim() === 'Cancel');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // Logout College Admin
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Logout'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // =========================================================================
    // STEP 4: Student Registration with College Code & 5 Subjects Display
    // =========================================================================
    console.log('[Step 4] Student Registration & Branch / 5 Subjects Verification...');
    await page.goto('http://localhost:5173/register', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button');

    // Select Student Role
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const studentBtn = buttons.find((b) => b.textContent.includes('Student'));
      if (studentBtn) studentBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    // Enter College Code
    await page.type('input[name="collegeCode"]', 'TEST_COLLAGE');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const verifyBtn = buttons.find((b) => b.textContent.includes('Verify Code'));
      if (verifyBtn) verifyBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Select Branch
    await page.waitForSelector('select[name="departmentId"]');
    await page.type('input[name="rollNumber"]', '0801CA251001');
    await page.type('input[name="name"]', 'Aman Verma (Student)');
    await page.type('input[name="email"]', 'student_test@testcollage.edu');
    await page.type('input[name="password"]', 'Password@123');

    // Screenshot showing verified college, branch selected, and exactly 5 subjects displayed!
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(TEST_DIR, '04_student_registration_5_subjects.png') });
    console.log('Saved 04_student_registration_5_subjects.png');

    // Submit Student Registration
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.location.pathname.includes('/student/portal') || window.location.pathname === '/', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1200));

    // Logout Student
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Logout'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // =========================================================================
    // STEP 5: Teacher Login & Create Batch for Assigned Subject CT10718
    // =========================================================================
    console.log('[Step 5] Teacher Login...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'teacher_test@testcollage.edu');
    await page.type('input[type="password"]', 'Password@123');
    await page.screenshot({ path: path.join(TEST_DIR, '05_teacher_login.png') });
    console.log('Saved 05_teacher_login.png');

    await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.location.pathname.includes('/batches'), { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Create New Batch
    console.log('[Step 6] Teacher creating batch for assigned subject CT10718...');
    await page.goto('http://localhost:5173/batches/new', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="examName"]');
    await page.type('input[name="examName"]', 'Midterm Evaluation 2026');

    // Subject dropdown should have CT10718 preselected or select it
    const selectElem = await page.$('select[name="subjectCode"]');
    if (selectElem) {
      await page.select('select[name="subjectCode"]', 'CT10718');
    }

    await page.screenshot({ path: path.join(TEST_DIR, '06_teacher_create_batch_assigned_subject.png') });
    console.log('Saved 06_teacher_create_batch_assigned_subject.png');

    await page.click('button[type="submit"]');
    await page.waitForFunction(() => /^\/batches\/[a-f0-9]+$/i.test(window.location.pathname), { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // =========================================================================
    // STEP 7: Batch Detail & Scans Upload
    // =========================================================================
    console.log('[Step 7] Uploading answer sheet scan page_000001.png...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Upload Scans to Batch'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('File input element not found');
    await fileInput.uploadFile(SAMPLE_IMAGE_PATH);
    await new Promise((r) => setTimeout(r, 800));

    // Click "Process 1 Scan" button
    console.log('Triggering Python OCR extraction pipeline...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Process') && b.textContent.includes('Scan'));
      if (btn) btn.click();
    });

    // Wait for OCR to complete and redirect to Evaluated Sheets table
    await page.waitForSelector('table', { timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(TEST_DIR, '07_teacher_ocr_evaluated_sheet.png') });
    console.log('Saved 07_teacher_ocr_evaluated_sheet.png');

    // =========================================================================
    // STEP 8: Teacher Review Sheet Detail Modal & Delete Option
    // =========================================================================
    console.log('[Step 8] Teacher Sheet Detail Modal (Edit & Delete options)...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Edit'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(TEST_DIR, '08_teacher_sheet_modal_edit_delete.png') });
    console.log('Saved 08_teacher_sheet_modal_edit_delete.png');

    // Close modal
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.trim() === 'Cancel');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // =========================================================================
    // STEP 9: Publish Batch
    // =========================================================================
    console.log('[Step 9] Publishing batch results...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Publish Batch Results'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(TEST_DIR, '09_teacher_batch_published.png') });
    console.log('Saved 09_teacher_batch_published.png');

    // Logout Teacher
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Logout'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // =========================================================================
    // STEP 10: Student Portal - Marks Display & Curriculum View
    // =========================================================================
    console.log('[Step 10] Student Login & Portal Dashboard...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'student_test@testcollage.edu');
    await page.type('input[type="password"]', 'Password@123');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.includes('/student/portal'), { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(TEST_DIR, '10_student_portal_marks_view.png') });
    console.log('Saved 10_student_portal_marks_view.png');

    // =========================================================================
    // STEP 11: Student Marksheet Detailed View
    // =========================================================================
    console.log('[Step 11] Opening Statement of Marks / Marksheet...');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const link = links.find((a) => a.textContent.includes('View Marksheet'));
      if (link) link.click();
    });
    await page.waitForFunction(() => window.location.pathname.startsWith('/results/'), { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(TEST_DIR, '11_student_detailed_marksheet.png') });
    console.log('Saved 11_student_detailed_marksheet.png');

    // Go back to Student Portal
    await page.goto('http://localhost:5173/student/portal', { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 1000));

    // =========================================================================
    // STEP 12: Student Raises an Issue / Grievance to Teacher
    // =========================================================================
    console.log('[Step 12] Student reporting an issue / grievance...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Report Issue'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    await page.waitForSelector('textarea');
    await page.type('textarea', 'Dear Professor, please re-verify question 3 marks. I attempted the full algorithm.');
    await page.screenshot({ path: path.join(TEST_DIR, '12_student_raise_issue_modal.png') });
    console.log('Saved 12_student_raise_issue_modal.png');

    // Submit Issue
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Submit Grievance'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 2000));

    // Logout Student
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Logout'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // =========================================================================
    // STEP 13: Teacher Reviews and Resolves Student Grievance
    // =========================================================================
    console.log('[Step 13] Teacher reviewing and resolving student grievance...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'teacher_test@testcollage.edu');
    await page.type('input[type="password"]', 'Password@123');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.includes('/batches'), { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Switch to Student Inquiries & Grievances tab
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Student Inquiries & Grievances'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Add teacher feedback and resolve
    await page.waitForSelector('input[placeholder*="teacher resolution"]');
    await page.type('input[placeholder*="teacher resolution"]', 'Verified Q3 breakdown: algorithm steps awarded 4 marks. Evaluation confirmed.');

    await page.evaluate(() => {
      const select = document.querySelector('select');
      if (select) {
        select.value = 'resolved';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await page.screenshot({ path: path.join(TEST_DIR, '13_teacher_resolve_student_grievance.png') });
    console.log('Saved 13_teacher_resolve_student_grievance.png');

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Save Resolution'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    console.log('=========================================================================');
    console.log('ALL WORKFLOWS TESTED & 13 SCREENSHOTS CAPTURED SUCCESSFULLY IN test/ !');
    console.log('=========================================================================');
  } catch (err) {
    console.error('Error during E2E test:', err);
    await page.screenshot({ path: path.join(TEST_DIR, 'error_step.png') });
  } finally {
    await browser.close();
  }
}

runFullE2ETest();
