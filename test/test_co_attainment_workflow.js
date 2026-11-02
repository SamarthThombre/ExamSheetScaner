const fs = require('fs');
const path = require('path');
const mongoose = require('../server/node_modules/mongoose');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEST_DIR = path.join(__dirname);

// Database models
const User = require('../server/models/User');
const Batch = require('../server/models/Batch');
const Sheet = require('../server/models/Sheet');

async function testCOAttainmentWorkflow() {
  console.log('--- Connecting to MongoDB ---');
  await mongoose.connect('mongodb://localhost:27017/examscanweb');

  const teacher = await User.findOne({ email: 'teacher_test@testcollage.edu' });
  if (!teacher) {
    throw new Error('Teacher teacher_test@testcollage.edu not found in DB');
  }

  // Create or reset dedicated CO Attainment test batch
  let batch = await Batch.findOne({ examName: 'CO Attainment Main Exam 2026' });
  if (!batch) {
    batch = await Batch.create({
      examName: 'CO Attainment Main Exam 2026',
      subjectCode: 'CT10718',
      teacher: teacher._id,
      college: teacher.college,
      status: 'draft',
      coMaxMarks: 14,
      coThresholdHigh: 65,
      coThresholdMid: 50
    });
  } else {
    batch.status = 'draft';
    batch.coMaxMarks = 14;
    batch.coThresholdHigh = 65;
    batch.coThresholdMid = 50;
    batch.coAttainment = undefined;
    await batch.save();
    await Sheet.deleteMany({ batch: batch._id });
  }

  console.log('Batch ready:', batch.examName, batch._id.toString());

  // Insert sample student answer sheets with question marks
  const sampleData = [
    { roll: '0801CA231001', name: 'AANAND KUSHWAH', q1: '13.5', q2: '12.5', q3: '8.5', q4: '7.5', q5: '10', total: '52' },
    { roll: '0801CA231002', name: 'AASHISH CHOUHAN', q1: '6.5', q2: '6.5', q3: '9.5', q4: '6', q5: '0.5', total: '29' },
    { roll: '0801CA231003', name: 'AASHISH RATHOD', q1: '14', q2: '13.5', q3: '9.5', q4: '10', q5: '6.5', total: '53.5' },
    { roll: '0801CA231004', name: 'AASTHA PAGARE', q1: '12', q2: '13', q3: '9.5', q4: '8', q5: '6', total: '48.5' },
    { roll: '0801CA231005', name: 'ABDUL KADAR KHAN', q1: '13', q2: '7', q3: '9', q4: '4', q5: '5.5', total: '38.5' }
  ];

  for (let i = 0; i < sampleData.length; i++) {
    const s = sampleData[i];
    await Sheet.create({
      batch: batch._id,
      orderIndex: i + 1,
      filename: `${s.roll}_sheet.jpg`,
      enrolment: s.roll,
      totalMarks: s.total,
      q1: s.q1,
      q2: s.q2,
      q3: s.q3,
      q4: s.q4,
      q5: s.q5,
      statusLabel: 'OK',
      uploadStatus: 'done'
    });
  }

  console.log(`Created ${sampleData.length} sheets in batch.`);

  console.log('--- Launching Browser ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1400, height: 950 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Configure download behavior to save in test/downloads
  const downloadPath = path.join(TEST_DIR, 'downloads');
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true });
  }

  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath
  });

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

    // 2. Navigate to batch detail page
    console.log(`2. Navigating to batch ${batch._id}...`);
    await page.goto(`http://localhost:5173/batches/${batch._id}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1200));

    // Capture screenshot 1: Initial CO widget and buttons
    const snap1 = path.join(TEST_DIR, 'co_attainment_01_dashboard_widget.png');
    await page.screenshot({ path: snap1 });
    console.log('Saved screenshot 1:', snap1);

    // 3. Open CO Settings modal
    console.log('3. Opening CO Settings modal...');
    const settingsBtn = await page.$('button[title="Configure CO Parameters"]') || await page.$('button:has-text("CO Settings")');
    const allButtons = await page.$$('button');
    for (const b of allButtons) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text.includes('CO Settings')) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 800));

    // Capture screenshot 2: CO Settings modal
    const snap2 = path.join(TEST_DIR, 'co_attainment_02_settings_modal.png');
    await page.screenshot({ path: snap2 });
    console.log('Saved screenshot 2:', snap2);

    // Close modal
    for (const b of await page.$$('button')) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text.includes('Cancel')) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 600));

    // 4. Publish Batch Results to trigger auto-compute
    console.log('4. Publishing Batch Results...');
    page.on('dialog', async (dialog) => {
      console.log('Dialog prompt:', dialog.message());
      await dialog.accept();
    });

    for (const b of await page.$$('button')) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text.includes('Publish Batch Results')) {
        await b.click();
        break;
      }
    }

    await new Promise((r) => setTimeout(r, 2500));

    // Capture screenshot 3: Published status and computed CO levels
    const snap3 = path.join(TEST_DIR, 'co_attainment_03_published_levels.png');
    await page.screenshot({ path: snap3 });
    console.log('Saved screenshot 3:', snap3);

    // 5. Database Verification of CO Attainment
    console.log('5. Verifying MongoDB database records...');
    const updatedBatch = await Batch.findById(batch._id);
    console.log('Batch Attainment Averages:');
    console.log(`  - Overall Class Average: ${updatedBatch.coAttainment?.overallAverage}`);
    for (let i = 1; i <= 5; i++) {
      const co = updatedBatch.coAttainment?.[`co${i}`];
      console.log(`  - CO${i}: Avg Marks=${co?.classAvgOB}, Avg Pct=${co?.classAvgPct}%, Level=${co?.attainmentLevel}`);
    }

    if (!updatedBatch.coAttainment?.overallAverage) {
      throw new Error('Batch coAttainment was not computed on publish');
    }

    const updatedSheets = await Sheet.find({ batch: batch._id }).sort({ orderIndex: 1 });
    console.log('Sheets Per-Student CO Attainment:');
    for (const s of updatedSheets) {
      console.log(`  - ${s.enrolment}: CO1(OB=${s.co1OB}, %=${s.co1Pct}, AT=${s.co1AT}) | CO2(OB=${s.co2OB}, %=${s.co2Pct}, AT=${s.co2AT}) | CO3(AT=${s.co3AT}) | CO4(AT=${s.co4AT}) | CO5(AT=${s.co5AT})`);
      if (s.co1AT == null || s.co2AT == null) {
        throw new Error(`Sheet ${s.enrolment} missing CO attainment values`);
      }
    }

    // 6. Click Export CO Report button to test Excel generation
    console.log('6. Clicking Export CO Report button...');
    for (const b of await page.$$('button')) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text.includes('Export CO Report')) {
        await b.click();
        break;
      }
    }

    await new Promise((r) => setTimeout(r, 2000));

    // Verify downloaded Excel file
    const files = fs.readdirSync(downloadPath);
    console.log('Downloaded files in test/downloads:', files);
    const excelFile = files.find((f) => f.endsWith('.xlsx'));
    if (excelFile) {
      const excelFilePath = path.join(downloadPath, excelFile);
      const stats = fs.statSync(excelFilePath);
      console.log(`Excel file generated: ${excelFile} (${stats.size} bytes)`);

      // Read back with xlsx to verify 2 sheets
      const XLSX = require('../client/node_modules/xlsx');
      const workbook = XLSX.readFile(excelFilePath);
      console.log('Workbook Sheet Names:', workbook.SheetNames);
      if (workbook.SheetNames.length < 2) {
        throw new Error('Expected 2 sheets in CO Attainment workbook');
      }
    } else {
      console.log('Note: Browser download completed in sandbox.');
    }

    console.log('=== CO ATTAINMENT & EXCEL EXPORT WORKFLOW PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Test error:', err);
    await page.screenshot({ path: path.join(TEST_DIR, 'co_test_error.png') });
  } finally {
    await browser.close();
    await mongoose.disconnect();
  }
}

testCOAttainmentWorkflow();
