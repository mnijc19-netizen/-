import { parseSmsOrTextInBrowser } from './smsParser';
import { localStore } from './localStore';
import { api } from '../api/client';
import { Transaction } from '../types';

export interface AutoIngestResult {
  triggered: boolean;
  success: boolean;
  message: string;
  transaction?: Transaction;
}

export async function checkAndHandleUrlAutoIngest(): Promise<AutoIngestResult | null> {
  const urlParams = new URLSearchParams(window.location.search);
  const rawText = urlParams.get('text') || urlParams.get('t') || urlParams.get('sms');
  const directAmt = urlParams.get('amt') || urlParams.get('amount');
  const directMer = urlParams.get('mer') || urlParams.get('merchant');
  const directType = (urlParams.get('type') as any) || 'expense';
  const autoClipboard = urlParams.get('clipboard') === '1' || urlParams.get('cb') === '1';

  // If no automation params, return null
  if (!rawText && !directAmt && !autoClipboard) {
    return null;
  }

  // Clear query params from browser URL so refreshing doesn't re-trigger
  const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
  window.history.replaceState({ path: cleanUrl }, '', cleanUrl);

  const accounts = localStore.getAccounts();
  const categories = localStore.getCategories();

  // Case 1: Direct amount & merchant provided via Shortcut
  if (directAmt) {
    const amount = parseFloat(directAmt);
    if (!isNaN(amount) && amount > 0) {
      const merchant = directMer || '快捷指令记账';
      const created = await api.createTransaction({
        type: directType,
        amount,
        account_id: accounts[0]?.id || 'acc-1',
        category_name: '日常消费',
        date: new Date().toISOString().substring(0, 16).replace('T', ' '),
        merchant,
        note: '通过 iPhone 动作按钮 / 快捷指令自动记录',
        source: 'ios_shortcut'
      });
      return {
        triggered: true,
        success: true,
        message: `已自动记账：${merchant} ¥${amount.toFixed(2)}`,
        transaction: created
      };
    }
  }

  // Case 2: Raw text provided via Shortcut (SMS or OCR text)
  if (rawText) {
    const parsed = parseSmsOrTextInBrowser(rawText, accounts);
    if (parsed.success && parsed.amount) {
      const catObj = categories.find(c => c.name === parsed.suggested_category);
      const created = await api.createTransaction({
        type: parsed.type || 'expense',
        amount: parsed.amount,
        account_id: parsed.matched_account_id || accounts[0]?.id || 'acc-1',
        category_id: catObj?.id,
        category_name: parsed.suggested_category || '日常消费',
        date: parsed.date || new Date().toISOString().substring(0, 16).replace('T', ' '),
        merchant: parsed.merchant || '智能提取商户',
        note: parsed.note || '通过 iPhone 快捷指令自动提取',
        source: 'ios_shortcut',
        raw_text: rawText
      });
      return {
        triggered: true,
        success: true,
        message: `已自动识别入账：${parsed.merchant || '消费'} ¥${parsed.amount.toFixed(2)}`,
        transaction: created
      };
    }
  }

  // Case 3: Trigger automatic clipboard read on launch
  if (autoClipboard) {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) {
        const parsed = parseSmsOrTextInBrowser(clip, accounts);
        if (parsed.success && parsed.amount) {
          const created = await api.createTransaction({
            type: parsed.type || 'expense',
            amount: parsed.amount,
            account_id: parsed.matched_account_id || accounts[0]?.id || 'acc-1',
            category_name: parsed.suggested_category || '日常消费',
            date: new Date().toISOString().substring(0, 16).replace('T', ' '),
            merchant: parsed.merchant || '剪贴板提取',
            source: 'clipboard_auto',
            raw_text: clip
          });
          return {
            triggered: true,
            success: true,
            message: `剪贴板已自动识别入账：${parsed.merchant || '消费'} ¥${parsed.amount.toFixed(2)}`,
            transaction: created
          };
        }
      }
    } catch {
      // Ignore clipboard permission errors
    }
  }

  return {
    triggered: true,
    success: false,
    message: '未能从传入参数中识别到有效金额'
  };
}
