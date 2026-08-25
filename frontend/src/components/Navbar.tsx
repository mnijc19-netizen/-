import React from 'react';
import { 
  Sparkles, 
  Camera, 
  Sun, 
  Moon, 
  Zap,
  RotateCcw,
  Bot
} from 'lucide-react';
import { DashboardAnalytics } from '../types';

interface NavbarProps {
  analytics: DashboardAnalytics | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSmartParser: () => void;
  onOpenQuickTx: () => void;
  onOpenSnapshot: () => void;
  onOpenImageOcr: () => void;
  onOpenAiHub: () => void;
  onOpenAiChat?: () => void;
  onReload: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  analytics,
  darkMode,
  onToggleDarkMode,
  onOpenSmartParser,
  onOpenImageOcr,
  onOpenAiHub,
  onOpenAiChat,
  onReload
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-2.5 flex items-center justify-between max-w-lg mx-auto w-full pt-[calc(0.5rem+env(safe-area-inset-top))]">
      {/* Brand & Net Worth Pill */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md shadow-amber-500/10 border border-slate-700/50 flex-shrink-0 bg-slate-950 flex items-center justify-center p-1">
          <img 
            src="./logo-transparent.png" 
            alt="斌斌账本" 
            className="w-full h-full object-contain" 
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">
              斌斌账本
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
              PRO
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {analytics ? `净资产: ¥${analytics.net_worth.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` : '加载中...'}
          </div>
        </div>
      </div>

      {/* Top Quick Actions */}
      <div className="flex items-center gap-1.5">
        {/* AI Chat Copilot button */}
        <button
          type="button"
          onClick={onOpenAiChat}
          className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-100 transition active:scale-95 shadow-sm flex items-center gap-1"
          title="💬 斌斌 AI 智能对话助手"
        >
          <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="text-[10px] font-bold hidden sm:inline">AI对话</span>
        </button>

        {/* Quick AI Hub button */}
        <button
          type="button"
          onClick={onOpenAiHub}
          className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition active:scale-95 shadow-sm"
          title="斌斌 AI 财务智能大脑"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        {/* Quick Camera OCR button */}
        <button
          type="button"
          onClick={onOpenImageOcr}
          className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition active:scale-95"
          title="拍照/图片识别记账"
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Quick SMS / Clipboard parse */}
        <button
          type="button"
          onClick={onOpenSmartParser}
          className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition active:scale-95"
          title="粘贴短信/通知记账"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        {/* Dark/Light toggle */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title={darkMode ? '浅色模式' : '深色模式'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Refresh */}
        <button
          type="button"
          onClick={onReload}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="刷新"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
