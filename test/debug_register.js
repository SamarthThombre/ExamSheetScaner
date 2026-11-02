const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    defaultViewport: { width: 1366, height: 860 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  page.on('console', (msg) => console.log('PAGE CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

  console.log('1. Loading /register...');
  await page.goto('http://localhost:5173/register', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1000));

  // Check if page loaded without crashing
  const title = await page.evaluate(() => document.querySelector('h2')?.textContent);
  console.log('Page Title:', title);

  // Switch to Student Role
  console.log('2. Selecting Student role...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const studentBtn = buttons.find(b => b.textContent.includes('Student'));
    if (studentBtn) studentBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // Enter College Code and verify
  console.log('3. Verifying college code...');
  await page.type('input[name="collegeCode"]', 'TEST_COLLAGE');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const verifyBtn = buttons.find(b => b.textContent.includes('Verify Code'));
    if (verifyBtn) verifyBtn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  // Fill details
  console.log('4. Filling student details...');
  await page.waitForSelector('select[name="departmentId"]');
  const uniqueRoll = `ROLL_${Date.now().toString().slice(-6)}`;
  await page.type('input[name="rollNumber"]', uniqueRoll);
  await page.type('input[name="name"]', 'Aman Student');
  await page.type('input[name="email"]', `student_${Date.now()}@test.edu`);
  await page.type('input[name="password"]', 'Password@123');

  console.log('5. Submitting form...');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2000));

  console.log('Current URL after submit:', page.url());
  const errorText = await page.evaluate(() => {
    const alert = document.querySelector('.bg-red-50');
    return alert ? alert.textContent : null;
  });
  if (errorText) {
    console.log('Form Error:', errorText);
  } else {
    console.log('SUCCESS: Student registered and redirected cleanly!');
  }

  await browser.close();
})();
