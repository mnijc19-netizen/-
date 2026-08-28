import { 
  Sun, 
  Moon, 
  Bot,
  RotateCcw
} from 'lucide-react';
import { DashboardAnalytics } from '../types';
import { haptic } from '../services/haptic';

interface NavbarProps {
  analytics: DashboardAnalytics | null;
  darkMode: boolean;
  privacyMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAiChat?: () => void;
  onReload?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  analytics,
  darkMode,
  privacyMode,
  onToggleDarkMode,
  onOpenAiChat,
  onReload
}) => {
  const handleToggleDark = () => {
    haptic.toggle();
    onToggleDarkMode();
  };

  const handleOpenAi = () => {
    haptic.impact();
    onOpenAiChat?.();
  };
  return (
    <header className="sticky top-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 px-4 py-2.5 flex items-center justify-between max-w-lg mx-auto w-full pt-[calc(0.5rem+env(safe-area-inset-top))]">
      {/* Brand & Net Worth Pill */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-2xl overflow-hidden shadow-sm border border-slate-800/40 flex-shrink-0 bg-slate-950 flex items-center justify-center p-1">
          <img 
            src="./logo-transparent.png" 
            alt="斌斌钱包" 
            className="w-full h-full object-contain" 
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">
              斌斌钱包
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {analytics 
              ? `净资产: ${privacyMode ? '••••' : `¥${analytics.net_worth.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`}` 
              : '加载中...'
            }
          </div>
        </div>
      </div>

      {/* Top Controls: Dark Mode Toggle & Unified AI Capsule */}
      <div className="flex items-center gap-2">
        {/* Dark Mode toggle */}
        <button
          type="button"
          onClick={handleToggleDark}
          className="p-2 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
          title="切换深浅主题"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Unified AI Financial Copilot Capsule */}
        <button
          type="button"
          onClick={handleOpenAi}
          className="px-3 py-1.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white hover:opacity-95 shadow-md shadow-indigo-500/20 transition active:scale-95 flex items-center gap-1.5 text-xs font-bold"
          title="💬 斌斌 AI 智能对话管家"
        >
          <Bot className="w-4 h-4" />
          <span>AI 管家</span>
        </button>
      </div>
    </header>
  );
};
