const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Chụp màn hình trang chủ
  await page.screenshot({ path: 'D:/Temp/opencode/reg_1_home.png' });
  console.log('URL:', page.url());
  console.log('Title:', await page.title());

  // Tìm nút đăng nhập/đăng ký
  const buttons = await page.locator('button').allInnerTexts();
  console.log('Buttons:', JSON.stringify(buttons.slice(0, 30)));

  await browser.close();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
