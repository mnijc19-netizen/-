import puppeteer from './frontend/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import fs from 'fs';
import path from 'path';

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
  await page.setViewport({ width: 1280, height: 900 });

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
  await new Promise(r => setTimeout(r, 2000));

  // Capture desktop dashboard screenshot
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_dashboard_desktop.png', fullPage: true });

  // 1. Check Dashboard
  const dashboardData = await page.evaluate(() => {
    const text = document.body.innerText;
    
    // Check Month Flow Stats
    const incomeEl = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('本月日常收入'));
    const expenseEl = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('本月日常支出'));
    
    // Check Budgets Monitor Section
    const budgetSection = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('月度预算监控'));
    const budgetText = budgetSection ? budgetSection.innerText : '';
    const budgetButtons = budgetSection ? Array.from(budgetSection.querySelectorAll('button')).map(b => b.innerText.trim()) : [];
    const budgetProgressBars = budgetSection ? budgetSection.querySelectorAll('.rounded-full.bg-slate-200, .rounded-full.bg-slate-700').length : 0;

    // Check Savings Goals Section
    const goalsSection = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('储蓄计划与心愿目标'));
    const goalsText = goalsSection ? goalsSection.innerText : '';
    const goalsButtons = goalsSection ? Array.from(goalsSection.querySelectorAll('button')).map(b => b.innerText.trim()) : [];
    const goalsProgressBars = goalsSection ? goalsSection.querySelectorAll('.rounded-full.bg-slate-200, .rounded-full.bg-slate-700').length : 0;

    // Check quick actions
    const quickActions = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(t => t.length > 0);

    return {
      title: document.title,
      incomeText: incomeEl ? incomeEl.innerText : '',
      expenseText: expenseEl ? expenseEl.innerText : '',
      hasBudgetSection: !!budgetSection,
      budgetText: budgetText.slice(0, 300),
      budgetButtons,
      budgetProgressBars,
      hasGoalsSection: !!goalsSection,
      goalsText: goalsText.slice(0, 300),
      goalsButtons,
      goalsProgressBars,
      allButtons: quickActions.slice(0, 20)
    };
  });

  console.log('Dashboard Data:', JSON.stringify(dashboardData, null, 2));

  // 2. Navigate to "明细" (Transactions) page
  console.log('Navigating to Transactions page...');
  const txNavResult = await page.evaluate(() => {
    // Look for nav buttons (Desktop sidebar or mobile bottom nav)
    const btns = Array.from(document.querySelectorAll('button, nav a, a'));
    const txBtn = btns.find(b => b.innerText.includes('明细') || b.innerText.includes('流水'));
    if (txBtn) {
      txBtn.click();
      return { success: true, text: txBtn.innerText };
    }
    return { success: false };
  });
  console.log('Transactions nav click:', txNavResult);
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_transactions.png', fullPage: true });

  const transactionsData = await page.evaluate(() => {
    // Check category breakdown
    const categoryCards = Array.from(document.querySelectorAll('.rounded-2xl, .rounded-xl, .p-3, .p-4')).filter(el => 
      el.innerText.includes('支出分类占比分析') || el.innerText.includes('支出分类') || el.innerText.includes('分类占比')
    );
    
    const breakdownEl = categoryCards[0];
    const breakdownText = breakdownEl ? breakdownEl.innerText : '';

    // Check summary card
    const summaryCard = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('本月日常支出') && d.innerText.includes('本月日常收入'));

    // Check transactions list items
    const rows = Array.from(document.querySelectorAll('.group.p-3\\.5, .p-3, .divide-y > div')).map(el => el.innerText.replace(/\n+/g, ' | ').slice(0, 100));

    return {
      breakdownFound: !!breakdownEl,
      breakdownText: breakdownText.slice(0, 500),
      summaryText: summaryCard ? summaryCard.innerText.slice(0, 200) : '',
      sampleRows: rows.slice(0, 10),
      bodyTextSnippet: document.body.innerText.slice(0, 1000)
    };
  });

  console.log('Transactions Page Data:', JSON.stringify(transactionsData, null, 2));

  // 3. Navigate to "我的" (Settings) page
  console.log('Navigating to Settings page...');
  const settingsNavResult = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, nav a, a'));
    const sBtn = btns.find(b => b.innerText.includes('我的') || b.innerText.includes('设置'));
    if (sBtn) {
      sBtn.click();
      return { success: true, text: sBtn.innerText };
    }
    return { success: false };
  });
  console.log('Settings nav click:', settingsNavResult);
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_settings.png', fullPage: true });

  const settingsData = await page.evaluate(() => {
    const hubEl = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('财务系统功能快捷入口'));
    const hubButtons = hubEl ? Array.from(hubEl.querySelectorAll('button')).map(b => b.innerText.replace(/\n+/g, ' - ')) : [];

    const aiSection = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('AI 智能大模型'));
    const glassSection = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('液态毛玻璃'));

    return {
      hubFound: !!hubEl,
      hubButtons,
      hubSnippet: hubEl ? hubEl.innerText.slice(0, 400) : '',
      hasAiSection: !!aiSection,
      hasGlassSection: !!glassSection
    };
  });

  console.log('Settings Page Data:', JSON.stringify(settingsData, null, 2));

  // Test Mobile Viewport (iPhone 14 / modern mobile 390x844)
  console.log('Testing mobile viewport...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_mobile_settings.png' });

  // Test mobile bottom nav
  const mobileNavData = await page.evaluate(() => {
    const bottomNav = document.querySelector('nav.fixed.bottom-0') || document.querySelector('.fixed.bottom-0');
    return {
      hasBottomNav: !!bottomNav,
      bottomNavButtons: bottomNav ? Array.from(bottomNav.querySelectorAll('button')).map(b => b.innerText.trim()) : []
    };
  });

  console.log('Mobile Nav Data:', JSON.stringify(mobileNavData, null, 2));

  // Test dark mode toggle if available
  const themeData = await page.evaluate(() => {
    const html = document.documentElement;
    const isDarkBefore = html.classList.contains('dark');
    // Find theme toggle button
    const themeBtn = Array.from(document.querySelectorAll('button')).find(b => 
      b.getAttribute('title')?.includes('明亮') || 
      b.getAttribute('title')?.includes('暗黑') ||
      b.getAttribute('aria-label')?.includes('theme') ||
      b.innerHTML.includes('Sun') ||
      b.innerHTML.includes('Moon') ||
      b.className.includes('theme')
    );
    if (themeBtn) {
      themeBtn.click();
    }
    return {
      isDarkBefore,
      themeBtnFound: !!themeBtn,
      isDarkAfter: html.classList.contains('dark')
    };
  });
  console.log('Theme toggle data:', JSON.stringify(themeData, null, 2));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_mobile_dark.png' });

  await browser.close();

  const fullReport = {
    dashboardData,
    transactionsData,
    settingsData,
    mobileNavData,
    themeData,
    consoleLogs,
    pageErrors
  };

  fs.writeFileSync('d:/Antigravity项目/财务管理系统/verification_full_report.json', JSON.stringify(fullReport, null, 2));
  console.log('Verification finished! Full report written.');
}

run().catch(console.error);
