const fs = require('fs');
const path = require('path');
const mongoose = require('../server/node_modules/mongoose');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEST_DIR = path.join(__dirname);
const PDF_FILE = path.join(TEST_DIR, 'multi_exam_sheets.pdf');

// Database models
const College = require('../server/models/College');
const Department = require('../server/models/Department');
const User = require('../server/models/User');
const Batch = require('../server/models/Batch');
const Sheet = require('../server/models/Sheet');

async function testPdfUploadWorkflow() {
  console.log('--- Connecting to MongoDB ---');
  await mongoose.connect('mongodb://localhost:27017/examscanweb');

  const teacher = await User.findOne({ email: 'teacher_test@testcollage.edu' });
  if (!teacher) {
    throw new Error('Teacher teacher_test@testcollage.edu not found');
  }
  teacher.password = 'Password@123';
  await teacher.save();

  // Create or retrieve a test batch for PDF upload
  let batch = await Batch.findOne({ examName: 'Automated PDF Exam Upload Test' });
  if (!batch) {
    batch = await Batch.create({
      examName: 'Automated PDF Exam Upload Test',
      teacher: teacher._id,
      subjectCode: 'CT10718',
      college: teacher.college,
      status: 'draft'
    });
  } else {
    // Clear old sheets in this test batch
    await Sheet.deleteMany({ batch: batch._id });
  }

  console.log('Batch ready:', batch.examName, batch._id.toString());

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
      () =>
        window.location.pathname.includes('/batches') ||
        window.location.pathname.includes('/teacher'),
      { timeout: 15000 }
    );
    console.log('Teacher logged in successfully.');

    // 2. Navigate to batch detail page
    console.log(`2. Navigating to batch ${batch._id}...`);
    await page.goto(`http://localhost:5173/batches/${batch._id}`, { waitUntil: 'networkidle0' });

    // 3. Switch to Upload tab
    console.log('3. Clicking Upload tab...');
    await page.waitForSelector('button', { timeout: 5000 });
    const buttons = await page.$$('button');
    let uploadTabBtn = null;
    for (const b of buttons) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text.includes('Upload Scans to Batch')) {
        uploadTabBtn = b;
        break;
      }
    }
    if (!uploadTabBtn) throw new Error('Upload tab button not found');
    await uploadTabBtn.click();
    await new Promise((r) => setTimeout(r, 800));

    // 4. Select the PDF file
    console.log('4. Selecting multi-page PDF file...');
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('File input element not found');
    await fileInput.uploadFile(PDF_FILE);
    await new Promise((r) => setTimeout(r, 800));

    // Capture screenshot of selected PDF with badge
    const snap1 = path.join(TEST_DIR, 'pdf_upload_01_selected_badge.png');
    await page.screenshot({ path: snap1 });
    console.log('Saved screenshot 1:', snap1);

    // 5. Click the Process button
    console.log('5. Clicking Process button to start upload & OCR...');
    const allButtons = await page.$$('button');
    let processBtn = null;
    for (const b of allButtons) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text.includes('Process') && (text.includes('PDF') || text.includes('Scan') || text.includes('File'))) {
        processBtn = b;
        break;
      }
    }
    if (!processBtn) throw new Error('Process button not found');
    await processBtn.click();

    // 6. Wait for OCR evaluation to complete and auto-switch to Sheets tab
    console.log('6. Waiting for upload and OCR extraction across PDF pages...');
    await page.waitForFunction(
      () => {
        const rows = document.querySelectorAll('table tbody tr.cursor-pointer');
        return rows && rows.length >= 2;
      },
      { timeout: 90000 }
    );

    await new Promise((r) => setTimeout(r, 1500));

    // Capture screenshot of extracted sheets in the table
    const snap2 = path.join(TEST_DIR, 'pdf_upload_02_sheets_extracted.png');
    await page.screenshot({ path: snap2 });
    console.log('Saved screenshot 2:', snap2);

    // Verify database count
    const sheetCount = await Sheet.countDocuments({ batch: batch._id });
    console.log(`Database verification: ${sheetCount} sheets found for batch.`);
    if (sheetCount < 2) {
      throw new Error(`Expected at least 2 sheets extracted from PDF, got ${sheetCount}`);
    }

    const sheets = await Sheet.find({ batch: batch._id }).sort({ orderIndex: 1 });
    for (const s of sheets) {
      console.log(`  - Sheet #${s.orderIndex}: Filename="${s.filename}", Enrolment="${s.enrolment}", TotalMarks=${s.totalMarks}, ImageUrl="${s.imageUrl}"`);
    }

    // 7. Open first sheet to verify side-by-side modal rendering
    console.log('7. Opening first sheet in detail modal...');
    const inspectBtn = await page.$('table tbody tr button');
    if (inspectBtn) {
      await inspectBtn.click();
    } else {
      const allBtns = await page.$$('button');
      for (const ib of allBtns) {
        const text = await page.evaluate((el) => el.innerText, ib);
        if (text.includes('Inspect') || text.includes('Review')) {
          await ib.click();
          break;
        }
      }
    }
    await new Promise((r) => setTimeout(r, 2000));

    const snap3 = path.join(TEST_DIR, 'pdf_upload_03_sheet_modal_verification.png');
    await page.screenshot({ path: snap3 });
    console.log('Saved screenshot 3:', snap3);

    console.log('=== TEST COMPLETED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Test error:', err);
    await page.screenshot({ path: path.join(TEST_DIR, 'pdf_test_error.png') });
  } finally {
    await browser.close();
    await mongoose.disconnect();
  }
}

testPdfUploadWorkflow();
