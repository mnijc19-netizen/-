import { Transaction, Account, SankeyData, RecurringRule } from '../types';
import { localStore } from './localStore';
import { api } from '../api/client';
import { getBeijingDateTimeString, getBeijingDateString } from '../utils/dateUtils';

/**
 * Computes a real dynamic Sankey flow from ledger transactions
 * Topology: [Income Categories] -> [Accounts] -> [Expense Categories]
 */
export function computeDynamicSankeyFlow(
  transactions: Transaction[],
  accounts: Account[],
  selectedMonth?: string
): SankeyData {
  const nodeMap = new Map<string, number>();
  const linkMap = new Map<string, number>();

  const targetMonth = selectedMonth || getBeijingDateString().substring(0, 7);

  const filtered = transactions.filter(t => {
    if (t.category_name === '余额校准' || (t.merchant && t.merchant.includes('余额校准'))) return false;
    if (targetMonth && t.date) {
      return t.date.startsWith(targetMonth);
    }
    return true;
  });

  const accountNameMap = new Map<string, string>();
  accounts.forEach(a => accountNameMap.set(a.id, a.name));

  filtered.forEach(t => {
    const accName = t.account_name || accountNameMap.get(t.account_id) || '常用账户';
    const accNode = `【账户】${accName}`;

    if (t.type === 'income') {
      const incCategory = `【收入】${t.category_name || '其他收入'}`;
      const linkKey = `${incCategory}:::${accNode}`;
      linkMap.set(linkKey, (linkMap.get(linkKey) || 0) + t.amount);
      nodeMap.set(incCategory, 1);
      nodeMap.set(accNode, 1);
    } else if (t.type === 'expense') {
      const expCategory = `【支出】${t.category_name || '日常消费'}`;
      const linkKey = `${accNode}:::${expCategory}`;
      linkMap.set(linkKey, (linkMap.get(linkKey) || 0) + t.amount);
      nodeMap.set(accNode, 1);
      nodeMap.set(expCategory, 1);
    }
  });

  // If no transactions in this month, create an empty or intuitive visual preview
  if (linkMap.size === 0) {
    const defaultAcc = accounts[0]?.name || '微信零钱';
    return {
      nodes: [
        { name: '【收入】暂无当月记录' },
        { name: `【账户】${defaultAcc}` },
        { name: '【支出】暂无支出' }
      ],
      links: [
        { source: '【收入】暂无当月记录', target: `【账户】${defaultAcc}`, value: 1 },
        { source: `【账户】${defaultAcc}`, target: '【支出】暂无支出', value: 1 }
      ]
    };
  }

  const nodes = Array.from(nodeMap.keys()).map(name => ({ name }));
  const links = Array.from(linkMap.entries()).map(([key, value]) => {
    const [source, target] = key.split(':::');
    return {
      source,
      target,
      value: Math.round(value * 100) / 100
    };
  });

  return { nodes, links };
}

/**
 * Checks and executes pending recurring rules in browser offline environment
 */
export async function executeClientRecurringRules(): Promise<number> {
  const rules = localStore.getRecurringRules().filter(r => r.is_active === 1);
  if (rules.length === 0) return 0;

  const now = new Date();
  const currentDay = now.getDate();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let executedCount = 0;

  for (const rule of rules) {
    const lastExecMonth = (rule.last_executed || '').substring(0, 7);
    if (lastExecMonth === currentMonthKey) {
      continue; // already executed this month
    }

    if (currentDay >= rule.day_of_period) {
      // Execute this rule
      await api.createTransaction({
        type: (rule.type as any) || 'expense',
        amount: rule.amount,
        account_id: rule.account_id,
        to_account_id: rule.to_account_id,
        category_name: rule.name,
        date: getBeijingDateTimeString(),
        merchant: `⏰ 周期自动记账: ${rule.name}`,
        note: rule.note || '由系统周期记账规则自动生成',
        source: 'recurring'
      });

      rule.last_executed = getBeijingDateTimeString();
      executedCount++;
    }
  }

  if (executedCount > 0) {
    localStore.saveRecurringRules(rules);
  }

  return executedCount;
}
