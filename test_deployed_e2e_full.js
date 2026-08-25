import puppeteer from './frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'fs';

async function run() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

  console.log('Launching browser with:', executablePath);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const testReport = {
    url: 'https://mnijc19-netizen.github.io/-/',
    timestamp: new Date().toISOString(),
    desktop: {},
    mobile: {},
    navbar: {},
    dashboardModules: {},
    quickAddSheet: {},
    quickAddActions: {},
    aiChatAssistant: {},
    themeToggle: {},
    consoleErrors: [],
    pageErrors: []
  };

  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      testReport.consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    testReport.pageErrors.push(err.toString());
  });

  // ----------------------------------------------------
  // TEST 1: DESKTOP VIEWPORT (1280x800)
  // ----------------------------------------------------
  console.log('\n--- [1] Testing Desktop Viewport (1280x800) ---');
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
  await page.goto('https://mnijc19-netizen.github.io/-/', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/test_desktop_dashboard.png', fullPage: false });

  // ----------------------------------------------------
  // TEST 2: MOBILE VIEWPORT (390x844 - iPhone 14 / standard iOS mobile)
  // ----------------------------------------------------
  console.log('\n--- [2] Testing Mobile Viewport (390x844) ---');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.goto('https://mnijc19-netizen.github.io/-/', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/test_mobile_dashboard_light.png' });

  // ----------------------------------------------------
  // TEST 3: NAVBAR VERIFICATION
  // ----------------------------------------------------
  console.log('\n--- [3] Verifying Clean Navbar ---');
  const navbarInfo = await page.evaluate(() => {
    const header = document.querySelector('header');
    if (!header) return { found: false };

    const logoImg = header.querySelector('img');
    const brandTitle = header.querySelector('span')?.innerText || '';
    const netWorthPill = header.innerText.includes('净资产:');
    
    const buttons = Array.from(header.querySelectorAll('button')).map(b => ({
      text: b.innerText.trim(),
      title: b.getAttribute('title') || '',
      ariaLabel: b.getAttribute('aria-label') || ''
    }));

    return {
      found: true,
      hasLogo: !!logoImg,
      logoSrc: logoImg?.src || '',
      brandTitle,
      netWorthPill,
      buttonsCount: buttons.length,
      buttons
    };
  });
  testReport.navbar = navbarInfo;
  console.log('Navbar Verification:', navbarInfo);

  // ----------------------------------------------------
  // TEST 4: DASHBOARD 3-MODULE LAYOUT VERIFICATION
  // ----------------------------------------------------
  console.log('\n--- [4] Verifying Dashboard 3-Module Layout ---');
  const dashboardLayout = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return { found: false };

    // 1. Hero Card: Net worth & flow
    const heroNetWorth = main.innerText.includes('净资产总额 (CNY)');
    const heroIncome = main.innerText.includes('本月收入');
    const heroExpense = main.innerText.includes('本月支出');
    const heroSurplus = main.innerText.includes('结余');

    // 2. Dual Monitor: Budgets & Goals
    const budgetMonitor = main.innerText.includes('月度预算监控');
    const goalsMonitor = main.innerText.includes('存钱心愿目标');

    // 3. Recent Transactions
    const recentTx = main.innerText.includes('最新明细');

    // Check for old cluttered 4-grids or duplicate banners
    const hasOldClutteredGrid = main.innerText.includes('智能导入') && main.innerText.includes('快捷小组件');
    const allSectionHeadings = Array.from(main.querySelectorAll('h1, h2, h3, span, div'))
      .map(el => el.innerText?.trim())
      .filter(t => t && ['净资产总额 (CNY)', '月度预算监控', '存钱心愿目标', '最新明细'].includes(t));

    return {
      found: true,
      hasHeroCard: heroNetWorth && heroIncome && heroExpense && heroSurplus,
      hasBudgetMonitor: budgetMonitor,
      hasGoalsMonitor: goalsMonitor,
      hasRecentTransactions: recentTx,
      hasOldClutteredGrid,
      sectionsIdentified: Array.from(new Set(allSectionHeadings))
    };
  });
  testReport.dashboardModules = dashboardLayout;
  console.log('Dashboard Layout:', dashboardLayout);

  // ----------------------------------------------------
  // TEST 5: THEME TOGGLE (DARK MODE)
  // ----------------------------------------------------
  console.log('\n--- [5] Testing Dark Mode Toggle ---');
  const themeToggleResult = await page.evaluate(() => {
    const header = document.querySelector('header');
    const toggleBtn = header?.querySelector('button[title*="主题"]');
    if (!toggleBtn) return { success: false, reason: 'toggle button not found' };
    
    const wasDarkBefore = document.documentElement.classList.contains('dark');
    toggleBtn.click();
    return {
      success: true,
      wasDarkBefore
    };
  });

  await new Promise(r => setTimeout(r, 600));
  const isDarkNow = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  testReport.themeToggle = { ...themeToggleResult, isDarkNow };
  console.log('Theme toggle result:', testReport.themeToggle);

  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/test_mobile_dashboard_dark.png' });

  // Switch back to light mode
  await page.evaluate(() => {
    const header = document.querySelector('header');
    header?.querySelector('button[title*="主题"]')?.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // ----------------------------------------------------
  // TEST 6: BOTTOM NAV & CENTRAL "+" BUTTON (UNIVERSAL ACTION SHEET)
  // ----------------------------------------------------
  console.log('\n--- [6] Testing Central "+" Button -> Universal Quick Add Sheet ---');
  const plusClick = await page.evaluate(() => {
    const nav = document.querySelector('nav');
    if (!nav) return { success: false, reason: 'nav not found' };
    
    const plusBtn = nav.querySelector('button[aria-label="记一笔"]') || Array.from(nav.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-plus') || b.innerText === '+');
    if (!plusBtn) return { success: false, reason: 'plus button not found' };

    plusBtn.click();
    return { success: true };
  });
  console.log('Plus button clicked:', plusClick);
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/test_modal_universal_quick_add.png' });

  // Inspect the Universal 5-in-1 Action Sheet
  const actionSheetData = await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0.z-50');
    if (!modal) return { found: false };

    const title = modal.querySelector('h3')?.innerText || '';
    const buttons = Array.from(modal.querySelectorAll('button')).map(b => b.innerText.trim());

    return {
      found: true,
      title,
      buttons,
      hasClipboard: buttons.some(b => b.includes('剪贴板')),
      hasManual: buttons.some(b => b.includes('手动记账')),
      hasPhoto: buttons.some(b => b.includes('拍照')),
      hasSmartText: buttons.some(b => b.includes('智能文本')),
      hasBatchBalance: buttons.some(b => b.includes('批量余额'))
    };
  });
  testReport.quickAddSheet = actionSheetData;
  console.log('Quick Add Sheet data:', actionSheetData);

  // ----------------------------------------------------
  // TEST 7: TEST EACH OF THE 5 ACTIONS IN QUICK ADD SHEET
  // ----------------------------------------------------
  console.log('\n--- [7] Testing each action in the 5-in-1 Quick Add Sheet ---');

  // Action 1: 手动记账
  console.log('Testing Action 1: 极速手动记账...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.fixed.inset-0.z-50 button'));
    const target = btns.find(b => b.innerText.includes('手动记账'));
    target?.click();
  });
  await new Promise(r => setTimeout(r, 600));
  const manualModal = await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0');
    return {
      isOpen: !!modal,
      text: modal?.innerText?.slice(0, 200)
    };
  });
  testReport.quickAddActions.manual = manualModal;
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/test_modal_manual_tx.png' });
  // Close modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.fixed.inset-0 button');
    closeBtn?.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Re-open Universal Sheet & Test Action 2: 拍照记账
  console.log('Testing Action 2: 拍照 / 扫小票...');
  await page.evaluate(() => {
    const nav = document.querySelector('nav');
    const plusBtn = nav?.querySelector('button[aria-label="记一笔"]');
    plusBtn?.click();
  });
  await new Promise(r => setTimeout(r, 500));

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.fixed.inset-0.z-50 button'));
    const target = btns.find(b => b.innerText.includes('拍照') || b.innerText.includes('小票'));
    target?.click();
  });
  await new Promise(r => setTimeout(r, 600));
  const photoModal = await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0');
    return {
      isOpen: !!modal,
      text: modal?.innerText?.slice(0, 200)
    };
  });
  testReport.quickAddActions.photoOcr = photoModal;
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/test_modal_photo_ocr.png' });
  // Close modal
  await page.evaluate(() => {
    const closeBtn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find(b => b.innerText.includes('✕') || b.querySelector('svg.lucide-x'));
    closeBtn?.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Re-open Universal Sheet & Test Action 3: 智能文本
  console.log('Testing Action 3: 智能文本 / 短信...');
  await page.evaluate(() => {
    const nav = document.querySelector('nav');
    nav?.querySelector('button[aria-label="记一笔"]')?.click();
  });
  await new Promise(r => setTimeout(r, 500));

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.fixed.inset-0.z-50 button'));
    const target = btns.find(b => b.innerText.includes('智能文本') || b.innerText.includes('短信'));
    target?.click();
  });
  await new Promise(r => setTimeout(r, 600));
  const parserModal = await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0');
    return {
      isOpen: !!modal,
      text: modal?.innerText?.slice(0, 200)
    };
  });
  testReport.quickAddActions.smartParser = parserModal;
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/test_modal_smart_parser.png' });
  // Close modal
  await page.evaluate(() => {
    const closeBtn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find(b => b.innerText.includes('✕') || b.querySelector('svg.lucide-x'));
    closeBtn?.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Re-open Universal Sheet & Test Action 4: 批量余额
  console.log('Testing Action 4: 批量余额对账...');
  await page.evaluate(() => {
    const nav = document.querySelector('nav');
    nav?.querySelector('button[aria-label="记一笔"]')?.click();
  });
  await new Promise(r => setTimeout(r, 500));

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.fixed.inset-0.z-50 button'));
    const target = btns.find(b => b.innerText.includes('批量余额'));
    target?.click();
  });
  await new Promise(r => setTimeout(r, 600));
  const batchBalanceModal = await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0');
    return {
      isOpen: !!modal,
      text: modal?.innerText?.slice(0, 200)
    };
  });
  testReport.quickAddActions.batchBalance = batchBalanceModal;
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/test_modal_batch_balance.png' });
  // Close modal
  await page.evaluate(() => {
    const closeBtn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find(b => b.innerText.includes('✕') || b.querySelector('svg.lucide-x'));
    closeBtn?.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Re-open Universal Sheet & Test Action 5: 剪贴板入账
  console.log('Testing Action 5: 剪贴板一键极速记账...');
  await page.evaluate(() => {
    const nav = document.querySelector('nav');
    nav?.querySelector('button[aria-label="记一笔"]')?.click();
  });
  await new Promise(r => setTimeout(r, 500));

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.fixed.inset-0.z-50 button'));
    const target = btns.find(b => b.innerText.includes('剪贴板'));
    target?.click();
  });
  await new Promise(r => setTimeout(r, 600));
  const clipboardToast = await page.evaluate(() => {
    // Check if toast notification appeared
    const toast = document.querySelector('.fixed.top-\\[calc\\(env\\(safe-area-inset-top\\,48px\\)\\+0\\.75rem\\)\\]') || document.body.innerText.includes('剪贴板');
    return {
      sheetClosed: !document.querySelector('.fixed.inset-0.z-50 h3'),
      toastShown: !!toast
    };
  });
  testReport.quickAddActions.clipboard = clipboardToast;
  console.log('Clipboard action test:', clipboardToast);

  // ----------------------------------------------------
  // TEST 8: TOP-RIGHT "AI 管家" BUTTON & MODAL CAPABILITIES
  // ----------------------------------------------------
  console.log('\n--- [8] Testing Top-Right "AI 管家" Button & Modal Capabilities ---');
  const aiButtonClick = await page.evaluate(() => {
    const header = document.querySelector('header');
    const aiBtn = header?.querySelector('button[title*="AI"]') || Array.from(header?.querySelectorAll('button') || []).find(b => b.innerText.includes('AI 管家'));
    if (!aiBtn) return { success: false, reason: 'AI button not found' };
    aiBtn.click();
    return { success: true, text: aiBtn.innerText };
  });
  console.log('AI Button Clicked:', aiButtonClick);
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/test_modal_ai_copilot.png' });

  const aiModalDetails = await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0');
    if (!modal) return { found: false };

    const headerTitle = modal.querySelector('h3')?.innerText || '';
    const welcomeMessages = Array.from(modal.querySelectorAll('.whitespace-pre-wrap, .text-xs, .text-sm')).map(el => el.innerText).filter(t => t.length > 5);
    
    // Quick prompt chips
    const promptChips = Array.from(modal.querySelectorAll('button')).map(b => b.innerText.trim()).filter(t => t.startsWith('💡') || t.startsWith('🔍') || t.startsWith('📊') || t.startsWith('🎯') || t.startsWith('🚀') || t.length > 4 && !t.includes('✕') && !t.includes('发送'));

    // Input elements & photo upload button
    const textarea = modal.querySelector('textarea, input[type="text"]');
    const fileInput = modal.querySelector('input[type="file"]');
    const photoUploadButton = modal.querySelector('button[title*="照片"], button[title*="截图"], button[title*="图片"]') || Array.from(modal.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-image') || b.querySelector('svg.lucide-camera') || b.querySelector('svg.lucide-paperclip'));
    const sendButton = modal.querySelector('button[type="submit"]') || Array.from(modal.querySelectorAll('button')).find(b => b.innerText.includes('发送') || b.querySelector('svg.lucide-send'));

    return {
      found: true,
      headerTitle,
      hasTextarea: !!textarea,
      hasFileInput: !!fileInput,
      hasPhotoUploadButton: !!photoUploadButton,
      hasSendButton: !!sendButton,
      promptChipsSample: promptChips.slice(0, 6),
      welcomeSample: welcomeMessages.slice(0, 3)
    };
  });
  testReport.aiChatAssistant = aiModalDetails;
  console.log('AI Assistant Modal Details:', aiModalDetails);

  // Close AI Modal
  await page.evaluate(() => {
    const closeBtn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find(b => b.innerText.includes('✕') || b.querySelector('svg.lucide-x'));
    closeBtn?.click();
  });
  await new Promise(r => setTimeout(r, 400));

  await browser.close();

  // Save report
  fs.writeFileSync('d:/Antigravity项目/财务管理系统/test_deployed_e2e_report.json', JSON.stringify(testReport, null, 2));
  console.log('\n=== Testing Complete. Report written to test_deployed_e2e_report.json ===');
}

run().catch(console.error);
