import React, { useState, useMemo } from 'react';
import { 
  ReceiptText, 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Trash2, 
  TrendingDown, 
  TrendingUp, 
  Layers, 
  Tag, 
  Calendar, 
  CreditCard,
  ChevronRight,
  Edit2,
  PieChart,
  CalendarRange,
  ArrowRight,
  CheckSquare,
  Square,
  CheckCircle2,
  X,
  Wallet,
  UploadCloud
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Transaction, Account, Category, TransactionType } from '../types';
import { api } from '../api/client';
import { TransactionEditModal } from '../components/TransactionEditModal';
import { getBeijingDateString, getBeijingFileStamp } from '../utils/dateUtils';

interface TransactionsPageProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onRefresh: () => void;
  onOpenQuickTx: () => void;
  onNavigate?: (page: string) => void;
}

type TimeRangePreset = 'all' | 'this_week' | 'this_month' | 'last_month' | 'custom';

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  transactions,
  accounts,
  categories,
  onRefresh,
  onOpenQuickTx,
  onNavigate
}) => {
  const [keyword, setKeyword] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRangePreset>('this_month');
  
  // Custom date range state using local Beijing time
  const todayStr = getBeijingDateString();
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return getBeijingDateString(d);
  });
  const [customEnd, setCustomEnd] = useState<string>(todayStr);

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Batch Selection States
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchCategoryModalOpen, setBatchCategoryModalOpen] = useState(false);
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  // Compute date range bounds
  const dateBounds = useMemo(() => {
    const now = new Date();
    if (timeRange === 'this_week') {
      const day = now.getDay() || 7;
      const start = new Date(now);
      start.setDate(now.getDate() - day + 1);
      start.setHours(0, 0, 0, 0);
      return { start: getBeijingDateString(start), end: '9999-12-31' };
    }
    if (timeRange === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: getBeijingDateString(start), end: '9999-12-31' };
    }
    if (timeRange === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: getBeijingDateString(start), end: getBeijingDateString(end) };
    }
    if (timeRange === 'custom') {
      return { start: customStart || '0000-01-01', end: customEnd ? customEnd + ' 23:59' : '9999-12-31' };
    }
    return { start: '0000-01-01', end: '9999-12-31' };
  }, [timeRange, customStart, customEnd]);

  // Filter transactions
  const filtered = useMemo(() => {
    return transactions.filter(t => {
      // Date filter
      const txDate = t.date.substring(0, 10);
      if (txDate < dateBounds.start || txDate > dateBounds.end) return false;

      // Type filter
      if (selectedType !== 'all' && t.type !== selectedType) return false;
      // Account filter
      if (selectedAccount !== 'all' && t.account_id !== selectedAccount && t.to_account_id !== selectedAccount) return false;
      // Category filter
      if (selectedCategory !== 'all' && t.category_name !== selectedCategory && t.category_id !== selectedCategory) return false;

      // Keyword search
      if (keyword.trim()) {
        const kw = keyword.toLowerCase();
        const m = (t.merchant || '').toLowerCase();
        const n = (t.note || '').toLowerCase();
        const c = (t.category_name || '').toLowerCase();
        const a = (t.account_name || '').toLowerCase();
        const amt = t.amount.toString();
        if (!m.includes(kw) && !n.includes(kw) && !c.includes(kw) && !a.includes(kw) && !amt.includes(kw)) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, dateBounds, selectedType, selectedAccount, selectedCategory, keyword]);

  // Statistics for the filtered view
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    const catMap: Record<string, number> = {};

    filtered.forEach(t => {
      if (t.category_name === '余额校准') return;
      if (t.type === 'income') income += t.amount;
      if (t.type === 'expense') {
        expense += t.amount;
        const c = t.category_name || '其他';
        catMap[c] = (catMap[c] || 0) + t.amount;
      }
    });

    const categoriesList = Object.entries(catMap)
      .map(([name, value]) => ({ name, value, pct: expense > 0 ? (value / expense) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);

    return {
      income,
      expense,
      balance: income - expense,
      categoriesList
    };
  }, [filtered]);

  const toggleSelectTx = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(t => t.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`确定要批量删除已选中的 ${selectedIds.size} 笔记账流水吗？关联账户余额将自动回滚。`)) {
      return;
    }

    setBatchActionLoading(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await api.deleteTransaction(id);
      }
      setSelectedIds(new Set());
      setIsBatchMode(false);
      onRefresh();
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
    } catch (e: any) {
      alert(`批量删除失败: ${e.message}`);
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchChangeCategory = async (newCategoryName: string) => {
    if (selectedIds.size === 0 || !newCategoryName) return;

    setBatchActionLoading(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await api.updateTransaction(id, { category_name: newCategoryName });
      }
      setSelectedIds(new Set());
      setIsBatchMode(false);
      setBatchCategoryModalOpen(false);
      onRefresh();
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
    } catch (e: any) {
      alert(`批量修改分类失败: ${e.message}`);
    } finally {
      setBatchActionLoading(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (filtered.length === 0) {
      alert('当前筛选条件下无数据可导出');
      return;
    }

    const headers = ['时间', '类型', '金额(元)', '分类', '商户/说明', '账户', '转入账户', '备注', '来源'];
    const rows = filtered.map(t => [
      t.date,
      t.type === 'expense' ? '支出' : t.type === 'income' ? '收入' : t.type === 'transfer' ? '转账' : '还款',
      t.amount.toFixed(2),
      t.category_name || '',
      `"${(t.merchant || '').replace(/"/g, '""')}"`,
      t.account_name || '',
      t.to_account_name || '',
      `"${(t.note || '').replace(/"/g, '""')}"`,
      t.source || 'manual'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SmartWealth_Transactions_${getBeijingFileStamp()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-3.5 pb-32 animate-in fade-in duration-200 max-w-lg mx-auto">
      {/* Top Header & Search Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              记账明细
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              共 {filtered.length} 笔
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setIsBatchMode(prev => !prev);
                setSelectedIds(new Set());
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition active:scale-95 flex items-center gap-1 ${
                isBatchMode
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-purple-600'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isBatchMode ? '退出管理' : '批量管理'}</span>
            </button>

            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('parser')}
                className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/80 dark:border-emerald-800/80 transition text-[11px] font-bold flex items-center gap-1 active:scale-95"
                title="导入微信/支付宝官方 Excel 或 CSV 账单"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>导入</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCsv}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition"
              title="导出当前筛选结果为 CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索商户、金额、分类或备注..."
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Time Range Selector Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1">
          {[
            { id: 'this_month', label: '本月' },
            { id: 'this_week', label: '本周' },
            { id: 'last_month', label: '上月' },
            { id: 'all', label: '全部' },
            { id: 'custom', label: '自选日期' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTimeRange(tab.id as any)}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition active:scale-95 flex-shrink-0 ${
                timeRange === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Custom Date Picker Inputs */}
        {timeRange === 'custom' && (
          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2 animate-in fade-in text-xs">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-[10px] text-slate-400">起:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-[11px] text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-[10px] text-slate-400">止:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-[11px] text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Overview Statistics Card */}
      <div className="p-3.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
          <div className="text-[10px] text-slate-400">期间总支出</div>
          <div className="text-xs font-bold font-mono text-rose-500 mt-0.5 truncate">
            -¥{stats.expense.toFixed(2)}
          </div>
        </div>
        <div className="p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
          <div className="text-[10px] text-slate-400">期间总收入</div>
          <div className="text-xs font-bold font-mono text-emerald-500 mt-0.5 truncate">
            +¥{stats.income.toFixed(2)}
          </div>
        </div>
        <div className="p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
          <div className="text-[10px] text-slate-400">期间结余</div>
          <div className={`text-xs font-bold font-mono mt-0.5 truncate ${stats.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
            {stats.balance >= 0 ? '+' : ''}¥{stats.balance.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Batch Mode Selection Info Bar */}
      {isBatchMode && (
        <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="font-bold text-purple-700 dark:text-purple-300 hover:underline"
            >
              {selectedIds.size === filtered.length && filtered.length > 0 ? '取消全选' : '全选本页'}
            </button>
            <span className="text-slate-400">|</span>
            <span className="text-purple-900 dark:text-purple-200">
              已选 <strong className="font-mono text-sm">{selectedIds.size}</strong> 笔
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={selectedIds.size === 0 || batchActionLoading}
              onClick={() => setBatchCategoryModalOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-purple-600 text-white text-[10px] font-bold hover:bg-purple-500 transition active:scale-95 disabled:opacity-40"
            >
              批量改分类
            </button>
            <button
              type="button"
              disabled={selectedIds.size === 0 || batchActionLoading}
              onClick={handleBatchDelete}
              className="px-2.5 py-1 rounded-xl bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-500 transition active:scale-95 disabled:opacity-40 flex items-center gap-0.5"
            >
              <Trash2 className="w-3 h-3" />
              <span>批量删除</span>
            </button>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <ReceiptText className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              无符合条件的明细记录
            </div>
            <p className="text-[10px] text-slate-400">
              尝试调整筛选条件或点击右上角「+」记一笔
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map(tx => {
              const isSelected = selectedIds.has(tx.id);
              return (
                <div 
                  key={tx.id} 
                  onClick={() => {
                    if (isBatchMode) {
                      toggleSelectTx(tx.id);
                    } else {
                      setEditingTx(tx);
                    }
                  }}
                  className={`py-3 flex items-center justify-between gap-3 cursor-pointer group transition rounded-2xl px-2 -mx-2 ${
                    isSelected ? 'bg-purple-50/80 dark:bg-purple-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Batch Checkbox */}
                    {isBatchMode && (
                      <div className="flex-shrink-0 text-purple-600">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 fill-purple-600 text-white" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    )}

                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs ${
                      tx.category_name === '余额校准'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-600'
                        : tx.type === 'income' 
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' 
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                    }`}>
                      {tx.category_name === '余额校准' ? <Wallet className="w-4 h-4" /> : tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {tx.merchant || tx.category_name || '日常消费'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                        <span>{tx.date.substring(5, 16)}</span>
                        <span>•</span>
                        <span>{tx.account_name || '默认账户'}</span>
                        {tx.category_name && (
                          <>
                            <span>•</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9px] text-slate-600 dark:text-slate-300">
                              {tx.category_name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={`text-xs font-bold font-mono text-right ${
                      tx.category_name === '余额校准' 
                        ? 'text-amber-600 dark:text-amber-400'
                        : tx.type === 'income' 
                          ? 'text-emerald-500' 
                          : 'text-slate-900 dark:text-white'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'}¥{tx.amount.toFixed(2)}
                    </div>
                    {!isBatchMode && (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction Edit Modal */}
      {editingTx && (
        <TransactionEditModal
          isOpen={!!editingTx}
          onClose={() => setEditingTx(null)}
          transaction={editingTx}
          accounts={accounts}
          categories={categories}
          onSuccess={() => {
            setEditingTx(null);
            onRefresh();
          }}
        />
      )}

      {/* Batch Change Category Modal */}
      {batchCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xs p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                批量修改分类 ({selectedIds.size} 笔)
              </h4>
              <button
                type="button"
                onClick={() => setBatchCategoryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto p-1">
              {categories.filter(c => c.type === 'expense').map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleBatchChangeCategory(cat.name)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-800 dark:text-slate-200 hover:border-purple-500 hover:text-purple-600 transition active:scale-95 text-center truncate"
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
