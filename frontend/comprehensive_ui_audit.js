import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function runAudit() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

  console.log('Launching browser with executable:', executablePath);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const consoleLogs = [];
  const pageErrors = [];

  const page = await browser.newPage();
  page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => pageErrors.push(err.toString()));

  const auditReport = {
    url: 'https://mnijc19-netizen.github.io/-/',
    timestamp: new Date().toISOString(),
    viewports: {},
    pagesInventory: {},
    modalsInventory: {},
    duplicateEntries: [],
    cognitiveLoadFindings: [],
    consoleErrors: []
  };

  // 1. Desktop Viewport Inspection (1440x900)
  console.log('--- 1. Desktop Viewport Inspection (1440x900) ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('https://mnijc19-netizen.github.io/-/', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('header');

  const desktopLayout = await page.evaluate(() => {
    const header = document.querySelector('header');
    const main = document.querySelector('main');
    const mainWrapper = document.querySelector('.max-w-md');
    const nav = document.querySelector('nav');
    const headerRect = header ? header.getBoundingClientRect() : null;
    const mainWrapperRect = mainWrapper ? mainWrapper.getBoundingClientRect() : null;

    return {
      windowWidth: window.innerWidth,
      headerWidth: headerRect ? headerRect.width : null,
      mainWrapperWidth: mainWrapperRect ? mainWrapperRect.width : null,
      isConstrainedToPhoneWidthOnDesktop: mainWrapperRect ? mainWrapperRect.width <= 500 : false,
      navFixedBottom: !!nav
    };
  });
  auditReport.viewports.desktop = desktopLayout;

  // 2. Mobile Viewport Inspection (390x844 iPhone 14 Pro style)
  console.log('--- 2. Mobile Viewport Inspection (390x844) ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.reload({ waitUntil: 'networkidle2' });

  // Gather all items on Dashboard
  const dashboardInventory = await page.evaluate(() => {
    const allButtons = Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.innerText.trim().replace(/\n+/g, ' | '),
      title: b.getAttribute('title') || '',
      ariaLabel: b.getAttribute('aria-label') || '',
      className: b.className
    }));

    const heroCard = document.querySelector('.bg-gradient-to-br')?.innerText || '';
    const allCards = Array.from(document.querySelectorAll('.rounded-3xl, .rounded-2xl')).map(c => ({
      title: c.querySelector('h1, h2, h3, h4, .font-bold')?.innerText || '',
      fullTextSnippet: c.innerText.slice(0, 100).replace(/\n+/g, ' ')
    }));

    return { allButtons, heroCard, allCards };
  });
  auditReport.pagesInventory.dashboard = dashboardInventory;

  // 3. Inspect Navigation & Each Page
  const pagesToTest = [
    { name: 'accounts', label: '资产' },
    { name: 'transactions', label: '明细' },
    { name: 'settings', label: '我的' }
  ];

  for (const p of pagesToTest) {
    console.log(`Testing navigation to: ${p.name}`);
    await page.evaluate((label) => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      const target = btns.find(b => b.innerText.includes(label));
      if (target) target.click();
    }, p.label);

    await new Promise(r => setTimeout(r, 600));

    const pageData = await page.evaluate((pageName) => {
      const pageTitle = document.querySelector('h1, h2')?.innerText || '';
      const buttons = Array.from(document.querySelectorAll('main button')).map(b => ({
        text: b.innerText.trim().replace(/\n+/g, ' | '),
        title: b.getAttribute('title') || ''
      }));
      const cards = Array.from(document.querySelectorAll('main .rounded-3xl, main .rounded-2xl')).map(c => ({
        heading: c.querySelector('h1, h2, h3, h4, .font-bold')?.innerText || '',
        snippet: c.innerText.slice(0, 100).replace(/\n+/g, ' ')
      }));
      return { pageName, pageTitle, buttons, cards };
    }, p.name);

    auditReport.pagesInventory[p.name] = pageData;
  }

  // 4. Test Modals
  console.log('Testing Modals Triggering...');
  // Return to dashboard
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('nav button'));
    const homeBtn = btns.find(b => b.innerText.includes('首页'));
    if (homeBtn) homeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Test Navbar Top AI Chat Assistant
  const testAiChat = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('header button')).find(b => b.title?.includes('对话') || b.innerText.includes('AI对话') || b.querySelector('svg'));
    // Let's click the AI Copilot button in header
    const aiChatBtn = document.querySelector('header button[title*="对话"]');
    if (aiChatBtn) {
      aiChatBtn.click();
      return true;
    }
    return false;
  });
  await new Promise(r => setTimeout(r, 600));

  const aiChatModal = await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0');
    if (!modal) return null;
    return {
      title: modal.querySelector('h3')?.innerText || '',
      buttons: Array.from(modal.querySelectorAll('button')).map(b => b.innerText.trim().replace(/\n+/g, ' ')),
      chips: Array.from(modal.querySelectorAll('.px-3.py-1\\.5, .rounded-full')).map(el => el.innerText.trim())
    };
  });
  auditReport.modalsInventory.aiChat = aiChatModal;

  // Close AI Chat Modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.fixed.inset-0 button');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Test Quick Transaction Modal (+)
  await page.evaluate(() => {
    const plusBtn = document.querySelector('nav button[aria-label="记一笔"]') || document.querySelector('nav button.-mt-5');
    if (plusBtn) plusBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const quickTxModal = await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0');
    if (!modal) return null;
    return {
      title: modal.querySelector('h3')?.innerText || '',
      typeTabs: Array.from(modal.querySelectorAll('.grid-cols-3 button, .grid-cols-2 button')).map(b => b.innerText.trim()),
      fields: Array.from(modal.querySelectorAll('label')).map(l => l.innerText.trim())
    };
  });
  auditReport.modalsInventory.quickTx = quickTxModal;

  // Close Quick Tx Modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.fixed.inset-0 button');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // 5. Test Dark Mode
  await page.evaluate(() => {
    const darkBtn = document.querySelector('header button[title*="模式"]');
    if (darkBtn) darkBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const isDarkModeActive = await page.evaluate(() => {
    return document.documentElement.classList.contains('dark');
  });
  auditReport.darkModeActive = isDarkModeActive;

  auditReport.consoleErrors = pageErrors;
  auditReport.consoleLogs = consoleLogs;

  await browser.close();

  fs.writeFileSync('d:/Antigravity项目/财务管理系统/frontend/full_audit_results.json', JSON.stringify(auditReport, null, 2));
  console.log('Audit completed successfully. Results written to full_audit_results.json');
}

runAudit().catch(console.error);
