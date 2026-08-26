import puppeteer from './frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'fs';

async function runAudit() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

  console.log('Launching browser with:', executablePath);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const auditReport = {
    url: 'https://mnijc19-netizen.github.io/-/',
    startTime: new Date().toISOString(),
    item1_initialLoad: {},
    item2_privacyMode: {},
    item3_inboxSyncBar: {},
    item4_navigationTabs: {
      dashboard: {},
      accounts: {},
      quickAddSheet: {},
      transactions: {},
      settings: {}
    },
    item5_aiCopilotModal: {},
    item6_consoleAndErrors: {
      consoleErrors: [],
      pageErrors: [],
      warningCount: 0
    },
    desktopVisual: {},
    mobileVisual: {}
  };

  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      auditReport.item6_consoleAndErrors.consoleErrors.push(msg.text());
      console.error('[Console Error]', msg.text());
    } else if (msg.type() === 'warn') {
      auditReport.item6_consoleAndErrors.warningCount++;
    }
  });

  page.on('pageerror', err => {
    auditReport.item6_consoleAndErrors.pageErrors.push(err.toString());
    console.error('[Page Error]', err.toString());
  });

  // =========================================================================
  // 1. Initial load & instant render test (Mobile & Desktop)
  // =========================================================================
  console.log('\n--- 1. TESTING INITIAL LOAD & INSTANT RENDER ---');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const navStart = Date.now();
  const response = await page.goto('https://mnijc19-netizen.github.io/-/', { waitUntil: 'networkidle2', timeout: 30000 });
  const navDuration = Date.now() - navStart;
  
  const status = response ? response.status() : 0;
  console.log(`Page navigation status: ${status}, duration: ${navDuration}ms`);

  // Check if stuck in loading spinner
  const initialRenderInfo = await page.evaluate(() => {
    const spinner = document.querySelector('.animate-spin');
    const heroNetWorth = document.body.innerText.includes('净资产总额 (CNY)');
    const bodyText = document.body.innerText;
    return {
      hasSpinner: !!spinner,
      hasHeroNetWorth: heroNetWorth,
      bodyLength: bodyText.length,
      title: document.title
    };
  });
  auditReport.item1_initialLoad = {
    httpStatus: status,
    loadDurationMs: navDuration,
    hasBlockingSpinner: initialRenderInfo.hasSpinner,
    renderedSuccessfully: initialRenderInfo.hasHeroNetWorth,
    title: initialRenderInfo.title
  };
  console.log('Initial Render Info:', auditReport.item1_initialLoad);

  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/audit_mobile_initial.png' });

  // =========================================================================
  // 2. Dashboard header & Privacy mode test
  // =========================================================================
  console.log('\n--- 2. TESTING DASHBOARD HEADER & PRIVACY MODE ---');
  const privacyTest = await page.evaluate(async () => {
    // 1. Check initial masked state
    const heroCard = document.querySelector('main') || document.body;
    const initialText = heroCard.innerText;
    const initialNetWorthMasked = initialText.includes('¥ ••••') || initialText.includes('••••');
    
    // Find eye toggle button
    const eyeBtn = Array.from(document.querySelectorAll('button')).find(b => 
      b.getAttribute('title')?.includes('显示资产') || 
      b.getAttribute('title')?.includes('隐藏私密') ||
      b.getAttribute('title')?.includes('资产') ||
      b.innerHTML.includes('lucide-eye') ||
      b.innerHTML.includes('lucide-eye-off')
    );

    let toggledRevealed = false;
    let revealedText = '';
    let toggledMaskedAgain = false;

    if (eyeBtn) {
      // Toggle to reveal
      eyeBtn.click();
      await new Promise(r => setTimeout(r, 300));
      revealedText = document.body.innerText;
      toggledRevealed = !revealedText.includes('¥ ••••');

      // Toggle back to mask
      eyeBtn.click();
      await new Promise(r => setTimeout(r, 300));
      const reMaskedText = document.body.innerText;
      toggledMaskedAgain = reMaskedText.includes('¥ ••••') || reMaskedText.includes('••••');
    }

    return {
      foundEyeButton: !!eyeBtn,
      initialMaskedByDefault: initialNetWorthMasked,
      toggleRevealsFiguresCleanly: toggledRevealed,
      toggleReMasksCleanly: toggledMaskedAgain
    };
  });
  auditReport.item2_privacyMode = privacyTest;
  console.log('Privacy Mode Test:', privacyTest);

  // =========================================================================
  // 3. Private Cloud Inbox Sync bar test
  // =========================================================================
  console.log('\n--- 3. TESTING PRIVATE CLOUD INBOX SYNC BAR ---');
  const syncBarTest = await page.evaluate(async () => {
    const body = document.body.innerText;
    const hasInboxText = body.includes('快捷指令私有信箱');
    
    const syncButton = Array.from(document.querySelectorAll('button')).find(b => 
      b.innerText.includes('立即同步') || b.innerText.includes('⚡ 立即同步')
    );

    let clicked = false;
    let buttonTextBefore = '';
    let buttonTextAfter = '';

    if (syncButton) {
      buttonTextBefore = syncButton.innerText.trim();
      syncButton.click();
      clicked = true;
      await new Promise(r => setTimeout(r, 500));
      buttonTextAfter = syncButton.innerText.trim();
    }

    return {
      hasInboxBar: hasInboxText,
      foundSyncButton: !!syncButton,
      buttonTextBefore,
      buttonTextAfter,
      isResponsive: clicked
    };
  });
  auditReport.item3_inboxSyncBar = syncBarTest;
  console.log('Inbox Sync Bar Test:', syncBarTest);

  // =========================================================================
  // 4. Navigation tabs test (5 tabs: 首页, 资产, +, 明细, 我的)
  // =========================================================================
  console.log('\n--- 4. TESTING ALL 5 NAVIGATION TABS ---');

  // Helper to click bottom tab
  async function clickBottomTab(label) {
    return await page.evaluate((tabLabel) => {
      const navButtons = Array.from(document.querySelectorAll('nav button'));
      const target = navButtons.find(b => b.innerText.includes(tabLabel));
      if (target) {
        target.click();
        return true;
      }
      return false;
    }, label);
  }

  // 4.1 Tab: 首页 (Dashboard)
  console.log('Testing Tab: 首页 (Dashboard)');
  await clickBottomTab('首页');
  await new Promise(r => setTimeout(r, 600));
  const dashboardTabCheck = await page.evaluate(() => {
    return {
      hasHero: document.body.innerText.includes('净资产总额 (CNY)'),
      hasRecent: document.body.innerText.includes('最新明细')
    };
  });
  auditReport.item4_navigationTabs.dashboard = dashboardTabCheck;
  console.log('Dashboard Tab:', dashboardTabCheck);

  // 4.2 Tab: 资产 (Accounts)
  console.log('Testing Tab: 资产 (Accounts)');
  await clickBottomTab('资产');
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/audit_tab_accounts.png' });
  const accountsTabCheck = await page.evaluate(async () => {
    const text = document.body.innerText;
    const hasTitle = text.includes('全域资产与账户矩阵') || text.includes('资产矩阵');
    
    // Check Batch OCR button
    const batchOcrBtn = Array.from(document.querySelectorAll('button')).find(b => 
      b.innerText.includes('批量识余额') || b.innerText.includes('批量识图') || b.innerText.includes('AI 批量识余额开账')
    );

    // Check account action buttons: 调额 (快速调额/对账), 编辑, 停用/删除
    const adjustBtns = Array.from(document.querySelectorAll('button')).filter(b => 
      b.innerText.includes('快速调额') || b.innerText.includes('调额')
    );
    const editBtns = Array.from(document.querySelectorAll('button')).filter(b => 
      b.innerText.includes('编辑') || b.getAttribute('title')?.includes('修改')
    );
    const deleteBtns = Array.from(document.querySelectorAll('button')).filter(b => 
      b.getAttribute('title')?.includes('停用') || b.getAttribute('title')?.includes('删除')
    );

    // Test clicking Batch OCR modal
    let batchModalOpened = false;
    if (batchOcrBtn) {
      batchOcrBtn.click();
      await new Promise(r => setTimeout(r, 400));
      const modalText = document.body.innerText;
      batchModalOpened = modalText.includes('批量截屏') || modalText.includes('识余额') || modalText.includes('上传');
      // close modal
      const closeBtn = document.querySelector('button[aria-label="Close"], button.close, [class*="fixed"] button');
      // find X button
      const allButtons = Array.from(document.querySelectorAll('button'));
      const xBtn = allButtons.find(b => b.innerHTML.includes('lucide-x') || b.innerText.includes('✕') || b.innerText.includes('取消'));
      if (xBtn) xBtn.click();
      await new Promise(r => setTimeout(r, 300));
    }

    return {
      hasTitle,
      hasBatchOcrButton: !!batchOcrBtn,
      batchModalOpened,
      adjustButtonsCount: adjustBtns.length,
      editButtonsCount: editBtns.length,
      deleteButtonsCount: deleteBtns.length,
      has3ActionButtons: adjustBtns.length > 0 && editBtns.length > 0 && deleteBtns.length > 0
    };
  });
  auditReport.item4_navigationTabs.accounts = accountsTabCheck;
  console.log('Accounts Tab:', accountsTabCheck);

  // 4.3 Tab: + (Universal Quick Add Action Sheet / Modal)
  console.log('Testing Tab: + (Universal Quick Add)');
  const quickAddCheck = await page.evaluate(async () => {
    // Center plus button
    const plusBtn = Array.from(document.querySelectorAll('nav button')).find(b => 
      b.getAttribute('aria-label') === '记一笔' || b.innerHTML.includes('lucide-plus')
    );

    if (!plusBtn) return { foundPlusButton: false };

    plusBtn.click();
    await new Promise(r => setTimeout(r, 500));

    const sheetText = document.body.innerText;
    const modalFound = sheetText.includes('记一笔') || sheetText.includes('支出') || sheetText.includes('收入') || sheetText.includes('转账');

    // Check fields inside quick add modal
    const amountInput = document.querySelector('input[type="number"], input[inputmode="decimal"], input[placeholder*="0.00"], input[placeholder*="金额"]');
    
    // Close modal
    const closeBtn = Array.from(document.querySelectorAll('button')).find(b => 
      b.innerText.includes('取消') || b.innerHTML.includes('lucide-x')
    );
    if (closeBtn) closeBtn.click();
    await new Promise(r => setTimeout(r, 300));

    return {
      foundPlusButton: true,
      modalOpened: modalFound,
      hasAmountInput: !!amountInput
    };
  });
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/audit_quick_add_modal.png' });
  auditReport.item4_navigationTabs.quickAddSheet = quickAddCheck;
  console.log('Quick Add Sheet / Modal:', quickAddCheck);

  // 4.4 Tab: 明细 (Transactions)
  console.log('Testing Tab: 明细 (Transactions)');
  await clickBottomTab('明细');
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/audit_tab_transactions.png' });
  const transactionsTabCheck = await page.evaluate(async () => {
    const text = document.body.innerText;
    
    // Filter tabs
    const hasAllTab = text.includes('全部');
    const hasExpenseTab = text.includes('支出');
    const hasIncomeTab = text.includes('收入');
    const hasTransferTab = text.includes('转账');

    // Search bar
    const searchInput = document.querySelector('input[placeholder*="搜索"], input[placeholder*="关键字"]');
    
    // Category aggregation / summary stats
    const hasSummaryPill = text.includes('支出') || text.includes('笔') || text.includes('¥');

    return {
      hasFilterTabs: hasAllTab && hasExpenseTab && hasIncomeTab,
      hasSearchInput: !!searchInput,
      hasCategoryAggregationOrStats: hasSummaryPill
    };
  });
  auditReport.item4_navigationTabs.transactions = transactionsTabCheck;
  console.log('Transactions Tab:', transactionsTabCheck);

  // 4.5 Tab: 我的 (Settings)
  console.log('Testing Tab: 我的 (Settings)');
  await clickBottomTab('我的');
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/audit_tab_settings.png' });
  const settingsTabCheck = await page.evaluate(async () => {
    const text = document.body.innerText;
    const hasSettingsTitle = text.includes('系统设置') || text.includes('设置');
    
    // Check AI Model references in Settings or Cloud Sync
    const hasAiSection = text.includes('AI') || text.includes('大模型') || text.includes('智谱');
    const hasWebDAV = text.includes('WebDAV') || text.includes('坚果云') || text.includes('坚果');
    const hasGist = text.includes('Gist') || text.includes('GitHub');

    // Check if GLM models are referenced or accessible
    const hasGLMRefs = text.includes('GLM-4') || text.includes('GLM-4.6V') || text.includes('GLM-4.5-Air') || text.includes('GLM-4V-Flash');

    return {
      hasSettingsTitle,
      hasAiSection,
      hasWebDAV,
      hasGist,
      hasGLMRefs
    };
  });
  auditReport.item4_navigationTabs.settings = settingsTabCheck;
  console.log('Settings Tab:', settingsTabCheck);

  // =========================================================================
  // 5. AI Copilot Modal test (AI 管家)
  // =========================================================================
  console.log('\n--- 5. TESTING AI COPILOT MODAL ---');
  // Return to Dashboard or open top right AI button
  const aiModalTest = await page.evaluate(async () => {
    const aiBtn = Array.from(document.querySelectorAll('header button, button')).find(b => 
      b.innerText.includes('AI 管家') || b.getAttribute('title')?.includes('AI')
    );

    if (!aiBtn) return { foundAiButton: false };

    aiBtn.click();
    await new Promise(r => setTimeout(r, 600));

    const modalText = document.body.innerText;
    
    // 1. Welcome prompt
    const hasWelcomePrompt = modalText.includes('斌斌 AI 财务智能全能管家') || 
                             modalText.includes('实时账本系统') ||
                             modalText.includes('AI 识别后支持人工确认与修改');

    // 2. Quick chips
    const chipButtons = Array.from(document.querySelectorAll('button')).filter(b => 
      b.innerText.includes('测算我这个月还剩多少钱能花') ||
      b.innerText.includes('记花呗分期') ||
      b.innerText.includes('把我每月预计工资设为') ||
      b.innerText.includes('带我去月度资金规划大厅')
    );

    // 3. Model selector & GLM Presets in AI Copilot
    // Find model selector dropdown/button
    const modelDropdownBtn = Array.from(document.querySelectorAll('button')).find(b => 
      b.innerText.includes('GLM-') || b.innerText.includes('DeepSeek') || b.innerText.includes('GPT-')
    );

    let availableModels = [];
    if (modelDropdownBtn) {
      modelDropdownBtn.click();
      await new Promise(r => setTimeout(r, 400));
      const modelItems = Array.from(document.querySelectorAll('button, div')).map(el => el.innerText.trim());
      availableModels = modelItems.filter(t => t.includes('GLM-4.6V') || t.includes('GLM-4.5-Air') || t.includes('GLM-4V-Flash') || t.includes('DeepSeek'));
      // close dropdown
      modelDropdownBtn.click();
      await new Promise(r => setTimeout(r, 300));
    }

    // 4. Camera / multi-photo preview strip input
    const fileInput = document.querySelector('input[type="file"][accept*="image"]');
    const cameraBtn = document.querySelector('button[title*="截图"], button[title*="图"]');

    return {
      foundAiButton: true,
      hasWelcomePrompt,
      quickChipsCount: chipButtons.length,
      quickChips: chipButtons.map(b => b.innerText.trim()),
      hasModelSelector: !!modelDropdownBtn,
      availableModels: Array.from(new Set(availableModels)),
      hasCameraUploadInput: !!fileInput && fileInput.getAttribute('multiple') !== null
    };
  });
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/audit_ai_copilot_modal.png' });
  auditReport.item5_aiCopilotModal = aiModalTest;
  console.log('AI Copilot Modal Test:', aiModalTest);

  // Close AI modal
  await page.evaluate(() => {
    const closeBtn = Array.from(document.querySelectorAll('button')).find(b => 
      b.innerHTML.includes('lucide-x') || b.getAttribute('aria-label')?.includes('Close')
    );
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));

  // =========================================================================
  // 6. Desktop & Dark Mode visual responsiveness test
  // =========================================================================
  console.log('\n--- 6. TESTING DESKTOP & DARK MODE ---');
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
  await clickBottomTab('首页').catch(() => {});
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/audit_desktop_light.png' });

  // Toggle Dark Mode
  const darkModeTest = await page.evaluate(async () => {
    const darkToggle = document.querySelector('header button[title*="主题"]');
    if (!darkToggle) return { foundToggle: false };
    
    const wasDarkBefore = document.documentElement.classList.contains('dark');
    darkToggle.click();
    await new Promise(r => setTimeout(r, 300));
    const isDarkAfter = document.documentElement.classList.contains('dark');
    
    return {
      foundToggle: true,
      wasDarkBefore,
      isDarkAfter,
      toggledSuccessfully: wasDarkBefore !== isDarkAfter
    };
  });
  await page.screenshot({ path: 'd:/Antigravity项目/财务管理系统/audit_desktop_dark.png' });
  auditReport.desktopVisual = {
    darkModeToggle: darkModeTest
  };
  console.log('Dark Mode Test:', darkModeTest);

  auditReport.endTime = new Date().toISOString();

  fs.writeFileSync('d:/Antigravity项目/财务管理系统/full_audit_360_report.json', JSON.stringify(auditReport, null, 2), 'utf-8');
  console.log('\n--- AUDIT COMPLETE --- Full report written to full_audit_360_report.json');

  await browser.close();
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
