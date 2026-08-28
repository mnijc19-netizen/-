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
import { DashboardModularWidgets } from '../components/DashboardModularWidgets';
import { haptic } from '../services/haptic';

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
              onClick={() => {
                haptic.toggle();
                onTogglePrivacy();
              }}
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

      {/* 2. Customizable Horizontal Financial Modular Widgets (Debts, Budgets, Goals, Planner, Investments, Analytics, Transactions) */}
      <DashboardModularWidgets 
        privacyMode={privacyMode} 
        onNavigateTo={onNavigateTo}
        onOpenQuickTx={onOpenQuickTx}
        onOpenBatchBalance={onOpenBatchBalance}
      />
    </div>
  );
};
