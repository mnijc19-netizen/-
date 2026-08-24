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
  Check
} from 'lucide-react';
import { Account, AccountType } from '../types';
import { api } from '../api/client';

interface AccountsPageProps {
  accounts: Account[];
  onRefresh: () => void;
  onOpenQuickTx: () => void;
}

const ACCOUNT_TYPE_CONFIG: Record<AccountType, { label: string; icon: any; color: string }> = {
  cash: { label: '现金活期', icon: Wallet, color: 'emerald' },
  bank: { label: '银行储蓄卡', icon: Building2, color: 'blue' },
  wallet: { label: '第三方钱包', icon: CreditCard, color: 'teal' },
  investment: { label: '证券与基金', icon: TrendingUp, color: 'amber' },
  crypto: { label: '加密资产', icon: Coins, color: 'yellow' },
  fixed: { label: '实体固定资产', icon: Building, color: 'purple' },
  receivable: { label: '债权与应收', icon: HandCoins, color: 'cyan' },
  credit: { label: '信用卡负债', icon: CreditCard, color: 'rose' },
  loan: { label: '贷款与按揭', icon: Building, color: 'slate' }
};

export const AccountsPage: React.FC<AccountsPageProps> = ({ accounts, onRefresh, onOpenQuickTx }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
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
    '固定资产与债权 (房产/车辆/借出款项)': accounts.filter(a => ['fixed', 'receivable'].includes(a.type)),
    '负债与信贷 (信用卡/房贷/各类贷款)': accounts.filter(a => ['credit', 'loan'].includes(a.type))
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            全域多资产与账户矩阵
          </h2>
          <p className="text-xs text-slate-400">
            涵盖银行卡、微信支付宝、股票基金、数字货币、房产与负债，穿透分散账户
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenQuickTx}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1.5"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" /> 账户间转账
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> 新增账户/资产
          </button>
        </div>
      </div>

      {/* Account Groups */}
      <div className="space-y-8">
        {Object.entries(groups).map(([groupTitle, accList]) => {
          if (accList.length === 0) return null;
          const groupTotal = accList.reduce((sum, a) => sum + (a.type === 'credit' || a.type === 'loan' ? -Math.abs(a.balance) : a.balance), 0);

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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accList.map(acc => {
                  const cfg = ACCOUNT_TYPE_CONFIG[acc.type] || ACCOUNT_TYPE_CONFIG.bank;
                  const Icon = cfg.icon;
                  const isLiability = acc.type === 'credit' || acc.type === 'loan';

                  return (
                    <div 
                      key={acc.id}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-400/50 transition flex flex-col justify-between gap-4 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
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
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                              <span>{cfg.label}</span>
                              {acc.card_last4 && <span>• 尾号*{acc.card_last4}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={() => openEditModal(acc)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="修改账户"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(acc.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                            title="停用账户"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                        <span className="text-[11px] text-slate-400">
                          {isLiability ? '当前应还/欠款' : '当前资产余额'}
                        </span>
                        <div className="text-right">
                          <div className={`text-lg font-extrabold font-mono ${
                            isLiability ? 'text-rose-500' : 'text-slate-900 dark:text-white'
                          }`}>
                            {acc.currency} {acc.balance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                          </div>
                          {acc.note && (
                            <div className="text-[10px] text-slate-400 truncate max-w-xs">
                              {acc.note}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingAccount ? '编辑账户信息' : '新增账户 / 资产'}
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
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
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
