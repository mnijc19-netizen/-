import React, { useState, useEffect } from 'react';
import { Camera, CheckCircle2, TrendingUp, X, Sparkles, AlertCircle, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api/client';
import { Account } from '../types';
import { getBeijingDateString } from '../utils/dateUtils';

interface SnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: Account[];
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accounts
}) => {
  const [snapshotDate, setSnapshotDate] = useState(() => getBeijingDateString());
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const initialMap: Record<string, number> = {};
      accounts.forEach(a => {
        initialMap[a.id] = a.balance;
      });
      setBalances(initialMap);
      setSnapshotDate(getBeijingDateString());
      setNotes('月底资产盘点与余额对账');
    }
  }, [isOpen, accounts]);

  const handleBalanceChange = (accId: string, valStr: string) => {
    const num = parseFloat(valStr) || 0;
    setBalances(prev => ({ ...prev, [accId]: num }));
  };

  // Calculate live preview totals
  let totalAssets = 0;
  let totalLiabilities = 0;
  accounts.forEach(a => {
    const b = balances[a.id] ?? a.balance;
    if (a.type === 'credit' || a.type === 'loan') {
      totalLiabilities += Math.abs(b);
    } else {
      totalAssets += b;
    }
  });
  const netWorth = totalAssets - totalLiabilities;

  const handleSaveSnapshot = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      await api.createSnapshot({
        snapshot_date: snapshotDate,
        accounts_balances: balances,
        notes: notes
      });

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '快照保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[82vh] my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                懒人余额快照模式
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  免逐笔记账
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                仅需每周/每月填写一次主要账户当前余额，系统自动核算净资产增减与财富走势
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Net Worth Preview Bar */}
        <div className="px-6 py-3 bg-indigo-50/60 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400">核算总资产：</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">¥{totalAssets.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">核算总负债：</span>
            <span className="font-bold text-rose-500 text-sm">¥{totalLiabilities.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">核算净资产：</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">¥{netWorth.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                快照盘点日期
              </label>
              <input
                type="date"
                value={snapshotDate}
                onChange={(e) => setSnapshotDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                盘点备注说明
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="例如：发薪后盘点、季度资产梳理"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
              <span>核实各账户最新余额</span>
              <span className="text-xs font-normal text-slate-400">
                可直接修改，系统将自动同步账户当前余额
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {accounts.map(acc => (
                <div 
                  key={acc.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3 hover:border-indigo-300 transition"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                      <span>{acc.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {acc.type === 'credit' || acc.type === 'loan' ? '负债' : '资产'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      原记录余额: ¥{acc.balance.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs text-slate-400">{acc.currency}</span>
                    <input
                      type="number"
                      step="0.01"
                      value={balances[acc.id] !== undefined ? balances[acc.id] : acc.balance}
                      onChange={(e) => handleBalanceChange(acc.id, e.target.value)}
                      className="w-32 px-3 py-1.5 text-right font-mono font-bold text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95 text-center"
          >
            取消
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveSnapshot}
            className="flex-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 transition active:scale-95 whitespace-nowrap"
          >
            {saving ? '正在保存...' : '完成盘点并保存'}
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
