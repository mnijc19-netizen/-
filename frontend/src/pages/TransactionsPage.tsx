import React, { useState } from 'react';
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
  Edit2
} from 'lucide-react';
import { Transaction, Account, Category, TransactionType } from '../types';
import { api } from '../api/client';
import { TransactionEditModal } from '../components/TransactionEditModal';

interface TransactionsPageProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onRefresh: () => void;
  onOpenQuickTx: () => void;
}

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
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Filter transactions
  const filtered = transactions.filter(t => {
    if (selectedType !== 'all' && t.type !== selectedType) return false;
    if (selectedAccount !== 'all' && t.account_id !== selectedAccount && t.to_account_id !== selectedAccount) return false;
    if (selectedCategory !== 'all' && t.category_name !== selectedCategory && t.category_id !== selectedCategory) return false;
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

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这笔流水吗？（账户余额将自动还原）')) {
      await api.deleteTransaction(id);
      onRefresh();
    }
  };

  const handleExportCSV = () => {
    const headers = ['时间', '类型', '金额', '商户/交易对象', '分类', '账户', '备注', '标签', '来源'];
    const rows = filtered.map(t => [
      t.date,
      t.type,
      t.amount,
      `"${t.merchant || ''}"`,
      t.category_name || '',
      t.account_name || '',
      `"${t.note || ''}"`,
      `"${(t.tags || []).join(',')}"`,
      t.source || ''
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `财务收支明细_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Totals for filtered list
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            收支流水与明细总账
          </h2>
          <p className="text-xs text-slate-400">
            多维度检索、标签筛选与 CSV 报表导出
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> 导出 CSV
          </button>
          <button
            type="button"
            onClick={onOpenQuickTx}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> 记一笔
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Keyword search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索商户、备注、分类..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Type filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">所有交易类型</option>
            <option value="expense">支出 📉</option>
            <option value="income">收入 📈</option>
            <option value="transfer">内部转账 🔄</option>
            <option value="repayment">信用卡/贷款还款 💳</option>
          </select>

          {/* Account filter */}
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">所有关联账户</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">所有消费分类</option>
            {categories.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Filter Summary pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div>
            共筛选出 <span className="font-bold text-slate-900 dark:text-white">{filtered.length}</span> 笔交易
          </div>
          <div className="flex items-center gap-4">
            <span>总支出: <strong className="text-rose-500">¥{totalExpense.toFixed(2)}</strong></span>
            <span>总收入: <strong className="text-emerald-500">¥{totalIncome.toFixed(2)}</strong></span>
          </div>
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              没有找到符合条件的流水记录
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
