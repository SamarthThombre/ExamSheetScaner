const fs = require('fs');
const path = require('path');
const mongoose = require('../server/node_modules/mongoose');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEST_DIR = path.join(__dirname);

// Database models
const College = require('../server/models/College');
const User = require('../server/models/User');
const Batch = require('../server/models/Batch');
const Sheet = require('../server/models/Sheet');
const Issue = require('../server/models/Issue');

async function testIssuesPage() {
  console.log('--- Connecting to MongoDB ---');
  await mongoose.connect('mongodb://localhost:27017/examscanweb');

  const teacher = await User.findOne({ email: 'teacher_test@testcollage.edu' });
  const student = await User.findOne({ email: 'student_test@testcollage.edu' });

  if (!teacher || !student) {
    throw new Error('Teacher or Student not found in DB');
  }

  // Ensure password is known
  teacher.password = 'Password@123';
  await teacher.save();

  // Find a sheet with an imageUrl
  const sampleSheet = await Sheet.findOne({ imageUrl: { $exists: true, $ne: null } });

  // Create or reset a test grievance
  let testIssue = await Issue.findOne({ description: 'Re-evaluation requested for Question 2 marks mismatch.' });
  if (!testIssue) {
    testIssue = await Issue.create({
      student: student._id,
      studentRoll: student.rollNumber || '0801CA251001',
      teacher: teacher._id,
      college: teacher.college,
      batch: sampleSheet?.batch || null,
      sheet: sampleSheet?._id || null,
      subjectCode: 'CT10718',
      issueType: 'marks_mismatch',
      description: 'Re-evaluation requested for Question 2 marks mismatch.',
      status: 'pending'
    });
  } else {
    testIssue.status = 'pending';
    testIssue.teacherResponse = '';
    await testIssue.save();
  }

  console.log('Sample issue ready in DB:', testIssue._id.toString());

  console.log('--- Launching Browser ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1400, height: 950 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // 1. Login as teacher
    console.log('1. Logging in as Teacher...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
    await page.type('input[type="email"]', 'teacher_test@testcollage.edu');
    await page.type('input[type="password"]', 'Password@123');
    await page.click('button[type="submit"]');

    await page.waitForFunction(
      () => window.location.pathname.includes('/batches') || window.location.pathname.includes('/teacher'),
      { timeout: 15000 }
    );
    console.log('Teacher logged in.');

    // 2. Check Navbar for Grievances link
    console.log('2. Inspecting Navbar for Grievances link...');
    await page.waitForSelector('a[href="/teacher/issues"]', { timeout: 10000 });
    const grievancesNavLink = await page.$('a[href="/teacher/issues"]');
    if (!grievancesNavLink) throw new Error('Grievances nav link not found in Navbar');

    // 3. Navigate to /teacher/issues
    console.log('3. Clicking Grievances link to navigate to /teacher/issues...');
    await grievancesNavLink.click();
    await page.waitForFunction(() => window.location.pathname.includes('/teacher/issues'), { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1200));

    // Capture list view screenshot
    const snap1 = path.join(TEST_DIR, 'issues_page_01_list_view.png');
    await page.screenshot({ path: snap1 });
    console.log('Saved screenshot 1:', snap1);

    // 4. Verify issue card/table row
    console.log('4. Verifying issues table content...');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    const rowText = await page.evaluate(() => document.querySelector('table tbody tr').innerText);
    console.log('Row text sample:', rowText.replace(/\n/g, ' '));

    // 5. Click Review button to open Resolve Modal
    console.log('5. Clicking Review button to open Resolve Modal...');
    const reviewBtn = await page.$('table tbody tr button');
    if (!reviewBtn) throw new Error('Review button in row not found');
    await reviewBtn.click();
    await new Promise((r) => setTimeout(r, 1500));

    // Capture modal screenshot with split-screen layout
    const snap2 = path.join(TEST_DIR, 'issues_page_02_resolve_modal.png');
    await page.screenshot({ path: snap2 });
    console.log('Saved screenshot 2:', snap2);

    // 6. Fill resolution form
    console.log('6. Filling status change and teacher response...');
    await page.select('select', 'resolved');
    await page.type('textarea', 'Verified physical exam sheet scan: Question 2 marks have been adjusted from 8 to 11.5. Grade record updated.');
    await new Promise((r) => setTimeout(r, 600));

    // 7. Submit resolution
    console.log('7. Submitting resolution...');
    const updateBtn = await page.$('button[type="submit"]');
    if (!updateBtn) throw new Error('Update Issue submit button not found');
    await updateBtn.click();
    await new Promise((r) => setTimeout(r, 2000));

    // Capture post-update screenshot
    const snap3 = path.join(TEST_DIR, 'issues_page_03_resolved_status.png');
    await page.screenshot({ path: snap3 });
    console.log('Saved screenshot 3:', snap3);

    // Verify DB update
    const updatedInDb = await Issue.findById(testIssue._id);
    console.log('Database verification:');
    console.log(`  - Status: ${updatedInDb.status}`);
    console.log(`  - Response: ${updatedInDb.teacherResponse}`);
    console.log(`  - ResolvedAt: ${updatedInDb.resolvedAt}`);

    if (updatedInDb.status !== 'resolved') {
      throw new Error(`Expected status 'resolved', got '${updatedInDb.status}'`);
    }

    console.log('=== ISSUES PAGE TEST PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Test error:', err);
    await page.screenshot({ path: path.join(TEST_DIR, 'issues_test_error.png') });
  } finally {
    await browser.close();
    await mongoose.disconnect();
  }
}

testIssuesPage();
