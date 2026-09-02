import React, { useState } from 'react';
import { 
  Wallet, 
  Building2, 
  CreditCard, 
  TrendingUp, 
  Coins, 
  Building, 
  HandCoins, 
  Plus, 
  Edit3, 
  Trash2, 
  Sparkles,
  ArrowRightLeft,
  X,
  Check,
  Images,
  Zap
} from 'lucide-react';
import { Account, AccountType, Investment } from '../types';
import { api } from '../api/client';
import { AccountBalanceAdjustModal } from '../components/AccountBalanceAdjustModal';
import { BatchBalanceOcrModal } from '../components/BatchBalanceOcrModal';
import { OnboardingWizardModal } from '../components/OnboardingWizardModal';
import { BottomSheet } from '../components/common/BottomSheet';
import { BrandLogo } from '../components/BrandLogo';
import { haptic } from '../services/haptic';
import { CANONICAL_ACCOUNT_CATALOG } from '../data/accountCatalog';
import { ArrowRight } from 'lucide-react';

interface AccountsPageProps {
  accounts: Account[];
  investments?: Investment[];
  onRefresh: () => void;
  onOpenQuickTx: () => void;
  onNavigate?: (page: string) => void;
}

const ACCOUNT_TYPE_CONFIG: Record<AccountType, { label: string; icon: any; color: string }> = {
  cash: { label: '现金活期', icon: Wallet, color: 'emerald' },
  bank: { label: '银行储蓄卡', icon: Building2, color: 'blue' },
  wallet: { label: '第三方钱包 (微信/支付宝)', icon: CreditCard, color: 'teal' },
  investment: { label: '证券与基金持仓', icon: TrendingUp, color: 'amber' },
  crypto: { label: '加密资产', icon: Coins, color: 'yellow' },
  fixed: { label: '实体固定资产', icon: Building, color: 'purple' },
  receivable: { label: '债权与应收', icon: HandCoins, color: 'cyan' },
  credit: { label: '银行信用卡', icon: CreditCard, color: 'rose' },
  huabei: { label: '蚂蚁花呗 (月付信贷)', icon: CreditCard, color: 'rose' },
  baitiao: { label: '京东白条 (消费信贷)', icon: CreditCard, color: 'rose' },
  meituan_pay: { label: '美团月付 (消费信贷)', icon: CreditCard, color: 'amber' },
  douyin_pay: { label: '抖音月付 (消费信贷)', icon: CreditCard, color: 'purple' },
  jiebei: { label: '蚂蚁借呗 (短期借贷)', icon: Building, color: 'slate' },
  fenfu: { label: '微信分付/微粒贷', icon: HandCoins, color: 'emerald' },
  loan: { label: '房贷/车贷/大额按揭', icon: Building, color: 'slate' }
};

