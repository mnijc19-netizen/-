import puppeteer from 'puppeteer-core';
import fs from 'fs';

async function run() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  await page.goto('https://mnijc19-netizen.github.io/-/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // Populate realistic test data in localStorage
  await page.evaluate(() => {
    // Current date formatted as YYYY-MM-DD
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
        amount: 88888.00,
        merchant: '微信零钱 (余额校准)',
        category_name: '余额校准',
        category_id: 'cat-adj',
        account_id: 'acc-1',
        account_name: '微信零钱/零钱通',
        note: '系统对账校准',
        source: 'manual'
      },
      {
        id: 'tx-living-1',
        date: `${dateStr} 12:30`,
        type: 'expense',
        amount: 168.00,
        merchant: '全聚德烤鸭',
        category_name: '餐饮美食',
        category_id: 'cat-exp-1',
        account_id: 'acc-1',
        account_name: '微信零钱/零钱通',
        note: '午餐聚餐',
        source: 'manual'
      },
      {
        id: 'tx-living-2',
        date: `${dateStr} 15:45`,
        type: 'expense',
        amount: 299.00,
        merchant: '盒马鲜生',
        category_name: '日用百货',
        category_id: 'cat-exp-3',
        account_id: 'acc-2',
        account_name: '支付宝/余额宝',
        note: '购买生鲜水果',
        source: 'manual'
      },
      {
        id: 'tx-inc-1',
        date: `${dateStr} 09:00`,
        type: 'income',
        amount: 12000.00,
        merchant: '公司工资',
        category_name: '工资薪金',
        category_id: 'cat-inc-1',
        account_id: 'acc-3',
        account_name: '主要银行储蓄卡',
        note: '本月工资入账',
        source: 'manual'
      }
    ];
    localStorage.setItem('smartwealth_transactions_v2', JSON.stringify(transactions));

    const budgets = [
      { id: 'bg-1', category_id: 'cat-exp-1', category_name: '餐饮美食', period: 'monthly', amount: 1500.00, spent_amount: 168.00, alert_threshold: 0.8 },
      { id: 'bg-2', category_id: 'cat-exp-3', category_name: '日用百货', period: 'monthly', amount: 800.00, spent_amount: 299.00, alert_threshold: 0.8 }
    ];
    localStorage.setItem('smartwealth_budgets_v2', JSON.stringify(budgets));

    const goals = [
      { id: 'g-1', name: '6个月存2万备用金计划', target_amount: 20000.00, current_amount: 6000.00, target_date: '2026-12-31', is_completed: 0, progress_percentage: 30.0 }
    ];
    localStorage.setItem('smartwealth_goals_v2', JSON.stringify(goals));
  });

  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // 1. Dashboard Check
  const dashboardInfo = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      netWorth: text.match(/¥[0-9,]+\.[0-9]{2}/g),
      budgetFound: text.includes('月度预算监控'),
      goalsFound: text.includes('储蓄计划与心愿目标'),
      dailyExpenseText: Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('本月日常支出'))?.innerText.replace(/\n+/g, ' ')
    };
  });
  console.log('Dashboard Info:', JSON.stringify(dashboardInfo, null, 2));

  // 2. Go to Transactions Page
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, nav a, a'));
    const txBtn = btns.find(b => b.innerText.includes('账单流水') || b.innerText.includes('明细'));
    if (txBtn) txBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_transactions_verified.png', fullPage: true });

  const txInfo = await page.evaluate(() => {
    const text = document.body.innerText;
    const breakdownSection = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('支出分类占比分析') && d.innerText.includes('餐饮美食'));
    
    return {
      pageHasBreakdown: text.includes('支出分类占比分析'),
      breakdownSectionText: breakdownSection ? breakdownSection.innerText.replace(/\n+/g, ' | ') : 'NOT_FOUND',
      hasCalibrationInBreakdown: text.includes('支出分类占比分析') && breakdownSection?.innerText.includes('余额校准'),
      summaryNumbers: Array.from(document.querySelectorAll('.font-mono')).map(el => el.innerText)
    };
  });
  console.log('Transactions Info:', JSON.stringify(txInfo, null, 2));

  // 3. Go to Settings Page & Hub Routing
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, nav a, a'));
    const sBtn = btns.find(b => b.innerText.includes('系统设置') || b.innerText.includes('我的'));
    if (sBtn) sBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/report_settings_verified.png', fullPage: true });

  const settingsHubInfo = await page.evaluate(() => {
    const hub = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('财务系统功能快捷入口'));
    return {
      hubFound: !!hub,
      buttons: hub ? Array.from(hub.querySelectorAll('button')).map(b => b.innerText.replace(/\n+/g, ' | ')) : []
    };
  });
  console.log('Settings Hub Info:', JSON.stringify(settingsHubInfo, null, 2));

  // Test routing to Budgets from Hub
  await page.evaluate(() => {
    const hub = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('财务系统功能快捷入口'));
    const btn = Array.from(hub.querySelectorAll('button')).find(b => b.innerText.includes('月度预算'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  const budgetsPageHeader = await page.evaluate(() => document.querySelector('h2')?.innerText || '');
  console.log('Navigated to Budgets page via Hub:', budgetsPageHeader);

  // Test routing to Goals from Hub
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, nav a, a'));
    const sBtn = btns.find(b => b.innerText.includes('系统设置') || b.innerText.includes('我的'));
    if (sBtn) sBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await page.evaluate(() => {
    const hub = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('财务系统功能快捷入口'));
    const btn = Array.from(hub.querySelectorAll('button')).find(b => b.innerText.includes('存钱目标'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  const goalsPageHeader = await page.evaluate(() => document.querySelector('h2')?.innerText || '');
  console.log('Navigated to Goals page via Hub:', goalsPageHeader);

  // Test Dark mode toggle in Navbar
  const themeToggleResult = await page.evaluate(() => {
    const html = document.documentElement;
    const isDarkBefore = html.classList.contains('dark');
    const themeBtn = Array.from(document.querySelectorAll('button')).find(b => 
      b.getAttribute('title') === '浅色模式' || b.getAttribute('title') === '深色模式'
    );
    if (themeBtn) {
      themeBtn.click();
    }
    return {
      isDarkBefore,
      themeBtnFound: !!themeBtn,
      themeBtnTitle: themeBtn?.getAttribute('title'),
      isDarkAfter: html.classList.contains('dark')
    };
  });
  console.log('Theme Toggle Result:', JSON.stringify(themeToggleResult, null, 2));

  await browser.close();
}

run().catch(console.error);
