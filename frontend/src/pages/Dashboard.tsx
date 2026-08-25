import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowRight, 
  ReceiptText, 
  ArrowUpRight, 
  ArrowDownRight, 
  PieChart,
  Target,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { DashboardAnalytics, Transaction, Account, Budget, Goal } from '../types';
import { api } from '../api/client';

interface DashboardProps {
  analytics: DashboardAnalytics | null;
  accounts: Account[];
  transactions: Transaction[];
  budgets?: Budget[];
  goals?: Goal[];
  onNavigateTo: (page: any) => void;
  onRefresh?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  analytics,
  accounts,
  transactions,
  budgets = [],
  goals = [],
  onNavigateTo,
  onRefresh
}) => {
  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const recentTransactions = transactions.slice(0, 8);
  const netSurplus = analytics.month_summary.income - analytics.month_summary.expense;

  const handleQuickAddGoal = async () => {
    try {
      await api.addGoal({
        name: '6个月存2万备用金计划',
        target_amount: 20000,
        current_amount: 0,
        target_date: '2026-12-31',
        notes: '由 AI 规划推荐的家庭与个人财务备用金计划'
      });
      onRefresh?.();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-3.5 pb-32 animate-in fade-in duration-200 max-w-lg mx-auto">
      {/* 1. Sleek Modern Financial Hero Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white shadow-xl shadow-emerald-500/10 relative overflow-hidden space-y-4">
        <div className="flex items-center justify-between text-emerald-100 text-xs">
          <span className="flex items-center gap-1.5 font-medium">
            <Wallet className="w-3.5 h-3.5" /> 净资产总额 (CNY)
          </span>
          <button 
            type="button" 
            onClick={() => onNavigateTo('accounts')}
            className="text-[11px] text-emerald-200 hover:text-white flex items-center gap-0.5"
          >
            {accounts.length}个账户 <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="text-3xl font-black font-mono tracking-tight">
          ¥{analytics.net_worth.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </div>

        {/* Month Flow Stats Row */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/15 text-xs">
          <div className="p-2 rounded-2xl bg-white/10 backdrop-blur-md space-y-0.5">
            <div className="text-emerald-100 text-[10px] flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3 text-emerald-300" /> 本月收入
            </div>
            <div className="text-xs font-bold font-mono truncate">
              +¥{analytics.month_summary.income.toFixed(2)}
            </div>
          </div>

          <div className="p-2 rounded-2xl bg-white/10 backdrop-blur-md space-y-0.5">
            <div className="text-rose-100 text-[10px] flex items-center gap-0.5">
              <ArrowDownRight className="w-3 h-3 text-rose-300" /> 本月支出
            </div>
            <div className="text-xs font-bold font-mono truncate">
              -¥{analytics.month_summary.expense.toFixed(2)}
            </div>
          </div>

          <div className="p-2 rounded-2xl bg-white/10 backdrop-blur-md space-y-0.5">
            <div className="text-teal-100 text-[10px] flex items-center gap-0.5">
              <span>结余</span>
            </div>
            <div className={`text-xs font-bold font-mono truncate ${netSurplus >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
              {netSurplus >= 0 ? '+' : ''}¥{netSurplus.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Unified Financial Trajectory (Budgets & Goals Monitor) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Module A: Monthly Budgets */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <PieChart className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                月度预算监控
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTo('budgets')}
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              {budgets.length > 0 ? '管理' : '+ 设定'} <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {budgets.length === 0 ? (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
              <div className="text-[10px] text-slate-400">
                尚未设置支出上限预警
              </div>
              <button
                type="button"
                onClick={() => onNavigateTo('budgets')}
                className="px-2 py-0.8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold shadow-sm"
              >
                去设置
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {budgets.slice(0, 2).map((b) => {
                const spent = b.spent_amount || 0;
                const pct = b.amount > 0 ? Math.min(100, Math.round((spent / b.amount) * 100)) : 0;
                const remaining = Math.max(0, b.amount - spent);
                const isOver = spent > b.amount;

                return (
                  <div key={b.id} className="p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {b.category_name || '总预算'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        {isOver ? (
                          <span className="text-rose-500 font-bold">超支 ¥{(spent - b.amount).toFixed(2)}</span>
                        ) : (
                          <span>余 ¥{remaining.toFixed(2)}</span>
                        )}
                      </span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOver ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Module B: Savings Goals */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Target className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                存钱心愿目标
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTo('goals')}
              className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center"
            >
              {goals.length > 0 ? '管理' : '+ 立项'} <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {goals.length === 0 ? (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
              <div className="text-[10px] text-slate-400">
                制定6个月存2万备用金
              </div>
              <button
                type="button"
                onClick={handleQuickAddGoal}
                className="px-2 py-0.8 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold shadow-sm"
              >
                一键立项
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {goals.slice(0, 2).map((g) => {
                const cur = g.current_amount || 0;
                const tot = g.target_amount || 1;
                const pct = Math.min(100, Math.round((cur / tot) * 100));

                return (
                  <div key={g.id} className="p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {g.name}
                      </span>
                      <span className="font-mono text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                        {pct}% (¥{cur.toFixed(0)}/{tot.toFixed(0)})
                      </span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. Recent Transactions Ledger (Floating up to the fold) */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            最新明细 ({transactions.length})
          </span>
          <button
            onClick={() => onNavigateTo('transactions')}
            className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-500 flex items-center gap-0.5"
          >
            全部账单 <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <ReceiptText className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              暂无记账记录
            </div>
            <p className="text-[10px] text-slate-400">
              点击下方「+」按钮，开启极速记账！
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentTransactions.map(tx => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs ${
                    tx.category_name === '余额校准'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-600'
                      : tx.type === 'income' 
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' 
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                  }`}>
                    {tx.category_name === '余额校准' ? <Wallet className="w-4 h-4" /> : tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {tx.merchant || tx.category_name || '日常消费'}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {tx.date.substring(5, 16)} • {tx.account_name || '默认账户'}
                    </div>
                  </div>
                </div>

                <div className={`text-xs font-bold font-mono flex-shrink-0 ${
                  tx.category_name === '余额校准' 
                    ? 'text-amber-600 dark:text-amber-400'
                    : tx.type === 'income' 
                      ? 'text-emerald-500' 
                      : 'text-slate-900 dark:text-white'
                }`}>
                  {tx.type === 'income' ? '+' : '-'}¥{tx.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
