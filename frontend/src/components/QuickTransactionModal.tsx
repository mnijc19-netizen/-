import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  TrendingDown, 
  TrendingUp, 
  ArrowRightLeft, 
  CreditCard, 
  Sparkles, 
  Check, 
  Calendar, 
  Wallet, 
  Bot, 
  Tag, 
  AlertCircle,
  Plus,
  Camera,
  ClipboardCheck
} from 'lucide-react';
import { BottomSheet } from './common/BottomSheet';
import { api } from '../api/client';
import { Account, Category, TransactionType } from '../types';
import { getBeijingDateTimeString } from '../utils/dateUtils';
import { debouncedSuggestCategory, AiCategoryResult } from '../services/aiCategoryService';
import { haptic } from '../services/haptic';

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: Account[];
  categories: Category[];
  initialType?: TransactionType;
  onOpenImageOcr?: () => void;
  onClipboardIngest?: () => void;
}

// Visual category presets with emoji icons and styling
export const CATEGORY_META: Record<string, { icon: string; bg: string; text: string }> = {
  '餐饮美食': { icon: '🍱', bg: 'bg-orange-500/10 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400' },
  '日用百货': { icon: '🛒', bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400' },
  '交通出行': { icon: '🚕', bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400' },
  '购物消费': { icon: '🛍️', bg: 'bg-pink-500/10 dark:bg-pink-500/20', text: 'text-pink-600 dark:text-pink-400' },
  '数码科技': { icon: '💻', bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400' },
  '社交人情': { icon: '🎁', bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400' },
  '金融还款': { icon: '💳', bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400' },
  '休闲娱乐': { icon: '🎮', bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400' },
  '医疗健康': { icon: '💊', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400' },
  '住房物业': { icon: '🏠', bg: 'bg-cyan-500/10 dark:bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400' },
  '生活服务': { icon: '🛠️', bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400' },
  '文化教育': { icon: '🎓', bg: 'bg-teal-500/10 dark:bg-teal-500/20', text: 'text-teal-600 dark:text-teal-400' },
  '服饰装扮': { icon: '👗', bg: 'bg-pink-500/10 dark:bg-pink-500/20', text: 'text-pink-600 dark:text-pink-400' },
  '其他支出': { icon: '📦', bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400' },
  '工资薪金': { icon: '💰', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400' },
  '薪资收入': { icon: '💰', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400' },
  '投资理财': { icon: '📈', bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400' },
  '兼职副业': { icon: '💼', bg: 'bg-teal-500/10 dark:bg-teal-500/20', text: 'text-teal-600 dark:text-teal-400' },
  '兼职外快': { icon: '💼', bg: 'bg-teal-500/10 dark:bg-teal-500/20', text: 'text-teal-600 dark:text-teal-400' },
  '礼金红包': { icon: '🧧', bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400' },
  '其他收入': { icon: '💵', bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400' }
};

export function getCategoryMeta(categoryName: string): { icon: string; bg: string; text: string } {
  const name = (categoryName || '').trim();
  if (CATEGORY_META[name]) {
    return CATEGORY_META[name];
  }

  // Fuzzy semantic keywords resolver
  if (/餐|吃|饭|美|外卖|咖啡|茶|肯德基|麦当劳|粮|面/.test(name)) {
    return { icon: '🍱', bg: 'bg-orange-500/10 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400' };
  }
  if (/车|行|打车|滴滴|高铁|飞机|油|地铁|公|高德/.test(name)) {
    return { icon: '🚕', bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400' };
  }
  if (/百货|商超|超市|日用|杂|果|生鲜/.test(name)) {
    return { icon: '🛒', bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400' };
  }
  if (/购|淘宝|京东|拼多多|网购|天猫|买/.test(name)) {
    return { icon: '🛍️', bg: 'bg-pink-500/10 dark:bg-pink-500/20', text: 'text-pink-600 dark:text-pink-400' };
  }
  if (/数码|科技|手机|电脑|电子|ipad|硬件/.test(name)) {
    return { icon: '💻', bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400' };
  }
  if (/人情|社交|送礼|礼|客|友|请客/.test(name)) {
    return { icon: '🎁', bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400' };
  }
  if (/还款|金融|分期|白条|花呗|借|贷|还债|信用/.test(name)) {
    return { icon: '💳', bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400' };
  }
  if (/医|药|病|健康|门诊|院/.test(name)) {
    return { icon: '💊', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400' };
  }
  if (/房|住|水|电|燃气|租|物业|暖/.test(name)) {
    return { icon: '🏠', bg: 'bg-cyan-500/10 dark:bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400' };
  }
  if (/娱|玩|游戏|游|影|乐|视|vip/.test(name)) {
    return { icon: '🎮', bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400' };
  }
  if (/衣|服|装|鞋|包|美妆|饰/.test(name)) {
    return { icon: '👗', bg: 'bg-pink-500/10 dark:bg-pink-500/20', text: 'text-pink-600 dark:text-pink-400' };
  }
  if (/工|薪|资|收入/.test(name)) {
    return { icon: '💰', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400' };
  }
  if (/红|礼金/.test(name)) {
    return { icon: '🧧', bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400' };
  }
  if (/兼职|副业|外快|单/.test(name)) {
    return { icon: '💼', bg: 'bg-teal-500/10 dark:bg-teal-500/20', text: 'text-teal-600 dark:text-teal-400' };
  }
  if (/理财|投|股|基|债|利息/.test(name)) {
    return { icon: '📈', bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400' };
  }

  return { icon: '✨', bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400' };
}

export const QuickTransactionModal: React.FC<QuickTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories,
  initialType = 'expense',
  onOpenImageOcr,
  onClipboardIngest
}) => {
  const [transType, setTransType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(() => getBeijingDateTimeString().substring(0, 16).replace(' ', 'T'));
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // AI category suggestion
  const [aiSuggestion, setAiSuggestion] = useState<AiCategoryResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Sync initial type and accounts on open
  useEffect(() => {
    if (isOpen) {
      setTransType(initialType || 'expense');
      setErrorMsg('');
      if (accounts.length > 0) {
        if (!accountId || !accounts.find(a => a.id === accountId)) {
          setAccountId(accounts[0].id);
        }
        if (!toAccountId && accounts.length > 1) {
          setToAccountId(accounts[1].id);
        }
      }
      // Focus amount input smoothly
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 350);
    }
  }, [isOpen, initialType, accounts]);

  // Categories filtered by transaction type
  const isIncome = transType === 'income';
  const filteredCategories = categories.filter(c => c.type === (isIncome ? 'income' : 'expense'));

  // Default select first category if current not matching
  useEffect(() => {
    if (filteredCategories.length > 0) {
      const exists = filteredCategories.find(c => c.id === categoryId);
      if (!exists) {
        setCategoryId(filteredCategories[0].id);
      }
    }
  }, [transType, filteredCategories]);

  // Auto AI suggestion when merchant changes
  const handleMerchantChange = useCallback((value: string) => {
    setMerchant(value);
    if (value.trim().length < 2) {
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
        if (result && result.confidence > 0.35) {
          setAiSuggestion(result);
          // Auto-highlight if matching
          const match = filteredCategories.find(c => c.name === result.category);
          if (match) {
            setCategoryId(match.id);
            haptic.selection();
          }
        } else {
          setAiSuggestion(null);
        }
      },
      450
    );
  }, [transType, amount, filteredCategories]);

  // Fast quick-add preset amount chip
  const handleAddAmount = (addVal: number) => {
    haptic.selection();
    const curr = parseFloat(amount) || 0;
    const nextVal = (curr + addVal).toFixed(2).replace(/\.00$/, '');
    setAmount(nextVal);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg('请输入正确的交易金额');
      haptic.warning();
      return;
    }
    if (!accountId) {
      setErrorMsg('请选择账户');
      haptic.warning();
      return;
    }
    if ((transType === 'transfer' || transType === 'repayment') && !toAccountId) {
      setErrorMsg('转账/还款需选择转入目标账户');
      haptic.warning();
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const selectedCat = categories.find(c => c.id === categoryId);
      await api.createTransaction({
        type: transType,
        amount: numAmount,
        account_id: accountId,
        to_account_id: (transType === 'transfer' || transType === 'repayment') ? toAccountId : undefined,
        category_id: categoryId || undefined,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        merchant: merchant || (transType === 'transfer' ? '账户调拨' : selectedCat?.name || '日常消费'),
        note: note
      });

      haptic.success();
      // Reset form
      setAmount('');
      setMerchant('');
      setNote('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '记账失败，请重试');
      haptic.warning();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="记一笔"
      description="极速入账 · 自动复式记账"
      headerActions={
        <div className="flex items-center gap-1.5 mr-1">
          {onOpenImageOcr && (
            <button
              type="button"
              onClick={() => {
                haptic.selection();
                onClose();
                onOpenImageOcr();
              }}
              className="p-1.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition active:scale-90"
              title="拍照识图记账"
            >
              <Camera className="w-4 h-4" />
            </button>
          )}
          {onClipboardIngest && (
            <button
              type="button"
              onClick={() => {
                haptic.selection();
                onClose();
                onClipboardIngest();
              }}
              className="p-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition active:scale-90"
              title="读取剪贴板极速入账"
            >
              <ClipboardCheck className="w-4 h-4" />
            </button>
          )}
        </div>
      }
      maxHeightClass="max-h-[94dvh]"
      contentClassName="p-4 sm:p-5 space-y-4"
    >
      {/* 1. Top High-Contrast Type Capsule Switcher */}
      <div className="grid grid-cols-4 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/90 text-xs font-bold gap-1 shadow-inner">
        <button
          type="button"
          onClick={() => {
            haptic.selection();
            setTransType('expense');
          }}
          className={`py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95 ${
            transType === 'expense'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>支出</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptic.selection();
            setTransType('income');
          }}
          className={`py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95 ${
            transType === 'income'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>收入</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptic.selection();
            setTransType('transfer');
          }}
          className={`py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95 ${
            transType === 'transfer'
              ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>转账</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptic.selection();
            setTransType('repayment');
          }}
          className={`py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95 ${
            transType === 'repayment'
              ? 'bg-purple-500 text-white shadow-md shadow-purple-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>还款</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 2. Hero Large Tactile Amount Input */}
        <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
            <span>金额 (CNY)</span>
            {aiSuggestion && (
              <span className="text-violet-500 dark:text-violet-400 flex items-center gap-1 font-normal">
                <Sparkles className="w-3 h-3" />
                AI 智能识别中
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-400 select-none">¥</span>
            <input
              ref={amountInputRef}
              type="number"
              inputMode="decimal"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full text-3xl font-black font-mono tracking-tight bg-transparent text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-700"
            />
          </div>

          {/* Fast Quick-Add Preset Chips */}
          <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
            {[10, 20, 50, 100, 200, 500].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleAddAmount(val)}
                className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-mono font-bold text-xs active:scale-90 transition shrink-0 shadow-xs"
              >
                +{val}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Nine-Grid Visual Category Picker (For Expense & Income) */}
        {transType !== 'transfer' && transType !== 'repayment' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                {isIncome ? '收入分类' : '消费分类'}
              </span>
              <span className="text-[10px] text-slate-400 font-normal">点击大图直选</span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {filteredCategories.map((c) => {
                const isSelected = categoryId === c.id;
                const meta = getCategoryMeta(c.name);

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      setCategoryId(c.id);
                    }}
                    className={`p-2 rounded-2xl flex flex-col items-center justify-center gap-1 border transition active:scale-95 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 shadow-sm ring-1 ring-indigo-500'
                        : 'border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="text-xl select-none">{meta.icon}</span>
                    <span className={`text-[10px] font-bold truncate max-w-full ${
                      isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {c.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Account Channel Selector Pills */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-slate-400" />
            <span>{isIncome ? '收款账户' : '付款账户'}</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {accounts.map((a) => {
              const isSelected = accountId === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    haptic.selection();
                    setAccountId(a.id);
                  }}
                  className={`px-3.5 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 shrink-0 transition active:scale-95 ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 ring-1 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="truncate">{a.name}</span>
                  <span className="font-mono text-[10.5px] opacity-70">
                    ¥{a.balance.toFixed(2)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Transfer / Repayment Target Account */}
        {(transType === 'transfer' || transType === 'repayment') && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
              <span>转入 / 目标账户</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {accounts.filter(a => a.id !== accountId).map((a) => {
                const isSelected = toAccountId === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      setToAccountId(a.id);
                    }}
                    className={`px-3.5 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 shrink-0 transition active:scale-95 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="truncate">{a.name}</span>
                    <span className="font-mono text-[10.5px] opacity-70">
                      ¥{a.balance.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Merchant & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>商户 / 交易对象</span>
              {aiLoading && (
                <span className="text-[10px] text-violet-500 animate-pulse flex items-center gap-1">
                  <Bot className="w-3 h-3" /> AI 分类中
                </span>
              )}
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => handleMerchantChange(e.target.value)}
              placeholder="例如：瑞幸咖啡、全家、房东…"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>交易时间</span>
            </label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 6. Sticky Action Save Button */}
        <button
          type="submit"
          disabled={saving || !amount || parseFloat(amount) <= 0}
          className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-500/25 active:scale-98 transition disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          {saving ? (
            <span>正在入账...</span>
          ) : (
            <>
              <Check className="w-5 h-5" />
              <span>立即保存入账 (¥{parseFloat(amount || '0').toFixed(2)})</span>
            </>
          )}
        </button>
      </form>
    </BottomSheet>
  );
};
