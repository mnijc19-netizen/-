import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowRight, 
  ReceiptText, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronRight,
  Eye,
  EyeOff,
  Sparkles,
  Camera,
  Plus,
  Bot,
  RotateCcw,
  CreditCard,
  CheckCircle2
} from 'lucide-react';
import { DashboardAnalytics, Transaction, Account } from '../types';
import { localStore } from '../services/localStore';

interface DashboardProps {
  analytics: DashboardAnalytics | null;
  accounts: Account[];
  transactions: Transaction[];
  privacyMode: boolean;
  onTogglePrivacy: () => void;
  onNavigateTo: (page: any) => void;
  onOpenQuickTx?: () => void;
  onOpenBatchBalance?: () => void;
  onOpenAiChat?: () => void;
  onOpenOnboarding?: () => void;
  onSyncGist?: () => void;
  syncingGist?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  analytics,
  accounts,
  transactions,
  privacyMode,
  onTogglePrivacy,
  onNavigateTo,
  onOpenQuickTx,
  onOpenBatchBalance,
  onOpenAiChat,
  onOpenOnboarding,
  onSyncGist,
  syncingGist
}) => {
  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const recentTransactions = transactions.slice(0, 10);
  const netSurplus = analytics.month_summary.income - analytics.month_summary.expense;
  const isBrandNew = transactions.length === 0 && analytics.total_assets === 0;

  return (
    <div className="space-y-3.5 pb-32 animate-in fade-in duration-200 max-w-lg mx-auto">
      {/* New User Welcome / Onboarding Card if Ledger is Brand New */}
      {isBrandNew && (
        <div className="p-3.5 rounded-3xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white shadow-lg shadow-indigo-500/20 flex items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">✨ 3步开启极智财务管家</div>
              <div className="text-[10px] text-purple-100/90 truncate">批量截图识余额 · 零摩擦记账</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="px-3 py-1.5 rounded-xl bg-white text-purple-900 font-bold text-[10px] shadow-sm hover:bg-purple-50 transition active:scale-95 flex-shrink-0"
          >
            开启向导
          </button>
        </div>
      )}

      {/* 1. Sleek Modern Financial Hero Card (with Privacy Eye Toggle) */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white shadow-xl shadow-emerald-500/10 relative overflow-hidden space-y-4">
        <div className="flex items-center justify-between text-emerald-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Wallet className="w-3.5 h-3.5" /> 净资产总额 (CNY)
            </span>
            <button
              type="button"
              onClick={onTogglePrivacy}
              className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/15 transition active:scale-95 flex items-center gap-1"
              title={privacyMode ? '点击显示资产金额' : '点击隐藏私密金额'}
            >
              {privacyMode ? <EyeOff className="w-3.5 h-3.5 text-emerald-300" /> : <Eye className="w-3.5 h-3.5 text-white" />}
            </button>
          </div>

          <button 
            type="button" 
            onClick={() => onNavigateTo('accounts')}
            className="text-[11px] text-emerald-200 hover:text-white flex items-center gap-0.5"
          >
            {accounts.length}个账户 <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="text-3xl font-black font-mono tracking-tight flex items-center gap-2">
          {privacyMode ? (
            <span className="tracking-widest font-sans text-2xl text-emerald-100/90 font-bold">
              ¥ ••••
            </span>
          ) : (
            <span>
              ¥{analytics.net_worth.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>

        {/* Month Flow Stats Row */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/15 text-xs">
          <div className="p-2 rounded-2xl bg-white/10 backdrop-blur-md space-y-0.5">
            <div className="text-emerald-100 text-[10px] flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3 text-emerald-300" /> 本月收入
            </div>
            <div className="text-xs font-bold font-mono truncate">
              {privacyMode ? '+¥ ••••' : `+¥${analytics.month_summary.income.toFixed(2)}`}
            </div>
          </div>

          <div className="p-2 rounded-2xl bg-white/10 backdrop-blur-md space-y-0.5">
            <div className="text-rose-100 text-[10px] flex items-center gap-0.5">
              <ArrowDownRight className="w-3 h-3 text-rose-300" /> 本月支出
            </div>
            <div className="text-xs font-bold font-mono truncate">
              {privacyMode ? '-¥ ••••' : `-¥${analytics.month_summary.expense.toFixed(2)}`}
            </div>
          </div>

          <div className="p-2 rounded-2xl bg-white/10 backdrop-blur-md space-y-0.5">
            <div className="text-teal-100 text-[10px] flex items-center gap-0.5">
              <span>期间结余</span>
            </div>
            <div className={`text-xs font-bold font-mono truncate ${netSurplus >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
              {privacyMode ? '¥ ••••' : `${netSurplus >= 0 ? '+' : ''}¥${netSurplus.toFixed(2)}`}
            </div>
          </div>
        </div>

        {/* Quick Link to Monthly Cashflow & Installment Planner */}
        <button
          type="button"
          onClick={() => onNavigateTo('planner')}
          className="w-full mt-2.5 pt-2 border-t border-white/15 flex items-center justify-between text-xs text-indigo-100 hover:text-white transition group"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/15 font-bold">规划</span>
            <span className="text-[11px] truncate">月度资金规划与分期还款大厅</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 group-hover:translate-x-0.5 transition-transform flex-shrink-0">
            <span>测算自由现金流</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </button>
      </div>

      {/* Cloud Inbox Live Sync Bar */}
      {onSyncGist && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/50 text-xs shadow-sm">
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-indigo-600/10 dark:bg-indigo-400/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            </div>
            <div className="truncate">
              <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">快捷指令私有信箱</span>
              <span className="text-[10px] text-slate-400 ml-1.5 hidden sm:inline">后台静默自动落库</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onSyncGist}
            disabled={syncingGist}
            className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition flex items-center gap-1 active:scale-95 shadow-sm disabled:opacity-50 flex-shrink-0"
          >
            <RotateCcw className={`w-3 h-3 ${syncingGist ? 'animate-spin' : ''}`} />
            {syncingGist ? '正在同步...' : '⚡ 立即同步'}
          </button>
        </div>
      )}

      {/* Active Debts & Repayment Board (Always visible on Dashboard when debts exist) */}
      {(() => {
        const activeDebts = localStore.getDebts().filter(d => (d.remaining_principal || 0) > 0);
        if (activeDebts.length === 0) return null;

        return (
          <div className="p-4 rounded-3xl bg-gradient-to-br from-rose-500/10 via-amber-500/10 to-indigo-500/10 border border-rose-200/70 dark:border-rose-800/50 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  💳 本期待还分期智能看板 ({activeDebts.length}笔)
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTo('planner')}
                className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5"
              >
                <span>资金规划大厅</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2">
              {activeDebts.map(debt => (
                <div 
                  key={debt.id} 
                  onClick={() => onNavigateTo('planner')}
                  className="p-3 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3 cursor-pointer hover:border-rose-400 transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {debt.name}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300 text-[9px] font-bold">
                        第 {debt.current_installment || 1}/{debt.total_installments || 1} 期
                      </span>
                      {debt.is_repaid_this_month && (
                        <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 text-[9px] font-bold flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> 本月已还
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>还款日: 每月{debt.repay_day || 4}日</span>
                      <span>•</span>
                      <span>总待还: ¥{Number(debt.remaining_principal || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-black font-mono text-rose-600 dark:text-rose-400">
                      ¥{(debt.monthly_payment || (debt.remaining_principal / (debt.total_installments || 1))).toFixed(2)}
                    </div>
                    <div className="text-[9px] text-slate-400">
                      {debt.is_repaid_this_month ? '当期已结清' : '当期应还'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 2. Recent Transactions Ledger (Clean, immediate and uncluttered) */}
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
          <div className="py-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <ReceiptText className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                暂无记账记录
              </div>
              <p className="text-[10px] text-slate-400">
                选择一种快捷方式，立即开启全新账本：
              </p>
            </div>

            {/* Quick Action Pills for Empty State */}
            <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto pt-1">
              <button
                type="button"
                onClick={onOpenBatchBalance}
                className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-[11px] font-bold flex items-center justify-center gap-1.5 hover:bg-purple-100 transition active:scale-95"
              >
                <Camera className="w-3.5 h-3.5 text-purple-600" />
                <span>📸 多图批量开账</span>
              </button>

              <button
                type="button"
                onClick={onOpenQuickTx}
                className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>⚡ 记第一笔账</span>
              </button>
            </div>
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
                  {privacyMode 
                    ? '••••' 
                    : `${tx.type === 'income' ? '+' : '-'}¥${tx.amount.toFixed(2)}`
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
