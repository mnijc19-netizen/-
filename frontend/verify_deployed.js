import puppeteer from 'puppeteer-core';
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
    // 1. Month Flow Stats
    const allDivs = Array.from(document.querySelectorAll('div'));
    const incomeEl = allDivs.find(d => d.innerText.includes('本月日常收入'));
    const expenseEl = allDivs.find(d => d.innerText.includes('本月日常支出'));

    // 2. Monthly Budgets Section
    const budgetHeading = Array.from(document.querySelectorAll('*')).find(el => el.innerText && el.innerText.includes('月度预算监控'));
    let budgetContainer = budgetHeading;
    while (budgetContainer && !budgetContainer.classList.contains('p-4') && budgetContainer.parentElement) {
      budgetContainer = budgetContainer.parentElement;
    }
    const budgetText = budgetContainer ? budgetContainer.innerText : (budgetHeading ? budgetHeading.innerText : '');
    const budgetButtons = budgetContainer ? Array.from(budgetContainer.querySelectorAll('button')).map(b => b.innerText.trim()) : [];
    const budgetProgressBars = budgetContainer ? budgetContainer.querySelectorAll('.rounded-full').length : 0;

    // 3. Savings Goals Section
    const goalsHeading = Array.from(document.querySelectorAll('*')).find(el => el.innerText && el.innerText.includes('储蓄计划与心愿目标'));
    let goalsContainer = goalsHeading;
    while (goalsContainer && !goalsContainer.classList.contains('p-4') && goalsContainer.parentElement) {
      goalsContainer = goalsContainer.parentElement;
    }
    const goalsText = goalsContainer ? goalsContainer.innerText : (goalsHeading ? goalsHeading.innerText : '');
    const goalsButtons = goalsContainer ? Array.from(goalsContainer.querySelectorAll('button')).map(b => b.innerText.trim()) : [];
    const goalsProgressBars = goalsContainer ? goalsContainer.querySelectorAll('.rounded-full').length : 0;

    // 4. Quick Action buttons
    const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(t => t.length > 0);

    return {
      title: document.title,
      netWorthCard: allDivs.find(d => d.innerText.includes('净资产总额'))?.innerText || '',
      incomeText: incomeEl ? incomeEl.innerText : '',
      expenseText: expenseEl ? expenseEl.innerText : '',
      hasBudgetSection: !!budgetHeading,
      budgetText: budgetText,
      budgetButtons,
      budgetProgressBars,
      hasGoalsSection: !!goalsHeading,
      goalsText: goalsText,
      goalsButtons,
      goalsProgressBars,
      buttonsSnippet: buttons.slice(0, 15)
    };
  });

  console.log('Dashboard Data:', JSON.stringify(dashboardData, null, 2));

  // 2. Navigate to "明细" (Transactions) page
  console.log('Navigating to Transactions page...');
  const txNavResult = await page.evaluate(() => {
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
    // Look for category breakdown section
    const allEls = Array.from(document.querySelectorAll('div, section'));
    const breakdownEl = allEls.find(el => el.innerText && el.innerText.includes('支出分类占比分析'));
    
    // Look for monthly expense summary
    const summaryCard = allEls.find(el => el.innerText && el.innerText.includes('本月日常支出') && el.innerText.includes('本月日常收入'));

    // Check if "余额校准" is in the breakdown
    const hasCalibrationInBreakdown = breakdownEl ? breakdownEl.innerText.includes('余额校准') : false;

    // Check transaction rows
    const txRows = Array.from(document.querySelectorAll('.group, .divide-y > div')).map(el => el.innerText.replace(/\s+/g, ' ').slice(0, 120)).filter(t => t.length > 10);

    return {
      breakdownFound: !!breakdownEl,
      breakdownText: breakdownEl ? breakdownEl.innerText : '',
      hasCalibrationInBreakdown,
      summaryText: summaryCard ? summaryCard.innerText : '',
      sampleTxRows: txRows.slice(0, 10)
    };
  });

  console.log('Transactions Data:', JSON.stringify(transactionsData, null, 2));

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
    const allEls = Array.from(document.querySelectorAll('div, section'));
    const hubEl = allEls.find(el => el.innerText && el.innerText.includes('财务系统功能快捷入口'));
    const hubButtons = hubEl ? Array.from(hubEl.querySelectorAll('button')).map(b => b.innerText.replace(/\n+/g, ' - ')) : [];

    const aiSection = allEls.find(el => el.innerText && el.innerText.includes('AI 智能大模型'));
    const glassSection = allEls.find(el => el.innerText && el.innerText.includes('液态毛玻璃'));

    return {
      hubFound: !!hubEl,
      hubButtons,
      hubSnippet: hubEl ? hubEl.innerText : '',
      hasAiSection: !!aiSection,
      hasGlassSection: !!glassSection
    };
  });

  console.log('Settings Data:', JSON.stringify(settingsData, null, 2));

  // Test Hub buttons navigation (e.g. click "月度预算" in Hub)
  console.log('Testing Hub button click for Budgets...');
  const hubBudgetsClick = await page.evaluate(() => {
    const hubEl = Array.from(document.querySelectorAll('div')).find(el => el.innerText && el.innerText.includes('财务系统功能快捷入口'));
    if (!hubEl) return { success: false, reason: 'hub not found' };
    const btn = Array.from(hubEl.querySelectorAll('button')).find(b => b.innerText.includes('月度预算'));
    if (btn) {
      btn.click();
      return { success: true, buttonText: btn.innerText };
    }
    return { success: false, reason: 'button not found' };
  });
  console.log('Hub Budgets Click Result:', hubBudgetsClick);
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_navigated_budgets.png', fullPage: true });

  const navigatedBudgetsPageText = await page.evaluate(() => {
    return {
      pageTitle: document.querySelector('h1')?.innerText || '',
      bodySnippet: document.body.innerText.slice(0, 300)
    };
  });
  console.log('Navigated Budgets Page:', navigatedBudgetsPageText);

  // 4. Test Mobile Viewport (390x844) & Responsive layout & Dark mode
  console.log('Testing mobile viewport 390x844...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  
  // Navigate back to Dashboard in mobile
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, nav a, a'));
    const dBtn = btns.find(b => b.innerText.includes('概览') || b.innerText.includes('首页') || b.innerText.includes('资产'));
    if (dBtn) dBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_mobile_dashboard.png' });

  // Check mobile bottom navigation
  const mobileNavInfo = await page.evaluate(() => {
    const bottomNav = document.querySelector('nav.fixed.bottom-0') || document.querySelector('.fixed.bottom-0');
    const buttons = bottomNav ? Array.from(bottomNav.querySelectorAll('button')).map(b => b.innerText.replace(/\s+/g, ' ').trim()) : [];
    return {
      hasBottomNav: !!bottomNav,
      bottomNavButtons: buttons
    };
  });
  console.log('Mobile Bottom Nav Info:', JSON.stringify(mobileNavInfo, null, 2));

  // Test Dark Mode
  const darkModeResult = await page.evaluate(() => {
    const html = document.documentElement;
    const isDarkBefore = html.classList.contains('dark');
    // Click theme toggle button in navbar
    const themeBtn = Array.from(document.querySelectorAll('button')).find(b => 
      b.getAttribute('title')?.includes('明亮') || 
      b.getAttribute('title')?.includes('暗黑') ||
      b.getAttribute('title')?.includes('主题') ||
      b.className.includes('theme')
    );
    if (themeBtn) {
      themeBtn.click();
    }
    return {
      isDarkBefore,
      themeBtnFound: !!themeBtn,
      themeBtnTitle: themeBtn ? themeBtn.getAttribute('title') : null,
      isDarkAfter: html.classList.contains('dark')
    };
  });
  console.log('Dark mode toggle result:', JSON.stringify(darkModeResult, null, 2));
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_mobile_dark_dashboard.png' });

  await browser.close();

  const finalReport = {
    dashboardData,
    transactionsData,
    settingsData,
    hubBudgetsClick,
    navigatedBudgetsPageText,
    mobileNavInfo,
    darkModeResult,
    consoleLogs,
    pageErrors
  };

  fs.writeFileSync('d:/Antigravity项目/财务管理系统/verification_full_report.json', JSON.stringify(finalReport, null, 2));
  console.log('Full report generated successfully!');
}

run().catch(console.error);
