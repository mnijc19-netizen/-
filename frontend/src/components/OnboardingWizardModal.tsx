import React, { useState } from 'react';
import { 
  Sparkles, 
  Check, 
  Plus, 
  ArrowRight, 
  Smartphone, 
  Camera, 
  Bot, 
  Wallet, 
  TrendingUp, 
  CreditCard,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Zap,
  DollarSign
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BottomSheet } from './common/BottomSheet';
import { BrandLogo } from './BrandLogo';
import { AccountType } from '../types';
import { api } from '../api/client';
import { haptic } from '../services/haptic';
import { localStore } from '../services/localStore';

interface PresetAccount {
  id: string;
  name: string;
  type: AccountType;
  defaultSelected: boolean;
  isLiability: boolean;
  suggestedBalance: number;
}

const PRESET_ACCOUNTS: PresetAccount[] = [
  {
    id: 'wechat',
    name: '微信零钱',
    type: 'wallet',
    defaultSelected: true,
    isLiability: false,
    suggestedBalance: 200
  },
  {
    id: 'alipay',
    name: '支付宝 (含余额宝)',
    type: 'wallet',
    defaultSelected: true,
    isLiability: false,
    suggestedBalance: 1500
  },
  {
    id: 'bank_cmb',
    name: '招商银行储蓄卡',
    type: 'bank',
    defaultSelected: true,
    isLiability: false,
    suggestedBalance: 5000
  },
  {
    id: 'bank_icbc',
    name: '工商银行储蓄卡',
    type: 'bank',
    defaultSelected: false,
    isLiability: false,
    suggestedBalance: 3000
  },
  {
    id: 'bank_ccb',
    name: '建设银行储蓄卡',
    type: 'bank',
    defaultSelected: false,
    isLiability: false,
    suggestedBalance: 3000
  },
  {
    id: 'jd_baitiao',
    name: '京东白条 (消费信贷)',
    type: 'baitiao',
    defaultSelected: true,
    isLiability: true,
    suggestedBalance: 600
  },
  {
    id: 'huabei',
    name: '蚂蚁花呗 (月付信贷)',
    type: 'huabei',
    defaultSelected: false,
    isLiability: true,
    suggestedBalance: 500
  },
  {
    id: 'fund',
    name: '基金与证券持仓',
    type: 'investment',
    defaultSelected: false,
    isLiability: false,
    suggestedBalance: 2000
  },
  {
    id: 'cash',
    name: '随身应急现金',
    type: 'cash',
    defaultSelected: false,
    isLiability: false,
    suggestedBalance: 200
  }
];

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenBatchBalanceOcr: () => void;
  onOpenAiChat: () => void;
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenBatchBalanceOcr,
  onOpenAiChat
}) => {
  const [activeTab, setActiveTab] = useState<'preset' | 'ocr' | 'ai'>('preset');
  
  // Selection and balances state for presets
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    PRESET_ACCOUNTS.forEach(p => {
      init[p.id] = p.defaultSelected;
    });
    return init;
  });

  const [balanceMap, setBalanceMap] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    PRESET_ACCOUNTS.forEach(p => {
      init[p.id] = p.suggestedBalance.toString();
    });
    return init;
  });

  const [submitting, setSubmitting] = useState(false);

  // Toggle selection of a preset
  const togglePreset = (id: string) => {
    haptic.selection();
    setSelectedMap(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Change balance of a preset
  const updateBalance = (id: string, val: string) => {
    setBalanceMap(prev => ({
      ...prev,
      [id]: val
    }));
  };

  // Calculate totals
  const selectedPresets = PRESET_ACCOUNTS.filter(p => selectedMap[p.id]);
  const totalAssets = selectedPresets
    .filter(p => !p.isLiability)
    .reduce((sum, p) => sum + (parseFloat(balanceMap[p.id]) || 0), 0);
  const totalLiabilities = selectedPresets
    .filter(p => p.isLiability)
    .reduce((sum, p) => sum + (parseFloat(balanceMap[p.id]) || 0), 0);
  const netWorth = totalAssets - totalLiabilities;

  // Submit batch preset account creation
  const handleConfirmPresets = async () => {
    if (selectedPresets.length === 0) {
      alert('请至少勾选一个账户进行开账');
      return;
    }

    setSubmitting(true);
    haptic.impact();

    try {
      for (const preset of selectedPresets) {
        const bal = parseFloat(balanceMap[preset.id]) || 0;
        await api.createAccount({
          name: preset.name,
          type: preset.type,
          currency: 'CNY',
          balance: bal,
          note: '开账初始化对齐'
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
      description="从 0 到 1 开启全域资产管理 · 推荐 10 秒预设点选"
      maxHeightClass="max-h-[94dvh]"
      contentClassName="p-3.5 sm:p-5 space-y-3.5"
    >
      {/* Three Modes Segmented Navigation */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold">
        <button
          type="button"
          onClick={() => { haptic.selection(); setActiveTab('preset'); }}
          className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
            activeTab === 'preset'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
          <span>⚡ 10秒预设</span>
        </button>

        <button
          type="button"
          onClick={() => { haptic.selection(); setActiveTab('ocr'); }}
          className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
            activeTab === 'ocr'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Camera className="w-3.5 h-3.5 flex-shrink-0 text-purple-500" />
          <span>📸 截屏识余额</span>
        </button>

        <button
          type="button"
          onClick={() => { haptic.selection(); setActiveTab('ai'); }}
          className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
            activeTab === 'ai'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Bot className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" />
          <span>💬 AI 一句开账</span>
        </button>
      </div>

      {/* TAB 1: 常用预设一键勾选开账 */}
      {activeTab === 'preset' && (
        <div className="space-y-3 animate-in fade-in">
          {/* Hero Banner */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-teal-500/10 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <div className="font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                <span>点选拥有的账户 · 填入当前大致金额</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                后续可随时在资产页精确微调对账，10秒生成第一份资产净值看板！
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex-shrink-0">
              已选 {selectedPresets.length} 项
            </span>
          </div>

          {/* Preset Cards List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[46dvh] overflow-y-auto pr-0.5 scrollbar-thin">
            {PRESET_ACCOUNTS.map(preset => {
              const isSelected = !!selectedMap[preset.id];
              return (
                <div
                  key={preset.id}
                  onClick={() => togglePreset(preset.id)}
                  className={`p-2.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                    isSelected
                      ? preset.isLiability
                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                        : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-50/60 dark:bg-slate-850 border-slate-200/80 dark:border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Checkbox */}
                    <div className={`w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 transition ${
                      isSelected
                        ? preset.isLiability ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                        : 'border border-slate-300 dark:border-slate-600'
                    }`}>
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>

                    {/* Brand Logo */}
                    <BrandLogo type={preset.type} name={preset.name} size="sm" />

                    {/* Account Name & Type */}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {preset.name}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {preset.isLiability ? '待还借贷负债 (扣减净资产)' : '可用资产 (计入净资产)'}
                      </div>
                    </div>
                  </div>

                  {/* Inline Balance Input */}
                  {isSelected && (
                    <div 
                      className="flex items-center gap-1 w-24 sm:w-28 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs font-mono font-bold text-slate-400">¥</span>
                      <input
                        type="number"
                        step="any"
                        value={balanceMap[preset.id] ?? ''}
                        onChange={(e) => updateBalance(preset.id, e.target.value)}
                        placeholder="0.00"
                        className={`w-full px-2 py-1 rounded-xl text-xs font-mono font-black text-right border ${
                          preset.isLiability
                            ? 'bg-rose-100/50 dark:bg-rose-900/40 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300'
                            : 'bg-emerald-100/50 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Real-time Summary Card & Submit CTA */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
              <div>
                <div className="text-[9px] text-slate-400 font-bold">预估总资产</div>
                <div className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 truncate">
                  ¥{totalAssets.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-bold">预估总负债</div>
                <div className="text-xs font-mono font-black text-rose-500 dark:text-rose-400 truncate">
                  ¥{totalLiabilities.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-bold">初始净资产</div>
                <div className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400 truncate">
                  ¥{netWorth.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={submitting || selectedPresets.length === 0}
              onClick={handleConfirmPresets}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-500/25 active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {submitting 
                  ? '⚡ 正在批量开立财务账户...' 
                  : `🚀 一键开启账本 (已选 ${selectedPresets.length} 个账户)`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: 截屏批量识别开账 */}
      {activeTab === 'ocr' && (
        <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-4 text-center animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-inner">
            <Camera className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              📸 AI 批量多图高并发识余额
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              在相册里准备好微信钱包、支付宝总资产、各银行 App 余额或白条账单截图，AI 支持同时并行解析，直接生成待确认开账清单！
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-[11px] text-purple-800 dark:text-purple-300 text-left space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-500" />
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
        <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-4 text-center animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <Bot className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              💬 斌斌 AI 自然语言一句话开账
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              不用填表也不用截图，直接给 AI 管家发一句话，AI 将自动归类所有资产与借贷，并在聊天框内生成确认卡片！
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 text-left font-mono space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-emerald-900 dark:text-emerald-200 font-sans">
              <span>💬 示范直接发送：</span>
            </div>
            <p className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800">
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
