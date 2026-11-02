const fs = require('fs');
const path = require('path');
const mongoose = require('../server/node_modules/mongoose');
const puppeteer = require('puppeteer-core');
const bcrypt = require('../server/node_modules/bcryptjs');

// Database models
const College = require('../server/models/College');
const Department = require('../server/models/Department');
const User = require('../server/models/User');
const Batch = require('../server/models/Batch');
const Sheet = require('../server/models/Sheet');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEST_DIR = path.join(__dirname);
const SAMPLE_IMAGE_PATH = 'C:\\Users\\sumit\\Desktop\\Samarth\\python\\data\\page_000001.png';

async function seedData() {
  console.log('--- Connecting to MongoDB to prepare test entities ---');
  await mongoose.connect('mongodb://localhost:27017/examscanweb');

  // 1. Ensure test_collage College exists
  let college = await College.findOne({ code: 'TEST_COLLAGE' });
  if (!college) {
    college = await College.create({
      name: 'test_collage',
      code: 'TEST_COLLAGE',
      address: 'Test University Campus'
    });
    console.log('Created College: test_collage (TEST_COLLAGE)');
  } else {
    college.name = 'test_collage';
    await college.save();
    console.log('College test_collage exists');
  }

  // 2. Ensure test_branch Department exists under test_collage
  let department = await Department.findOne({ college: college._id, code: 'TEST_BRANCH' });
  if (!department) {
    department = await Department.create({
      name: 'test_branch',
      code: 'TEST_BRANCH',
      college: college._id,
      subjects: [
        {
          name: 'test_subject',
          code: 'CT10718',
          maxMarks: 100
        }
      ]
    });
    console.log('Created Department: test_branch with subject test_subject (CT10718)');
  } else {
    const hasSub = department.subjects.some((s) => s.code === 'CT10718');
    if (!hasSub) {
      department.subjects.push({
        name: 'test_subject',
        code: 'CT10718',
        maxMarks: 100
      });
      await department.save();
    }
    console.log('Department test_branch exists with subject CT10718');
  }

  // 3. Ensure College Admin & Teacher users exist with single hashing
  await User.deleteMany({
    email: { $in: ['collegeadmin_test@testcollage.edu', 'teacher_test@testcollage.edu'] }
  });

  const admin = await User.create({
    name: 'Test College Admin',
    email: 'collegeadmin_test@testcollage.edu',
    password: 'Password@123',
    role: 'college_admin',
    college: college._id,
    isActive: true
  });
  console.log('Created College Admin: collegeadmin_test@testcollage.edu');

  const teacher = await User.create({
    name: 'Test Teacher Prof',
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

async function runE2E() {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }

  await seedData();

  console.log('--- Launching Puppeteer Browser ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: { width: 1366, height: 860 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,860']
  });

  const page = await browser.newPage();

  // Accept any window dialogs (e.g. confirm publish batch)
  page.on('dialog', async (dialog) => {
    console.log(`Dialog message: "${dialog.message()}" -> Accepting`);
    await dialog.accept();
  });

  try {
    // -------------------------------------------------------------
    // Step 1: College Admin Login Page
    // -------------------------------------------------------------
    console.log('[Step 1] Opening login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'collegeadmin_test@testcollage.edu');
    await page.type('input[type="password"]', 'Password@123');
    await page.screenshot({ path: path.join(TEST_DIR, '01_college_admin_login.png') });
    console.log('Saved 01_college_admin_login.png');

    // -------------------------------------------------------------
    // Step 2: College Admin Console - Departments & Subjects
    // -------------------------------------------------------------
    console.log('[Step 2] Submitting College Admin login...');
    await page.click('button[type="submit"]');

    // Wait for redirect to /admin/college
    await page.waitForFunction(() => window.location.pathname.includes('/admin/college'), { timeout: 15000 });
    await page.waitForSelector('h1');
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(TEST_DIR, '02_college_admin_departments.png') });
    console.log('Saved 02_college_admin_departments.png');

    // -------------------------------------------------------------
    // Step 3: College Admin Assign Faculty Modal
    // -------------------------------------------------------------
    console.log('[Step 3] Switching to Faculty & Assignments tab...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Faculty & Subject Assignments'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Click "Assign Subjects" button for teacher
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Assign Subjects'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(TEST_DIR, '03_college_admin_assign_faculty.png') });
    console.log('Saved 03_college_admin_assign_faculty.png');

    // Close modal
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.trim() === 'Cancel');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // -------------------------------------------------------------
    // Step 4: Teacher Login
    // -------------------------------------------------------------
    console.log('[Step 4] Logging out College Admin...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Logout'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    console.log('[Step 4] Logging in as Teacher...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'teacher_test@testcollage.edu');
    await page.type('input[type="password"]', 'Password@123');
    await page.screenshot({ path: path.join(TEST_DIR, '04_teacher_login.png') });
    console.log('Saved 04_teacher_login.png');

    await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.location.pathname.includes('/batches'), { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // -------------------------------------------------------------
    // Step 5: Teacher Create Batch for CT10718
    // -------------------------------------------------------------
    console.log('[Step 5] Creating new evaluation batch...');
    await page.goto('http://localhost:5173/batches/new', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="examName"]');
    await page.type('input[name="examName"]', 'End-Term Examination 2026');

    // Verify select dropdown or input for subjectCode
    const selectElem = await page.$('select[name="subjectCode"]');
    if (selectElem) {
      await page.select('select[name="subjectCode"]', 'CT10718');
    } else {
      await page.type('input[name="subjectCode"]', 'CT10718');
    }

    await page.screenshot({ path: path.join(TEST_DIR, '05_teacher_create_batch.png') });
    console.log('Saved 05_teacher_create_batch.png');

    // Submit batch creation
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => /^\/batches\/[a-f0-9]+$/i.test(window.location.pathname), { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // -------------------------------------------------------------
    // Step 6: Batch Detail Page (Empty state / metrics)
    // -------------------------------------------------------------
    console.log('[Step 6] Batch detail page opened...');
    await page.screenshot({ path: path.join(TEST_DIR, '06_teacher_batch_detail.png') });
    console.log('Saved 06_teacher_batch_detail.png');

    // -------------------------------------------------------------
    // Step 7: Upload and live Python OCR evaluation
    // -------------------------------------------------------------
    console.log('[Step 7] Switching to Upload Scans tab and selecting image...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Upload Scans to Batch'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    // Find file input and upload page_000001.png
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('File input not found');
    await fileInput.uploadFile(SAMPLE_IMAGE_PATH);
    await new Promise((r) => setTimeout(r, 800));

    // Click "Start Evaluation" button
    console.log('Triggering OCR evaluation via Python backend...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Start Evaluation'));
      if (btn) btn.click();
    });

    // Wait for OCR to complete and switch back to sheets tab
    await page.waitForSelector('table', { timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(TEST_DIR, '07_teacher_ocr_uploaded.png') });
    console.log('Saved 07_teacher_ocr_uploaded.png');

    // -------------------------------------------------------------
    // Step 8: Teacher Review Sheet Detail Modal
    // -------------------------------------------------------------
    console.log('[Step 8] Opening Sheet Review modal...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Review') || b.textContent.includes('Edit'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(TEST_DIR, '08_teacher_review_sheet.png') });
    console.log('Saved 08_teacher_review_sheet.png');

    // Close modal
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Close') || b.textContent.includes('Cancel'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // -------------------------------------------------------------
    // Step 9: Publish Batch
    // -------------------------------------------------------------
    console.log('[Step 9] Publishing batch results...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Publish Batch Results'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 2500));
    await page.screenshot({ path: path.join(TEST_DIR, '09_teacher_publish_batch.png') });
    console.log('Saved 09_teacher_publish_batch.png');

    // -------------------------------------------------------------
    // Step 10: Student Result Search Portal
    // -------------------------------------------------------------
    console.log('[Step 10] Opening student result search portal...');
    await page.goto('http://localhost:5173/results', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[placeholder*="0801"]');
    await page.screenshot({ path: path.join(TEST_DIR, '10_student_search_page.png') });
    console.log('Saved 10_student_search_page.png');

    // Search enrolment from the OCR image: 0801CA251001
    await page.type('input[placeholder*="0801"]', '0801CA251001');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Search Results'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 2500));
    await page.screenshot({ path: path.join(TEST_DIR, '11_student_search_results_list.png') });
    console.log('Saved 11_student_search_results_list.png');

    // -------------------------------------------------------------
    // Step 11: Student Marksheet Detailed View & PDF
    // -------------------------------------------------------------
    console.log('[Step 11] Opening Statement of Marks / Marksheet...');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const lnk = links.find((a) => a.textContent.includes('View Marksheet') || a.textContent.includes('Statement of Marks'));
      if (lnk) lnk.click();
    });
    await page.waitForFunction(() => window.location.pathname.startsWith('/results/'), { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(TEST_DIR, '12_student_marksheet_pdf.png') });
    console.log('Saved 12_student_marksheet_pdf.png');

    console.log('=== All E2E steps completed and screenshots captured successfully! ===');
  } catch (err) {
    console.error('Error during E2E test:', err);
    await page.screenshot({ path: path.join(TEST_DIR, 'error_step.png') });
  } finally {
    await browser.close();
  }
}

runE2E();
