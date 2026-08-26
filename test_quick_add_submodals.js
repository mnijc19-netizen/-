import puppeteer from './frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'fs';

async function testSubmodals() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.goto('https://mnijc19-netizen.github.io/-/', { waitUntil: 'networkidle2' });

  console.log('Testing Universal Quick Add modal transitions...');

  // 1. Click '+' to open Universal Quick Add Action Sheet
  const plusBtn = await page.$('nav button[aria-label="记一笔"]');
  if (plusBtn) await plusBtn.click();
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/test_modal_universal_quick_add.png' });

  // 2. Click '⚡ 极速手动记账'
  const manualBtn = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('极速手动记账'));
    if (btn) { btn.click(); return true; }
    return false;
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/test_modal_manual_tx.png' });

  // Close manual modal
  await page.evaluate(() => {
    const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('取消') || b.innerHTML.includes('lucide-x'));
    if (cancelBtn) cancelBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));

  // 3. Test opening Photo OCR
  const plusBtn2 = await page.$('nav button[aria-label="记一笔"]');
  if (plusBtn2) await plusBtn2.click();
  await new Promise(r => setTimeout(r, 400));

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('拍照 / 扫小票'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/test_modal_photo_ocr.png' });

  // Close Photo OCR modal
  await page.evaluate(() => {
    const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('取消') || b.innerHTML.includes('lucide-x'));
    if (cancelBtn) cancelBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));

  console.log('Submodal testing completed successfully.');
  await browser.close();
}

testSubmodals().catch(console.error);
