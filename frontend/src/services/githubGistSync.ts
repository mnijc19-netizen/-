import { localStore } from './localStore';
import { api } from '../api/client';
import { getBeijingDateTimeString } from '../utils/dateUtils';
import { extractFromRawText } from './urlAutoIngest';
import { parseWithAi } from './aiParser';

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
   * 从 GitHub Gist 拉取并自动落库所有待入账流水
   * 每一步都带诊断信息，绝不静默吞错
   */
  async pullAndIngestGist(customConfig?: Partial<GithubGistConfig>): Promise<{ count: number; items: any[]; message?: string }> {
    const cfg = { ...this.getConfig(), ...customConfig };

    if (!cfg.gistId || !cfg.gistId.trim()) {
      return { count: 0, items: [], message: '❌ 未配置 Gist ID，请先填入或点击一键创建' };
    }

    const gistId = cfg.gistId.trim();

    // Step 1: Fetch Gist from GitHub API
    let fetchRes: Response;
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache'
      };
      if (cfg.token && cfg.token.trim()) {
        headers['Authorization'] = `token ${cfg.token.trim()}`;
      }
      fetchRes = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'GET',
        headers
      });
    } catch (e: any) {
      return { count: 0, items: [], message: `❌ 网络请求失败: ${e.message || '无法连接 GitHub'}` };
    }

    if (!fetchRes.ok) {
      return { count: 0, items: [], message: `❌ GitHub API 响应 ${fetchRes.status}（检查 Token 是否有效）` };
    }

    // Step 2: Parse API response
    let apiData: any;
    try {
      apiData = await fetchRes.json();
    } catch (e: any) {
      return { count: 0, items: [], message: `❌ GitHub 返回数据格式异常: ${e.message}` };
    }

    const file = apiData.files && apiData.files['smartwealth_inbox.json'];
    if (!file || !file.content) {
      return { count: 0, items: [], message: '❌ Gist 中未找到 smartwealth_inbox.json 文件' };
    }

    const rawContent = file.content;
    if (rawContent.trim() === '[]' || rawContent.trim() === '') {
      return { count: 0, items: [], message: '☁️ GitHub 信箱当前为空（无待入账流水）' };
    }

    // Step 3: Parse the file content (handle iOS unescaped newlines)
    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      // iOS Shortcut sends raw newlines that break JSON.parse
      try {
        const m = rawContent.match(/"raw_text"\s*:\s*"([\s\S]*?)"\s*\}\s*\]/);
        if (m) {
          parsed = [{ raw_text: m[1] }];
        } else {
          // Try extracting everything between [ ] as raw text
          const textContent = rawContent.replace(/^\[\s*\{\s*"raw_text"\s*:\s*"/, '').replace(/"\s*\}\s*\]$/, '');
          if (textContent && textContent.length > 5) {
            parsed = [{ raw_text: textContent }];
          }
        }
      } catch (e2: any) {
        return { count: 0, items: [], message: `❌ 信箱内容解析失败: ${e2.message}` };
      }
    }

    if (!parsed) {
      return { count: 0, items: [], message: '❌ 信箱数据格式无法识别（既非 JSON 也无法通过正则提取）' };
    }

    const rawList: any[] = Array.isArray(parsed) ? parsed : (parsed.items || [parsed]);
    if (!rawList || rawList.length === 0) {
      return { count: 0, items: [], message: '☁️ 信箱解析成功但列表为空' };
    }

    // Step 4: Process each item
    const accounts = localStore.getAccounts();
    const defaultAccount = accounts[0] || { id: 'acc-1', name: '默认账户' };
    const categories = localStore.getCategories();
    const ingestedList: any[] = [];
    const errors: string[] = [];

    for (let idx = 0; idx < rawList.length; idx++) {
      const item = rawList[idx];
      if (!item) continue;

      let numAmt = parseFloat(String(item.amount || '0'));
      let merchant = item.merchant || '';
      let catName = item.category || '';
      let dateStr = item.date || getBeijingDateTimeString();

      const rawText = item.raw_text || item['键'] || item.text || (typeof item === 'string' ? item : '');

      if ((!numAmt || numAmt <= 0) && rawText) {
        // 1. Try AI parsing first (if enabled)
        const aiConfig = localStore.getAiConfig();
        if (aiConfig.enabled && aiConfig.apiKey && aiConfig.apiKey.trim()) {
          try {
            const aiRes = await parseWithAi(rawText, accounts);
            if (aiRes && aiRes.amount && aiRes.amount > 0) {
              numAmt = aiRes.amount;
              merchant = aiRes.merchant || merchant;
              catName = aiRes.suggested_category || catName;
            }
          } catch (aiErr: any) {
            errors.push(`AI解析[${idx}]: ${aiErr.message || '未知错误'}`);
          }
        }

        // 2. Fallback to rule-based extraction
        if (!numAmt || numAmt <= 0) {
          try {
            const extracted = await extractFromRawText(rawText, accounts);
            if (extracted.amount && extracted.amount > 0) {
              numAmt = extracted.amount;
              merchant = extracted.merchant || merchant;
              catName = extracted.category || catName;
            }
          } catch (extErr: any) {
            errors.push(`规则解析[${idx}]: ${extErr.message || '未知错误'}`);
          }
        }
      }

      if (!numAmt || numAmt <= 0) {
        errors.push(`条目[${idx}]: 金额为0，跳过`);
        continue;
      }

      catName = catName || '日常消费';
      merchant = merchant || '快捷指令入账';
      const matchedCat = categories.find(c => c.name === catName);

      // Step 5: Create transaction
      try {
        await api.createTransaction({
          type: item.type === 'income' ? 'income' : 'expense',
          amount: Math.abs(numAmt),
          account_id: defaultAccount.id,
          category_id: matchedCat?.id,
          category_name: catName,
          date: dateStr,
          merchant,
          note: item.note || `来自 GitHub Gist 快捷指令云同步`,
          source: 'shortcut'
        });
        ingestedList.push({ merchant, amount: numAmt, category: catName, date: dateStr });
      } catch (txErr: any) {
        errors.push(`入账[${idx}]: ${txErr.message || '写入失败'}`);
      }
    }

    // Step 6: Clear Gist after successful ingestion
    if (ingestedList.length > 0 && cfg.token && cfg.token.trim()) {
      try {
        await fetch(`https://api.github.com/gists/${gistId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `token ${cfg.token.trim()}`,
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
        });
      } catch {}
    }

    if (ingestedList.length > 0) {
      const summary = ingestedList.map(i => `${i.merchant} ¥${i.amount}`).join('、');
      return {
        count: ingestedList.length,
        items: ingestedList,
        message: `✅ 成功入账 ${ingestedList.length} 笔：${summary}`
      };
    }

    // If we got here, data existed but nothing was ingested
    const errDetail = errors.length > 0 ? errors.join('；') : '金额识别为0';
    return {
      count: 0,
      items: [],
      message: `⚠️ 信箱有 ${rawList.length} 条数据，但入账失败：${errDetail}`
    };
  }
};
