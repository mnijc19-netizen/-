import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Camera, 
  Sparkles, 
  ArrowRight, 
  Plus, 
  ReceiptText, 
  ArrowUpRight, 
  ArrowDownRight, 
  Zap, 
  Fingerprint, 
  PieChart,
  ClipboardCheck,
  Bot,
  Target,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Calendar,
  PiggyBank,
  ChevronRight
} from 'lucide-react';
import { DashboardAnalytics, Transaction, Account, Budget, Goal } from '../types';
import { api } from '../api/client';

interface DashboardProps {
  analytics: DashboardAnalytics | null;
  accounts: Account[];
  transactions: Transaction[];
  budgets?: Budget[];
  goals?: Goal[];
  onOpenSmartParser: () => void;
  onOpenQuickTx: () => void;
  onOpenSnapshot: () => void;
  onOpenImageOcr: () => void;
  onOpenAiHub: () => void;
  onOpenAiChat?: () => void;
  onClipboardIngest: () => void;
  onNavigateTo: (page: any) => void;
  onRefresh?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  analytics,
  accounts,
  transactions,
  budgets = [],
  goals = [],
  onOpenSmartParser,
  onOpenQuickTx,
  onOpenSnapshot,
  onOpenImageOcr,
  onOpenAiHub,
  onOpenAiChat,
  onClipboardIngest,
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

  const recentTransactions = transactions.slice(0, 6);

