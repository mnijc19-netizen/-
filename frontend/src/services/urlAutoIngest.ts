import { parseSmsOrTextInBrowser } from './smsParser';
import { parseRecognizedBillText } from './imageOcr';
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
  try {
    const searchParams = new URLSearchParams(window.location.search);
    // Also check hash parameters if search is empty
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#\/?/, ''));

    const rawText = searchParams.get('text') || searchParams.get('t') || searchParams.get('sms') ||
                    hashParams.get('text') || hashParams.get('t') || hashParams.get('sms');
    const directAmt = searchParams.get('amt') || searchParams.get('amount') ||
                      hashParams.get('amt') || hashParams.get('amount');
    const directMer = searchParams.get('mer') || searchParams.get('merchant') ||
                      hashParams.get('mer') || hashParams.get('merchant');
    const directType = (searchParams.get('type') || hashParams.get('type') || 'expense') as any;
    const autoClipboard = searchParams.get('clipboard') === '1' || searchParams.get('cb') === '1' ||
                          hashParams.get('clipboard') === '1' || hashParams.get('cb') === '1';

    // If no automation params, return null
    if (!rawText && !directAmt && !autoClipboard) {
      return null;
    }

    // Clean URL state safely
    try {
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    } catch {}

    const accounts = localStore.getAccounts();
    const categories = localStore.getCategories();

    // Helper to save transaction directly
    const saveAndReturn = async (amount: number, merchant: string, note: string, type: any = 'expense', category?: string, accountId?: string) => {
      const matchedCategory = category || '餐饮美食';
      const catObj = categories.find(c => c.name === matchedCategory);
      const targetAccountId = accountId || accounts[0]?.id || 'acc-1';

      const created = await api.createTransaction({
        type,
        amount,
        account_id: targetAccountId,
        category_id: catObj?.id,
        category_name: matchedCategory,
        date: new Date().toISOString().substring(0, 16).replace('T', ' '),
        merchant,
        note,
        source: 'ios_shortcut'
      });

      return {
        triggered: true,
        success: true,
        message: `🎉 已自动入账：${merchant} ¥${amount.toFixed(2)}`,
        transaction: created
      };
    };

    // Case 1: Direct amount & merchant provided via Shortcut
    if (directAmt) {
      const amount = parseFloat(directAmt);
      if (!isNaN(amount) && amount > 0) {
        const merchant = directMer || '快捷自动记账';
        return await saveAndReturn(amount, merchant, '通过 iPhone 快捷指令直接记录');
      }
    }

    // Case 2: Raw text passed from Screenshot / SMS / Dictation
    if (rawText) {
      let decoded = rawText;
      try {
        decoded = decodeURIComponent(rawText);
      } catch {
        decoded = rawText;
      }

      // Try bill card & SMS parser
      let parsed = parseRecognizedBillText(decoded, accounts);
      if (!parsed.success || !parsed.amount) {
        parsed = parseSmsOrTextInBrowser(decoded, accounts);
      }

      if (parsed.success && parsed.amount) {
        return await saveAndReturn(
          parsed.amount, 
          parsed.merchant || '快捷提取消费', 
          parsed.note || '通过 iPhone 快捷指令自动识别',
          parsed.type,
          parsed.suggested_category,
          parsed.matched_account_id
        );
      }
    }

    // Case 3: Automatic clipboard read on launch
    if (autoClipboard) {
      try {
        const clip = await navigator.clipboard.readText();
        if (clip) {
          let parsed = parseRecognizedBillText(clip, accounts);
          if (!parsed.success || !parsed.amount) {
            parsed = parseSmsOrTextInBrowser(clip, accounts);
          }
          if (parsed.success && parsed.amount) {
            return await saveAndReturn(
              parsed.amount, 
              parsed.merchant || '剪贴板消费', 
              '由剪贴板一键自动入账',
              parsed.type,
              parsed.suggested_category,
              parsed.matched_account_id
            );
          }
        }
      } catch (e) {
        console.warn('Clipboard read error:', e);
      }
    }

    return {
      triggered: true,
      success: false,
      message: '未能识别到有效金额，请确保截屏或文字包含付款数字'
    };
  } catch (err: any) {
    console.error('URL auto ingest error:', err);
    return {
      triggered: true,
      success: false,
      message: `处理出错: ${err.message || '请重试'}`
    };
  }
}
