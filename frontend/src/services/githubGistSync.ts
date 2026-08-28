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
    let cfg: GithubGistConfig = {
      token: '',
      gistId: '19112eef901e903254dedab4765f135b',
      autoSync: true
    };
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      if (val) {
        const parsed = JSON.parse(val);
        cfg = {
          ...cfg,
          ...parsed,
          token: parsed.token || cfg.token,
          gistId: parsed.gistId || cfg.gistId
        };
      }
    } catch {}
    return cfg;
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
   * 双路由加速（API + Raw CDN 容灾），每一步都带诊断信息，绝不静默吞错
   */
  async pullAndIngestGist(customConfig?: Partial<GithubGistConfig>): Promise<{ count: number; items: any[]; message?: string }> {
    const cfg = { ...this.getConfig(), ...customConfig };

    if (!cfg.gistId || !cfg.gistId.trim()) {
      return { count: 0, items: [], message: '❌ 未配置 Gist ID，请先填入或点击一键创建' };
    }

    const gistId = cfg.gistId.trim();

    // Step 1: Fetch Gist from GitHub API (with Raw CDN fallback for 5G speed)
    let rawContent = '';
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache'
      };
      if (cfg.token && cfg.token.trim()) {
        headers['Authorization'] = `token ${cfg.token.trim()}`;
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const fetchRes = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'GET',
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (fetchRes.ok) {
        const apiData = await fetchRes.json();
        const file = apiData.files && apiData.files['smartwealth_inbox.json'];
        if (file && file.content) {
          rawContent = file.content;
        }
      }
    } catch (e: any) {
      console.warn('Direct API fetch failed or timed out, trying raw CDN...', e);
    }

    // Fallback: Raw CDN route if API was blocked by carrier 5G
    if (!rawContent) {
      try {
        const rawRes = await fetch(`https://gist.githubusercontent.com/mnijc19-netizen/${gistId}/raw/smartwealth_inbox.json?t=${Date.now()}`, {
          cache: 'no-store'
        });
        if (rawRes.ok) {
          rawContent = await rawRes.text();
        }
      } catch (rawErr: any) {
        return { count: 0, items: [], message: `❌ 无法连接 GitHub (请检查手机网络): ${rawErr.message}` };
      }
    }

    if (!rawContent || rawContent.trim() === '[]' || rawContent.trim() === '') {
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

    // Direct Vision AI Response Unpacking (If Shortcut sends GLM-4.6V output directly)
    if (parsed.choices && parsed.choices[0]?.message?.content) {
      try {
        const innerContent = parsed.choices[0].message.content.trim();
        const jsonMatch = innerContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = [JSON.parse(jsonMatch[0])];
        }
      } catch {}
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

      let numAmt = Math.abs(parseFloat(String(item.amount || '0')));
      let merchant = item.merchant || '';
      let catName = item.category || '';
      let dateStr = item.date || getBeijingDateTimeString();
      let targetAccountId = defaultAccount.id;

      const channel = item.channel || item.account || '';
      if (/支付宝|花呗|余额宝/.test(channel)) {
        const alipayAcc = accounts.find(a => a.name && (a.name.includes('支付宝') || a.name.includes('花呗'))) || accounts.find(a => a.id === 'acc-2');
        if (alipayAcc) targetAccountId = alipayAcc.id;
      } else if (/微信|零钱/.test(channel)) {
        const wxAcc = accounts.find(a => a.name && (a.name.includes('微信') || a.name.includes('零钱'))) || accounts.find(a => a.id === 'acc-1');
        if (wxAcc) targetAccountId = wxAcc.id;
      }

      const rawText = item.raw_text || item['键'] || item.text || (typeof item === 'string' ? item : '');

      if ((isNaN(numAmt) || numAmt <= 0) && rawText) {
        // 1. Try AI parsing first (if enabled)
        const aiConfig = localStore.getAiConfig();
        if (aiConfig.enabled && aiConfig.apiKey && aiConfig.apiKey.trim()) {
          try {
            const aiRes = await parseWithAi(rawText, accounts);
            if (aiRes && aiRes.amount && aiRes.amount > 0) {
              numAmt = Math.abs(aiRes.amount);
              merchant = aiRes.merchant || merchant;
              catName = aiRes.suggested_category || catName;
            }
          } catch (aiErr: any) {
            errors.push(`AI解析[${idx}]: ${aiErr.message || '未知错误'}`);
          }
        }

        // 2. Fallback to rule-based extraction
        if (isNaN(numAmt) || numAmt <= 0) {
          try {
            const extracted = await extractFromRawText(rawText, accounts);
            if (extracted.amount && extracted.amount > 0) {
              numAmt = Math.abs(extracted.amount);
              merchant = extracted.merchant || merchant;
              catName = extracted.category || catName;
              if (extracted.date) {
                dateStr = extracted.date;
              }
              if (extracted.accountId) {
                targetAccountId = extracted.accountId;
              }
            }
          } catch (extErr: any) {
            errors.push(`规则解析[${idx}]: ${extErr.message || '未知错误'}`);
          }
        }
      }

      if (isNaN(numAmt) || numAmt <= 0) {
        errors.push(`条目[${idx}]: 金额为0，跳过`);
        continue;
      }

      const combinedContent = `${item.type || ''} ${merchant} ${catName} ${channel} ${rawText} ${item.note || ''}`;
      const isDebt = item.type === 'debt' || 
        /待还账单|全部待还|剩余待还|分期还款|提前结清|月待还|已出账|还款日/i.test(combinedContent) ||
        (/白条|花呗|借呗|月付|分付|信用卡|房贷|车贷/.test(combinedContent) && /待还|欠款|账单|本金/.test(combinedContent));

      // 💳 Special Branch: Debt & Installments Auto-Routing (DO NOT DEDUCT CASH)
      if (isDebt) {
        let debtPlatform = 'baitiao';
        let debtName = '京东白条';
        if (/花呗/.test(combinedContent)) { debtPlatform = 'huabei'; debtName = '蚂蚁花呗'; }
        else if (/美团/.test(combinedContent)) { debtPlatform = 'meituan_pay'; debtName = '美团月付'; }
        else if (/抖音/.test(combinedContent)) { debtPlatform = 'douyin_pay'; debtName = '抖音月付'; }
        else if (/信用卡/.test(combinedContent)) { debtPlatform = 'credit_card'; debtName = '信用卡分期'; }
        else if (/房贷/.test(combinedContent)) { debtPlatform = 'mortgage'; debtName = '房贷按揭'; }
        else if (/车贷/.test(combinedContent)) { debtPlatform = 'car_loan'; debtName = '车贷分期'; }

        let installments = item.installments || item.total_installments;
        if (!installments && rawText) {
          const m = rawText.match(/(\d+)月待还/g);
          if (m && m.length > 0) installments = m.length;
        }
        installments = installments || 3;

        let monthlyPayment = item.monthly_payment;
        if (!monthlyPayment && rawText) {
          const m = rawText.match(/剩余待还\s*([0-9,.]+)/);
          if (m) monthlyPayment = parseFloat(m[1].replace(/,/g, ''));
        }
        if (!monthlyPayment || isNaN(monthlyPayment)) {
          monthlyPayment = Number((numAmt / installments).toFixed(2));
        }

        let repayDay = item.repay_day || 4;
        if (rawText) {
          const m = rawText.match(/还款日\s*(?:\d+月)?(\d+)日/);
          if (m) repayDay = parseInt(m[1]);
        }

        try {
          const existingDebts = localStore.getDebts();
          const existingDebt = existingDebts.find(d => d.name === debtName || d.type === debtPlatform);
          if (existingDebt) {
            await api.updateDebt(existingDebt.id, {
              total_principal: numAmt,
              remaining_principal: numAmt,
              monthly_payment: monthlyPayment,
              total_installments: installments,
              repay_day: repayDay
            });
          } else {
            await api.addDebt({
              name: debtName,
              type: debtPlatform as any,
              total_principal: numAmt,
              remaining_principal: numAmt,
              monthly_payment: monthlyPayment,
              total_installments: installments,
              repay_day: repayDay
            });
          }

          // Update liability account balance
          let liabAcc = accounts.find(a => a.type === debtPlatform || a.name.includes(debtName));
          if (liabAcc) {
            liabAcc.balance = numAmt;
            localStore.saveAccounts(accounts);
          }

          ingestedList.push({
            merchant: `💳 ${debtName}分期负债 (${installments}期)`,
            amount: numAmt,
            category: '信贷分期',
            date: dateStr
          });
        } catch (debtErr: any) {
          errors.push(`负债入账[${idx}]: ${debtErr.message || '写入失败'}`);
        }
        continue;
      }

      catName = catName || '日常消费';
      merchant = merchant || '快捷指令入账';

      // Deduplication check: Avoid recording the same transaction multiple times
      const existingTxs = localStore.getTransactions();
      const isDuplicate = existingTxs.some(existing => {
        if (rawText && existing.raw_text && existing.raw_text.trim() === rawText.trim()) {
          return true;
        }
        if (existing.merchant === merchant && Math.abs(existing.amount - numAmt) < 0.001) {
          const d1 = (dateStr || '').substring(0, 10);
          const d2 = (existing.date || '').substring(0, 10);
          if (d1 === d2) {
            return true;
          }
        }
        return false;
      });

      if (isDuplicate) {
        // Skip duplicate
        continue;
      }

      const matchedCat = categories.find(c => c.name === catName);

      // Step 5: Create transaction
      try {
        await api.createTransaction({
          type: item.type === 'income' ? 'income' : 'expense',
          amount: Math.abs(numAmt),
          account_id: targetAccountId,
          category_id: matchedCat?.id,
          category_name: catName,
          date: dateStr,
          merchant,
          note: item.note || `来自 GitHub Gist 快捷指令云同步`,
          source: 'shortcut',
          raw_text: rawText
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
