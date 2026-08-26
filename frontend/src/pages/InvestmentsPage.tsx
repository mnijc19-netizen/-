import React, { useState, useEffect } from 'react';
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
  PieChart,
  RefreshCw,
  Sparkles,
  Bot,
  CheckCircle2,
  ExternalLink,
  Search,
  Layers,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Investment, Account } from '../types';
import { api } from '../api/client';
import { localStore } from '../services/localStore';
import { refreshInvestmentQuotes, querySingleQuote, MarketQuoteResult } from '../services/marketData';

interface InvestmentsPageProps {
  investments: Investment[];
  accounts: Account[];
  onRefresh: () => void;
  onOpenAiChat?: () => void;
}

export const InvestmentsPage: React.FC<InvestmentsPageProps> = ({ 
  investments, 
  accounts, 
  onRefresh,
  onOpenAiChat 
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<Investment | null>(null);
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<any>('fund');
  const [shares, setShares] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [currency, setCurrency] = useState('CNY');
  const [saving, setSaving] = useState(false);
  const [refreshingQuotes, setRefreshingQuotes] = useState(false);

  // Live Auto-recognition states
  const [searchingQuote, setSearchingQuote] = useState(false);
  const [matchedQuote, setMatchedQuote] = useState<MarketQuoteResult | null>(null);

  const investmentAccounts = accounts.filter(a => ['investment', 'crypto', 'bank', 'wallet'].includes(a.type));

  const totalCost = investments.reduce((s, i) => s + i.total_cost, 0);
  const totalMarketVal = investments.reduce((s, i) => s + i.market_value, 0);
  const totalPnl = totalMarketVal - totalCost;
  const totalPnlRate = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const totalUninvestedCash = accounts
    .filter(a => a.type === 'investment' || (a.cash_balance && a.cash_balance > 0))
    .reduce((sum, a) => sum + (a.cash_balance || 0), 0);

  // Auto-deduplicate on mount to heal any legacy duplicate records
  useEffect(() => {
    const rawInvs = localStore.getInvestments();
    const seen = new Set<string>();
    const cleaned: Investment[] = [];
    let hasDupes = false;

    for (const inv of rawInvs) {
      const key = `${inv.account_id}:::${inv.code || inv.id}`;
      if (seen.has(key) || seen.has(inv.id)) {
        hasDupes = true;
        continue;
      }
      seen.add(key);
      seen.add(inv.id);
      cleaned.push(inv);
    }

    if (hasDupes) {
      localStore.saveInvestments(cleaned);
      onRefresh();
    }
  }, []);

  // Real-time debounce code lookup
  useEffect(() => {
    if (!modalOpen) return;
    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length < 2) {
      setMatchedQuote(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingQuote(true);
      try {
        const quote = await querySingleQuote(cleanCode, type);
        if (quote && quote.currentPrice > 0) {
          setMatchedQuote(quote);
          if (!name || name === '投资标的' || name === '新增标的' || name === '300' || !editingInv) {
            setName(quote.name);
          }
          if (quote.suggestedType && !editingInv) {
            setType(quote.suggestedType);
          }
          setCurrentPrice(quote.currentPrice.toString());
          if (!costPrice && !editingInv) {
            setCostPrice(quote.currentPrice.toString());
          }
        } else {
          setMatchedQuote(null);
        }
      } catch (e) {
        setMatchedQuote(null);
      } finally {
        setSearchingQuote(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [code, modalOpen]);

  const openAddModal = () => {
    setEditingInv(null);
    setAccountId(investmentAccounts[0]?.id || accounts[0]?.id || '');
    setCode('');
    setName('');
    setType('fund');
    setShares('');
    setCostPrice('');
    setCurrentPrice('');
    setCurrency('CNY');
    setMatchedQuote(null);
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
    setMatchedQuote(null);
    setModalOpen(true);
  };

  const handleRefreshAllQuotes = async () => {
    if (investments.length === 0) return;
    setRefreshingQuotes(true);
    try {
      const res = await refreshInvestmentQuotes(investments);
      onRefresh();
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
    } catch (e: any) {
      alert(`刷新行情失败: ${e.message}`);
    } finally {
      setRefreshingQuotes(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const parsedShares = parseFloat(shares) || 0;
      const parsedCost = parseFloat(costPrice) || parseFloat(currentPrice) || 1.0;
      const parsedCurrent = parseFloat(currentPrice) || parsedCost;

      const payload = {
        account_id: accountId,
        code: code || '000000',
        name: name || matchedQuote?.name || '投资标的',
        type,
        shares: parsedShares,
        cost_price: parsedCost,
        current_price: parsedCurrent,
        currency
      };

      if (editingInv) {
        await api.updateInvestment(editingInv.id, payload);
      } else {
        await api.addInvestment(payload);
      }

      // Automatically recalculate and sync linked investment account balance
      await refreshInvestmentQuotes(investments);

      setModalOpen(false);
      onRefresh();
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
    } catch (e: any) {
      alert(e.message || '操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定删除此持仓记录吗？')) {
      await api.deleteInvestment(id);
      await refreshInvestmentQuotes(investments.filter(i => i.id !== id));
      onRefresh();
    }
  };

  return (
    <div className="space-y-3.5 pb-32 animate-in fade-in duration-200 max-w-lg mx-auto">
      {/* Top Header Card */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              投资理财与持仓
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
              {investments.length} 支标的
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={refreshingQuotes || investments.length === 0}
              onClick={handleRefreshAllQuotes}
              className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:text-purple-600 transition active:scale-95 flex items-center gap-1 disabled:opacity-40"
              title="一键拉取腾讯财经官方最新行情"
            >
              <RefreshCw className={`w-3 h-3 ${refreshingQuotes ? 'animate-spin text-purple-600' : ''}`} />
              <span>{refreshingQuotes ? '拉取中...' : '刷新市值'}</span>
            </button>

            <button
              type="button"
              onClick={openAddModal}
              className="px-3 py-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[11px] font-bold shadow-sm hover:from-purple-500 hover:to-indigo-500 transition active:scale-95 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>输入代码录入</span>
            </button>
          </div>
        </div>

        {/* AI Quick Camera Ingestion Banner */}
        <div className="p-2.5 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 font-medium">
            <Bot className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <span className="text-[11px]">📸 支持直接发券商/基金持仓截图给 AI 自动解析建仓</span>
          </div>
          <button
            type="button"
            onClick={onOpenAiChat}
            className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold transition active:scale-95 flex items-center gap-0.5 flex-shrink-0"
          >
            <span>发图</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Portfolio Overview Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white shadow-md space-y-3">
          <div className="flex items-center justify-between text-xs text-indigo-200">
            <span>总持仓市值 (CNY)</span>
            <span className={`font-bold flex items-center gap-0.5 ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalPnl >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {totalPnl >= 0 ? '+' : ''}{totalPnlRate.toFixed(2)}%
            </span>
          </div>

          <div className="text-2xl font-black font-mono tracking-tight">
            ¥{totalMarketVal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
            <div>
              <div className="text-[10px] text-indigo-300">持仓总成本</div>
              <div className="font-bold font-mono text-white/90">
                ¥{totalCost.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-indigo-300">累计浮动盈亏</div>
              <div className={`font-bold font-mono ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalPnl >= 0 ? '+' : ''}¥{totalPnl.toFixed(2)}
              </div>
            </div>
          </div>

          {totalUninvestedCash > 0 && (
            <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-[10px] text-amber-300">💰 证券可用现金 (未投)</div>
                <div className="font-bold font-mono text-amber-200">
                  ¥{totalUninvestedCash.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-indigo-300">🏦 券商总资产 (市值+现金)</div>
                <div className="font-bold font-mono text-white">
                  ¥{(totalMarketVal + totalUninvestedCash).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Investments List */}
      <div className="space-y-2.5">
        {investments.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center mx-auto">
              <PieChart className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              暂无证券或基金持仓
            </div>
            <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
              只需输入代码（如 <code className="text-purple-600">159941</code> 纳指ETF、<code className="text-purple-600">510300</code> 沪深300、<code className="text-purple-600">005827</code> 易方达蓝筹），系统即可秒级识别名称与实时现价！
            </p>
          </div>
        ) : (
          investments.map(inv => {
            const isProfit = inv.floating_pnl >= 0;
            const matchedAcc = accounts.find(a => a.id === inv.account_id);
            return (
              <div
                key={inv.id}
                className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {inv.name}
                      </h4>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                        {inv.code}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                        {inv.type === 'stock_a' ? 'A股' : inv.type === 'stock_hk_us' ? '美港股' : inv.type === 'fund' ? '基金ETF' : '其他'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      持仓: <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{inv.shares} 份</span> • 成本: <span className="font-mono">¥{inv.cost_price.toFixed(3)}</span>
                      {matchedAcc && (
                        <span className="ml-1.5 text-purple-600 dark:text-purple-400">
                          (存放在: {matchedAcc.name})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(inv)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="编辑标的"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(inv.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="删除标的"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400">当前实时现价</div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                      ¥{inv.current_price.toFixed(3)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">持仓市值</div>
                    <div className="font-mono font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                      ¥{inv.market_value.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">累计浮动盈亏</div>
                    <div className={`font-mono font-bold mt-0.5 ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {isProfit ? '+' : ''}{inv.pnl_rate.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Modal with Real-Time Auto-Recognition */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>{editingInv ? '编辑投资标的' : '输入代码实时识别标的'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-2.5 text-xs">
              {/* Code Input with Live Recognition */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                    标的代码 (如 159941 / 510300 / 005827 / 600519 / AAPL)
                  </label>
                  {searchingQuote && (
                    <span className="text-[9px] text-purple-600 animate-pulse font-medium">
                      🔍 正在拉取官方实时行情...
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="输入基金/股票代码，自动识别名称与净值"
                    className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {matchedQuote && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>

              {/* Matched Quote Indicator Pill */}
              {matchedQuote && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 space-y-0.5 animate-in fade-in">
                  <div className="font-bold text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>✨ 已成功识别：{matchedQuote.name}</span>
                  </div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                    <span>最新现价/净值：<strong className="font-mono font-bold">¥{matchedQuote.currentPrice.toFixed(3)}</strong></span>
                    <span>涨跌幅: <strong className="font-mono">{matchedQuote.changeRate >= 0 ? '+' : ''}{matchedQuote.changeRate}%</strong></span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">标的名称 (自动识别或手动输入)</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如: 广发纳斯达克100ETF"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">资产类型</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="fund">公募基金 / ETF</option>
                    <option value="stock_a">A股股票</option>
                    <option value="stock_hk_us">美股 / 港股</option>
                    <option value="crypto">加密货币</option>
                    <option value="gold">黄金 / 大宗商品</option>
                    <option value="other">其他理财</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">存放账户 (如华泰证券)</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none text-[11px]"
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">持有份额</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                    placeholder="800"
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">成本单价</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="1.586"
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">当前现价</label>
                  <input
                    type="number"
                    step="any"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    placeholder="1.643"
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-500 shadow-md shadow-purple-500/20"
                >
                  {saving ? '保存中...' : '保存标的'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
