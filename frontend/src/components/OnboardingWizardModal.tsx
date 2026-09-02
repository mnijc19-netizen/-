import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Check, 
  Plus, 
  ArrowRight, 
  Camera, 
  Bot, 
  ShieldCheck, 
  Zap,
  Filter,
  X,
  Wallet,
  Building2,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BottomSheet } from './common/BottomSheet';
import { BrandLogo } from './BrandLogo';
import { AccountType } from '../types';
import { api } from '../api/client';
import { haptic } from '../services/haptic';
import { localStore } from '../services/localStore';
import { CANONICAL_ACCOUNT_CATALOG, CanonicalAccountItem } from '../data/accountCatalog';

interface CustomItem {
  id: string;
  name: string;
  type: AccountType;
  isLiability: boolean;
  balance: string;
}

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenBatchBalanceOcr: () => void;
  onOpenAiChat: () => void;
}

type CatalogCategory = 'popular' | 'wallet_bnpl' | 'bank' | 'investment' | 'all';

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenBatchBalanceOcr,
  onOpenAiChat
}) => {
  const [activeTab, setActiveTab] = useState<'preset' | 'ocr' | 'ai'>('preset');
  const [selectedCategory, setSelectedCategory] = useState<CatalogCategory>('popular');
  
  // Selection and balances state for catalog accounts
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    CANONICAL_ACCOUNT_CATALOG.forEach(p => {
      if (p.defaultSelected) init[p.id] = true;
    });
    return init;
  });

  const [balanceMap, setBalanceMap] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    CANONICAL_ACCOUNT_CATALOG.forEach(p => {
      init[p.id] = (p.suggestedBalance ?? 1000).toString();
    });
    return init;
  });

  // Custom User-Added Accounts during Onboarding
  const [customAccounts, setCustomAccounts] = useState<CustomItem[]>([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState<AccountType>('bank');
  const [customBalance, setCustomBalance] = useState('1000');

  const [submitting, setSubmitting] = useState(false);

  // Toggle selection
  const toggleSelect = (id: string) => {
    haptic.selection();
    setSelectedMap(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Update balance
  const updateBalance = (id: string, val: string) => {
    setBalanceMap(prev => ({
      ...prev,
      [id]: val
    }));
  };

  // Filtered items based on active category
  const displayedCatalog = useMemo(() => {
    if (selectedCategory === 'all') return CANONICAL_ACCOUNT_CATALOG;
    return CANONICAL_ACCOUNT_CATALOG.filter(item => item.category === selectedCategory);
  }, [selectedCategory]);

  // Handle Add Custom Account
  const handleAddCustomAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    haptic.selection();
    const liabilityTypes = ['credit', 'loan', 'huabei', 'baitiao', 'meituan_pay', 'douyin_pay', 'jiebei', 'fenfu'];
    const isLiab = liabilityTypes.includes(customType);

    const newItem: CustomItem = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      type: customType,
      isLiability: isLiab,
      balance: customBalance || '0'
    };

    setCustomAccounts(prev => [...prev, newItem]);
    setCustomName('');
    setShowAddCustom(false);
  };

  const removeCustomAccount = (id: string) => {
    haptic.selection();
    setCustomAccounts(prev => prev.filter(c => c.id !== id));
  };

  // Calculate totals
  const selectedCatalog = CANONICAL_ACCOUNT_CATALOG.filter(p => selectedMap[p.id]);
  
  const catalogAssets = selectedCatalog
    .filter(p => !p.isLiability)
    .reduce((sum, p) => sum + (parseFloat(balanceMap[p.id]) || 0), 0);
  const catalogLiabilities = selectedCatalog
    .filter(p => p.isLiability)
    .reduce((sum, p) => sum + (parseFloat(balanceMap[p.id]) || 0), 0);

  const customAssets = customAccounts
    .filter(c => !c.isLiability)
    .reduce((sum, c) => sum + (parseFloat(c.balance) || 0), 0);
  const customLiabilities = customAccounts
    .filter(c => c.isLiability)
    .reduce((sum, c) => sum + (parseFloat(c.balance) || 0), 0);

  const totalAssets = catalogAssets + customAssets;
  const totalLiabilities = catalogLiabilities + customLiabilities;
  const netWorth = totalAssets - totalLiabilities;
  const totalSelectedCount = selectedCatalog.length + customAccounts.length;

  // Submit batch account creation
  const handleConfirmPresets = async () => {
    if (totalSelectedCount === 0) {
      alert('请至少选择一个账户开启您的账本');
      return;
    }

    setSubmitting(true);
    haptic.impact();

    try {
      // 1. Create selected catalog accounts
      for (const item of selectedCatalog) {
        const bal = parseFloat(balanceMap[item.id]) || 0;
        await api.createAccount({
          name: item.name,
          type: item.type,
          bank_name: item.bankName,
          currency: 'CNY',
          balance: bal,
          note: '开账初始化对齐'
        });
      }

      // 2. Create custom accounts
      for (const item of customAccounts) {
        const bal = parseFloat(item.balance) || 0;
        await api.createAccount({
          name: item.name,
          type: item.type,
          currency: 'CNY',
          balance: bal,
          note: '开账自定义账户'
        });
      }

      localStore.saveOnboardingCompleted(true);
      haptic.success();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      onSuccess();
      onClose();
    } catch (err: any) {
      haptic.warning();
      alert(`开账失败: ${err.message || '请稍后再试'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="✨ 斌斌钱包 · 新手极速开账大厅"
      description="从 0 到 1 开启全域资产管理 · 推荐点选预设"
      maxHeightClass="max-h-[94dvh]"
      contentClassName="p-3.5 sm:p-5 space-y-3.5"
    >
      {/* 1. Mode Switcher (Clean Single Icons, No Duplicate Emojis) */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold">
        <button
          type="button"
          onClick={() => { haptic.selection(); setActiveTab('preset'); }}
          className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
            activeTab === 'preset'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <span>10秒预设</span>
        </button>

        <button
          type="button"
          onClick={() => { haptic.selection(); setActiveTab('ocr'); }}
          className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
            activeTab === 'ocr'
              ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Camera className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
          <span>截屏识余额</span>
        </button>

        <button
          type="button"
          onClick={() => { haptic.selection(); setActiveTab('ai'); }}
          className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
            activeTab === 'ai'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          <span>AI 一句开账</span>
        </button>
      </div>

      {/* TAB 1: 常用预设与全量账户点选开账 */}
      {activeTab === 'preset' && (
        <div className="space-y-3 animate-in fade-in">
          {/* Category Filter Pills & Add Custom Account Button */}
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px] font-bold">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {[
                { key: 'popular', label: '🌟 常用推荐' },
                { key: 'wallet_bnpl', label: '📱 钱包信贷' },
                { key: 'bank', label: '🏛️ 各大银行' },
                { key: 'investment', label: '📈 投资证券' },
                { key: 'all', label: `全部 (${CANONICAL_ACCOUNT_CATALOG.length})` }
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    haptic.selection();
                    setSelectedCategory(tab.key as CatalogCategory);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl transition flex-shrink-0 ${
                    selectedCategory === tab.key
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                haptic.selection();
                setShowAddCustom(true);
              }}
              className="flex-shrink-0 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 text-[11px] font-bold shadow-xs active:scale-95 transition ml-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>自定义账户</span>
            </button>
          </div>

          {/* Inline Add Custom Account Form if Open */}
          {showAddCustom && (
            <form 
              onSubmit={handleAddCustomAccount} 
              className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/95 border border-emerald-300 dark:border-emerald-700/80 space-y-2 animate-in slide-in-from-top-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-emerald-500" />
                  <span>添加非预设自定义账户</span>
                </span>
                <button 
                  type="button" 
                  onClick={() => setShowAddCustom(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="账户名称(如:老婆建行卡)"
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white col-span-1 sm:col-span-1"
                />

                <select
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value as AccountType)}
                  className="px-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="bank">银行储蓄卡</option>
                  <option value="wallet">第三方钱包</option>
                  <option value="credit">信用卡(负债)</option>
                  <option value="baitiao">消费信贷(负债)</option>
                  <option value="investment">证券与基金</option>
                  <option value="cash">随身现金</option>
                </select>

                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="any"
                    value={customBalance}
                    onChange={(e) => setCustomBalance(e.target.value)}
                    placeholder="余额"
                    className="w-full px-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-right"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs active:scale-95 transition"
                  >
                    确定
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Cards List with High Contrast & Crystal Visibility */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[46dvh] overflow-y-auto pr-0.5 scrollbar-thin">
            {/* 1. Custom Added Accounts */}
            {customAccounts.map(c => (
              <div
                key={c.id}
                className={`p-2.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-2.5 ${
                  c.isLiability
                    ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700/80 shadow-xs'
                    : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/80 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <BrandLogo type={c.type} name={c.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                      {c.name}
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-300">
                      {c.isLiability ? '待还借贷负债' : '可用资产 (自定义)'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs font-mono font-black text-slate-700 dark:text-slate-200">
                    ¥{c.balance}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCustomAccount(c.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* 2. Canonical Catalog Accounts */}
            {displayedCatalog.map(preset => {
              const isSelected = !!selectedMap[preset.id];
              return (
                <div
                  key={preset.id}
                  onClick={() => toggleSelect(preset.id)}
                  className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer select-none ${
                    isSelected
                      ? preset.isLiability
                        ? 'bg-rose-50/80 dark:bg-rose-950/50 border-2 border-rose-400 dark:border-rose-600 shadow-sm'
                        : 'bg-emerald-50/80 dark:bg-emerald-950/50 border-2 border-emerald-400 dark:border-emerald-600 shadow-sm'
                      : 'bg-white dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700/90 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Checkbox with High Contrast Check */}
                    <div className={`w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 transition ${
                      isSelected
                        ? preset.isLiability ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                        : 'border-2 border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-700'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    {/* Official Brand Logo */}
                    <BrandLogo type={preset.type} name={preset.name} size="sm" />

                    {/* Account Name & Type (Guaranteed High Contrast) */}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-300 font-medium truncate">
                        {preset.isLiability ? '待还借贷负债 (扣减净资产)' : preset.description || '可用资产 (计入净资产)'}
                      </div>
                    </div>
                  </div>

                  {/* Inline Balance Input (High Contrast, Razor Sharp) */}
                  {isSelected && (
                    <div 
                      className="flex items-center gap-1 w-24 sm:w-28 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-300">¥</span>
                      <input
                        type="number"
                        step="any"
                        value={balanceMap[preset.id] ?? ''}
                        onChange={(e) => updateBalance(preset.id, e.target.value)}
                        placeholder="0.00"
                        className={`w-full px-2 py-1 rounded-xl text-xs font-mono font-black text-right border ${
                          preset.isLiability
                            ? 'bg-rose-100/70 dark:bg-rose-900/60 border-rose-400 dark:border-rose-600 text-rose-800 dark:text-rose-100'
                            : 'bg-emerald-100/70 dark:bg-emerald-900/60 border-emerald-400 dark:border-emerald-600 text-emerald-800 dark:text-emerald-100'
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Real-time Summary Card & Submit CTA */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-center">
              <div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">预估总资产</div>
                <div className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 truncate">
                  ¥{totalAssets.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">预估总负债</div>
                <div className="text-xs font-mono font-black text-rose-500 dark:text-rose-400 truncate">
                  ¥{totalLiabilities.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">初始净资产</div>
                <div className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400 truncate">
                  ¥{netWorth.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={submitting || totalSelectedCount === 0}
              onClick={handleConfirmPresets}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-500/25 active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {submitting 
                  ? '⚡ 正在批量开立财务账户...' 
                  : `🚀 一键开启账本 (已选 ${totalSelectedCount} 个账户)`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: 截屏批量识别开账 */}
      {activeTab === 'ocr' && (
        <div className="p-4 rounded-3xl bg-slate-100/80 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 space-y-4 text-center animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-inner">
            <Camera className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              AI 批量多图高并发识余额
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
              在相册里准备好微信钱包、支付宝总资产、各银行 App 余额或白条账单截图，AI 支持同时并行解析，直接生成待确认开账清单！
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 text-[11px] text-purple-900 dark:text-purple-200 text-left space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
              <ShieldCheck className="w-4 h-4" />
              <span>💡 截哪张图开账最准？</span>
            </div>
            <p>• <b>微信</b>：打开「我」→「服务」→「钱包」页面截屏</p>
            <p>• <b>支付宝</b>：打开「我的」页面或「总资产」页面截屏</p>
            <p>• <b>银行卡</b>：各银行 App 首页「我的账户总览」截屏</p>
          </div>

          <button
            type="button"
            onClick={() => {
              haptic.selection();
              onClose();
              onOpenBatchBalanceOcr();
            }}
            className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-md shadow-purple-500/25 active:scale-98 transition flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4" />
            <span>打开批量截屏识余额窗口</span>
          </button>
        </div>
      )}

      {/* TAB 3: AI 对话一句话开账 */}
      {activeTab === 'ai' && (
        <div className="p-4 rounded-3xl bg-slate-100/80 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 space-y-4 text-center animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <Bot className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              斌斌 AI 自然语言一句话开账
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
              不用填表也不用截图，直接给 AI 管家发一句话，AI 将自动归类所有资产与借贷，并在聊天框内生成确认卡片！
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-[11px] text-emerald-900 dark:text-emerald-200 text-left space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
              <span>💬 示范直接发送：</span>
            </div>
            <p className="p-2 rounded-xl bg-white dark:bg-slate-900/90 border border-emerald-200 dark:border-emerald-700/80 text-slate-800 dark:text-slate-200 font-mono">
              “帮我开账：我有微信零钱450元，支付宝余额宝3200元，招商银行卡15000元，京东白条欠839元，华泰证券持仓1960元”
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              haptic.selection();
              onClose();
              onOpenAiChat();
            }}
            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-500/25 active:scale-98 transition flex items-center justify-center gap-2"
          >
            <Bot className="w-4 h-4" />
            <span>立即唤起 AI 管家对话开账</span>
          </button>
        </div>
      )}
    </BottomSheet>
  );
};
