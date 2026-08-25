import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  X, 
  Check, 
  Plus, 
  Minus, 
  TrendingUp, 
  TrendingDown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Account } from '../types';
import { api } from '../api/client';
import { getBeijingDateTimeString } from '../utils/dateUtils';
import { BrandLogo } from './BrandLogo';

interface AccountBalanceAdjustModalProps {
  isOpen: boolean;
  account: Account | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AccountBalanceAdjustModal: React.FC<AccountBalanceAdjustModalProps> = ({
  isOpen,
  account,
  onClose,
  onSuccess
}) => {
  const [mode, setMode] = useState<'set_total' | 'delta'>('set_total');
  const [newTotalStr, setNewTotalStr] = useState('');
  const [deltaStr, setDeltaStr] = useState('');
  const [deltaType, setDeltaType] = useState<'add' | 'sub'>('add');
  const [createTxRecord, setCreateTxRecord] = useState(true);
  const [note, setNote] = useState('资产余额日常校准/对账');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (account) {
      setNewTotalStr(account.balance.toString());
      setDeltaStr('');
      setDeltaType('add');
      setNote(`账户【${account.name}】余额校准`);
    }
  }, [account, isOpen]);

  if (!isOpen || !account) return null;

  const currentBalance = account.balance;
  const isLiability = ['credit', 'loan', 'huabei', 'baitiao', 'meituan_pay', 'douyin_pay', 'jiebei', 'fenfu'].includes(account.type);
  
  // Calculate resulting balance and diff
  let targetBalance = currentBalance;
  let diff = 0;

  if (mode === 'set_total') {
    const val = parseFloat(newTotalStr);
    targetBalance = isNaN(val) ? currentBalance : val;
    diff = targetBalance - currentBalance;
  } else {
    const dVal = parseFloat(deltaStr) || 0;
    diff = deltaType === 'add' ? dVal : -dVal;
    targetBalance = currentBalance + diff;
  }

  const handleApplyPresetDelta = (amount: number) => {
    setMode('delta');
    setDeltaStr(amount.toString());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      // 1. Update account balance
      await api.updateAccount(account.id, {
        ...account,
        balance: targetBalance
      });

      // 2. Optionally create a balance adjustment transaction for bookkeeping traceability
      if (createTxRecord && Math.abs(diff) > 0.001) {
        await api.createTransaction({
          type: isLiability ? 'repayment' : (diff > 0 ? 'income' : 'expense'),
          amount: Math.abs(diff),
          account_id: account.id,
          category_name: '余额校准',
          date: getBeijingDateTimeString(),
          merchant: `${account.name}余额校准`,
          note: `${note} (原¥${currentBalance.toFixed(2)} -> 现¥${targetBalance.toFixed(2)})`,
          source: 'balance_adjust'
        });
      }

      confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || '更新余额失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <BrandLogo type={account.type} name={account.name} size="lg" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{account.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {account.currency}
                </span>
              </h3>
              <div className="text-[11px] text-slate-400">
                {isLiability ? '当前账面待还: ' : '当前账面余额: '}
                <span className={`font-mono font-bold ${isLiability ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}>
                  ¥{currentBalance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto">
          {/* Mode Switcher: Direct Set vs Quick +/- */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode('set_total')}
              className={`py-2 rounded-xl transition ${
                mode === 'set_total'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              直接设置最新总额
            </button>
            <button
              type="button"
              onClick={() => setMode('delta')}
              className={`py-2 rounded-xl transition ${
                mode === 'delta'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              增减变动差额 (±)
            </button>
          </div>

          {mode === 'set_total' ? (
            /* Mode 1: Set Total Direct Balance */
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {isLiability ? '输入此账户最新实际待还金额 (CNY)' : '输入此账户最新实际余额 (CNY)'}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">
                  ¥
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newTotalStr}
                  onChange={(e) => setNewTotalStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  autoFocus
                />
              </div>
            </div>
          ) : (
            /* Mode 2: Quick Delta +/- */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeltaType('add')}
                  className={`flex-1 py-2.5 rounded-2xl border flex items-center justify-center gap-1.5 text-xs font-bold transition ${
                    deltaType === 'add'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  <Plus className="w-4 h-4" /> 增加余额
                </button>
                <button
                  type="button"
                  onClick={() => setDeltaType('sub')}
                  className={`flex-1 py-2.5 rounded-2xl border flex items-center justify-center gap-1.5 text-xs font-bold transition ${
                    deltaType === 'sub'
                      ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-600 dark:text-rose-400 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  <Minus className="w-4 h-4" /> 减少余额
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">
                  {deltaType === 'add' ? '+' : '-'}¥
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={deltaStr}
                  onChange={(e) => setDeltaStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Quick preset chips */}
              <div className="flex flex-wrap gap-1.5">
                {[100, 200, 500, 1000, 2000, 5000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleApplyPresetDelta(amt)}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 text-xs font-mono font-semibold transition active:scale-95"
                  >
                    {deltaType === 'add' ? '+' : '-'}{amt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Realtime Difference Feedback Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <div className="text-slate-400 text-[11px]">调整后最新总余额</div>
              <div className="font-mono font-black text-base text-slate-900 dark:text-white">
                ¥{targetBalance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="text-right space-y-0.5">
              <div className="text-slate-400 text-[11px]">变动差额</div>
              <div className={`font-mono font-bold text-sm flex items-center justify-end gap-0.5 ${
                diff > 0 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : diff < 0 
                    ? 'text-rose-600 dark:text-rose-400' 
                    : 'text-slate-400'
              }`}>
                {diff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : diff < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : null}
                {diff > 0 ? '+' : ''}¥{diff.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Traceability Option */}
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={createTxRecord}
                onChange={(e) => setCreateTxRecord(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span>自动生成一条「余额校准/平账」流水记录（推荐）</span>
            </label>

            {createTxRecord && (
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="添加校准说明/备注..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-500 active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {saving ? '正在同步保存...' : '立即确认并更新余额'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
