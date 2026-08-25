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
  await new Promise(r => setTimeout(r, 1000));

  // 1. Inject realistic test data
  await page.evaluate(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const accounts = [
      { id: 'acc-1', name: '微信零钱/零钱通', type: 'wallet', currency: 'CNY', balance: 5000, initial_balance: 5000, is_active: 1 },
      { id: 'acc-2', name: '支付宝/余额宝', type: 'wallet', currency: 'CNY', balance: 8000, initial_balance: 8000, is_active: 1 },
      { id: 'acc-3', name: '主要银行储蓄卡', type: 'bank', currency: 'CNY', balance: 20000, initial_balance: 20000, is_active: 1 }
    ];
    localStorage.setItem('smartwealth_accounts_v2', JSON.stringify(accounts));

    const transactions = [
      {
        id: 'tx-adj-1',
        date: `${dateStr} 10:00`,
        type: 'expense',
        amount: 50000.00,
        merchant: '微信零钱 (余额校准)',
        category_name: '余额校准',
        category_id: 'cat-adj',
        account_id: 'acc-1',
        account_name: '微信零钱/零钱通',
        note: '微信零钱余额对账校准',
        source: 'manual'
      },
      {
        id: 'tx-living-1',
        date: `${dateStr} 12:30`,
        type: 'expense',
        amount: 188.00,
        merchant: '外婆家餐厅',
        category_name: '餐饮美食',
        category_id: 'cat-exp-1',
        account_id: 'acc-1',
        account_name: '微信零钱/零钱通',
        note: '周末聚餐',
        source: 'manual'
      },
      {
        id: 'tx-living-2',
        date: `${dateStr} 15:45`,
        type: 'expense',
        amount: 312.00,
        merchant: '山姆会员商店',
        category_name: '日用百货',
        category_id: 'cat-exp-3',
        account_id: 'acc-2',
        account_name: '支付宝/余额宝',
        note: '购买家庭生活日用品',
        source: 'manual'
      },
      {
        id: 'tx-inc-1',
        date: `${dateStr} 09:00`,
        type: 'income',
        amount: 16000.00,
        merchant: '公司工资',
        category_name: '工资薪金',
        category_id: 'cat-inc-1',
        account_id: 'acc-3',
        account_name: '主要银行储蓄卡',
        note: '月度薪酬发放',
        source: 'manual'
      }
    ];
    localStorage.setItem('smartwealth_transactions_v2', JSON.stringify(transactions));

    const budgets = [
      { id: 'bg-1', category_id: 'cat-exp-1', category_name: '餐饮美食', period: 'monthly', amount: 1500.00, spent_amount: 188.00, alert_threshold: 0.8 },
      { id: 'bg-2', category_id: 'cat-exp-3', category_name: '日用百货', period: 'monthly', amount: 1000.00, spent_amount: 312.00, alert_threshold: 0.8 }
    ];
    localStorage.setItem('smartwealth_budgets_v2', JSON.stringify(budgets));

    const goals = [
      { id: 'g-1', name: '6个月存2万备用金计划', target_amount: 20000.00, current_amount: 8000.00, target_date: '2026-12-31', is_completed: 0, progress_percentage: 40.0 },
      { id: 'g-2', name: '年终全家海岛游心愿', target_amount: 15000.00, current_amount: 5000.00, target_date: '2026-12-25', is_completed: 0, progress_percentage: 33.3 }
    ];
    localStorage.setItem('smartwealth_goals_v2', JSON.stringify(goals));
  });

  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // ==============================================================
  // 1. DASHBOARD INSPECTION
  // ==============================================================
  console.log('\n--- 1. INSPECTING DASHBOARD ---');
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/inspection_1_dashboard.png', fullPage: true });

  const dashboardResult = await page.evaluate(() => {
    const text = document.body.innerText;
    
    // Monthly flow numbers
    const incomeCard = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('本月日常收入'));
    const expenseCard = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('本月日常支出'));

    // Budgets section
    const budgetSection = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('月度预算监控') && d.classList.contains('p-4'));
    const budgetItems = budgetSection ? Array.from(budgetSection.querySelectorAll('.rounded-2xl')).map(el => {
      const bar = el.querySelector('.rounded-full div');
      return {
        text: el.innerText.replace(/\n+/g, ' | '),
        progressStyle: bar ? bar.getAttribute('style') : null
      };
    }) : [];
    const budgetButtons = budgetSection ? Array.from(budgetSection.querySelectorAll('button')).map(b => b.innerText.trim()) : [];

    // Goals section
    const goalsSection = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('储蓄计划与心愿目标') && d.classList.contains('p-4'));
    const goalItems = goalsSection ? Array.from(goalsSection.querySelectorAll('.rounded-2xl, .p-3')).map(el => {
      const bar = el.querySelector('.rounded-full div');
      return {
        text: el.innerText.replace(/\n+/g, ' | '),
        progressStyle: bar ? bar.getAttribute('style') : null
      };
    }) : [];
    const goalButtons = goalsSection ? Array.from(goalsSection.querySelectorAll('button')).map(b => b.innerText.trim()) : [];

    return {
      monthlyIncomeDisplay: incomeCard ? incomeCard.innerText.replace(/\n+/g, ' ') : '',
      monthlyExpenseDisplay: expenseCard ? expenseCard.innerText.replace(/\n+/g, ' ') : '',
      budgetsSection: {
        visible: !!budgetSection,
        headerText: budgetSection?.querySelector('.font-bold')?.innerText,
        buttons: budgetButtons,
        items: budgetItems
      },
      goalsSection: {
        visible: !!goalsSection,
        headerText: goalsSection?.querySelector('.font-bold')?.innerText,
        buttons: goalButtons,
        items: goalItems
      }
    };
  });
  console.log('Dashboard Result:', JSON.stringify(dashboardResult, null, 2));

  // ==============================================================
  // 2. TRANSACTIONS PAGE INSPECTION
  // ==============================================================
  console.log('\n--- 2. INSPECTING TRANSACTIONS PAGE ---');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('aside button, nav button, button'));
    const txBtn = btns.find(b => b.innerText.includes('账单流水') || b.innerText.includes('明细'));
    if (txBtn) txBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/inspection_2_transactions.png', fullPage: true });

  const transactionsResult = await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));
    
    // Category Breakdown
    const breakdownEl = allDivs.find(d => d.innerText.includes('支出分类占比分析') && d.classList.contains('p-3.5'));
    const breakdownItems = breakdownEl ? Array.from(breakdownEl.querySelectorAll('.rounded-xl')).map(el => el.innerText.replace(/\n+/g, ' | ')) : [];

    // Summary Card
    const totalExpEl = allDivs.find(d => d.innerText.includes('总支出') && d.classList.contains('p-3'));
    const totalIncEl = allDivs.find(d => d.innerText.includes('总收入') && d.classList.contains('p-3'));
    const netBalEl = allDivs.find(d => d.innerText.includes('期间结余') && d.classList.contains('p-3'));

    return {
      breakdownVisible: !!breakdownEl,
      breakdownContainsCalibration: breakdownEl ? breakdownEl.innerText.includes('余额校准') : false,
      breakdownCategories: breakdownItems,
      totalExpenseDisplay: totalExpEl ? totalExpEl.innerText.replace(/\n+/g, ' ') : '',
      totalIncomeDisplay: totalIncEl ? totalIncEl.innerText.replace(/\n+/g, ' ') : '',
      netBalanceDisplay: netBalEl ? netBalEl.innerText.replace(/\n+/g, ' ') : ''
    };
  });
  console.log('Transactions Result:', JSON.stringify(transactionsResult, null, 2));

  // ==============================================================
  // 3. SETTINGS PAGE & HUB INSPECTION
  // ==============================================================
  console.log('\n--- 3. INSPECTING SETTINGS PAGE & HUB ---');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('aside button, nav button, button'));
    const sBtn = btns.find(b => b.innerText.includes('系统设置') || b.innerText.trim() === '我的');
    if (sBtn) sBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/inspection_3_settings.png', fullPage: true });

  const settingsResult = await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));
    const hubEl = allDivs.find(d => d.innerText.includes('财务系统功能快捷入口') && d.classList.contains('p-4'));
    const hubButtons = hubEl ? Array.from(hubEl.querySelectorAll('button')).map(b => b.innerText.replace(/\n+/g, ' | ')) : [];

    return {
      hubVisible: !!hubEl,
      hubTitle: hubEl?.querySelector('h3')?.innerText,
      hubButtons
    };
  });
  console.log('Settings Hub Result:', JSON.stringify(settingsResult, null, 2));

  // Test Hub direct navigation
  const hubRoutingVerification = {};
  const hubTests = [
    { name: '月度预算', expectedH2: '预算监控与风控预警' },
    { name: '存钱目标', expectedH2: '心愿目标与储蓄计划' },
    { name: '财务图表', expectedH2: '深度财务分析' },
    { name: '负债与还款', expectedH2: '负债与还款规划' },
    { name: '投资持仓', expectedH2: '投资理财' }
  ];

  for (const t of hubTests) {
    // Go to Settings
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('aside button, nav button, button'));
      const sBtn = btns.find(b => b.innerText.includes('系统设置') || b.innerText.trim() === '我的');
      if (sBtn) sBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Click target button
    const clickSuccess = await page.evaluate((btnName) => {
      const hubEl = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('财务系统功能快捷入口'));
      if (!hubEl) return false;
      const btn = Array.from(hubEl.querySelectorAll('button')).find(b => b.innerText.includes(btnName));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    }, t.name);
    await new Promise(r => setTimeout(r, 800));

    const pageH2 = await page.evaluate(() => document.querySelector('h2')?.innerText || '');
    hubRoutingVerification[t.name] = {
      clicked: clickSuccess,
      navigatedH2: pageH2,
      success: pageH2.includes(t.expectedH2)
    };
  }
  console.log('Hub Direct Navigation Verification:', JSON.stringify(hubRoutingVerification, null, 2));

  // ==============================================================
  // 4. MOBILE LAYOUT & DARK MODE & CONSOLE ERRORS
  // ==============================================================
  console.log('\n--- 4. INSPECTING MOBILE & DARK MODE ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  // Go to Dashboard
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('aside button, nav button, button'));
    const dBtn = btns.find(b => b.innerText.includes('首页') || b.innerText.includes('财务总览'));
    if (dBtn) dBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/inspection_4_mobile_light.png' });

  // Check Mobile Bottom Nav
  const mobileNavResult = await page.evaluate(() => {
    const bNav = document.querySelector('nav.fixed.bottom-0');
    return {
      visible: !!bNav,
      items: bNav ? Array.from(bNav.querySelectorAll('button')).map(b => b.innerText.replace(/\s+/g, ' ').trim()) : []
    };
  });
  console.log('Mobile Nav Result:', JSON.stringify(mobileNavResult, null, 2));

  // Toggle Dark Mode
  const darkModeResult = await page.evaluate(() => {
    const html = document.documentElement;
    const isDarkInit = html.classList.contains('dark');
    const themeBtn = Array.from(document.querySelectorAll('header button')).find(b => 
      b.getAttribute('title') === '浅色模式' || b.getAttribute('title') === '深色模式'
    );
    if (themeBtn) themeBtn.click();
    return {
      before: isDarkInit,
      buttonFound: !!themeBtn,
      after: html.classList.contains('dark')
    };
  });
  console.log('Dark Mode Result:', JSON.stringify(darkModeResult, null, 2));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/inspection_5_mobile_dark.png' });

  await browser.close();

  const fullReport = {
    dashboardResult,
    transactionsResult,
    settingsResult,
    hubRoutingVerification,
    mobileNavResult,
    darkModeResult,
    consoleLogs,
    pageErrors
  };

  fs.writeFileSync('d:/Antigravity项目/财务管理系统/inspection_master_report.json', JSON.stringify(fullReport, null, 2));
  console.log('\nMASTER INSPECTION COMPLETED 100% SUCCESSFULLY!');
}

run().catch(console.error);
