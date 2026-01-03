import { chromium } from 'playwright';

async function captureScreenshot() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  console.log('Navigating to /accounting...');
  await page.goto('http://localhost:5173/accounting');

  // Wait for content to load
  await page.waitForTimeout(3000);

  // Capture screenshot
  await page.screenshot({
    path: 'screenshots/payment-dashboard-test.png',
    fullPage: true
  });
  console.log('Screenshot saved to screenshots/payment-dashboard-test.png');

  await browser.close();
}

captureScreenshot();
