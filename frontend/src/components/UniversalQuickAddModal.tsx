import React from 'react';
import { 
  X, 
  Plus, 
  Camera, 
  Sparkles, 
  ClipboardCheck, 
  PieChart, 
  Layers, 
  WalletCards, 
  ChevronRight,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  CreditCard
} from 'lucide-react';

interface UniversalQuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectManual: (type?: 'expense' | 'income' | 'transfer') => void;
  onSelectImageOcr: () => void;
  onSelectSmartParser: () => void;
  onSelectBatchBalance: () => void;
  onSelectSnapshot: () => void;
  onClipboardIngest: () => void;
  onSelectPlanner?: () => void;
}

import { BottomSheet } from './common/BottomSheet';
import { haptic } from '../services/haptic';

export const UniversalQuickAddModal: React.FC<UniversalQuickAddModalProps> = ({
  isOpen,
  onClose,
  onSelectManual,
  onSelectImageOcr,
  onSelectSmartParser,
  onSelectBatchBalance,
  onSelectSnapshot,
  onClipboardIngest,
  onSelectPlanner
}) => {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="记一笔 / 智能入账"
      description="选择记账方式或通过 AI 极速入库"
      maxHeightClass="max-h-[92dvh]"
      contentClassName="p-4 space-y-3"
    >
      {/* 1-Tap Clipboard Instant Ingest Hero Button */}
      <div>
        <button
          type="button"
            onClick={() => {
              onClose();
              onClipboardIngest();
            }}
            className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white flex items-center justify-between shadow-md shadow-emerald-500/20 active:scale-98 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-105 transition">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>📋 读取剪贴板一键极速记账</span>
                  <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-white/20 font-bold">AI</span>
                </div>
                <div className="text-[10px] text-emerald-100">截屏或复制账单后，点此秒级入库</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-200" />
          </button>
        </div>

        {/* 4 Core Ingest Modes */}
        <div className="p-4 pt-2 grid grid-cols-2 gap-2.5">
          {/* Mode 1: Manual Entry */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectManual('expense');
            }}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-left hover:border-emerald-400 active:scale-95 transition group space-y-1.5"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">⚡ 极速手动记账</div>
              <div className="text-[10px] text-slate-400">支出 / 收入 / 转账</div>
            </div>
          </button>

          {/* Mode 2: Photo / Bill OCR */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectImageOcr();
            }}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-left hover:border-purple-400 active:scale-95 transition group space-y-1.5"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                <span>📸 拍照 / 扫小票</span>
                <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold">AI</span>
              </div>
              <div className="text-[10px] text-slate-400">识别账单凭证与发票</div>
            </div>
          </button>

          {/* Mode 3: Text / SMS Parser */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectSmartParser();
            }}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-left hover:border-blue-400 active:scale-95 transition group space-y-1.5"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                <span>✨ 智能文本 / 短信</span>
                <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold">AI</span>
              </div>
              <div className="text-[10px] text-slate-400">自然语言与银行短信</div>
            </div>
          </button>

          {/* Mode 4: Batch Balance OCR */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectBatchBalance();
            }}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-left hover:border-amber-400 active:scale-95 transition group space-y-1.5"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition">
              <WalletCards className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                <span>📸 批量余额对账</span>
                <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">AI</span>
              </div>
              <div className="text-[10px] text-slate-400">微信/支付宝多图开账</div>
            </div>
          </button>
        </div>

        {/* Mode 5: Debt & Installment Planning Direct Hub */}
        {onSelectPlanner && (
          <div className="p-4 pt-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                onSelectPlanner();
              }}
              className="w-full p-3 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-indigo-500/10 border border-rose-200/60 dark:border-rose-800/40 text-left hover:border-rose-400 active:scale-98 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>💳 负债与分期还款规划</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-600 font-bold">白条/花呗/月供</span>
                  </div>
                  <div className="text-[10px] text-slate-400">查看各期还款进度与自由资金流</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-500 group-hover:translate-x-0.5 transition" />
            </button>
          </div>
        )}
    </BottomSheet>
  );
};
