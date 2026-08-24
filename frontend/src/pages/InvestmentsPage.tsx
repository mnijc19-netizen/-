import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Coins, 
  Globe, 
  DollarSign, 
  Edit3, 
  Trash2, 
  X,
  PieChart
} from 'lucide-react';
import { Investment, Account } from '../types';
import { api } from '../api/client';

interface InvestmentsPageProps {
  investments: Investment[];
  accounts: Account[];
  onRefresh: () => void;
}

export const InvestmentsPage: React.FC<InvestmentsPageProps> = ({ investments, accounts, onRefresh }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<Investment | null>(null);
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<any>('stock_a');
  const [shares, setShares] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [currency, setCurrency] = useState('CNY');
  const [saving, setSaving] = useState(false);

  const investmentAccounts = accounts.filter(a => ['investment', 'crypto', 'bank'].includes(a.type));

  const totalCost = investments.reduce((s, i) => s + i.total_cost, 0);
  const totalMarketVal = investments.reduce((s, i) => s + i.market_value, 0);
  const totalPnl = totalMarketVal - totalCost;
  const totalPnlRate = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const openAddModal = () => {
    setEditingInv(null);
    setAccountId(investmentAccounts[0]?.id || accounts[0]?.id || '');
    setCode('');
    setName('');
    setType('stock_a');
    setShares('');
    setCostPrice('');
    setCurrentPrice('');
    setCurrency('CNY');
    setModalOpen(true);
  };

  const openEditModal = (inv: Investment) => {
    setEditingInv(inv);
    setAccountId(inv.account_id);
    setCode(inv.code);
    setName(inv.name);
    setType(inv.type);
    setShares(inv.shares.toString());
    setCostPrice(inv.cost_price.toString());
    setCurrentPrice(inv.current_price.toString());
    setCurrency(inv.currency);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        account_id: accountId,
        code,
        name,
        type,
        shares: parseFloat(shares) || 0,
        cost_price: parseFloat(costPrice) || 0,
        current_price: parseFloat(currentPrice) || 0,
        currency
      };

      if (editingInv) {
        await api.updateInvestment(editingInv.id, payload);
      } else {
        await api.addInvestment(payload);
      }
      setModalOpen(false);
      onRefresh();
    } catch (e: any) {
      alert(e.message || '操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定删除此持仓记录吗？')) {
      await api.deleteInvestment(id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            投资理财与资产收益看板
          </h2>
          <p className="text-xs text-slate-400">
            A股、港美股、公募基金、加密货币持仓成本与浮动盈亏监控
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> 记录新持仓
        </button>
      </div>

      {/* Portfolio Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-400 mb-1">持仓总市值 (折合)</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            ¥{totalMarketVal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-400 mb-1">累计持仓成本</div>
          <div className="text-2xl font-black text-slate-700 dark:text-slate-300 font-mono">
            ¥{totalCost.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-400 mb-1">累计浮动盈亏</div>
          <div className={`text-2xl font-black font-mono ${totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {totalPnl >= 0 ? '+' : ''}¥{totalPnl.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-400 mb-1">综合收益率</div>
          <div className={`text-2xl font-black font-mono ${totalPnlRate >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {totalPnlRate >= 0 ? '+' : ''}{totalPnlRate.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            全部持仓明细 ({investments.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">标的名称 / 代码</th>
                <th className="py-3 px-4">类别</th>
                <th className="py-3 px-4 text-right">持仓数量</th>
                <th className="py-3 px-4 text-right">成本价</th>
                <th className="py-3 px-4 text-right">现价</th>
                <th className="py-3 px-4 text-right">当前市值</th>
                <th className="py-3 px-4 text-right">浮动盈亏</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {investments.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    <div>{inv.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{inv.code} • {inv.account_name}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px]">
                      {inv.type === 'stock_a' ? 'A股' : inv.type === 'stock_hk_us' ? '港美股' : inv.type === 'fund' ? '基金' : inv.type === 'crypto' ? '数字货币' : '其他'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono">{inv.shares}</td>
                  <td className="py-3 px-4 text-right font-mono">{inv.cost_price.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold">{inv.current_price.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold">
                    {inv.currency} {inv.market_value.toFixed(2)}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono font-bold ${inv.floating_pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    <div>{inv.floating_pnl >= 0 ? '+' : ''}{inv.floating_pnl.toFixed(2)}</div>
                    <div className="text-[10px]">{inv.pnl_rate >= 0 ? '+' : ''}{inv.pnl_rate}%</div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(inv)}
                        className="p-1 rounded text-slate-400 hover:text-slate-600"
                        title="编辑"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(inv.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-500"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingInv ? '更新持仓信息' : '添加投资标的'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1">标的代码</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="如: 600519 或 AAPL"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">标的名称</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="如: 贵州茅台"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1">资产类型</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="stock_a">A股股票</option>
                    <option value="fund">公募/ETF基金</option>
                    <option value="stock_hk_us">港美股</option>
                    <option value="crypto">加密货币</option>
                    <option value="gold">黄金/贵金属</option>
                    <option value="other">其他理财</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">关联账户</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1">持有数量/份额</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">成本单价</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">最新现价</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
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
