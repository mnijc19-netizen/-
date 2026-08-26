import { Debt, Budget, Transaction, MonthlyPlanConfig } from '../types';
import { getBeijingDateTimeString, getBeijingMonthString } from '../utils/dateUtils';

const CONFIG_KEY = 'monthly_plan_config';

export const DEFAULT_MONTHLY_CONFIG: MonthlyPlanConfig = {
  expected_salary: 8000,
  additional_income: 0,
  include_installments_in_budget: true
};

export function getMonthlyPlanConfig(): MonthlyPlanConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_MONTHLY_CONFIG };
    return { ...DEFAULT_MONTHLY_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_MONTHLY_CONFIG };
  }
}

export function saveMonthlyPlanConfig(config: Partial<MonthlyPlanConfig>): MonthlyPlanConfig {
  const current = getMonthlyPlanConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
  return updated;
}

export interface MonthlyCashflowSummary {
  period: string;
  expectedSalary: number;
  recordedIncome: number;
  totalIncome: number;
  thisMonthDueAmount: number;
  nextMonthDueAmount: number;
  thisMonthDebts: Debt[];
  nextMonthDebts: Debt[];
  thisMonthRepaidDebts: Debt[];
  livingExpensesSpent: number;
  totalBudget: number;
  remainingBudget: number;
  safeFreeCashflow: number;
  healthStatus: 'comfortable' | 'moderate' | 'deficit';
  healthMessage: string;
}

/**
 * Determines whether a debt bill falls into 'this_month' or 'next_month'
 */
export function getDebtTargetMonth(debt: Debt): 'this_month' | 'next_month' {
  if (debt.target_month) {
    const currentMonth = getBeijingMonthString();
    return debt.target_month === currentMonth ? 'this_month' : 'next_month';
  }

  // Use repay_day and current Beijing day of month
  const beijingNowStr = getBeijingDateTimeString();
  const dayOfMonth = parseInt(beijingNowStr.slice(8, 10)) || 1;
  const repayDay = debt.repay_day || 20;

  // If today is on or before repay_day, it is due this month; otherwise next month
  return dayOfMonth <= repayDay ? 'this_month' : 'next_month';
}

/**
 * Calculates complete monthly cashflow planning equation
 */
export function calculateMonthlyCashflowPlan(
  debts: Debt[],
  budgets: Budget[],
  transactions: Transaction[],
  config: MonthlyPlanConfig = getMonthlyPlanConfig()
): MonthlyCashflowSummary {
  const currentMonth = getBeijingMonthString();

  // 1. Incomes
  const recordedIncome = transactions
    .filter(tx => tx.type === 'income' && tx.date.startsWith(currentMonth))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalIncome = config.expected_salary + (config.additional_income || 0);

  // 2. Debts and Installments routing
  const thisMonthDebts: Debt[] = [];
  const nextMonthDebts: Debt[] = [];
  const thisMonthRepaidDebts: Debt[] = [];

  for (const d of debts) {
    if (d.remaining_principal <= 0) continue;

    const dueMonth = getDebtTargetMonth(d);
    if (dueMonth === 'this_month') {
      if (d.is_repaid_this_month) {
        thisMonthRepaidDebts.push(d);
      } else {
        thisMonthDebts.push(d);
      }
    } else {
      nextMonthDebts.push(d);
    }
  }

  const thisMonthDueAmount = thisMonthDebts.reduce((sum, d) => sum + (d.monthly_payment || d.remaining_principal), 0);
  const nextMonthDueAmount = nextMonthDebts.reduce((sum, d) => sum + (d.monthly_payment || d.remaining_principal), 0);

  // 3. Living expenses and budgets
  const livingExpensesSpent = transactions
    .filter(tx => 
      tx.type === 'expense' && 
      tx.date.startsWith(currentMonth) && 
      tx.category_name !== '余额校准' && 
      tx.category_name !== '内部转账'
    )
    .reduce((sum, tx) => sum + tx.amount, 0);

  const categoryBudgets = budgets.filter(b => b.category_id);
  const overallBudget = budgets.find(b => !b.category_id);
  const totalBudget = overallBudget ? overallBudget.amount : categoryBudgets.reduce((s, b) => s + b.amount, 0);
  const remainingBudget = Math.max(0, totalBudget - livingExpensesSpent);

  // 4. Safe Free Cashflow calculation
  // Free Cashflow = Expected Income - This Month Debt Due - Actual Living Spent - Remaining Unspent Budget
  const safeFreeCashflow = totalIncome - thisMonthDueAmount - livingExpensesSpent - remainingBudget;

  let healthStatus: 'comfortable' | 'moderate' | 'deficit' = 'comfortable';
  let healthMessage = '资金充裕，可放心规划储蓄或投资';

  if (safeFreeCashflow < 0) {
    healthStatus = 'deficit';
    healthMessage = `预计透支 ¥${Math.abs(safeFreeCashflow).toFixed(2)}，请立即精简非必要支出！`;
  } else if (safeFreeCashflow < totalIncome * 0.15) {
    healthStatus = 'moderate';
    healthMessage = '收支紧平衡，建议合理控制花呗与日常大额消费';
  }

  return {
    period: currentMonth,
    expectedSalary: config.expected_salary,
    recordedIncome,
    totalIncome,
    thisMonthDueAmount,
    nextMonthDueAmount,
    thisMonthDebts,
    nextMonthDebts,
    thisMonthRepaidDebts,
    livingExpensesSpent,
    totalBudget,
    remainingBudget,
    safeFreeCashflow,
    healthStatus,
    healthMessage
  };
}
