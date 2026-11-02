const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    defaultViewport: { width: 1366, height: 860 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.type('input[type="email"]', 'teacher_test@testcollage.edu');
  await page.type('input[type="password"]', 'Password@123');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.pathname.includes('/batches'), { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(__dirname, 'teacher_dashboard_college_and_department.png') });
  console.log('Saved teacher_dashboard_college_and_department.png');
  await browser.close();
})();
