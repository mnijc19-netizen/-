import { localStore } from './localStore';
import { api } from '../api/client';
import { extractFromRawText } from './urlAutoIngest';
import { parseWithAi } from './aiParser';

export interface CloudCodeSyncConfig {
  syncCode: string;
  inboxId: string;
  autoSync: boolean;
  lastSyncTime?: string;
}

const STORAGE_KEY = 'smartwealth_cloud_code_sync_v1';
const API_BASE = 'https://api.restful-api.dev/objects';

export const cloudCodeSync = {
  getConfig(): CloudCodeSyncConfig {
    const defaultCfg: CloudCodeSyncConfig = {
      syncCode: '',
      inboxId: '',
      autoSync: true
    };
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...defaultCfg, ...JSON.parse(saved) };
      }
    } catch {}
    return defaultCfg;
  },

  saveConfig(cfg: Partial<CloudCodeSyncConfig>) {
    const current = this.getConfig();
    const updated = { ...current, ...cfg };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    return updated;
  },

  /**
   * 一键创建或绑定 6 位专属云端信箱 (免注册、免 Token)
   */
  async createOrBindInbox(customCode?: string): Promise<{ success: boolean; syncCode: string; inboxId: string; message: string }> {
    const syncCode = (customCode && customCode.trim()) 
      ? customCode.trim() 
      : Math.floor(100000 + Math.random() * 900000).toString();

    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: `SmartWealth_Inbox_${syncCode}`,
          data: {
            sync_code: syncCode,
            inbox: []
          }
        })
      });

      if (!res.ok) {
        throw new Error(`云端响应异常 (${res.status})`);
      }

      const data = await res.json();
      const inboxId = data.id;

      this.saveConfig({
        syncCode,
        inboxId,
        autoSync: true
      });

      return {
        success: true,
        syncCode,
        inboxId,
        message: `✅ 已成功创建 6 位专属云信箱！同步码: ${syncCode}`
      };
    } catch (e: any) {
      throw new Error(`创建云端信箱失败: ${e.message || '网络连接超时'}`);
    }
  },

  /**
   * 从 6 位云端信箱拉取并自动落库所有待记账账单
   */
  async pullAndIngestInbox(customConfig?: Partial<CloudCodeSyncConfig>): Promise<{ count: number; items: any[]; message: string }> {
    const cfg = { ...this.getConfig(), ...customConfig };

    if (!cfg.inboxId || !cfg.inboxId.trim()) {
      return { count: 0, items: [], message: '❌ 未配置云信箱 ID，请先点击「一键生成专属同步码」' };
    }

    const inboxId = cfg.inboxId.trim();

    try {
      const res = await fetch(`${API_BASE}/${inboxId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        if (res.status === 404) {
          return { count: 0, items: [], message: '❌ 云端信箱已过期或不存在，请重新生成' };
        }
        throw new Error(`云端返回状态码 ${res.status}`);
      }

      const json = await res.json();
      const inboxList: any[] = (json.data && Array.isArray(json.data.inbox)) ? json.data.inbox : [];

      if (inboxList.length === 0) {
        return { count: 0, items: [], message: '☁️ 云信箱当前为空（无待入账流水）' };
      }

      // Process each item
      const accounts = localStore.getAccounts();
      const defaultAccount = accounts[0] || { id: 'acc-1', name: '默认账户' };
      const categories = localStore.getCategories();
      const ingestedList: any[] = [];

      for (let rawItem of inboxList) {
        let item = rawItem;

        // 1. If item is a JSON string, try parsing it
        if (typeof item === 'string') {
          try {
            item = JSON.parse(item);
          } catch {
            // Regex try match JSON object inside string
            const m = item.match(/\{[\s\S]*\}/);
            if (m) {
              try { item = JSON.parse(m[0]); } catch {}
            }
          }
        }

        // 2. If item is raw Zhipu API Response ({ choices: [...] })
        if (item && item.choices && item.choices[0]?.message?.content) {
          try {
            const innerStr = item.choices[0].message.content.trim();
            const m = innerStr.match(/\{[\s\S]*\}/);
            if (m) {
              item = JSON.parse(m[0]);
            }
          } catch {}
        }

        // 3. Direct structured transaction
        if (item && typeof item === 'object' && item.amount && !isNaN(Number(item.amount))) {
          const matchedCategory = categories.find(c => c.name === item.category) || categories[0];
          const matchedAccount = accounts.find(a => a.name.includes(item.account_name || '')) || defaultAccount;

          const txData = {
            account_id: matchedAccount.id,
            category_id: matchedCategory.id,
            category_name: matchedCategory.name,
            type: (item.type === 'income' ? 'income' : 'expense') as 'income' | 'expense',
            amount: Math.abs(Number(item.amount)),
            description: item.merchant || item.description || '快捷指令记账',
            transaction_date: item.created_at || new Date().toISOString(),
            tag: '6位云信箱同步'
          };

          await api.createTransaction(txData);
          ingestedList.push(txData);
        } else if (item.raw_text) {
          // Fallback NLP parser via extractFromRawText
          try {
            const ext = await extractFromRawText(item.raw_text, accounts);
            if (ext && ext.amount > 0) {
              const matchedCategory = categories.find(c => c.name === ext.category) || categories[0];
              const matchedAcc = accounts.find(a => a.id === ext.accountId) || defaultAccount;
              const txData = {
                account_id: matchedAcc.id,
                category_id: matchedCategory.id,
                category_name: matchedCategory.name,
                type: 'expense' as const,
                amount: Math.abs(ext.amount),
                description: ext.merchant || '快捷指令识别记账',
                transaction_date: ext.date || new Date().toISOString(),
                tag: '6位云信箱AI识别'
              };
              await api.createTransaction(txData);
              ingestedList.push(txData);
            }
          } catch (nlpErr) {
            console.warn('NLP extraction failed in cloudCodeSync:', nlpErr);
          }
        }
      }

      // Clear cloud inbox after successful ingestion
      if (ingestedList.length > 0) {
        try {
          await fetch(`${API_BASE}/${inboxId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `SmartWealth_Inbox_${cfg.syncCode}`,
              data: {
                sync_code: cfg.syncCode,
                inbox: []
              }
            })
          });
        } catch (clearErr) {
          console.warn('Failed to clear cloud inbox after sync:', clearErr);
        }
      }

      this.saveConfig({
        lastSyncTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      });

      return {
        count: ingestedList.length,
        items: ingestedList,
        message: `🎉 成功从 6 位云信箱同步入账 ${ingestedList.length} 笔流水！`
      };
    } catch (e: any) {
      return {
        count: 0,
        items: [],
        message: `❌ 同步失败: ${e.message || '网络连接超时'}`
      };
    }
  },

  /**
   * 测试云信箱连接状态
   */
  async testConnection(inboxId: string): Promise<{ success: boolean; message: string }> {
    if (!inboxId || !inboxId.trim()) {
      return { success: false, message: '请先填入或生成云信箱 ID' };
    }

    try {
      const res = await fetch(`${API_BASE}/${inboxId.trim()}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        const data = await res.json();
        const count = Array.isArray(data.data?.inbox) ? data.data.inbox.length : 0;
        return {
          success: true,
          message: `✅ 云信箱连接通畅！当前信箱中有 ${count} 笔待入账流水`
        };
      } else {
        return {
          success: false,
          message: `❌ 连接失败 (状态码: ${res.status})`
        };
      }
    } catch (e: any) {
      return {
        success: false,
        message: `❌ 无法连接到云端服务: ${e.message}`
      };
    }
  }
};
