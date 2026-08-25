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
  Bot
} from 'lucide-react';
import { DashboardAnalytics, Transaction, Account } from '../types';

interface DashboardProps {
  analytics: DashboardAnalytics | null;
  accounts: Account[];
  transactions: Transaction[];
  onOpenSmartParser: () => void;
  onOpenQuickTx: () => void;
  onOpenSnapshot: () => void;
  onOpenImageOcr: () => void;
  onOpenAiHub: () => void;
  onClipboardIngest: () => void;
  onNavigateTo: (page: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  analytics,
  accounts,
  transactions,
  onOpenSmartParser,
  onOpenQuickTx,
  onOpenSnapshot,
  onOpenImageOcr,
  onOpenAiHub,
  onClipboardIngest,
  onNavigateTo
}) => {
  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const recentTransactions = transactions.slice(0, 8);

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200 max-w-lg mx-auto">
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
              <ArrowUpRight className="w-3 h-3 text-emerald-300" /> 本月收入
            </div>
            <div className="text-sm font-bold font-mono">
              +¥{analytics.month_summary.income.toFixed(2)}
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md space-y-0.5">
            <div className="text-emerald-100 flex items-center gap-1 text-[11px]">
              <ArrowDownRight className="w-3 h-3 text-rose-300" /> 本月支出
            </div>
            <div className="text-sm font-bold font-mono">
              -¥{analytics.month_summary.expense.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* 1-Tap Clipboard Instant Ingest Banner (Works directly on Standalone PWA) */}
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
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-bold">
                1触即存
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              长按侧边键截屏后，点此自动读取并瞬间入库
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-emerald-500 flex-shrink-0" />
      </button>

      {/* 🤖 AI Financial Copilot & Laboratory Hero Card */}
      <button
        type="button"
        onClick={onOpenAiHub}
        className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/40 flex items-center justify-between text-left hover:border-indigo-400 active:scale-98 transition shadow-md group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/30 group-hover:scale-105 transition">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>✨ 斌斌 AI 财务智能大脑 & 实验室</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-bold">
                智能管家
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              一句话自动拆解记多笔 • AI 财务深度体检与省钱建议
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-indigo-500 flex-shrink-0" />
      </button>

      {/* Mobile 4-Grid Quick Action Matrix */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Action 1: Photo / Screenshot OCR */}
        <button
          type="button"
          onClick={onOpenImageOcr}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 text-left hover:border-emerald-400 active:scale-95 transition"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-white">📸 拍照/截屏识别</div>
            <div className="text-[10px] text-slate-400 truncate">扫小票或账单图片</div>
          </div>
        </button>

        {/* Action 2: Text / SMS & Notification parser */}
        <button
          type="button"
          onClick={onOpenSmartParser}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 text-left hover:border-blue-400 active:scale-95 transition"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-white">✨ 智能文本记账</div>
            <div className="text-[10px] text-slate-400 truncate">自然语言与短信解析</div>
          </div>
        </button>

        {/* Action 3: Quick manual entry */}
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

      {/* iPhone Action Button Shortcut Configuration Banner */}
      <button
        type="button"
        onClick={() => onNavigateTo('iphone_shortcut')}
        className="w-full p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-left hover:border-indigo-400 active:scale-98 transition text-xs"
      >
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <span className="font-bold text-slate-700 dark:text-slate-300">
            ⚙️ 查看 iPhone 快捷指令与按键配置指南
          </span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
      </button>

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
            最新记账明细
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
              账本已清空，准备就绪
            </div>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              点击上方「📋 剪贴板一键存」或「拍照识别」，开启您的第一笔智能极速记账！
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentTransactions.map(tx => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs ${
                    tx.type === 'income' 
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' 
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                  }`}>
                    {tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
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
                  tx.type === 'income' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'
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
