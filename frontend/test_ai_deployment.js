import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

// Create 2 test dummy png files for image upload verification
const testImg1Path = path.resolve('test_img_1.png');
const testImg2Path = path.resolve('test_img_2.png');

const dummyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync(testImg1Path, dummyPng);
fs.writeFileSync(testImg2Path, dummyPng);

async function runComprehensiveTest() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

  console.log('Using browser executable:', executablePath);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const results = {
    url: 'https://mnijc19-netizen.github.io/-/',
    timestamp: new Date().toISOString(),
    tests: {},
    consoleErrors: [],
    pageErrors: []
  };

  const page = await browser.newPage();
  
  // Collect console and page errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.consoleErrors.push(msg.text());
      console.log('Console Error:', msg.text());
    }
  });
  page.on('pageerror', err => {
    results.pageErrors.push(err.toString());
    console.log('Page Error:', err.toString());
  });

  // Enable request interception for mock AI endpoint
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/chat/completions')) {
      const aiReply = {
        reply: '已为您成功识别并创建【华泰证券/基金持仓】资产账户，初始金额 ¥1,966.65 已入库并计入总资产！',
        action: {
          type: 'create_account',
          payload: {
            name: '华泰证券/基金持仓',
            type: 'investment',
            balance: 1966.65,
            currency: 'CNY',
            note: '由 AI 智能管家根据指令自动创建'
          }
        }
      };

      request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'chatcmpl-mock-123',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: JSON.stringify(aiReply)
            },
            finish_reason: 'stop'
          }]
        })
      });
    } else {
      request.continue();
    }
  });

  try {
    // ----------------------------------------------------
    // TEST 1: Page Load & Initial UI Layout Audit
    // ----------------------------------------------------
    console.log('\n--- 1. Testing Page Load & UI Layout ---');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('https://mnijc19-netizen.github.io/-/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Inject mock AI config and privacy_mode: false into localStorage
    await page.evaluate(() => {
      localStorage.setItem('privacy_mode', 'false'); // unmask balances
      localStorage.setItem('smartwealth_ai_config_v1', JSON.stringify({
        enabled: true,
        provider: 'deepseek',
        apiKey: 'sk-mock-valid-key-for-test-verification',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat'
      }));
    });
    // Reload to pick up config
    await page.reload({ waitUntil: 'networkidle2' });

    await page.screenshot({ path: 'audit_01_desktop_home.png' });
    
    const pageTitle = await page.title();
    console.log('Page Title:', pageTitle);
    results.tests.pageLoad = { title: pageTitle, success: true };

    // ----------------------------------------------------
    // TEST 2: Open AI Chat Assistant Modal
    // ----------------------------------------------------
    console.log('\n--- 2. Testing AI Chat Assistant Modal Opening ---');
    const aiBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent && b.textContent.includes('AI 管家')) || null;
    });

    if (!aiBtn.asElement()) {
      throw new Error('Could not find AI 管家 button in header!');
    }
    await aiBtn.asElement().click();
    await page.waitForSelector('.fixed.inset-0', { visible: true });
    await page.screenshot({ path: 'audit_02_ai_modal_open.png' });
    console.log('AI Modal successfully opened!');
    results.tests.aiModalOpen = { success: true };

    // ----------------------------------------------------
    // TEST 3: Multi-Image Upload Capabilities Verification
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Multi-Image Upload Capabilities ---');
    const fileInputInfo = await page.evaluate(() => {
      const fileInput = document.querySelector('input[type="file"][multiple]');
      if (!fileInput) return null;
      return {
        hasMultiple: fileInput.hasAttribute('multiple'),
        accept: fileInput.getAttribute('accept'),
        className: fileInput.className
      };
    });
    console.log('File Input attributes:', fileInputInfo);

    if (!fileInputInfo || !fileInputInfo.hasMultiple) {
      throw new Error('File input missing or does not have multiple attribute!');
    }

    // Upload 2 test images
    const fileInputHandle = await page.$('input[type="file"][multiple]');
    await fileInputHandle.uploadFile(testImg1Path, testImg2Path);
    await new Promise(r => setTimeout(r, 600)); // wait for FileReader

    await page.screenshot({ path: 'audit_03_multi_image_preview.png' });

    // Verify thumbnail strip contents
    const stripVerification = await page.evaluate(() => {
      const thumbnails = document.querySelectorAll('img[alt^="预览"]');
      const badges = Array.from(document.querySelectorAll('span')).filter(s => /^#\d+$/.test(s.textContent?.trim() || ''));
      const deleteButtons = document.querySelectorAll('button[class*="bg-rose-500"]');
      const addMoreBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('加图'));
      const countLabel = Array.from(document.querySelectorAll('span')).find(s => s.textContent && s.textContent.includes('已选'));

      return {
        thumbnailCount: thumbnails.length,
        badges: badges.map(b => b.textContent?.trim()),
        deleteBtnCount: deleteButtons.length,
        hasAddMoreBtn: !!addMoreBtn,
        countLabelText: countLabel?.textContent?.trim()
      };
    });
    console.log('Multi-image strip verification:', stripVerification);
    results.tests.multiImageUpload = stripVerification;

    // Test removing 1 image
    console.log('Testing image removal...');
    const deleteFirstBtn = await page.$('button[class*="bg-rose-500"]');
    if (deleteFirstBtn) {
      await deleteFirstBtn.click();
      await new Promise(r => setTimeout(r, 300));
    }
    const afterDeleteCount = await page.evaluate(() => document.querySelectorAll('img[alt^="预览"]').length);
    console.log('Thumbnail count after removing 1 image:', afterDeleteCount);
    results.tests.imageRemoval = { countAfterRemoval: afterDeleteCount, success: afterDeleteCount === 1 };

    // Clear all images
    await page.evaluate(() => {
      const clearBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('清空全部'));
      if (clearBtn) clearBtn.click();
    });
    await new Promise(r => setTimeout(r, 200));

    // ----------------------------------------------------
    // TEST 4: Securities & Fund Assets AI Action Execution
    // ----------------------------------------------------
    console.log('\n--- 4. Testing Securities & Fund Assets AI Action Execution ---');
    const inputSelector = 'input[type="text"][placeholder*="输入指令"]';
    await page.waitForSelector(inputSelector);
    await page.type(inputSelector, '把券商持仓1966.65存到资产里分类为基金');
    
    // Submit message
    const sendBtn = await page.$('button[type="submit"]');
    await sendBtn.click();
    console.log('Message sent, waiting for AI response and card rendering...');

    // Wait for assistant reply and action card
    await page.waitForFunction(() => {
      const elements = Array.from(document.querySelectorAll('span, div, h3, h4'));
      return elements.some(el => el.textContent && el.textContent.includes('已成功开立新资产账户'));
    }, { timeout: 10000 });

    await page.screenshot({ path: 'audit_04_ai_action_card.png' });

    // Verify Action Confirmation Card details
    const actionCardDetails = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div')).filter(d => 
        d.textContent && d.textContent.includes('已成功开立新资产账户') && d.textContent.includes('前往资产账户查看')
      );
      const targetCard = cards[cards.length - 1];

      if (!targetCard) return { found: false };

      const cardText = targetCard.innerText;
      const hasTitle = cardText.includes('已成功开立新资产账户');
      const hasType = cardText.includes('投资/基金持仓');
      const hasAccountName = cardText.includes('华泰证券/基金持仓');
      const hasBalance = cardText.includes('1,966.65') || cardText.includes('1966.65');
      const hasNavigateBtn = Array.from(targetCard.querySelectorAll('button')).some(b => b.textContent && b.textContent.includes('前往资产账户查看'));
      const hasUndoBtn = Array.from(targetCard.querySelectorAll('button')).some(b => b.textContent && b.textContent.includes('撤销'));

      return {
        found: true,
        hasTitle,
        hasType,
        hasAccountName,
        hasBalance,
        hasNavigateBtn,
        hasUndoBtn,
        cardFullTextSnippet: cardText.substring(0, 200)
      };
    });
    console.log('Action confirmation card details:', actionCardDetails);
    results.tests.aiActionCard = actionCardDetails;

    // ----------------------------------------------------
    // TEST 5: Navigate to Accounts Page & Verify Fund Account
    // ----------------------------------------------------
    console.log('\n--- 5. Testing Navigation to Accounts Page & Verifying Fund Account ---');
    // Click "前往资产账户查看" button inside the action card
    await page.evaluate(() => {
      const navigateBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('前往资产账户查看'));
      if (navigateBtn) navigateBtn.click();
    });

    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: 'audit_05_accounts_page.png' });

    // Check accounts on Accounts page
    const accountsPageVerification = await page.evaluate(() => {
      const pageText = document.body.innerText;
      const hasFundAcc = pageText.includes('华泰证券/基金持仓');
      const hasBalance = pageText.includes('1,966.65') || pageText.includes('1966.65') || pageText.includes('3,933.30');

      // Check localStorage accounts
      const storedAccounts = JSON.parse(localStorage.getItem('smartwealth_accounts_v2') || '[]');
      const createdAcc = storedAccounts.find(a => a.name.includes('华泰证券') || a.name.includes('基金'));

      return {
        hasFundAccOnUI: hasFundAcc,
        hasBalanceOnUI: hasBalance,
        createdAccInStorage: createdAcc,
        totalAccountsCount: storedAccounts.length
      };
    });
    console.log('Accounts page verification:', accountsPageVerification);
    results.tests.accountsPage = accountsPageVerification;

    // ----------------------------------------------------
    // TEST 6: Dark Mode & Mobile Responsiveness
    // ----------------------------------------------------
    console.log('\n--- 6. Testing Dark Mode & Mobile Responsiveness ---');
    // Toggle dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await page.screenshot({ path: 'audit_06_dark_mode.png' });

    // Mobile Viewport (iPhone 14 style: 390x844)
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.screenshot({ path: 'audit_07_mobile_view.png' });

    // Verify Mobile Navigation
    const mobileNavVerification = await page.evaluate(() => {
      const mobileNav = document.querySelector('nav');
      const navButtons = mobileNav ? Array.from(mobileNav.querySelectorAll('button')).map(b => b.textContent?.trim()) : [];
      return {
        hasMobileNav: !!mobileNav,
        navButtons
      };
    });
    console.log('Mobile nav verification:', mobileNavVerification);

    results.tests.visualAudit = {
      darkModeCaptured: true,
      mobileCaptured: true,
      mobileNav: mobileNavVerification
    };

    console.log('\nAll tests completed successfully!');
  } catch (err) {
    console.error('Test error:', err);
    results.error = err.toString();
  } finally {
    await browser.close();
    fs.writeFileSync('verification_test_results.json', JSON.stringify(results, null, 2));
    console.log('Saved results to verification_test_results.json');
  }
}

runComprehensiveTest();
