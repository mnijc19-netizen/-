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

  console.log('Navigating to https://mnijc19-netizen.github.io/-/...');
  await page.goto('https://mnijc19-netizen.github.io/-/?t=' + Date.now(), { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Initialize test data via localStorage injection in the browser to test full visual presentation
  await page.evaluate(() => {
    const today = new Date().toISOString().slice(0, 10);
    
    // 1. Accounts
    const accounts = [
      { id: 'acc-1', name: '微信零钱/零钱通', type: 'wallet', currency: 'CNY', balance: 5000, initial_balance: 5000, is_active: 1 },
      { id: 'acc-2', name: '支付宝/余额宝', type: 'wallet', currency: 'CNY', balance: 8000, initial_balance: 8000, is_active: 1 },
      { id: 'acc-3', name: '招商银行卡', type: 'bank', currency: 'CNY', balance: 20000, initial_balance: 20000, is_active: 1 }
    ];
    localStorage.setItem('smartwealth_accounts_v2', JSON.stringify(accounts));

    // 2. Transactions: 1 Balance adjustment of 100,000, and 2 Living expenses (Dining 128.00, Shopping 350.00), 1 Income (Salary 15000.00)
    const transactions = [
      {
        id: 'tx-adj-1',
        date: `${today} 10:00:00`,
        type: 'expense',
        amount: 100000,
        merchant: '余额校准 (系统调账)',
        category_name: '余额校准',
        category_id: 'cat-adj',
        account_id: 'acc-1',
        account_name: '微信零钱/零钱通',
        note: '微信零钱余额校准补差',
        source: 'manual'
      },
      {
        id: 'tx-living-1',
        date: `${today} 12:30:00`,
        type: 'expense',
        amount: 128.00,
        merchant: '海底捞火锅',
        category_name: '餐饮美食',
        category_id: 'cat-exp-1',
        account_id: 'acc-1',
        account_name: '微信零钱/零钱通',
        note: '和朋友聚餐',
        source: 'manual'
      },
      {
        id: 'tx-living-2',
        date: `${today} 15:45:00`,
        type: 'expense',
        amount: 350.00,
        merchant: '优衣库 UNIQLO',
        category_name: '购物消费',
        category_id: 'cat-exp-4',
        account_id: 'acc-2',
        account_name: '支付宝/余额宝',
        note: '购买夏季短袖',
        source: 'manual'
      },
      {
        id: 'tx-inc-1',
        date: `${today} 09:00:00`,
        type: 'income',
        amount: 15000.00,
        merchant: '公司薪资发放',
        category_name: '工资薪金',
        category_id: 'cat-inc-1',
        account_id: 'acc-3',
        account_name: '招商银行卡',
        note: '月度基本薪酬',
        source: 'manual'
      }
    ];
    localStorage.setItem('smartwealth_transactions_v2', JSON.stringify(transactions));

    // 3. Budgets: Monthly Dining Budget ¥1,000, Monthly Shopping Budget ¥800
    const budgets = [
      {
        id: 'bg-1',
        category_id: 'cat-exp-1',
        category_name: '餐饮美食',
        period: 'monthly',
        amount: 1000.00,
        spent_amount: 128.00,
        alert_threshold: 0.8
      },
      {
        id: 'bg-2',
        category_id: 'cat-exp-4',
        category_name: '购物消费',
        period: 'monthly',
        amount: 800.00,
        spent_amount: 350.00,
        alert_threshold: 0.8
      }
    ];
    localStorage.setItem('smartwealth_budgets_v2', JSON.stringify(budgets));

    // 4. Goals: 6 Months 20k Emergency Fund
    const goals = [
      {
        id: 'g-1',
        name: '6个月存2万备用金计划',
        target_amount: 20000.00,
        current_amount: 6500.00,
        target_date: '2026-12-31',
        is_completed: 0,
        progress_percentage: 32.5
      },
      {
        id: 'g-2',
        name: '日本京都赏枫旅行心愿',
        target_amount: 12000.00,
        current_amount: 4000.00,
        target_date: '2026-11-15',
        is_completed: 0,
        progress_percentage: 33.3
      }
    ];
    localStorage.setItem('smartwealth_goals_v2', JSON.stringify(goals));
  });

  // Reload page to apply state
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // ==============================================================
  // 1. VERIFY DASHBOARD
  // ==============================================================
  console.log('\n--- 1. DASHBOARD VERIFICATION ---');
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_e2e_1_dashboard.png', fullPage: true });

  const dashboardCheck = await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));
    
    // Net worth and monthly flow
    const incomeCard = allDivs.find(d => d.innerText.includes('本月日常收入'));
    const expenseCard = allDivs.find(d => d.innerText.includes('本月日常支出'));

    // Budgets Section
    const budgetSection = allDivs.find(d => d.innerText.includes('月度预算监控') && d.classList.contains('p-4'));
    const budgetHeader = budgetSection ? budgetSection.querySelector('.font-bold')?.innerText : '';
    const budgetCards = budgetSection ? Array.from(budgetSection.querySelectorAll('.rounded-2xl')).map(el => {
      const bar = el.querySelector('.rounded-full div');
      return {
        text: el.innerText.replace(/\n+/g, ' | '),
        barWidth: bar ? bar.getAttribute('style') : null,
        barClass: bar ? bar.className : null
      };
    }) : [];
    const budgetButtons = budgetSection ? Array.from(budgetSection.querySelectorAll('button')).map(b => b.innerText.trim()) : [];

    // Goals Section
    const goalsSection = allDivs.find(d => d.innerText.includes('储蓄计划与心愿目标') && d.classList.contains('p-4'));
    const goalsHeader = goalsSection ? goalsSection.querySelector('.font-bold')?.innerText : '';
    const goalCards = goalsSection ? Array.from(goalsSection.querySelectorAll('.rounded-2xl, .p-3')).map(el => {
      const bar = el.querySelector('.rounded-full div');
      return {
        text: el.innerText.replace(/\n+/g, ' | '),
        barWidth: bar ? bar.getAttribute('style') : null
      };
    }) : [];
    const goalButtons = goalsSection ? Array.from(goalsSection.querySelectorAll('button')).map(b => b.innerText.trim()) : [];

    return {
      incomeText: incomeCard ? incomeCard.innerText.replace(/\n+/g, ' ') : '',
      expenseText: expenseCard ? expenseCard.innerText.replace(/\n+/g, ' ') : '',
      budgets: {
        found: !!budgetSection,
        header: budgetHeader,
        buttons: budgetButtons,
        cardsCount: budgetCards.length,
        cards: budgetCards
      },
      goals: {
        found: !!goalsSection,
        header: goalsHeader,
        buttons: goalButtons,
        cardsCount: goalCards.length,
        cards: goalCards
      }
    };
  });
  console.log('Dashboard Check:', JSON.stringify(dashboardCheck, null, 2));

  // ==============================================================
  // 2. VERIFY TRANSACTIONS (明细) PAGE
  // ==============================================================
  console.log('\n--- 2. TRANSACTIONS PAGE VERIFICATION ---');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, nav a, a'));
    const txBtn = btns.find(b => b.innerText.includes('账单流水') || b.innerText.includes('明细'));
    if (txBtn) txBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_e2e_2_transactions.png', fullPage: true });

  const transactionsCheck = await page.evaluate(() => {
    const allEls = Array.from(document.querySelectorAll('div, section'));

    // Category Breakdown
    const breakdownEl = allEls.find(el => el.innerText && el.innerText.includes('支出分类占比分析') && el.classList.contains('p-4'));
    const breakdownRows = breakdownEl ? Array.from(breakdownEl.querySelectorAll('.rounded-2xl, .p-2\\.5, .flex.items-center.justify-between')).map(el => el.innerText.replace(/\n+/g, ' | ')).filter(t => t.length > 5) : [];

    const hasCalibrationInBreakdown = breakdownEl ? breakdownEl.innerText.includes('余额校准') : false;

    // Summary Card
    const summaryCard = allEls.find(el => el.innerText && el.innerText.includes('本月日常支出') && el.innerText.includes('本月日常结余'));

    return {
      breakdownFound: !!breakdownEl,
      hasCalibrationInBreakdown,
      breakdownRows,
      summaryText: summaryCard ? summaryCard.innerText.replace(/\n+/g, ' | ') : ''
    };
  });
  console.log('Transactions Check:', JSON.stringify(transactionsCheck, null, 2));

  // ==============================================================
  // 3. VERIFY SETTINGS (我的) PAGE HUB & ROUTING
  // ==============================================================
  console.log('\n--- 3. SETTINGS PAGE HUB VERIFICATION ---');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, nav a, a'));
    const sBtn = btns.find(b => b.innerText.includes('系统设置') || b.innerText.includes('我的'));
    if (sBtn) sBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_e2e_3_settings.png', fullPage: true });

  const settingsCheck = await page.evaluate(() => {
    const allEls = Array.from(document.querySelectorAll('div, section'));
    const hubEl = allEls.find(el => el.innerText && el.innerText.includes('财务系统功能快捷入口') && el.classList.contains('p-4'));
    const hubButtons = hubEl ? Array.from(hubEl.querySelectorAll('button')).map(b => b.innerText.replace(/\n+/g, ' | ')) : [];

    return {
      hubFound: !!hubEl,
      hubTitle: hubEl ? hubEl.querySelector('h3')?.innerText : '',
      hubButtons
    };
  });
  console.log('Settings Check:', JSON.stringify(settingsCheck, null, 2));

  // Verify direct click routing on each Hub button
  const routingResults = {};
  const buttonsToTest = [
    { label: '月度预算', expectedHeading: '预算与风控' },
    { label: '存钱目标', expectedHeading: '心愿目标' },
    { label: '财务图表', expectedHeading: '深度财务分析' },
    { label: '负债与还款', expectedHeading: '负债与还款规划' },
    { label: '投资持仓', expectedHeading: '投资理财' }
  ];

  for (const item of buttonsToTest) {
    // 1. Go to settings
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, nav a, a'));
      const sBtn = btns.find(b => b.innerText.includes('系统设置') || b.innerText.includes('我的'));
      if (sBtn) sBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // 2. Click target Hub button
    const clicked = await page.evaluate((btnLabel) => {
      const hubEl = Array.from(document.querySelectorAll('div')).find(el => el.innerText && el.innerText.includes('财务系统功能快捷入口'));
      if (!hubEl) return false;
      const btn = Array.from(hubEl.querySelectorAll('button')).find(b => b.innerText.includes(btnLabel));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    }, item.label);

    await new Promise(r => setTimeout(r, 800));
    const currentHeading = await page.evaluate(() => document.querySelector('h1')?.innerText || '');
    routingResults[item.label] = {
      clicked,
      headingFound: currentHeading,
      matchesExpected: currentHeading.includes(item.expectedHeading)
    };
  }
  console.log('Hub Buttons Routing Verification:', JSON.stringify(routingResults, null, 2));

  // ==============================================================
  // 4. MOBILE LAYOUT & DARK MODE
  // ==============================================================
  console.log('\n--- 4. MOBILE VIEWPORT & DARK MODE VERIFICATION ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  // Navigate to mobile dashboard
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, nav a, a'));
    const dBtn = btns.find(b => b.innerText.includes('首页') || b.innerText.includes('财务总览'));
    if (dBtn) dBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_e2e_4_mobile_dashboard.png' });

  // Check mobile bottom nav
  const mobileNavCheck = await page.evaluate(() => {
    const bNav = document.querySelector('nav.fixed.bottom-0');
    return {
      hasNav: !!bNav,
      navItems: bNav ? Array.from(bNav.querySelectorAll('button')).map(b => b.innerText.replace(/\s+/g, ' ').trim()) : []
    };
  });
  console.log('Mobile Bottom Navigation:', JSON.stringify(mobileNavCheck, null, 2));

  // Check dark mode toggle
  const darkModeCheck = await page.evaluate(() => {
    const html = document.documentElement;
    const isDarkBefore = html.classList.contains('dark');
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
  console.log('Dark mode check:', JSON.stringify(darkModeCheck, null, 2));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_e2e_5_mobile_dark_dashboard.png' });

  await browser.close();

  const fullReport = {
    dashboardCheck,
    transactionsCheck,
    settingsCheck,
    routingResults,
    mobileNavCheck,
    darkModeCheck,
    consoleLogs,
    pageErrors
  };

  fs.writeFileSync('d:/Antigravity项目/财务管理系统/report_e2e_verified.json', JSON.stringify(fullReport, null, 2));
  console.log('\n--- ALL E2E VERIFICATIONS COMPLETE! ---');
}

run().catch(console.error);
