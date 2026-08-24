import React from 'react';
import { 
  Sparkles, 
  Plus, 
  Camera, 
  Sun, 
  Moon, 
  ShieldCheck, 
  TrendingUp,
  RotateCcw,
  Zap
} from 'lucide-react';
import { DashboardAnalytics } from '../types';

interface NavbarProps {
  analytics: DashboardAnalytics | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSmartParser: () => void;
  onOpenQuickTx: () => void;
  onOpenSnapshot: () => void;
  onReload: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  analytics,
  darkMode,
  onToggleDarkMode,
  onOpenSmartParser,
  onOpenQuickTx,
  onOpenSnapshot,
  onReload
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 lg:px-8 py-3 flex items-center justify-between">
      {/* Brand & Net Worth preview */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                极智财务
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                PRO
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              SmartWealth 全域资产管家
            </div>
          </div>
        </div>

        {/* Global Net Worth Ticker */}
        {analytics && (
          <div className="hidden md:flex items-center gap-4 pl-6 border-l border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-[11px] text-slate-400 font-medium">全局净资产</div>
              <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                ¥{analytics.net_worth.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">本月结余</div>
              <div className={`text-sm font-extrabold font-mono ${analytics.month_summary.savings >= 0 ? 'text-slate-800 dark:text-slate-200' : 'text-rose-500'}`}>
                {analytics.month_summary.savings >= 0 ? '+' : ''}¥{analytics.month_summary.savings.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons & Settings */}
      <div className="flex items-center gap-2.5">
        {/* Anti-dropout Smart Parser button */}
        <button
          type="button"
          onClick={onOpenSmartParser}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition active:scale-95"
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span className="hidden sm:inline">智能短信/通知识别</span>
          <span className="sm:hidden">智能识别</span>
        </button>

        {/* Lazy Snapshot mode button */}
        <button
          type="button"
          onClick={onOpenSnapshot}
          className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
          title="懒人余额快照对账（免逐笔记账）"
        >
          <Camera className="w-3.5 h-3.5" />
          <span className="hidden md:inline">懒人余额快照</span>
        </button>

        {/* Quick manual transaction */}
        <button
          type="button"
          onClick={onOpenQuickTx}
          className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-bold shadow-sm flex items-center gap-1.5 transition active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">记一笔</span>
        </button>

        {/* Dark/Light toggle */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title={darkMode ? '切换到浅色模式' : '切换到深色模式'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Refresh button */}
        <button
          type="button"
          onClick={onReload}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="刷新数据"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
