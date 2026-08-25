import puppeteer from './frontend/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import fs from 'fs';

async function run() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

  console.log('Launching browser with executable:', executablePath);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const consoleLogs = [];
  const pageErrors = [];

  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', err => {
    pageErrors.push(err.toString());
  });

  console.log('Navigating to https://mnijc19-netizen.github.io/-/...');
  await page.goto('https://mnijc19-netizen.github.io/-/', { waitUntil: 'networkidle2', timeout: 30000 });

  console.log('Page title:', await page.title());

  // Find all buttons
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.innerText.trim(),
      className: b.className,
      ariaLabel: b.getAttribute('aria-label'),
      title: b.getAttribute('title')
    }));
  });
  console.log('Found buttons:', JSON.stringify(buttons, null, 2));

  // Find and click the button for AI Chat
  const clickResult = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const target = btns.find(b => 
      b.innerText.includes('AI对话') || 
      b.innerText.includes('AI') || 
      b.getAttribute('title')?.includes('AI') ||
      b.getAttribute('title')?.includes('智能')
    );
    if (target) {
      target.click();
      return { found: true, text: target.innerText, title: target.getAttribute('title') };
    }
    return { found: false };
  });

  console.log('AI Button Click Result:', clickResult);
  await new Promise(r => setTimeout(r, 1000));

  // Inspect modal content
  const modalData = await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0');
    if (!modal) return { modalFound: false, html: document.body.innerHTML.slice(0, 500) };

    const headerTitle = modal.querySelector('h3')?.innerText || '';
    const messages = Array.from(modal.querySelectorAll('.whitespace-pre-wrap')).map(el => el.innerText);
    const chipButtons = Array.from(modal.querySelectorAll('button')).map(b => b.innerText.trim()).filter(t => t.length > 0);
    const fullText = modal.innerText;

    return {
      modalFound: true,
      headerTitle,
      messages,
      chipButtons,
      fullText
    };
  });

  console.log('Modal inspection data:', JSON.stringify(modalData, null, 2));
  console.log('Console Logs:', JSON.stringify(consoleLogs, null, 2));
  console.log('Page Errors:', JSON.stringify(pageErrors, null, 2));

  await browser.close();

  fs.writeFileSync('d:/Antigravity项目/财务管理系统/inspection_report.json', JSON.stringify({
    modalData,
    consoleLogs,
    pageErrors
  }, null, 2));
}

run().catch(console.error);
