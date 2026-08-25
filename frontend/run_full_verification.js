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

  // Handle all confirm/alert dialogs automatically
  page.on('dialog', async dialog => {
    console.log('Auto-accepting dialog:', dialog.message());
    await dialog.accept();
  });

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

  // 1. First, load Demo data to populate realistic multi-account, budget, goal, and transaction records
  console.log('Loading full-spectrum demo data...');
  // Go to Settings
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, nav a, a'));
    const sBtn = btns.find(b => b.innerText.includes('系统设置') || b.innerText.includes('我的'));
    if (sBtn) sBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Click seed demo button
  const seedClick = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const seedBtn = btns.find(b => b.innerText.includes('载入全场景演示数据'));
    if (seedBtn) {
      seedBtn.click();
      return { success: true, text: seedBtn.innerText };
    }
    return { success: false };
  });
  console.log('Seed demo button clicked:', seedClick);
  await new Promise(r => setTimeout(r, 2000));

  // ==========================================
  // ITEM 1: CHECK DASHBOARD
  // ==========================================
  console.log('\n==========================================');
  console.log('ITEM 1: CHECKING DASHBOARD...');
  console.log('==========================================');
  // Navigate to Dashboard
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, nav a, a'));
    const dBtn = btns.find(b => b.innerText.includes('财务总览') || b.innerText.includes('首页'));
    if (dBtn) dBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_1_dashboard.png', fullPage: true });

  const dashboardVerification = await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));
    
    // 1. Month summary numbers
    const incomeEl = allDivs.find(d => d.innerText.includes('本月日常收入'));
    const expenseEl = allDivs.find(d => d.innerText.includes('本月日常支出'));
    const netWorthEl = allDivs.find(d => d.innerText.includes('净资产总额'));

    // 2. Monthly Budgets Section
    const budgetSection = allDivs.find(d => d.innerText.includes('月度预算监控') && d.classList.contains('p-4'));
    const budgetItems = budgetSection ? Array.from(budgetSection.querySelectorAll('.rounded-2xl')).map(el => ({
      text: el.innerText.replace(/\n+/g, ' | '),
      hasProgressBar: el.querySelectorAll('.rounded-full').length > 0
    })) : [];
    const budgetButtons = budgetSection ? Array.from(budgetSection.querySelectorAll('button')).map(b => b.innerText.trim()) : [];

    // 3. Savings Goals Section
    const goalsSection = allDivs.find(d => d.innerText.includes('储蓄计划与心愿目标') && d.classList.contains('p-4'));
    const goalItems = goalsSection ? Array.from(goalsSection.querySelectorAll('.rounded-2xl, .p-3')).map(el => ({
      text: el.innerText.replace(/\n+/g, ' | '),
      hasProgressBar: el.querySelectorAll('.rounded-full').length > 0
    })) : [];
    const goalButtons = goalsSection ? Array.from(goalsSection.querySelectorAll('button')).map(b => b.innerText.trim()) : [];

    return {
      netWorthCard: netWorthEl ? netWorthEl.innerText.replace(/\n+/g, ' | ') : '',
      incomeText: incomeEl ? incomeEl.innerText.replace(/\n+/g, ' ') : '',
      expenseText: expenseEl ? expenseEl.innerText.replace(/\n+/g, ' ') : '',
      budgets: {
        found: !!budgetSection,
        header: budgetSection ? budgetSection.querySelector('.font-bold')?.innerText : '',
        buttons: budgetButtons,
        itemsCount: budgetItems.length,
        items: budgetItems
      },
      goals: {
        found: !!goalsSection,
        header: goalsSection ? goalsSection.querySelector('.font-bold')?.innerText : '',
        buttons: goalButtons,
        itemsCount: goalItems.length,
        items: goalItems
      }
    };
  });
  console.log('Dashboard Verification Result:', JSON.stringify(dashboardVerification, null, 2));

  // ==========================================
  // ITEM 2: CHECK TRANSACTIONS (明细) PAGE
  // ==========================================
  console.log('\n==========================================');
  console.log('ITEM 2: CHECKING TRANSACTIONS PAGE...');
  console.log('==========================================');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, nav a, a'));
    const txBtn = btns.find(b => b.innerText.includes('账单流水') || b.innerText.includes('明细'));
    if (txBtn) txBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_2_transactions.png', fullPage: true });

  const transactionsVerification = await page.evaluate(() => {
    const allEls = Array.from(document.querySelectorAll('div, section'));

    // Category Breakdown Card
    const breakdownEl = allEls.find(el => el.innerText && el.innerText.includes('支出分类占比分析') && el.classList.contains('p-4'));
    const breakdownRows = breakdownEl ? Array.from(breakdownEl.querySelectorAll('.rounded-2xl, .p-2\\.5, .flex.items-center.justify-between')).map(el => el.innerText.replace(/\n+/g, ' | ')).filter(t => t.length > 5) : [];

    const hasCalibrationInBreakdown = breakdownEl ? breakdownEl.innerText.includes('余额校准') : false;

    // Summary Card
    const summaryCard = allEls.find(el => el.innerText && el.innerText.includes('本月日常支出') && el.innerText.includes('本月日常结余'));

    // Transaction rows in list
    const txList = Array.from(document.querySelectorAll('.group')).map(el => el.innerText.replace(/\s+/g, ' ').slice(0, 100));

    return {
      breakdownCardFound: !!breakdownEl,
      hasCalibrationInBreakdown,
      breakdownRowsSnippet: breakdownRows.slice(0, 10),
      summaryCardText: summaryCard ? summaryCard.innerText.replace(/\n+/g, ' | ') : '',
      sampleTransactions: txList.slice(0, 5)
    };
  });
  console.log('Transactions Verification Result:', JSON.stringify(transactionsVerification, null, 2));

  // ==========================================
  // ITEM 3: CHECK SETTINGS (我的) PAGE & HUB
  // ==========================================
  console.log('\n==========================================');
  console.log('ITEM 3: CHECKING SETTINGS HUB...');
  console.log('==========================================');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, nav a, a'));
    const sBtn = btns.find(b => b.innerText.includes('系统设置') || b.innerText.includes('我的'));
    if (sBtn) sBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_3_settings.png', fullPage: true });

  const settingsVerification = await page.evaluate(() => {
    const allEls = Array.from(document.querySelectorAll('div, section'));
    const hubEl = allEls.find(el => el.innerText && el.innerText.includes('财务系统功能快捷入口') && el.classList.contains('p-4'));
    const hubButtons = hubEl ? Array.from(hubEl.querySelectorAll('button')).map(b => b.innerText.replace(/\n+/g, ' | ')) : [];

    const aiCard = allEls.find(el => el.innerText && el.innerText.includes('AI 智能大模型') && el.classList.contains('p-4'));
    const glassCard = allEls.find(el => el.innerText && el.innerText.includes('液态毛玻璃') && el.classList.contains('p-4'));

    return {
      hubFound: !!hubEl,
      hubTitle: hubEl ? hubEl.querySelector('h3')?.innerText : '',
      hubButtons,
      hasAiCard: !!aiCard,
      hasGlassCard: !!glassCard
    };
  });
  console.log('Settings Hub Verification Result:', JSON.stringify(settingsVerification, null, 2));

  // Test Direct Navigation of All Hub Buttons
  console.log('\nTesting Hub Buttons Routing Navigation...');
  const routingTest = {};

  const testPages = [
    { name: '月度预算', expectedTitle: '预算与风控' },
    { name: '存钱目标', expectedTitle: '心愿目标' },
    { name: '财务图表', expectedTitle: '深度财务分析' },
    { name: '负债与还款', expectedTitle: '负债与还款规划' },
    { name: '投资持仓', expectedTitle: '投资理财' }
  ];

  for (const item of testPages) {
    // Navigate to Settings
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, nav a, a'));
      const sBtn = btns.find(b => b.innerText.includes('系统设置') || b.innerText.includes('我的'));
      if (sBtn) sBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Click Hub button
    const clickOk = await page.evaluate((btnName) => {
      const hubEl = Array.from(document.querySelectorAll('div')).find(el => el.innerText && el.innerText.includes('财务系统功能快捷入口'));
      if (!hubEl) return false;
      const btn = Array.from(hubEl.querySelectorAll('button')).find(b => b.innerText.includes(btnName));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    }, item.name);

    await new Promise(r => setTimeout(r, 800));
    const pageTitle = await page.evaluate(() => document.querySelector('h1')?.innerText || '');
    routingTest[item.name] = { clicked: clickOk, navigatedTitle: pageTitle };
  }
  console.log('Routing Navigation Results:', JSON.stringify(routingTest, null, 2));

  // ==========================================
  // ITEM 4: RESPONSIVENESS, MOBILE, DARK MODE
  // ==========================================
  console.log('\n==========================================');
  console.log('ITEM 4: TESTING MOBILE & DARK MODE...');
  console.log('==========================================');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  // Navigate to Dashboard
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, nav a, a'));
    const dBtn = btns.find(b => b.innerText.includes('首页') || b.innerText.includes('财务总览'));
    if (dBtn) dBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_4_mobile_light.png' });

  // Check Mobile Bottom Nav
  const mobileNav = await page.evaluate(() => {
    const bNav = document.querySelector('nav.fixed.bottom-0');
    return {
      exists: !!bNav,
      buttons: bNav ? Array.from(bNav.querySelectorAll('button')).map(b => b.innerText.replace(/\s+/g, ' ').trim()) : []
    };
  });
  console.log('Mobile Nav:', JSON.stringify(mobileNav, null, 2));

  // Toggle Dark Mode
  const darkModeToggle = await page.evaluate(() => {
    const html = document.documentElement;
    const isDarkInit = html.classList.contains('dark');
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
      before: isDarkInit,
      buttonFound: !!themeBtn,
      after: html.classList.contains('dark')
    };
  });
  console.log('Dark Mode Toggle:', JSON.stringify(darkModeToggle, null, 2));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_5_mobile_dark.png' });

  await browser.close();

  const finalOutput = {
    dashboardVerification,
    transactionsVerification,
    settingsVerification,
    routingTest,
    mobileNav,
    darkModeToggle,
    consoleLogs,
    pageErrors
  };

  fs.writeFileSync('d:/Antigravity项目/财务管理系统/final_verification_report.json', JSON.stringify(finalOutput, null, 2));
  console.log('\n==========================================');
  console.log('FULL VERIFICATION COMPLETED SUCCESSFULLY!');
  console.log('==========================================');
}

run().catch(console.error);
