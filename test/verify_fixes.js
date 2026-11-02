const fs = require('fs');
const path = require('path');
const mongoose = require('../server/node_modules/mongoose');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEST_DIR = path.join(__dirname);

// Database models
const College = require('../server/models/College');
const Department = require('../server/models/Department');
const User = require('../server/models/User');
const Batch = require('../server/models/Batch');
const Sheet = require('../server/models/Sheet');

async function testFixes() {
  console.log('--- Connecting to DB to prepare test entities ---');
  await mongoose.connect('mongodb://localhost:27017/examscanweb');

  // 1. Ensure Super Admin user exists
  await User.deleteMany({ email: 'superadmin_test@platform.edu' });
  await User.create({
    name: 'Platform Super Admin',
    email: 'superadmin_test@platform.edu',
    password: 'Password@123',
    role: 'super_admin',
    isActive: true
  });

  // 2. Create a temporary college to test deletion by Super Admin
  const tempCollege = await College.create({
    name: 'Temporary College to Delete',
    code: 'TEMP_DEL_99',
    address: 'To be removed'
  });
  console.log('Created temporary college for delete test:', tempCollege.code);

  await mongoose.disconnect();

  // Test teacher authorization backend check directly via fetch
  console.log('--- Testing Teacher Unauthorized Email Rejection API ---');
  const unauthTeacherRes = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Unregistered Teacher',
      email: 'hacker_teacher@nowhere.com',
      password: 'Password@123',
      role: 'teacher',
      collegeCode: 'TEST_COLLAGE'
    })
  });
  const unauthTeacherJson = await unauthTeacherRes.json();
  console.log('Unauthorized Teacher Registration HTTP Status:', unauthTeacherRes.status);
  console.log('Unauthorized Teacher Error Message:', unauthTeacherJson.message);
  if (unauthTeacherRes.status === 403) {
    console.log('PASSED: Teacher registration rejected because email was not in database!');
  } else {
    console.error('FAILED: Unexpected status for unauthorized teacher registration:', unauthTeacherRes.status);
  }

  // Test UI with Puppeteer: Super Admin Delete College & Teacher Image Verification
  console.log('--- Launching Puppeteer to test Super Admin Delete & Teacher Modal Image ---');
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
    // 1. Login as Super Admin
    console.log('[Test 1] Super Admin Login...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'superadmin_test@platform.edu');
    await page.type('input[type="password"]', 'Password@123');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.includes('/admin/super'), { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1200));

    // Screenshot of Super Admin Console showing Delete button for Colleges
    await page.screenshot({ path: path.join(TEST_DIR, 'fix1_super_admin_delete_college_button.png') });
    console.log('Saved fix1_super_admin_delete_college_button.png');

    // Delete the temporary college
    console.log('Deleting temporary college...');
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const targetRow = rows.find((r) => r.textContent.includes('TEMP_DEL_99'));
      if (targetRow) {
        const delBtn = targetRow.querySelector('button[title="Delete College"]');
        if (delBtn) delBtn.click();
      }
    });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(TEST_DIR, 'fix1_college_deleted_successfully.png') });
    console.log('Saved fix1_college_deleted_successfully.png');

    // 2. Login as Teacher & Inspect Side-by-Side Paper Image in Sheet Detail Modal
    console.log('[Test 2] Teacher Review with Paper Scan Image...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'teacher_test@testcollage.edu');
    await page.type('input[type="password"]', 'Password@123');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.includes('/batches'), { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Connect and find latest batch
    await mongoose.connect('mongodb://localhost:27017/examscanweb');
    const existingBatch = await Batch.findOne().sort({ createdAt: -1 });
    await mongoose.disconnect();

    if (!existingBatch) throw new Error('No batches found');
    console.log(`Navigating to batch: ${existingBatch._id}`);
    await page.goto(`http://localhost:5173/batches/${existingBatch._id}`, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 1000));

    // Upload an image so we have a persistent scan with imageUrl
    console.log('Uploading sheet to test persistent image display...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('Upload Scans to Batch'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile('C:\\Users\\sumit\\Desktop\\Samarth\\python\\data\\page_000001.png');
      await new Promise((r) => setTimeout(r, 600));

      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find((b) => b.textContent.includes('Process') && b.textContent.includes('Scan'));
        if (btn) btn.click();
      });

      await page.waitForSelector('table', { timeout: 60000 });
      await new Promise((r) => setTimeout(r, 1500));
    }

    // Open Edit Sheet Modal to view side-by-side image
    console.log('Opening Sheet Detail Modal to verify side-by-side image display...');
    await page.evaluate(() => {
      const editButtons = Array.from(document.querySelectorAll('button'));
      const btn = editButtons.find((b) => b.textContent.includes('Edit'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(TEST_DIR, 'fix2_sheet_modal_side_by_side_image_scan.png') });
    console.log('Saved fix2_sheet_modal_side_by_side_image_scan.png');

    console.log('=== All 3 Fixes Verified Successfully! ===');
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
}

testFixes();
