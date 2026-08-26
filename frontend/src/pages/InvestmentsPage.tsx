import React, { useState, useEffect, useMemo } from 'react';
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
  Check, 
  AlertTriangle, 
  ExternalLink, 
  Search, 
  Layers, 
  ArrowRight,
  Building2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Investment, Account } from '../types';
import { api } from '../api/client';
import { localStore } from '../services/localStore';
import { refreshInvestmentQuotes, querySingleQuote, queryAllQuotesForCode, MarketQuoteResult } from '../services/marketData';

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
  const [matchedQuotes, setMatchedQuotes] = useState<MarketQuoteResult[]>([]);
  const [matchedQuote, setMatchedQuote] = useState<MarketQuoteResult | null>(null);

  const handleSelectCandidate = (q: MarketQuoteResult) => {
    setMatchedQuote(q);
    setName(q.name);
    if (q.suggestedType) {
      setType(q.suggestedType);
    }
    setCurrentPrice(q.currentPrice.toString());
    if (!costPrice || costPrice === '0') {
      setCostPrice(q.currentPrice.toString());
    }
  };

  const handleTypeSelect = (newType: string) => {
    setType(newType);
    if (matchedQuotes.length > 1) {
      const candidate = matchedQuotes.find(q => q.suggestedType === newType);
      if (candidate) {
        handleSelectCandidate(candidate);
      }
    }
  };

  const investmentAccounts = accounts.filter(a => ['investment', 'crypto', 'bank', 'wallet'].includes(a.type));

  const totalCost = investments.reduce((s, i) => s + i.total_cost, 0);
  const totalMarketVal = investments.reduce((s, i) => s + i.market_value, 0);
  const totalPnl = totalMarketVal - totalCost;
  const totalPnlRate = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const totalUninvestedCash = accounts
    .filter(a => a.type === 'investment' || (a.cash_balance && a.cash_balance > 0))
    .reduce((sum, a) => sum + (a.cash_balance || 0), 0);

  // Platform filtering state: 'all' or specific account_id
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>('all');
  const [newPlatformModalOpen, setNewPlatformModalOpen] = useState<boolean>(false);
  const [newPlatformName, setNewPlatformName] = useState<string>('');
  const [newPlatformCash, setNewPlatformCash] = useState<string>('');

  // Collect platform groups with financial summaries
  const platformGroups = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      cash: number;
      holdings: Investment[];
      totalVal: number;
      totalCost: number;
      totalGain: number;
    }>();

    // 1. Existing investment accounts
    for (const acc of accounts) {
      if (acc.type === 'investment' || (acc.cash_balance && acc.cash_balance > 0)) {
        map.set(acc.id, {
          id: acc.id,
          name: acc.name,
          cash: acc.cash_balance || 0,
          holdings: [],
          totalVal: 0,
          totalCost: 0,
          totalGain: 0
        });
      }
    }

    // 2. Add investments into their respective accounts
    for (const inv of investments) {
      let accId = inv.account_id;
      if (!map.has(accId)) {
        const matched = accounts.find(a => a.id === accId);
        const pName = matched?.name || inv.account_name || '华泰证券';
        map.set(accId, {
          id: accId,
          name: pName,
          cash: matched?.cash_balance || 0,
          holdings: [],
          totalVal: 0,
          totalCost: 0,
          totalGain: 0
        });
      }
      const group = map.get(accId)!;
      group.holdings.push(inv);
      group.totalVal += inv.market_value;
      group.totalCost += inv.total_cost;
      group.totalGain += inv.floating_pnl;
    }

    return Array.from(map.values());
  }, [accounts, investments]);

  // Active platform when selectedPlatformId !== 'all'
  const activePlatform = useMemo(() => {
    if (selectedPlatformId === 'all') return null;
    return platformGroups.find(p => p.id === selectedPlatformId) || null;
  }, [selectedPlatformId, platformGroups]);

  // Filtered investments based on selectedPlatformId
  const displayedInvestments = useMemo(() => {
    if (selectedPlatformId === 'all') return investments;
    return investments.filter(i => i.account_id === selectedPlatformId);
  }, [selectedPlatformId, investments]);

  // View statistics: Platform-specific vs All Platforms
  const currentViewStats = useMemo(() => {
    if (activePlatform) {
      const val = activePlatform.totalVal;
      const cost = activePlatform.totalCost;
      const pnl = activePlatform.totalGain;
      const pnlRate = cost > 0 ? (pnl / cost) * 100 : 0;
      const cash = activePlatform.cash;
      return {
        title: activePlatform.name,
        subtitle: `平台专属持仓 · ${activePlatform.holdings.length} 支标的`,
        totalVal: val,
        totalCost: cost,
        totalPnl: pnl,
        totalPnlRate: pnlRate,
        uninvestedCash: cash,
        totalAssets: val + cash
      };
    }

    return {
      title: '总持仓市值 (CNY)',
      subtitle: `全平台合并统计 · ${investments.length} 支标的`,
      totalVal: totalMarketVal,
      totalCost: totalCost,
      totalPnl: totalPnl,
      totalPnlRate: totalPnlRate,
      uninvestedCash: totalUninvestedCash,
      totalAssets: totalMarketVal + totalUninvestedCash
    };
  }, [activePlatform, totalMarketVal, totalCost, totalPnl, totalPnlRate, totalUninvestedCash, investments.length]);

  const handleCreateNewPlatform = async (platName: string, cashVal: number = 0) => {
    const clean = platName.trim();
    if (!clean) return;
    try {
      const created = await api.createAccount({
        name: clean,
        type: 'investment',
        balance: cashVal,
        cash_balance: cashVal,
        currency: 'CNY',
        note: `投资理财券商平台 (${clean})`
      });
      onRefresh();
      setSelectedPlatformId(created.id);
      setNewPlatformModalOpen(false);
      setNewPlatformName('');
      setNewPlatformCash('');
    } catch (e: any) {
      alert(`创建平台失败: ${e.message}`);
    }
  };

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
      setMatchedQuotes([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingQuote(true);
      try {
        const quotes = await queryAllQuotesForCode(cleanCode, type);
        setMatchedQuotes(quotes);

        if (quotes.length > 0) {
          const bestMatch = quotes.find(q => q.suggestedType === type) || quotes[0];
          setMatchedQuote(bestMatch);
          if (!name || name === '投资标的' || name === '新增标的' || name === '300' || !editingInv) {
            setName(bestMatch.name);
          }
          if (bestMatch.suggestedType && !editingInv) {
            setType(bestMatch.suggestedType);
          }
          setCurrentPrice(bestMatch.currentPrice.toString());
          if (!costPrice && !editingInv) {
            setCostPrice(bestMatch.currentPrice.toString());
          }
        } else {
          setMatchedQuote(null);
        }
      } catch (e) {
        setMatchedQuote(null);
        setMatchedQuotes([]);
      } finally {
        setSearchingQuote(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [code, modalOpen]);

  const openAddModal = (presetAccId?: string) => {
    setEditingInv(null);
    const targetAccId = presetAccId || (selectedPlatformId !== 'all' ? selectedPlatformId : (investmentAccounts[0]?.id || accounts[0]?.id || ''));
    setAccountId(targetAccId);
    setCode('');
    setName('');
    setType('stock_a');
    setShares('');
    setCostPrice('');
    setCurrentPrice('');
    setCurrency('CNY');
    setMatchedQuote(null);
    setMatchedQuotes([]);
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
    setMatchedQuotes([]);
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

  const renderHoldingCard = (inv: Investment) => {
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
                <span className="ml-1.5 text-purple-600 dark:text-purple-400 font-medium">
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
              {displayedInvestments.length} 支标的
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
              onClick={() => openAddModal()}
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

        {/* Portfolio Overview Banner (Platform-Adaptive) */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white shadow-md space-y-3">
          <div className="flex items-center justify-between text-xs text-indigo-200">
            <div className="flex items-center gap-1.5 font-bold">
              <Building2 className="w-3.5 h-3.5 text-purple-300" />
              <span>{currentViewStats.title}</span>
            </div>
            <span className={`font-bold flex items-center gap-0.5 ${currentViewStats.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {currentViewStats.totalPnl >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {currentViewStats.totalPnl >= 0 ? '+' : ''}{currentViewStats.totalPnlRate.toFixed(2)}%
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black font-mono tracking-tight">
              ¥{currentViewStats.totalVal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-indigo-300/80 font-medium">
              {currentViewStats.subtitle}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
            <div>
              <div className="text-[10px] text-indigo-300">持仓总成本</div>
              <div className="font-bold font-mono text-white/90">
                ¥{currentViewStats.totalCost.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-indigo-300">累计浮动盈亏</div>
              <div className={`font-bold font-mono ${currentViewStats.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {currentViewStats.totalPnl >= 0 ? '+' : ''}¥{currentViewStats.totalPnl.toFixed(2)}
              </div>
            </div>
          </div>

          {currentViewStats.uninvestedCash > 0 && (
            <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-[10px] text-amber-300">💰 券商可用现金 (未投)</div>
                <div className="font-bold font-mono text-amber-200">
                  ¥{currentViewStats.uninvestedCash.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-indigo-300">🏦 券商总资产 (市值+现金)</div>
                <div className="font-bold font-mono text-white">
                  ¥{currentViewStats.totalAssets.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Platform / Broker Filter Segmented Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
        <button
          type="button"
          onClick={() => setSelectedPlatformId('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 flex items-center gap-1.5 ${
            selectedPlatformId === 'all'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-purple-600'
          }`}
        >
          <span>全部平台</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            selectedPlatformId === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }`}>
            {investments.length}
          </span>
        </button>

        {platformGroups.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedPlatformId(p.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 flex items-center gap-1.5 ${
              selectedPlatformId === p.id
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-purple-600'
            }`}
          >
            <span>{p.name}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              selectedPlatformId === p.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              {p.holdings.length}
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => setNewPlatformModalOpen(true)}
          className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition flex-shrink-0 flex items-center gap-1 active:scale-95"
          title="新增其他券商平台（如同花顺、东方财富等）"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>加平台</span>
        </button>
      </div>

      {/* Investments List */}
      <div className="space-y-3">
        {displayedInvestments.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center mx-auto">
              <PieChart className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {activePlatform ? `【${activePlatform.name}】暂无持仓` : '暂无证券或基金持仓'}
            </div>
            <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
              {activePlatform 
                ? `点击下方按钮在【${activePlatform.name}】录入持仓标的`
                : '只需输入代码（如 159941 纳指ETF、510300 沪深300、001309 德明利），系统即可秒级识别名称与实时现价！'}
            </p>
            {activePlatform && (
              <button
                type="button"
                onClick={() => openAddModal(activePlatform.id)}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1 mx-auto shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>在【{activePlatform.name}】录入标的</span>
              </button>
            )}
          </div>
        ) : selectedPlatformId === 'all' && platformGroups.filter(p => p.holdings.length > 0).length > 1 ? (
          // Grouped by Platform
          platformGroups.filter(p => p.holdings.length > 0).map(p => (
            <div key={p.id} className="space-y-2">
              {/* Platform Header Sub-Banner */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-slate-900 dark:to-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    🏛️
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-xs text-slate-900 dark:text-white">{p.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-200/80 dark:bg-purple-900 text-purple-800 dark:text-purple-200 font-mono font-bold">
                        {p.holdings.length} 支标的
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      市值: <strong className="text-purple-600 dark:text-purple-400">¥{p.totalVal.toFixed(2)}</strong> • 
                      浮盈: <strong className={p.totalGain >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                        {p.totalGain >= 0 ? '+' : ''}¥{p.totalGain.toFixed(2)}
                      </strong>
                      {p.cash > 0 && <span> • 现金: ¥{p.cash.toFixed(2)}</span>}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openAddModal(p.id)}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 text-[10px] font-bold transition flex items-center gap-1 active:scale-95 shadow-xs"
                >
                  <Plus className="w-3 h-3" />
                  <span>在此平台录入</span>
                </button>
              </div>

              {/* Holdings inside platform */}
              <div className="space-y-2">
                {p.holdings.map(inv => renderHoldingCard(inv))}
              </div>
            </div>
          ))
        ) : (
          // Single list
          displayedInvestments.map(inv => renderHoldingCard(inv))
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

              {/* Duplicate Code Multi-Candidate Resolver (e.g. 001309 德明利 vs 东方红睿逸) */}
              {matchedQuotes.length > 1 && (
                <div className="p-3 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-700/80 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>检测到该代码对应 {matchedQuotes.length} 个不同市场标的</span>
                    </div>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">请点击选择真实持有资产：</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {matchedQuotes.map((q, idx) => {
                      const isSelected = matchedQuote?.name === q.name && matchedQuote?.suggestedType === q.suggestedType;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectCandidate(q)}
                          className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between group ${
                            isSelected
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600 shadow-md ring-2 ring-purple-400/30'
                              : 'bg-white dark:bg-slate-800 border-amber-200/80 dark:border-amber-800/60 hover:border-purple-300 dark:hover:border-purple-700 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                isSelected 
                                  ? 'bg-white/20 text-white' 
                                  : q.suggestedType === 'stock_a'
                                    ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                                    : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                              }`}>
                                {q.marketLabel || (q.suggestedType === 'stock_a' ? 'A股股票' : '公募基金')}
                              </span>
                              <span className="font-bold text-xs truncate">{q.name}</span>
                              <span className={`font-mono text-[10px] ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                                ({q.code})
                              </span>
                            </div>
                            <div className={`text-[10px] font-mono mt-1 flex items-center gap-3 ${isSelected ? 'text-purple-100' : 'text-slate-500 dark:text-slate-400'}`}>
                              <span>最新{q.suggestedType === 'fund' ? '净值' : '现价'}: <strong className="font-bold">¥{q.currentPrice.toFixed(3)}</strong></span>
                              <span>涨跌幅: <strong>{q.changeRate >= 0 ? '+' : ''}{q.changeRate}%</strong></span>
                            </div>
                          </div>
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white flex-shrink-0 ml-2">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 flex-shrink-0 ml-2 group-hover:underline">
                              选择此标的
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Matched Quote Indicator Pill (when 1 candidate or single candidate active) */}
              {matchedQuote && matchedQuotes.length <= 1 && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 space-y-0.5 animate-in fade-in">
                  <div className="font-bold text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>✨ 已成功识别：{matchedQuote.name} ({matchedQuote.marketLabel || '标的'})</span>
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
                    onChange={(e) => handleTypeSelect(e.target.value)}
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
                  <label className="block text-[10px] text-slate-400 mb-1">存放平台 / 券商账户</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none text-[11px]"
                  >
                    {platformGroups.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                    {accounts.filter(a => !platformGroups.some(p => p.id === a.id)).map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick platform preset buttons */}
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">快捷选平台 / 一键新建：</label>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {['华泰证券', '同花顺', '东方财富', '招商证券', '支付宝理财', '微信零钱通'].map(preset => {
                    const isCurrent = accounts.find(a => a.id === accountId)?.name.includes(preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={async () => {
                          const existing = accounts.find(a => a.name.includes(preset) || preset.includes(a.name));
                          if (existing) {
                            setAccountId(existing.id);
                          } else {
                            const created = await api.createAccount({
                              name: preset,
                              type: 'investment',
                              balance: 0,
                              cash_balance: 0,
                              currency: 'CNY',
                              note: `投资理财平台 (${preset})`
                            });
                            onRefresh();
                            setAccountId(created.id);
                          }
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition flex-shrink-0 ${
                          isCurrent
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-purple-300'
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
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

      {/* Quick Add Platform Modal */}
      {newPlatformModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-purple-600" />
                <span>新增投资券商或理财平台</span>
              </h3>
              <button
                type="button"
                onClick={() => setNewPlatformModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] text-slate-400">选择常用平台或输入自定义名称：</label>
              <div className="flex flex-wrap gap-1.5">
                {['华泰证券', '同花顺', '东方财富', '招商证券', '中信证券', '银河证券', '支付宝理财', '微信零钱通', '天天基金'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNewPlatformName(preset)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition ${
                      newPlatformName === preset
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-400'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mt-2 mb-1">平台名称</label>
                <input
                  type="text"
                  value={newPlatformName}
                  onChange={(e) => setNewPlatformName(e.target.value)}
                  placeholder="如：同花顺、东方财富、华泰证券(尾号123)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">平台可用未投现金 (可选，¥)</label>
                <input
                  type="number"
                  step="any"
                  value={newPlatformCash}
                  onChange={(e) => setNewPlatformCash(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewPlatformModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!newPlatformName.trim()}
                onClick={() => handleCreateNewPlatform(newPlatformName, parseFloat(newPlatformCash) || 0)}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-bold text-white shadow-sm disabled:opacity-50"
              >
                确认开立平台
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
