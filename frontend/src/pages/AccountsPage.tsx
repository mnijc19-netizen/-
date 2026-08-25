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
  huabei: { label: '🌸 蚂蚁花呗 (月付信贷)', icon: CreditCard, color: 'rose' },
  baitiao: { label: '🐕 京东白条 (消费信贷)', icon: CreditCard, color: 'rose' },
  meituan_pay: { label: '🦘 美团月付 (消费信贷)', icon: CreditCard, color: 'amber' },
  douyin_pay: { label: '🎵 抖音月付 (消费信贷)', icon: CreditCard, color: 'purple' },
  jiebei: { label: '💰 蚂蚁借呗 (短期借贷)', icon: Building, color: 'slate' },
  fenfu: { label: '💬 微信分付/微粒贷', icon: HandCoins, color: 'emerald' },
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
    <div className="space-y-6 pb-36 animate-in fade-in duration-300">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          {/* AI Batch Balance Multi-Image Onboarding */}
          <button
            type="button"
            onClick={() => setBatchOcrOpen(true)}
            className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-between text-left shadow-lg shadow-purple-500/20 active:scale-98 transition group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0">
                <Images className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">📸 AI 批量识余额开账</div>
                <div className="text-[10px] text-purple-100 truncate">多张截图一键建账</div>
              </div>
            </div>
            <Sparkles className="w-4 h-4 text-purple-200 group-hover:scale-110 transition flex-shrink-0" />
          </button>

          {/* Add Account Directly */}
          <button
            type="button"
            onClick={openAddModal}
            className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-between text-left shadow-lg shadow-emerald-500/20 active:scale-98 transition group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">➕ 手动新增资产/账户</div>
                <div className="text-[10px] text-emerald-100 truncate">添加银行卡/钱包/基金</div>
              </div>
            </div>
          </button>

          {/* Inter-account Transfer */}
          <button
            type="button"
            onClick={onOpenQuickTx}
            className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-between text-left border border-slate-200 dark:border-slate-700 active:scale-98 transition"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                <ArrowRightLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">🔄 账户间互转</div>
                <div className="text-[10px] text-slate-400 truncate">记录还款与提现调拨</div>
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
                      className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-400/50 transition flex flex-col justify-between gap-3.5"
                    >
                      {/* Top Row: Icon + Name + Balance Display */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                            isLiability 
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400' 
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
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

                      {/* Linked Holdings for Investment Accounts (華泰证券 / 基金持仓) */}
                      {acc.type === 'investment' && (() => {
                        const matchedHoldings = investments.filter(i => i.account_id === acc.id);
                        return (
                          <div className="p-2.5 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/80 flex items-center justify-between text-xs gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-[11px] text-purple-900 dark:text-purple-200 truncate flex items-center gap-1">
                                <TrendingUp className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                                <span>关联持仓: {matchedHoldings.length > 0 ? matchedHoldings.map(h => `${h.name}(¥${h.market_value.toFixed(2)})`).join('、') : '暂无单项标的'}</span>
                              </div>
                              <div className="text-[10px] text-purple-600/80 dark:text-purple-300/80 truncate mt-0.5">
                                市值实时与本账户余额联动对齐，拒绝冲突
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onNavigate?.('investments')}
                              className="px-2 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold shadow-sm transition active:scale-95 flex items-center gap-0.5 flex-shrink-0"
                            >
                              <span>管理持仓</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
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

      {/* Add / Edit Details Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingAccount ? '编辑账户详细信息' : '新增账户 / 资产'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">账户名称</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：招商银行储蓄卡、富途美股"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1">账户类别</label>
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
                  <label className="text-slate-500 block mb-1">计价币种</label>
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
                  <label className="text-slate-500 block mb-1">当前余额</label>
                  <input
                    type="number"
                    step="0.01"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">卡号后4位 (智能匹配用)</label>
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
                <label className="text-slate-500 block mb-1">开户机构 / 银行名称</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="例如：招商银行、华泰证券、OKX"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1">备注说明</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="例如：主要发薪与消费卡"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