export const AccountsPage: React.FC<AccountsPageProps> = ({ 
  accounts, 
  investments = [], 
  onRefresh, 
  onOpenQuickTx,
  onNavigate 
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [batchOcrOpen, setBatchOcrOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [adjustingAccount, setAdjustingAccount] = useState<Account | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [currency, setCurrency] = useState('CNY');
  const [balance, setBalance] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [bankName, setBankName] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const openAddModal = () => {
    setEditingAccount(null);
    setName('');
    setType('bank');
    setCurrency('CNY');
    setBalance('0');
    setCardLast4('');
    setBankName('');
    setNote('');
    setModalOpen(true);
  };

  const openEditModal = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setCurrency(acc.currency);
    setBalance(acc.balance.toString());
    setCardLast4(acc.card_last4 || '');
    setBankName(acc.bank_name || '');
    setNote(acc.note || '');
    setModalOpen(true);
  };

  const openAdjustModal = (acc: Account) => {
    setAdjustingAccount(acc);
    setAdjustModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const numBal = parseFloat(balance) || 0;
      if (editingAccount) {
        await api.updateAccount(editingAccount.id, {
          name,
          type,
          currency,
          balance: numBal,
          card_last4: cardLast4 || undefined,
          bank_name: bankName || undefined,
          note: note || undefined
        });
      } else {
        await api.createAccount({
          name,
          type,
          currency,
          balance: numBal,
          initial_balance: numBal,
          card_last4: cardLast4 || undefined,
          bank_name: bankName || undefined,
          note: note || undefined
        });
      }
      setModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || '操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (accId: string) => {
    if (confirm('确定要停用此账户吗？')) {
      await api.deleteAccount(accId);
      onRefresh();
    }
  };

  // Group accounts by category
  const groups: { [key: string]: Account[] } = {
    '流动资产 (现金/银行卡/第三方钱包)': accounts.filter(a => ['cash', 'bank', 'wallet'].includes(a.type)),
    '投资理财 (证券/基金/加密资产)': accounts.filter(a => ['investment', 'crypto'].includes(a.type)),
    '月付与消费信贷 (花呗/白条/美团月付/抖音月付/信用卡)': accounts.filter(a => ['huabei', 'baitiao', 'meituan_pay', 'douyin_pay', 'fenfu', 'credit'].includes(a.type)),
    '大额借贷与固定资产 (借呗/房贷/车贷/房产)': accounts.filter(a => ['loan', 'jiebei', 'fixed', 'receivable'].includes(a.type))
  };

  return (
    <div className="space-y-4 pb-36 animate-in fade-in duration-300">
      {/* Header & Quick Action Hub */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-500" />
              全域资产与账户矩阵
            </h2>
            <p className="text-xs text-slate-400">
              涵盖微信/支付宝、银行储蓄卡、基金股票与各类负债，支持直接调额与批量识图
            </p>
          </div>
        </div>

        {/* Feature Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {/* AI Batch Balance Multi-Image Onboarding */}
          <button
            type="button"
            onClick={() => setBatchOcrOpen(true)}
            className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-between text-left shadow-lg shadow-purple-500/20 active:scale-98 transition group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0">
                <Images className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate">📸 批量识余额</div>
                <div className="text-[9px] text-purple-100 truncate">多图一键建账</div>
              </div>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-purple-200 group-hover:scale-110 transition flex-shrink-0" />
          </button>

          {/* Debt & Installments Hall */}
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('planner')}
            className="p-3 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white flex items-center justify-between text-left shadow-lg shadow-rose-500/20 active:scale-98 transition group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate">💳 分期还款大厅</div>
                <div className="text-[9px] text-rose-100 truncate">白条/花呗/月供</div>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-rose-200 group-hover:translate-x-0.5 transition flex-shrink-0" />
          </button>

          {/* Add Account Directly */}
          <button
            type="button"
            onClick={openAddModal}
            className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-between text-left shadow-lg shadow-emerald-500/20 active:scale-98 transition group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0">
                <Plus className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate">➕ 新增真实卡/账户</div>
                <div className="text-[9px] text-emerald-100 truncate">银行卡/基金/现金</div>
              </div>
            </div>
          </button>

          {/* Inter-account Transfer */}
          <button
            type="button"
            onClick={onOpenQuickTx}
            className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-between text-left border border-slate-200 dark:border-slate-700 active:scale-98 transition"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                <ArrowRightLeft className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate">🔄 账户间互转</div>
                <div className="text-[9px] text-slate-400 truncate">记录还款与提现调拨</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Account Groups */}
      <div className="space-y-6">
        {Object.entries(groups).map(([groupTitle, accList]) => {
          if (accList.length === 0) return null;
          const groupTotal = accList.reduce((sum, a) => {
            const isLiab = ['credit', 'loan', 'huabei', 'baitiao', 'meituan_pay', 'douyin_pay', 'jiebei', 'fenfu'].includes(a.type);
            return sum + (isLiab ? -Math.abs(a.balance) : a.balance);
          }, 0);

          return (
            <div key={groupTitle} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {groupTitle}
                </h3>
                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                  小计: ¥{groupTotal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {accList.map(acc => {
                  const cfg = ACCOUNT_TYPE_CONFIG[acc.type] || ACCOUNT_TYPE_CONFIG.bank;
                  const Icon = cfg.icon;
                  const isLiability = ['credit', 'loan', 'huabei', 'baitiao', 'meituan_pay', 'douyin_pay', 'jiebei', 'fenfu'].includes(acc.type);

                  return (
                    <div 
                      key={acc.id}
                      className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-emerald-400/50 transition flex flex-col justify-between gap-2.5"
                    >
                      {/* Top Row: Icon + Name + Balance Display */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <BrandLogo type={acc.type} name={acc.name} size="lg" />
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {acc.name}
                            </h4>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                                {cfg.label}
                              </span>
                              {acc.card_last4 && <span>尾号*{acc.card_last4}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="text-[10px] text-slate-400">
                            {isLiability ? '当前应还' : '当前余额'}
                          </div>
                          <div className={`text-base sm:text-lg font-black font-mono tracking-tight ${
                            isLiability ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                          }`}>
                            ¥{acc.balance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>

                      {/* Note if available */}
                      {acc.note && (
                        <div className="text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-2.5 py-1 rounded-xl truncate">
                          {acc.note}
                        </div>
                      )}

                      {/* Linked Holdings for Investment Accounts (华泰证券 / 基金持仓) */}
                      {acc.type === 'investment' && (() => {
                        const matchedHoldings = investments.filter(i => i.account_id === acc.id);
                        const uninvestedCash = typeof acc.cash_balance === 'number' ? acc.cash_balance : 0;
                        const holdingsMarketVal = matchedHoldings.reduce((s, h) => s + h.market_value, 0);
                        return (
                          <div className="p-2.5 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/80 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-[11px] text-purple-900 dark:text-purple-200 truncate flex items-center gap-1">
                                <TrendingUp className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                                <span>关联持仓: {matchedHoldings.length > 0 ? matchedHoldings.map(h => `${h.name}(¥${h.market_value.toFixed(2)})`).join('、') : '暂无单项标的'}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => onNavigate?.('investments')}
                                className="px-2 py-0.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold shadow-sm transition active:scale-95 flex items-center gap-0.5 flex-shrink-0"
                              >
                                <span>管理持仓</span>
                                <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            </div>
                            {uninvestedCash > 0 && (
                              <div className="text-[10px] text-purple-700 dark:text-purple-300 flex items-center justify-between font-mono bg-purple-100/60 dark:bg-purple-900/40 px-2 py-0.5 rounded-md">
                                <span>💰 可用现金 (未投): ¥{uninvestedCash.toFixed(2)}</span>
                                <span>📈 持仓市值: ¥{holdingsMarketVal.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Bottom Action Bar (Permanent on Mobile & Desktop) */}
                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                        {/* 1-Tap Quick Balance Reconcile Button */}
                        <button
                          type="button"
                          onClick={() => openAdjustModal(acc)}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 border border-emerald-200/60 dark:border-emerald-800/60"
                        >
                          <Zap className="w-3.5 h-3.5 text-emerald-500" />
                          <span>快速调额/对账</span>
                        </button>

                        {/* Edit Details */}
                        <button
                          type="button"
                          onClick={() => openEditModal(acc)}
                          className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95"
                          title="修改账户信息"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          <span>编辑</span>
                        </button>

                        {/* Delete Account */}
                        <button
                          type="button"
                          onClick={() => handleDelete(acc.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition active:scale-95"
                          title="停用账户"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Zero-Account Empty State Hero Canvas */}
      {accounts.length === 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-white/90 to-slate-50/90 dark:from-slate-900/90 dark:to-slate-850/90 border-2 border-dashed border-emerald-300 dark:border-emerald-800 text-center space-y-5 animate-in fade-in shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/25">
            <Wallet className="w-8 h-8" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>开启您的全域资产管理第一步</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              开账是构建个人财务大盘的基石。录入您的微信、支付宝、银行储蓄卡与白条负债，即可实时掌控真实净资产与资金流向。
            </p>
          </div>

          {/* Two Primary Fast Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left">
            <button
              type="button"
              onClick={() => { haptic.selection(); setWizardOpen(true); }}
              className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 active:scale-98 transition group space-y-2 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Zap className="w-5 h-5 text-amber-300" />
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 shadow-xs">
                  最推荐 · 10秒
                </span>
              </div>
              <div>
                <div className="text-sm font-black">⚡ 常用预设一键开账</div>
                <div className="text-[11px] text-indigo-100 mt-0.5 leading-relaxed">
                  勾选微信、支付宝、招行/工行卡与白条，填入数字一键秒级建账
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => { haptic.selection(); setBatchOcrOpen(true); }}
              className="p-4 rounded-2xl bg-gradient-to-br from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 text-white shadow-lg shadow-purple-500/25 active:scale-98 transition group space-y-2 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Images className="w-5 h-5 text-purple-200" />
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/20 text-white">
                  AI 多图高并发
                </span>
              </div>
              <div>
                <div className="text-sm font-black">📸 批量截图识别开账</div>
                <div className="text-[11px] text-teal-100 mt-0.5 leading-relaxed">
                  直接上传微信钱包、支付宝总资产或各银行余额截图自动识别
                </div>
              </div>
            </button>
          </div>

          {/* Alternative Text Link */}
          <div className="pt-2">
            <button
              type="button"
              onClick={openAddModal}
              className="text-xs text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 underline font-medium transition"
            >
              或点击此处手动单个新增自定义账户
            </button>
          </div>
        </div>
      )}

      {/* Direct Balance Adjust Modal */}
      <AccountBalanceAdjustModal
        isOpen={adjustModalOpen}
        account={adjustingAccount}
        onClose={() => {
          setAdjustModalOpen(false);
          setAdjustingAccount(null);
        }}
        onSuccess={onRefresh}
      />

      {/* AI Batch Balance Multi-Image Onboarding Modal */}
      <BatchBalanceOcrModal
        isOpen={batchOcrOpen}
        onClose={() => setBatchOcrOpen(false)}
        onSuccess={onRefresh}
        existingAccounts={accounts}
      />

      {/* Interactive Onboarding Wizard Modal */}
      <OnboardingWizardModal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={onRefresh}
        onOpenBatchBalanceOcr={() => setBatchOcrOpen(true)}
        onOpenAiChat={() => onNavigate?.('dashboard')}
      />

      {/* Add / Edit Details BottomSheet */}
      <BottomSheet
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAccount ? '✏️ 编辑账户详细信息' : '➕ 新增真实卡/资产账户'}
        description="规范录入资产或负债类别，支持自定义银行名称与卡号"
        maxHeightClass="max-h-[92dvh]"
        contentClassName="p-4 sm:p-5 space-y-4"
      >
        <form onSubmit={handleSave} className="space-y-3.5 text-xs">
          {/* Quick Brand Preset Chips from Unified Canonical Catalog */}
          {!editingAccount && (
            <div>
              <label className="text-slate-500 dark:text-slate-400 block mb-1.5 font-bold">✨ 点击快速选择品牌与机构 ({CANONICAL_ACCOUNT_CATALOG.length})</label>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                {CANONICAL_ACCOUNT_CATALOG.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      setName(p.name);
                      setType(p.type as AccountType);
                      setBankName(p.bankName || '');
                    }}
                    className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/40 active:scale-95 transition text-[11px] font-bold text-slate-700 dark:text-slate-200"
                  >
                    <BrandLogo type={p.type} name={p.name} size="sm" />
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-slate-500 block mb-1 font-bold">账户名称</label>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                <BrandLogo type={type} name={name || bankName} size="md" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：招商银行储蓄卡、富途美股"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-500 block mb-1 font-bold">账户类别</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {Object.entries(ACCOUNT_TYPE_CONFIG).map(([t, cfg]) => (
                  <option key={t} value={t}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-500 block mb-1 font-bold">计价币种</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="CNY">CNY 人民币 (¥)</option>
                <option value="USD">USD 美元 ($)</option>
                <option value="HKD">HKD 港币 (HK$)</option>
                <option value="EUR">EUR 欧元 (€)</option>
                <option value="USDT">USDT 泰达币 (₮)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-500 block mb-1 font-bold">
                {['credit', 'loan', 'huabei', 'baitiao', 'meituan_pay', 'douyin_pay', 'jiebei', 'fenfu'].includes(type)
                  ? '待还负债金额 (¥)'
                  : '当前资产余额 (¥)'}
              </label>
              <input
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-1 font-bold">卡号后4位 (智能匹配用)</label>
              <input
                type="text"
                maxLength={4}
                value={cardLast4}
                onChange={(e) => setCardLast4(e.target.value)}
                placeholder="如: 9527"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-500 block mb-1 font-bold">开户机构 / 银行名称</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="例如：招商银行、华泰证券、OKX"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="text-slate-500 block mb-1 font-bold">备注说明</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：主要发薪与消费卡"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition"
            >
              {saving ? '保存中...' : '保存账户'}
            </button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
};
