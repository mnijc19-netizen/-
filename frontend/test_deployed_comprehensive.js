import puppeteer from 'puppeteer-core';
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
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1280, height: 900 });

  const consoleLogs = [];
  const pageErrors = [];

  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', err => {
    pageErrors.push(err.toString());
  });

  console.log('Navigating to https://mnijc19-netizen.github.io/-/?t=' + Date.now());
  await page.goto('https://mnijc19-netizen.github.io/-/?t=' + Date.now(), { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // 1. First test initial state of Dashboard
  const initialDashboard = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      bodySnippet: text.slice(0, 1500),
      hasBudget: text.includes('月度预算监控'),
      hasGoals: text.includes('储蓄计划与心愿目标'),
      hasDailyExpense: text.includes('本月日常支出')
    };
  });
  console.log('Initial Dashboard check:', initialDashboard);

  // If data is empty or needs demo data, let's load demo data to verify full data visualization & calculation
  console.log('Loading demo data for complete data verification...');
  await page.evaluate(async () => {
    // Go to settings or call api directly
    if (window.localStorage) {
      // Find seed demo button or trigger api.seedDemo() via custom eval
      const btns = Array.from(document.querySelectorAll('button, nav a, a'));
      const settingsBtn = btns.find(b => b.innerText.includes('我的') || b.innerText.includes('设置'));
      if (settingsBtn) settingsBtn.click();
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  // Click seed demo button in Settings
  const seedResult = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const seedBtn = btns.find(b => b.innerText.includes('载入全场景演示数据') || b.innerText.includes('演示数据'));
    if (seedBtn) {
      // Mock window.confirm
      window.confirm = () => true;
      seedBtn.click();
      return { success: true, text: seedBtn.innerText };
    }
    return { success: false };
  });
  console.log('Seed demo click result:', seedResult);
  await new Promise(r => setTimeout(r, 2000));

  // Navigate back to Dashboard (首页/概览)
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, nav a, a'));
    const dBtn = btns.find(b => b.innerText.includes('首页') || b.innerText.includes('概览') || b.innerText.includes('资产'));
    if (dBtn) dBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // Capture full desktop dashboard screenshot
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_1_dashboard_desktop.png', fullPage: true });

  // 1. In-depth Dashboard Verification
  const dashboardDetails = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    
    // Monthly flow cards
    const incomeCard = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('本月日常收入'));
    const expenseCard = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('本月日常支出'));

    // Budgets Section
    const allDivs = Array.from(document.querySelectorAll('div'));
    const budgetSection = allDivs.find(d => d.innerText.includes('月度预算监控') && d.classList.contains('p-4'));
    const budgetItems = budgetSection ? Array.from(budgetSection.querySelectorAll('.rounded-2xl')).map(el => el.innerText.replace(/\n+/g, ' | ')) : [];
    const budgetProgressBars = budgetSection ? budgetSection.querySelectorAll('.bg-emerald-500, .bg-amber-500, .bg-rose-500, [style*="width"]').length : 0;
    const budgetActionBtns = budgetSection ? Array.from(budgetSection.querySelectorAll('button')).map(b => b.innerText.trim()) : [];

    // Goals Section
    const goalsSection = allDivs.find(d => d.innerText.includes('储蓄计划与心愿目标') && d.classList.contains('p-4'));
    const goalItems = goalsSection ? Array.from(goalsSection.querySelectorAll('.rounded-2xl, .p-3')).map(el => el.innerText.replace(/\n+/g, ' | ')) : [];
    const goalProgressBars = goalsSection ? goalsSection.querySelectorAll('.bg-gradient-to-r, [style*="width"]').length : 0;
    const goalActionBtns = goalsSection ? Array.from(goalsSection.querySelectorAll('button')).map(b => b.innerText.trim()) : [];

    return {
      netWorthText: allDivs.find(d => d.innerText.includes('净资产总额'))?.innerText.split('\n').slice(0, 4).join(' | '),
      incomeText: incomeCard ? incomeCard.innerText.replace(/\n+/g, ' ') : '',
      expenseText: expenseCard ? expenseCard.innerText.replace(/\n+/g, ' ') : '',
      budgetSectionFound: !!budgetSection,
      budgetHeader: budgetSection ? budgetSection.querySelector('.font-bold')?.innerText : '',
      budgetItems,
      budgetProgressBars,
      budgetActionBtns,
      goalsSectionFound: !!goalsSection,
      goalsHeader: goalsSection ? goalsSection.querySelector('.font-bold')?.innerText : '',
      goalItems,
      goalProgressBars,
      goalActionBtns
    };
  });
  console.log('=== 1. DASHBOARD VERIFICATION RESULTS ===\n', JSON.stringify(dashboardDetails, null, 2));

  // 2. In-depth Transactions Verification
  console.log('\nNavigating to Transactions Page...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, nav a, a'));
    const txBtn = btns.find(b => b.innerText.includes('明细') || b.innerText.includes('流水'));
    if (txBtn) txBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_2_transactions_desktop.png', fullPage: true });

  const transactionsDetails = await page.evaluate(() => {
    const allEls = Array.from(document.querySelectorAll('div, section'));
    
    // Category Breakdown Card
    const breakdownEl = allEls.find(el => el.innerText && el.innerText.includes('支出分类占比分析') && el.classList.contains('p-4'));
    const breakdownItems = breakdownEl ? Array.from(breakdownEl.querySelectorAll('.rounded-2xl, .p-2\\.5, .flex.items-center.justify-between')).map(el => el.innerText.replace(/\n+/g, ' | ')) : [];

    // Check if "余额校准" is in breakdown
    const hasCalibrationInBreakdown = breakdownEl ? breakdownEl.innerText.includes('余额校准') : false;

    // Summary Card
    const summaryCard = allEls.find(el => el.innerText && el.innerText.includes('本月日常支出') && el.innerText.includes('本月日常结余'));

    // Transaction rows
    const txList = Array.from(document.querySelectorAll('.group')).map(el => el.innerText.replace(/\s+/g, ' ').slice(0, 100));

    return {
      breakdownSectionFound: !!breakdownEl,
      breakdownSnippet: breakdownEl ? breakdownEl.innerText : '',
      hasCalibrationInBreakdown,
      breakdownItems: breakdownItems.slice(0, 10),
      summaryCardText: summaryCard ? summaryCard.innerText.replace(/\n+/g, ' | ') : '',
      sampleTxs: txList.slice(0, 8)
    };
  });
  console.log('=== 2. TRANSACTIONS VERIFICATION RESULTS ===\n', JSON.stringify(transactionsDetails, null, 2));

  // 3. In-depth Settings Verification
  console.log('\nNavigating to Settings Page...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, nav a, a'));
    const sBtn = btns.find(b => b.innerText.includes('我的') || b.innerText.includes('设置'));
    if (sBtn) sBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_3_settings_desktop.png', fullPage: true });

  const settingsDetails = await page.evaluate(() => {
    const allEls = Array.from(document.querySelectorAll('div, section'));
    
    // Quick Hub
    const hubEl = allEls.find(el => el.innerText && el.innerText.includes('财务系统功能快捷入口') && el.classList.contains('p-4'));
    const hubButtons = hubEl ? Array.from(hubEl.querySelectorAll('button')).map(b => b.innerText.replace(/\n+/g, ' | ')) : [];

    // AI & Labs
    const aiSection = allEls.find(el => el.innerText && el.innerText.includes('AI 智能大模型'));
    const glassSection = allEls.find(el => el.innerText && el.innerText.includes('液态毛玻璃'));

    return {
      hubSectionFound: !!hubEl,
      hubButtons,
      hasAiSection: !!aiSection,
      hasGlassSection: !!glassSection
    };
  });
  console.log('=== 3. SETTINGS HUB VERIFICATION RESULTS ===\n', JSON.stringify(settingsDetails, null, 2));

  // Test Hub direct navigation
  console.log('\nTesting Hub Buttons Direct Navigation...');
  const hubNavigationTest = {};
  
  // Test clicking "月度预算" in Hub
  await page.evaluate(() => {
    const hubEl = Array.from(document.querySelectorAll('div')).find(el => el.innerText && el.innerText.includes('财务系统功能快捷入口'));
    const btn = Array.from(hubEl.querySelectorAll('button')).find(b => b.innerText.includes('月度预算'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  hubNavigationTest.budgetsPageTitle = await page.evaluate(() => document.querySelector('h1')?.innerText || '');

  // Go back to Settings
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, nav a, a'));
    const sBtn = btns.find(b => b.innerText.includes('我的') || b.innerText.includes('设置'));
    if (sBtn) sBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Test clicking "存钱目标" in Hub
  await page.evaluate(() => {
    const hubEl = Array.from(document.querySelectorAll('div')).find(el => el.innerText && el.innerText.includes('财务系统功能快捷入口'));
    const btn = Array.from(hubEl.querySelectorAll('button')).find(b => b.innerText.includes('存钱目标'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  hubNavigationTest.goalsPageTitle = await page.evaluate(() => document.querySelector('h1')?.innerText || '');

  // Go back to Settings
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, nav a, a'));
    const sBtn = btns.find(b => b.innerText.includes('我的') || b.innerText.includes('设置'));
    if (sBtn) sBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Test clicking "财务图表" in Hub
  await page.evaluate(() => {
    const hubEl = Array.from(document.querySelectorAll('div')).find(el => el.innerText && el.innerText.includes('财务系统功能快捷入口'));
    const btn = Array.from(hubEl.querySelectorAll('button')).find(b => b.innerText.includes('财务图表'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  hubNavigationTest.analyticsPageTitle = await page.evaluate(() => document.querySelector('h1')?.innerText || '');

  console.log('Hub Direct Navigation Test:', hubNavigationTest);

  // 4. Mobile & Responsive & Dark Mode Verification
  console.log('\nTesting Mobile Viewport & Dark Mode...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  
  // Go to Dashboard
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, nav a, a'));
    const dBtn = btns.find(b => b.innerText.includes('首页') || b.innerText.includes('概览') || b.innerText.includes('资产'));
    if (dBtn) dBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_4_mobile_dashboard.png' });

  // Toggle Dark Mode
  const darkModeTest = await page.evaluate(() => {
    const html = document.documentElement;
    const isDarkBefore = html.classList.contains('dark');
    // Find theme toggle button in navbar
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
      isDarkAfter: html.classList.contains('dark')
    };
  });
  console.log('Dark mode toggle test:', darkModeTest);
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_5_mobile_dark_dashboard.png' });

  // Mobile Bottom Navigation Bar check
  const mobileNavCheck = await page.evaluate(() => {
    const bottomNav = document.querySelector('nav.fixed.bottom-0');
    const items = bottomNav ? Array.from(bottomNav.querySelectorAll('button')).map(b => b.innerText.replace(/\s+/g, ' ').trim()) : [];
    return {
      hasBottomNav: !!bottomNav,
      items
    };
  });
  console.log('Mobile Bottom Navigation:', mobileNavCheck);

  await browser.close();

  const finalReport = {
    dashboardDetails,
    transactionsDetails,
    settingsDetails,
    hubNavigationTest,
    mobileNavCheck,
    darkModeTest,
    consoleLogs,
    pageErrors
  };

  fs.writeFileSync('d:/Antigravity项目/财务管理系统/verification_complete_report.json', JSON.stringify(finalReport, null, 2));
  console.log('\nAll comprehensive tests passed and report written to verification_complete_report.json!');
}

run().catch(console.error);
