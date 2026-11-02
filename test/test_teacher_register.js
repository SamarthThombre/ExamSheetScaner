const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    defaultViewport: { width: 1366, height: 860 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  console.log('1. Loading /register with Teacher selected...');
  await page.goto('http://localhost:5173/register', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1000));

  // Role is Teacher by default
  await page.type('input[name="collegeCode"]', 'TEST_COLLAGE');
  await page.type('input[name="name"]', 'Unauthorized Faculty');
  await page.type('input[name="email"]', `unauthorized_${Date.now()}@gmail.com`);
  await page.type('input[name="password"]', 'Password@123');

  console.log('2. Submitting unauthorized teacher registration...');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 1500));

  const errorText = await page.evaluate(() => {
    const alert = document.querySelector('.bg-red-50');
    return alert ? alert.textContent : null;
  });
  console.log('UI Error Message displayed to user:', errorText);

  await browser.close();
})();