  const handleQuickAddBudget = async (catName: string, amt: number) => {
    try {
      await api.setBudget({
        period: 'monthly',
        amount: amt,
        alert_threshold: 0.8
      });
      onRefresh?.();
    } catch (e: any) {
      alert(e.message);
    }
  };

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
    <div className="space-y-4 pb-36 animate-in fade-in duration-200 max-w-lg mx-auto">
      {/* Mobile Hero Card: Net Worth & Monthly Flow */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-700 text-white shadow-xl shadow-emerald-500/15 relative overflow-hidden space-y-4">
        <div className="flex items-center justify-between text-emerald-100 text-xs">
          <span className="flex items-center gap-1.5 font-medium">
            <Wallet className="w-3.5 h-3.5" /> 净资产总额 (CNY)
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md">
            实时汇总
          </span>
        </div>

        <div className="text-3xl font-black font-mono tracking-tight">
          ¥{analytics.net_worth.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </div>

        {/* Month Flow Stats Row */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/20 text-xs">
          <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md space-y-0.5">
            <div className="text-emerald-100 flex items-center gap-1 text-[11px]">
              <ArrowUpRight className="w-3 h-3 text-emerald-300" /> 本月日常收入
            </div>
            <div className="text-sm font-bold font-mono">
              +¥{analytics.month_summary.income.toFixed(2)}
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md space-y-0.5">
            <div className="text-emerald-100 flex items-center gap-1 text-[11px]">
              <ArrowDownRight className="w-3 h-3 text-rose-300" /> 本月日常支出
            </div>
            <div className="text-sm font-bold font-mono">
              -¥{analytics.month_summary.expense.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* 1-Tap Clipboard Instant Ingest Banner */}
      <button
        type="button"
        onClick={onClipboardIngest}
        className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600/20 via-teal-600/20 to-blue-600/20 border border-emerald-500/40 flex items-center justify-between text-left hover:border-emerald-400 active:scale-98 transition shadow-sm group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>📋 快捷指令 / 剪贴板一键极速入账</span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400">
                AI
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              截图或复制文本后，点此自动识别入库
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-emerald-500 flex-shrink-0" />
      </button>

      {/* 🤖 AI Financial Copilot & Laboratory Action Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onOpenAiChat}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white flex items-center justify-between text-left shadow-lg shadow-purple-500/20 active:scale-98 transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>💬 斌斌 AI 对话管家</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-white/20 text-white">
                  BETA
                </span>
              </div>
              <p className="text-[10px] text-purple-100 mt-0.5">
                自然语言/发图直接帮您记账、对账、定存钱计划
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-purple-200 flex-shrink-0" />
        </button>

        <button
          type="button"
          onClick={onOpenAiHub}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-950/50 dark:via-purple-950/40 dark:to-slate-900/80 border border-indigo-300/60 dark:border-indigo-500/30 flex items-center justify-between text-left hover:border-indigo-400 active:scale-98 transition shadow-sm group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/30 group-hover:scale-105 transition">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-950 dark:text-white flex items-center gap-1.5">
                <span>✨ 智能大脑 & 实验室</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-500/15 dark:bg-purple-500/25 text-indigo-700 dark:text-purple-300">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5">
                AI 财务体检报告 • 多图批量提取
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
        </button>
      </div>

      {/* 📊 1. Monthly Budgets Section */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              月度预算监控 ({budgets.length > 0 ? `${budgets.length}项` : '未设置'})
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTo('budgets')}
            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
          >
            {budgets.length > 0 ? '管理全部预算' : '+ 设定预算'} <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {budgets.length === 0 ? (
          <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <div className="font-bold text-blue-900 dark:text-blue-200 text-[11px]">
                💡 尚未设置月度支出上限
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                设定餐饮与日常预算，超支时 AI 自动预警防剁手
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTo('budgets')}
              className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold shadow-sm"
            >
              立即配置
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {budgets.slice(0, 3).map((b) => {
              const spent = b.spent_amount || 0;
              const pct = b.amount > 0 ? Math.min(100, Math.round((spent / b.amount) * 100)) : 0;
              const remaining = Math.max(0, b.amount - spent);
              const isOver = spent > b.amount;

              return (
                <div key={b.id} className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>{b.category_name || '日常总预算'}</span>
                      {isOver ? (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 text-[9px] font-bold">
                          已超支
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-normal">
                          剩余 ¥{remaining.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-slate-900 dark:text-white">¥{spent.toFixed(2)}</span> / ¥{b.amount.toFixed(2)} ({pct}%)
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
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

      {/* 🎯 2. Savings Goals Section */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              储蓄计划与心愿目标 ({goals.length > 0 ? `${goals.length}个` : '未立项'})
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTo('goals')}
            className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5"
          >
            {goals.length > 0 ? '全部目标清单' : '+ 新建立项'} <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {goals.length === 0 ? (
          <div className="p-3 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <div className="font-bold text-purple-900 dark:text-purple-200 text-[11px]">
                🎯 设定您的第一个存钱目标
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                如【6个月存2万备用金】或【年终旅游心愿】
              </div>
            </div>
            <button
              type="button"
              onClick={handleQuickAddGoal}
              className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold shadow-sm"
            >
              一键立项
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {goals.slice(0, 2).map((g) => {
              const cur = g.current_amount || 0;
              const tot = g.target_amount || 1;
              const pct = Math.min(100, Math.round((cur / tot) * 100));

              return (
                <div key={g.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {g.name}
                    </div>
                    <div className="font-mono text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                      {pct}% 完成
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                    <div>
                      已存 <span className="font-bold font-mono text-slate-800 dark:text-slate-200">¥{cur.toFixed(2)}</span> / 目标 ¥{tot.toFixed(2)}
                    </div>
                    {g.target_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>截止 {g.target_date}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4-Grid Quick Action Matrix */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Action 1: Photo / Screenshot OCR */}
        <button
          type="button"
          onClick={onOpenImageOcr}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 text-left hover:border-purple-400 active:scale-95 transition"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
              <span>📸 拍照记账</span>
              <span className="text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400">
                AI
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">扫小票或账单图片</div>
          </div>
        </button>

        {/* Action 2: Text / SMS Parser */}
        <button
          type="button"
          onClick={onOpenSmartParser}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 text-left hover:border-blue-400 active:scale-95 transition"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
              <span>✨ 智能文本记账</span>
              <span className="text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400">
                AI
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">自然语言与短信解析</div>
          </div>
        </button>

        {/* Action 3: Quick Manual Entry */}
        <button
          type="button"
          onClick={onOpenQuickTx}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 text-left hover:border-indigo-400 active:scale-95 transition"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
            <Plus className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-white">⚡ 极速手动记账</div>
            <div className="text-[10px] text-slate-400 truncate">支出/收入/转账</div>
          </div>
        </button>

        {/* Action 4: Lazy Balance Snapshot */}
        <button
          type="button"
          onClick={onOpenSnapshot}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 text-left hover:border-purple-400 active:scale-95 transition"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
            <PieChart className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-white">📸 懒人余额快照</div>
            <div className="text-[10px] text-slate-400 truncate">免逐笔记账对盘</div>
          </div>
        </button>
      </div>

      {/* Accounts List Summary */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            我的主要账户 ({accounts.length})
          </span>
          <button
            onClick={() => onNavigateTo('accounts')}
            className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-500 flex items-center gap-0.5"
          >
            全部资产 <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {accounts.slice(0, 4).map(acc => (
            <div key={acc.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                {acc.name}
              </div>
              <div className={`text-xs font-bold font-mono ${acc.type === 'credit' ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                ¥{acc.balance.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Ledger List */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            最新记账流水
          </span>
          <button
            onClick={() => onNavigateTo('transactions')}
            className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-500 flex items-center gap-0.5"
          >
            查看全部 <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <ReceiptText className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              账本准备就绪
            </div>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              点击上方「📋 剪贴板入账」或「拍照记账」，开启您的第一笔记账！
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
