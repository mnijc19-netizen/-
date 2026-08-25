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
  EyeOff
} from 'lucide-react';
import { DashboardAnalytics, Transaction, Account } from '../types';

interface DashboardProps {
  analytics: DashboardAnalytics | null;
  accounts: Account[];
  transactions: Transaction[];
  privacyMode: boolean;
  onTogglePrivacy: () => void;
  onNavigateTo: (page: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  analytics,
  accounts,
  transactions,
  privacyMode,
  onTogglePrivacy,
  onNavigateTo
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

  return (
    <div className="space-y-3.5 pb-32 animate-in fade-in duration-200 max-w-lg mx-auto">
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
              <span>结余</span>
            </div>
            <div className={`text-xs font-bold font-mono truncate ${netSurplus >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
              {privacyMode ? '¥ ••••' : `${netSurplus >= 0 ? '+' : ''}¥${netSurplus.toFixed(2)}`}
            </div>
          </div>
        </div>
      </div>

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
