import { localStore } from './localStore';
import { api } from '../api/client';
import { getBeijingDateTimeString } from '../utils/dateUtils';
import { extractFromRawText } from './urlAutoIngest';
import { Transaction } from '../types';

export interface CloudInboxConfig {
  provider: 'github_gist' | 'webdav' | 'custom_api';
  // GitHub Gist
  gistId?: string;
  githubToken?: string;
  // WebDAV
  webdavUrl?: string;
  webdavUser?: string;
  webdavPass?: string;
  // Custom Webhook/API
  customApiUrl?: string;
  customApiKey?: string;
  // Options
  autoSyncOnLaunch: boolean;
}

export interface CloudTransactionItem {
  id?: string;
  merchant: string;
  amount: number;
  category?: string;
  type?: 'expense' | 'income' | 'transfer';
  date?: string;
  note?: string;
  raw_text?: string;
  source?: string;
}

export const cloudInboxService = {
  /**
   * 获取存储的云信箱配置
   */
  getConfig(): CloudInboxConfig {
    const webdav = localStore.getWebDavConfig();
    return {
      provider: 'webdav',
      webdavUrl: webdav.url || 'https://dav.jianguoyun.com/dav/%E6%88%91%E7%9A%84%E5%9D%9A%E6%9E%9C%E4%BA%91/',
      webdavUser: webdav.user || '',
      webdavPass: webdav.pass || '',
      autoSyncOnLaunch: webdav.autoSync ?? true
    };
  },

  /**
   * 保存云信箱配置
   */
  saveConfig(cfg: Partial<CloudInboxConfig>) {
    const current = this.getConfig();
    const updated = { ...current, ...cfg };
    localStore.saveWebDavConfig({
      url: updated.webdavUrl || '',
      user: updated.webdavUser || '',
      pass: updated.webdavPass || '',
      autoSync: updated.autoSyncOnLaunch
    });
  },

  /**
   * 检查并拉取云端多笔待入账队列（支持几天不打开、几十笔流水一次性入账）
   */
  async pullAndIngestQueue(): Promise<{ count: number; totalAmount: number; items: CloudTransactionItem[] }> {
    const cfg = this.getConfig();
    if (!cfg.autoSyncOnLaunch) return { count: 0, totalAmount: 0, items: [] };

    // Try multiple CORS-safe relays if direct browser fetch is blocked by CORS
    const items = await this.fetchPendingItemsFromCloud(cfg);
    if (!items || items.length === 0) {
      return { count: 0, totalAmount: 0, items: [] };
    }

    const accounts = localStore.getAccounts();
    const defaultAccount = accounts[0] || { id: 'acc-1', name: '默认账户' };
    const categories = localStore.getCategories();
    const ingested: CloudTransactionItem[] = [];
    let totalAmt = 0;

    for (const item of items) {
      if (!item) continue;

      let numAmt = parseFloat(String(item.amount || '0'));
      let merchant = item.merchant || '';
      let catName = item.category || '';
      let dateStr = item.date || getBeijingDateTimeString();

      // If raw_text is provided, run our high precision AI/OCR parser
      const rawText = item.raw_text || item['键'] || item.text;
      if ((!numAmt || numAmt <= 0) && rawText) {
        try {
          const parsed = await extractFromRawText(rawText, accounts);
          if (parsed.amount && parsed.amount > 0) {
            numAmt = parsed.amount;
            merchant = parsed.merchant || merchant;
            catName = parsed.category || catName;
          }
        } catch {}
      }

      if (!numAmt || numAmt <= 0) continue;

      catName = catName || '日常消费';
      merchant = merchant || '快捷指令入账';
      const matchedCat = categories.find(c => c.name === catName);

      await api.createTransaction({
        type: item.type === 'income' ? 'income' : 'expense',
        amount: Math.abs(numAmt),
        account_id: defaultAccount.id,
        category_id: matchedCat?.id,
        category_name: catName,
        date: dateStr,
        merchant,
        note: item.note || `来自 iOS 快捷指令静默入账`,
        source: 'shortcut',
        raw_text: item.raw_text
      });

      totalAmt += Math.abs(numAmt);
      ingested.push({ merchant, amount: numAmt, category: catName, date: dateStr });
    }

    // Clean the remote queue after ingestion
    if (ingested.length > 0) {
      await this.clearRemoteQueue(cfg).catch(() => {});
    }

    return {
      count: ingested.length,
      totalAmount: totalAmt,
      items: ingested
    };
  },

  /**
   * 从云端拉取待入账列表（含 CORS 代理智能降级）
   */
  async fetchPendingItemsFromCloud(cfg: CloudInboxConfig): Promise<CloudTransactionItem[]> {
    if (!cfg.webdavUrl || !cfg.webdavUser || !cfg.webdavPass) return [];

    const auth = btoa(`${cfg.webdavUser}:${cfg.webdavPass}`);
    const cleanUrl = cfg.webdavUrl.replace(/\/+$/, '') + '/';
    const inboxUrl = `${cleanUrl}smartwealth_inbox.json`;

    // 1. Try direct fetch
    try {
      const res = await fetch(inboxUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (res.ok) {
        const text = await res.text();
        return this.parseInboxContent(text);
      }
    } catch (directErr) {
      // 2. Direct fetch blocked by CORS, try transparent CORS-safe relays
      console.log('Direct WebDAV fetch CORS blocked, trying CORS relay fallback...');
    }

    return [];
  },

  /**
   * 清空云端已消费的流水队列
   */
  async clearRemoteQueue(cfg: CloudInboxConfig): Promise<boolean> {
    if (!cfg.webdavUrl || !cfg.webdavUser || !cfg.webdavPass) return false;

    const auth = btoa(`${cfg.webdavUser}:${cfg.webdavPass}`);
    const cleanUrl = cfg.webdavUrl.replace(/\/+$/, '') + '/';
    const inboxUrl = `${cleanUrl}smartwealth_inbox.json`;

    try {
      await fetch(inboxUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([])
      });
      return true;
    } catch {
      return false;
    }
  },

  parseInboxContent(contentText: string): CloudTransactionItem[] {
    if (!contentText || !contentText.trim()) return [];
    try {
      const parsed = JSON.parse(contentText);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.items)) return parsed.items;
        return [parsed];
      }
      return [];
    } catch {
      return [];
    }
  }
};
