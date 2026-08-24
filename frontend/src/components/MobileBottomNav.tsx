import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  WalletCards, 
  Plus, 
  ReceiptText, 
  Settings, 
  Sparkles, 
  Camera, 
  Clipboard, 
  X,
  Edit3,
  PieChart
} from 'lucide-react';
import { PageId } from './Sidebar';

interface MobileBottomNavProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  onOpenSmartParser: () => void;
  onOpenQuickTx: () => void;
  onOpenSnapshot: () => void;
  onOpenImageOcr: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentPage,
  onSelectPage,
  onOpenSmartParser,
  onOpenQuickTx,
  onOpenSnapshot,
  onOpenImageOcr
}) => {
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  return (
    <>
      {/* Floating Center Action Sheet */}
      {actionMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                极速记账通道
              </span>
              <button 
                onClick={() => setActionMenuOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {/* Option 1: Image OCR */}
              <button
                type="button"
                onClick={() => {
                  setActionMenuOpen(false);
                  onOpenImageOcr();
                }}
                className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 text-left space-y-2 hover:bg-emerald-500/20 active:scale-95 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">📸 拍照/图片识别</div>
                  <div className="text-[10px] text-slate-400">小票、微信/支付宝截图</div>
                </div>
              </button>

              {/* Option 2: SMS & Notification */}
              <button
                type="button"
                onClick={() => {
                  setActionMenuOpen(false);
                  onOpenSmartParser();
                }}
                className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/30 text-left space-y-2 hover:bg-blue-500/20 active:scale-95 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Clipboard className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">📱 粘贴短信/通知</div>
                  <div className="text-[10px] text-slate-400">复制扣款文本一键提取</div>
                </div>
              </button>

              {/* Option 3: Quick Manual Entry */}
              <button
                type="button"
                onClick={() => {
                  setActionMenuOpen(false);
                  onOpenQuickTx();
                }}
                className="p-4 rounded-2xl bg-gradient-to-br from-slate-500/10 to-slate-700/10 border border-slate-300 dark:border-slate-700 text-left space-y-2 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">⚡ 极速手动记账</div>
                  <div className="text-[10px] text-slate-400">支出、收入、转账调拨</div>
                </div>
              </button>

              {/* Option 4: Balance Snapshot */}
              <button
                type="button"
                onClick={() => {
                  setActionMenuOpen(false);
                  onOpenSnapshot();
                }}
                className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 text-left space-y-2 hover:bg-purple-500/20 active:scale-95 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                  <PieChart className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">📸 懒人余额快照</div>
                  <div className="text-[10px] text-slate-400">填总余额免逐笔记录</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 px-2 py-1.5 flex items-center justify-around max-w-lg mx-auto shadow-lg pb-[calc(0.4rem+env(safe-area-inset-bottom))]">
        {/* Tab 1: Home */}
        <button
          type="button"
          onClick={() => onSelectPage('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
            currentPage === 'dashboard' ? 'text-emerald-500 font-bold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">首页</span>
        </button>

        {/* Tab 2: Assets / Accounts */}
        <button
          type="button"
          onClick={() => onSelectPage('accounts')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
            currentPage === 'accounts' ? 'text-emerald-500 font-bold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <WalletCards className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">资产</span>
        </button>

        {/* Central Prominent Floating Button */}
        <button
          type="button"
          onClick={() => setActionMenuOpen(true)}
          className="-mt-5 w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Tab 4: Transactions */}
        <button
          type="button"
          onClick={() => onSelectPage('transactions')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
            currentPage === 'transactions' ? 'text-emerald-500 font-bold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <ReceiptText className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">明细</span>
        </button>

        {/* Tab 5: Settings / More */}
        <button
          type="button"
          onClick={() => onSelectPage('settings')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
            currentPage === 'settings' ? 'text-emerald-500 font-bold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">我的</span>
        </button>
      </nav>
    </>
  );
};
