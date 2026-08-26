import { localStore } from './localStore';
import { api } from '../api/client';
import { getBeijingDateTimeString } from '../utils/dateUtils';
import { extractFromRawText } from './urlAutoIngest';
import { parseWithAi } from './aiParser';
import { Transaction } from '../types';

export interface GithubGistConfig {
  token: string;
  gistId: string;
  autoSync: boolean;
}

const STORAGE_KEY = 'smartwealth_github_gist_config_v1';

export const githubGistSync = {
  getConfig(): GithubGistConfig {
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      if (val) return JSON.parse(val);
    } catch {}
    return {
      token: '',
      gistId: '',
      autoSync: true
    };
  },

  saveConfig(cfg: Partial<GithubGistConfig>) {
    const current = this.getConfig();
    const updated = { ...current, ...cfg };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  },

  /**
   * 一键在用户 GitHub 上创建专属的私有 Gist 云信箱
   */
  async createInitialGist(token: string): Promise<{ success: boolean; gistId: string; message: string }> {
    if (!token || !token.trim()) {
      throw new Error('请先填入 GitHub Personal Access Token (PAT)');
    }

    const cleanToken = token.trim();
    const res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `token ${cleanToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: 'SmartWealth 极智记账 - 快捷指令私有云信箱',
        public: false,
        files: {
          'smartwealth_inbox.json': {
            content: '[]'
          }
        }
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `GitHub 响应错误 (${res.status})`);
    }

    const data = await res.json();
    const gistId = data.id;

    this.saveConfig({
      token: cleanToken,
      gistId,
      autoSync: true
    });

    return {
      success: true,
      gistId,
      message: `✅ 已成功在你的 GitHub 上创建私有 Gist 信箱 (ID: ${gistId})！`
    };
  },

  /**
   * 从 GitHub Gist 拉取并自动落库所有待入账流水（100% 官方 CORS 通行证，永不拦截）
   */
  async pullAndIngestGist(customConfig?: Partial<GithubGistConfig>): Promise<{ count: number; items: any[]; message?: string }> {
    const cfg = { ...this.getConfig(), ...customConfig };
    if (!cfg.gistId || !cfg.gistId.trim()) {
      return { count: 0, items: [], message: '未配置 Gist ID' };
    }

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache'
      };
      if (cfg.token && cfg.token.trim()) {
        headers['Authorization'] = `token ${cfg.token.trim()}`;
      }

      const res = await fetch(`https://api.github.com/gists/${cfg.gistId.trim()}`, {
        method: 'GET',
        headers
      });

      if (!res.ok) {
        return { count: 0, items: [], message: `GitHub 响应异常 (${res.status})` };
      }

      const data = await res.json();
      const file = data.files && data.files['smartwealth_inbox.json'];
      if (!file || !file.content || file.content.trim() === '[]' || file.content.trim() === '') {
        return { count: 0, items: [], message: 'GitHub 信箱当前为空（无待入账流水）' };
      }

      let parsed: any;
      try {
        parsed = JSON.parse(file.content);
      } catch {
        // Handle unescaped newlines or control characters from iOS Shortcut raw text
        try {
          const m = file.content.match(/"raw_text"\s*:\s*"([\s\S]*?)"\s*\}\s*\]/);
          if (m) {
            parsed = [{ raw_text: m[1] }];
          } else {
            const rawMatch = file.content.match(/\[\s*\{([\s\S]*)\}\s*\]/);
            if (rawMatch) {
              const textContent = file.content.replace(/^\[\s*\{\s*"raw_text"\s*:\s*"/, '').replace(/"\s*\}\s*\]$/, '');
              parsed = [{ raw_text: textContent }];
            }
          }
        } catch {
          return { count: 0, items: [] };
        }
      }

      if (!parsed) return { count: 0, items: [] };

      const rawList: any[] = Array.isArray(parsed) ? parsed : (parsed.items || [parsed]);
      if (!rawList || rawList.length === 0) return { count: 0, items: [] };

      const accounts = localStore.getAccounts();
      const defaultAccount = accounts[0] || { id: 'acc-1', name: '默认账户' };
      const categories = localStore.getCategories();
      const ingestedList: any[] = [];

      for (const item of rawList) {
        if (!item) continue;

        let numAmt = parseFloat(String(item.amount || '0'));
        let merchant = item.merchant || '';
        let catName = item.category || '';
        let dateStr = item.date || getBeijingDateTimeString();

        const rawText = item.raw_text || item['键'] || item.text || (typeof item === 'string' ? item : '');

        if ((!numAmt || numAmt <= 0) && rawText) {
          // 1. High precision AI parsing if enabled
          const aiConfig = localStore.getAiConfig();
          if (aiConfig.enabled && aiConfig.apiKey && aiConfig.apiKey.trim()) {
            try {
              const aiRes = await parseWithAi(rawText, accounts);
              if (aiRes && aiRes.amount && aiRes.amount > 0) {
                numAmt = aiRes.amount;
                merchant = aiRes.merchant || merchant;
                catName = aiRes.suggested_category || catName;
              }
            } catch {}
          }

          // 2. Specialized OCR payment card rule fallback
          if (!numAmt || numAmt <= 0) {
            try {
              const extracted = await extractFromRawText(rawText, accounts);
              if (extracted.amount && extracted.amount > 0) {
                numAmt = extracted.amount;
                merchant = extracted.merchant || merchant;
                catName = extracted.category || catName;
              }
            } catch {}
          }
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
          note: item.note || `来自 GitHub Gist 快捷指令云同步`,
          source: 'shortcut',
          raw_text: rawText
        });

        ingestedList.push({ merchant, amount: numAmt, category: catName, date: dateStr });
      }

      // Clear Gist after successful ingestion
      if (ingestedList.length > 0) {
        await fetch(`https://api.github.com/gists/${cfg.gistId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `token ${cfg.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            files: {
              'smartwealth_inbox.json': {
                content: '[]'
              }
            }
          })
        }).catch(() => {});
      }

      return { count: ingestedList.length, items: ingestedList };
    } catch (e) {
      console.warn('Gist pull error:', e);
      return { count: 0, items: [] };
    }
  }
};
