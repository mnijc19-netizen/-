import React, { useState, useCallback, useRef } from 'react';
import { PlusCircle, ArrowRightLeft, TrendingDown, TrendingUp, X, Check, Tag, Calendar, Wallet, Sparkles, Bot, ChevronRight } from 'lucide-react';
import { api } from '../api/client';
import { Transaction, Account, Category, TransactionType } from '../types';
import { getBeijingDateTimeString } from '../utils/dateUtils';
import { debouncedSuggestCategory, AiCategoryResult } from '../services/aiCategoryService';

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: Account[];
  categories: Category[];
}

export const QuickTransactionModal: React.FC<QuickTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories
}) => {
  const [transType, setTransType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || 'acc-1');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || '');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(() => getBeijingDateTimeString());
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // AI category suggestion state
  const [aiSuggestion, setAiSuggestion] = useState<AiCategoryResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDismissed, setAiDismissed] = useState(false);

  const handleMerchantChange = useCallback((value: string) => {
    setMerchant(value);
    setAiDismissed(false);
    if (value.length < 2) {
      setAiSuggestion(null);
      return;
    }
    setAiLoading(true);
    debouncedSuggestCategory(
      value,
      transType === 'transfer' ? '转账' : undefined,
      parseFloat(amount) || undefined,
      (result) => {
        setAiLoading(false);
        if (result && result.confidence > 0.4) {
          setAiSuggestion(result);
        } else {
          setAiSuggestion(null);
        }
      },
      500
    );
  }, [transType, amount]);

  const applyAiSuggestion = useCallback(() => {
    if (!aiSuggestion) return;
    const matchCat = categories.find(c => c.name === aiSuggestion.category);
    if (matchCat) {
      setCategoryId(matchCat.id);
    }
    setAiDismissed(true);
  }, [aiSuggestion, categories]);

  // Auto-sync accountId when accounts load
  React.useEffect(() => {
    if (accounts.length > 0) {
      if (!accountId || !accounts.find(a => a.id === accountId)) {
        setAccountId(accounts[0].id);
      }
      if (!toAccountId && accounts.length > 1) {
        setToAccountId(accounts[1].id);
      }
    }
  }, [accounts, isOpen]);

  const filteredCategories = categories.filter(c => c.type === (transType === 'income' ? 'income' : 'expense'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg('请输入正确的交易金额');
      return;
    }
    if (!accountId) {
      setErrorMsg('请选择账户');
      return;
    }
    if ((transType === 'transfer' || transType === 'repayment') && !toAccountId) {
      setErrorMsg('转账/还款需选择目标账户');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const selectedCat = categories.find(c => c.id === categoryId);
      const tagsList = tagsInput ? tagsInput.split(/[,，\s]+/).filter(Boolean) : [];

      await api.createTransaction({
        type: transType,
        amount: numAmount,
        account_id: accountId,
        to_account_id: (transType === 'transfer' || transType === 'repayment') ? toAccountId : undefined,
        category_id: categoryId || undefined,
        category_name: selectedCat?.name || (transType === 'transfer' ? '账户转账' : '日常支出'),
        date: date,
        merchant: merchant || (transType === 'transfer' ? '内部调拨' : '快捷记账'),
        note: note,
        tags: tagsList,
        source: 'manual'
      });

      // Reset
      setAmount('');
      setMerchant('');
      setNote('');
      setTagsInput('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '记账失败');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[82vh] my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              快捷记账与调拨
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type selector tabs */}
        <div className="grid grid-cols-4 p-2 bg-slate-100/70 dark:bg-slate-800/70 m-4 mb-0 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setTransType('expense')}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
              transType === 'expense' 
                ? 'bg-rose-500 text-white shadow' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" /> 支出
          </button>
          <button
            type="button"
            onClick={() => setTransType('income')}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
              transType === 'income' 
                ? 'bg-emerald-500 text-white shadow' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> 收入
          </button>
          <button
            type="button"
            onClick={() => setTransType('transfer')}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
              transType === 'transfer' 
                ? 'bg-blue-500 text-white shadow' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" /> 转账
          </button>
          <button
            type="button"
            onClick={() => setTransType('repayment')}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
              transType === 'repayment' 
                ? 'bg-purple-500 text-white shadow' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            💳 还款
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Amount input */}
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">
              交易金额 (¥)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">¥</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 text-2xl font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Account Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" /> {transType === 'income' ? '收款账户' : '付款账户'}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {(transType === 'transfer' || transType === 'repayment') && (
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" /> 转入/目标账户
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.balance.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {transType !== 'transfer' && transType !== 'repayment' && (
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> 消费分类
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">-- 选择分类 --</option>
                  {filteredCategories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Date & Merchant */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> 交易时间
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                商户 / 交易对手
                {aiLoading && (
                  <span className="ml-auto text-[10px] text-violet-400 animate-pulse flex items-center gap-0.5">
                    <Bot className="w-3 h-3" /> AI识别中…
                  </span>
                )}
              </label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => handleMerchantChange(e.target.value)}
                placeholder="例如：赵一鸣零食、阿飞、瑞幸…"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />

              {/* AI 分类建议气泡 */}
              {aiSuggestion && !aiDismissed && transType !== 'transfer' && transType !== 'repayment' && (
                <div className="mt-1.5 flex items-center gap-1.5 p-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-800/50 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="w-5 h-5 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-violet-500 dark:text-violet-400 font-medium truncate">
                      AI 建议：<span className="font-bold">{aiSuggestion.category}</span>
                      {aiSuggestion.isPersonTransfer && ' 👤'}
                    </div>
                    <div className="text-[9px] text-violet-400/80 dark:text-violet-500/70 truncate">{aiSuggestion.reason}</div>
                  </div>
                  <button
                    type="button"
                    onClick={applyAiSuggestion}
                    className="flex-shrink-0 px-2 py-0.5 text-[10px] font-bold bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition active:scale-95"
                  >
                    采纳
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiDismissed(true)}
                    className="flex-shrink-0 text-violet-300 hover:text-violet-500 dark:text-violet-600 dark:hover:text-violet-400 transition p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notes & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                备注说明
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="添加备注信息..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                标签 (用空格分隔)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="例如：旅游 餐饮 聚餐"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Submit buttons */}
          <div className="pt-3 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95 text-center"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition active:scale-95 whitespace-nowrap"
            >
              {saving ? '保存中...' : '确认记录'}
              <Check className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
