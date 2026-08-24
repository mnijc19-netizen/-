import React from 'react';
import { 
  LayoutDashboard, 
  WalletCards, 
  Plus, 
  ReceiptText, 
  Settings
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
  onOpenQuickTx
}) => {
  return (
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

      {/* Central Prominent Floating '+' Button -> Direct Universal Add Transaction Modal */}
      <button
        type="button"
        onClick={onOpenQuickTx}
        aria-label="记一笔"
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
  );
};
