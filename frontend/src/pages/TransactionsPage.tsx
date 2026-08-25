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
  ArrowRight
} from 'lucide-react';
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
}

type TimeRangePreset = 'all' | 'this_week' | 'this_month' | 'last_month' | 'custom';

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  transactions,
  accounts,
  categories,
  onRefresh,
  onOpenQuickTx
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
        const matchMerchant = t.merchant?.toLowerCase().includes(kw);
        const matchNote = t.note?.toLowerCase().includes(kw);
        const matchCat = t.category_name?.toLowerCase().includes(kw);
        const matchRaw = t.raw_text?.toLowerCase().includes(kw);
        if (!matchMerchant && !matchNote && !matchCat && !matchRaw) return false;
      }
      return true;
    });
  }, [transactions, dateBounds, selectedType, selectedAccount, selectedCategory, keyword]);

  // Totals and category breakdown for the selected period (Excluding non-consumption balance adjustments)
  const isAdj = (t: Transaction) => t.category_name === '余额校准' || (t.merchant && t.merchant.includes('余额校准')) || (t.note && t.note.includes('余额校准'));
  
  const livingExpenseTxs = useMemo(() => filtered.filter(t => t.type === 'expense' && !isAdj(t)), [filtered]);
  const livingIncomeTxs = useMemo(() => filtered.filter(t => t.type === 'income' && !isAdj(t)), [filtered]);
  
  const totalExpense = useMemo(() => livingExpenseTxs.reduce((s, t) => s + t.amount, 0), [livingExpenseTxs]);
  const totalIncome = useMemo(() => livingIncomeTxs.reduce((s, t) => s + t.amount, 0), [livingIncomeTxs]);
  const netBalance = totalIncome - totalExpense;

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    livingExpenseTxs.forEach(t => {
      const cat = t.category_name || '日常消费';
      map[cat] = (map[cat] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([name, amount]) => ({
        name,
        amount,
        pct: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [livingExpenseTxs, totalExpense]);

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      alert('当前筛选条件下暂无流水记录可导出');
      return;
    }

    const headers = ['时间', '类型', '金额', '商户/交易对象', '分类', '账户', '备注', '标签', '来源'];
    const rows = filtered.map(t => [
      t.date,
      t.type === 'income' ? '收入' : t.type === 'transfer' ? '转账' : '支出',
      t.amount,
      `"${(t.merchant || '').replace(/"/g, '""')}"`,
      t.category_name || '',
      t.account_name || '',
      `"${(t.note || '').replace(/"/g, '""')}"`,
      `"${(t.tags || []).join(',')}"`,
      t.source || ''
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Dynamic filename based on filters
    let periodLabel = '全部明细';
    if (timeRange === 'this_week') periodLabel = '本周明细';
    else if (timeRange === 'this_month') periodLabel = '本月明细';
    else if (timeRange === 'last_month') periodLabel = '上月明细';
    else if (timeRange === 'custom') periodLabel = `${customStart}至${customEnd}`;

    const catLabel = selectedCategory !== 'all' ? `_${selectedCategory}` : '';
    const dateLabel = getBeijingFileStamp();

    link.setAttribute('href', url);
    link.setAttribute('download', `财务账单_${periodLabel}${catLabel}_${dateLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            收支明细与账单总汇
          </h2>
          <p className="text-[11px] text-slate-400">
            多维度检索、自定义时间区间与分类透视
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1"
            title="导出 CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onOpenQuickTx}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1 active:scale-95"
          >
            <Plus className="w-4 h-4" /> 记一笔
          </button>
        </div>
      </div>

      {/* Time Range Selector Tabs */}
      <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl grid grid-cols-5 gap-1 text-[11px] font-bold">
        <button
          type="button"
          onClick={() => setTimeRange('this_month')}
          className={`py-1.5 rounded-xl transition ${timeRange === 'this_month' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500'}`}
        >
          本月
        </button>
        <button
          type="button"
          onClick={() => setTimeRange('this_week')}
          className={`py-1.5 rounded-xl transition ${timeRange === 'this_week' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500'}`}
        >
          本周
        </button>
        <button
          type="button"
          onClick={() => setTimeRange('last_month')}
          className={`py-1.5 rounded-xl transition ${timeRange === 'last_month' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500'}`}
        >
          上月
        </button>
        <button
          type="button"
          onClick={() => setTimeRange('all')}
          className={`py-1.5 rounded-xl transition ${timeRange === 'all' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500'}`}
        >
          全部
        </button>
        <button
          type="button"
          onClick={() => setTimeRange('custom')}
          className={`py-1.5 rounded-xl transition flex items-center justify-center gap-0.5 ${timeRange === 'custom' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500'}`}
        >
          <CalendarRange className="w-3 h-3" /> 自定义
        </button>
      </div>

      {/* Custom Date Range Picker (Shown when "自定义" is active) */}
      {timeRange === 'custom' && (
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-1">
            <span className="text-[10px] text-slate-400">从:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-mono text-slate-800 dark:text-slate-200"
            />
          </div>
          <span className="text-slate-400">至</span>
          <div className="flex items-center gap-1.5 flex-1">
            <span className="text-[10px] text-slate-400">到:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-mono text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
      )}

      {/* Period Summary KPI Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-rose-500" /> 总支出
          </div>
          <div className="text-sm font-extrabold font-mono text-rose-600 dark:text-rose-400 truncate">
            ¥{totalExpense.toFixed(2)}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" /> 总收入
          </div>
          <div className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400 truncate">
            ¥{totalIncome.toFixed(2)}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
            <Layers className="w-3 h-3 text-indigo-500" /> 期间结余
          </div>
          <div className={`text-sm font-extrabold font-mono truncate ${netBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {netBalance >= 0 ? '+' : ''}¥{netBalance.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Category Breakdown Progress Bars (If expenses exist) */}
      {categoryBreakdown.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-emerald-500" /> 支出分类占比分析
            </span>
            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="text-[10px] text-emerald-600 font-medium"
              >
                清除分类筛选 ✕
              </button>
            )}
          </div>

          <div className="space-y-2">
            {categoryBreakdown.slice(0, 4).map(cat => (
              <div 
                key={cat.name} 
                onClick={() => setSelectedCategory(selectedCategory === cat.name ? 'all' : cat.name)}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  selectedCategory === cat.name 
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40' 
                    : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{cat.name}</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">
                    ¥{cat.amount.toFixed(2)} <span className="text-[10px] text-slate-400">({cat.pct.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                    style={{ width: `${Math.min(100, Math.max(5, cat.pct))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Toolbar (Search, Type, Account, Category) */}
      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索商户、备注、分类..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Type filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">全部类型</option>
            <option value="expense">支出 📉</option>
            <option value="income">收入 📈</option>
            <option value="transfer">转账 🔄</option>
          </select>

          {/* Account filter */}
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">全部账户</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">全部分类</option>
            {categories.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.length === 0 ? (
            <div className="p-10 text-center space-y-1.5">
              <div className="text-slate-400 text-xs">
                所选时间区间内暂无符合条件的流水
              </div>
              <div className="text-[10px] text-slate-400">
                可切换上方「本月 / 本周 / 全部」或点击「记一笔」
              </div>
            </div>
          ) : (
            filtered.map((t) => (
              <div 
                key={t.id} 
                onClick={() => setEditingTx(t)}
                className="p-3.5 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 active:scale-[0.99] transition flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    t.type === 'income' 
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' 
                      : t.type === 'transfer' || t.type === 'repayment'
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                  }`}>
                    {t.type === 'income' ? <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" /> : t.type === 'transfer' || t.type === 'repayment' ? <Layers className="w-4 h-4 sm:w-5 sm:h-5" /> : <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {t.merchant || t.category_name || '收支交易'}
                      </span>
                      {t.source === 'ios_shortcut' && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[9px] font-mono">
                          快捷指令
                        </span>
                      )}
                      {t.source === 'sms_parser' && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[9px]">
                          短信识别
                        </span>
                      )}
                      {t.source === 'ocr_image' && (
                        <span className="px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-[9px]">
                          图片识别
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] sm:text-[11px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span>{t.date}</span>
                      <span>•</span>
                      <span className="font-medium text-slate-600 dark:text-slate-300">{t.account_name || '默认账户'}</span>
                      {t.to_account_name && (
                        <span>→ {t.to_account_name}</span>
                      )}
                      <span>•</span>
                      <span className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {t.category_name || '日常消费'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <div className={`text-sm sm:text-base font-bold font-mono ${
                      t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                    }`}>
                      {t.type === 'income' ? '+' : t.type === 'transfer' ? '' : '-'}¥{t.amount.toFixed(2)}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Transaction Edit & Detail Modal */}
      <TransactionEditModal
        isOpen={!!editingTx}
        transaction={editingTx}
        accounts={accounts}
        categories={categories}
        onClose={() => setEditingTx(null)}
        onSuccess={() => {
          onRefresh();
          setEditingTx(null);
        }}
      />
    </div>
  );
};
