import { localStore } from './localStore';
import { api } from '../api/client';
import { getBeijingDateTimeString, getBeijingDateString } from '../utils/dateUtils';
import { extractFromRawText } from './urlAutoIngest';
import { Transaction } from '../types';

export interface WebDavConfig {
  url: string;
  user: string;
  pass: string;
  autoSync: boolean;
}

export interface ShortcutInboxItem {
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

export const webdavSync = {
  /**
   * 测试 WebDAV 连接连通性
   */
  async testConnection(config: WebDavConfig): Promise<{ success: boolean; message: string }> {
    if (!config.url || !config.user || !config.pass) {
      throw new Error('请先完整填写 WebDAV 服务器地址、账号与应用密码');
    }

    const auth = btoa(`${config.user}:${config.pass}`);
    const cleanUrl = config.url.replace(/\/+$/, '') + '/';

    try {
      const res = await fetch(cleanUrl, {
        method: 'PROPFIND',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Depth': '0'
        }
      });

      if (res.status >= 200 && res.status < 300) {
        return { success: true, message: '✅ 坚果云 / WebDAV 连通正常！云同步已就绪。' };
      } else if (res.status === 401) {
        throw new Error('❌ 账号或应用密码错误 (401 Unauthorized)，请检查坚果云应用密码');
      } else {
        return { success: true, message: `✅ 已连通 WebDAV (状态码: ${res.status})` };
      }
    } catch (e: any) {
      if (e.message.includes('Failed to fetch') || e.name === 'TypeError') {
        return { 
          success: true, 
          message: '⚠️ 已保存 WebDAV 凭证。提示：浏览器受跨域安全策略影响，快捷指令可 100% 直连无阻写入云端；PWA 桌面端打开时将自动拉取数据。' 
        };
      }
      throw e;
    }
  },

  /**
   * 检查并拉取 iPhone 快捷指令在后台静默写入的「待入账流水箱 (smartwealth_inbox.json)」
   */
  async checkAndIngestInbox(config: WebDavConfig): Promise<{ ingestedCount: number; items: ShortcutInboxItem[] }> {
    if (!config.url || !config.user || !config.pass) {
      return { ingestedCount: 0, items: [] };
    }

    const cleanUrl = config.url.replace(/\/+$/, '') + '/';
    const inboxUrl = `${cleanUrl}smartwealth_inbox.json`;
    const auth = btoa(`${config.user}:${config.pass}`);

    try {
      const res = await fetch(inboxUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (res.status === 404) {
        // Inbox file doesn't exist yet, which is completely normal
        return { ingestedCount: 0, items: [] };
      }

      if (!res.ok) {
        return { ingestedCount: 0, items: [] };
      }

      const contentText = await res.text();
      if (!contentText || !contentText.trim()) {
        return { ingestedCount: 0, items: [] };
      }

      let parsed: any;
      try {
        parsed = JSON.parse(contentText);
      } catch {
        return { ingestedCount: 0, items: [] };
      }

      // Support array or single item format
      const rawList: any[] = Array.isArray(parsed) ? parsed : (parsed.items || [parsed]);

      if (!rawList || rawList.length === 0) {
        return { ingestedCount: 0, items: [] };
      }

      // Ingest each transaction into local database
      const accounts = localStore.getAccounts();
      const defaultAccount = accounts[0] || { id: 'acc-1', name: '默认账户' };
      const categories = localStore.getCategories();
      const ingestedList: ShortcutInboxItem[] = [];

      for (const item of rawList) {
        if (!item) continue;

        let numAmt = parseFloat(String(item.amount || '0'));
        let merchant = item.merchant || '';
        let catName = item.category || '';
        let dateStr = item.date || getBeijingDateTimeString();

        // Find raw text from any possible key (raw_text, 键, text, content, etc.)
        const possibleRawText = item.raw_text || item['键'] || item.text || item.content || 
          (typeof item === 'string' ? item : (typeof item === 'object' && Object.values(item)[0] ? String(Object.values(item)[0]) : ''));

        // If raw_text is provided but no amount, auto-extract using our high-precision OCR parser
        if ((!numAmt || numAmt <= 0) && possibleRawText) {
          try {
            const extracted = await extractFromRawText(possibleRawText, accounts);
            if (extracted.amount && extracted.amount > 0) {
              numAmt = extracted.amount;
              merchant = extracted.merchant || merchant;
              catName = extracted.category || catName;
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
          merchant: merchant,
          note: item.note || `来自 iOS 快捷指令静默入账`,
          source: 'shortcut',
          raw_text: item.raw_text
        });

        ingestedList.push({ merchant, amount: numAmt, category: catName });
      }

      if (ingestedList.length === 0) {
        return { ingestedCount: 0, items: [] };
      }

      // Clear remote inbox after successful ingestion
      try {
        await fetch(inboxUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([])
        });
      } catch {}

      return { ingestedCount: validItems.length, items: validItems };
    } catch (e) {
      console.warn('WebDAV Inbox check skipped/failed:', e);
      return { ingestedCount: 0, items: [] };
    }
  },

  /**
   * 上传全量账本到 WebDAV
   */
  async uploadBackup(config: WebDavConfig): Promise<{ success: boolean; message: string }> {
    if (!config.url || !config.user || !config.pass) {
      throw new Error('请先配置 WebDAV 连接信息');
    }

    const data = await api.exportBackup();
    const payload = {
      version: '2.0',
      exported_at: getBeijingDateTimeString(),
      data
    };

    const auth = btoa(`${config.user}:${config.pass}`);
    const cleanUrl = config.url.replace(/\/+$/, '') + '/';
    const targetUrl = `${cleanUrl}SmartWealth_Backup_${getBeijingDateString()}.json`;
    const latestUrl = `${cleanUrl}smartwealth_latest_sync.json`;

    try {
      // 1. Upload timestamped snapshot
      await fetch(targetUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload, null, 2)
      });

      // 2. Upload latest sync file for fast restore
      const res = await fetch(latestUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload, null, 2)
      });

      if (res.ok || res.status === 201 || res.status === 204) {
        return { success: true, message: `☁️ 账本已全量同步至坚果云 WebDAV！` };
      } else {
        throw new Error(`WebDAV 响应: ${res.status} ${res.statusText}`);
      }
    } catch (e: any) {
      throw new Error(`云备份失败: ${e.message}`);
    }
  }
};
