import React, { useState, useEffect } from 'react';
import { 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  TrendingDown, 
  TrendingUp, 
  Layers, 
  Wallet, 
  Tag, 
  Calendar, 
  Store,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Transaction, Account, Category, TransactionType } from '../types';
import { api } from '../api/client';

interface TransactionEditModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

export const TransactionEditModal: React.FC<TransactionEditModalProps> = ({
  isOpen,
  transaction,
  accounts,
  categories,
  onClose,
  onSuccess
}) => {
  const [transType, setTransType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (transaction) {
      setTransType(transaction.type);
      setAmount(transaction.amount.toString());
      setMerchant(transaction.merchant || '');
      setAccountId(transaction.account_id);
      setToAccountId(transaction.to_account_id || '');
      
      const foundCat = categories.find(c => c.name === transaction.category_name || c.id === transaction.category_id);
      setCategoryId(foundCat ? foundCat.id : '');
      
      setDate(transaction.date);
      setNote(transaction.note || '');
      setErrorMsg('');
    }
  }, [transaction, categories]);

  if (!isOpen || !transaction) return null;

  const filteredCategories = categories.filter(c => c.type === (transType === 'income' ? 'income' : 'expense'));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('请输入正确的金额');
      return;
    }
    if (!accountId) {
      setErrorMsg('请选择关联账户');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const catObj = categories.find(c => c.id === categoryId);
      await api.updateTransaction(transaction.id, {
        type: transType,
        amount: numAmount,
        merchant: merchant.trim() || '日常收支',
        account_id: accountId,
        to_account_id: transType === 'transfer' ? toAccountId : undefined,
        category_id: categoryId || undefined,
        category_name: catObj ? catObj.name : transaction.category_name,
        date: date.trim() || transaction.date,
        note: note.trim()
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '修改保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这笔流水吗？（关联账户余额将自动还原）')) return;
    setDeleting(true);
    try {
      await api.deleteTransaction(transaction.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[82vh] my-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                编辑与查看流水明细
              </h3>
              <p className="text-[10px] text-slate-400">
                修改商户名、切换账户或调整分类
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="p-4 overflow-y-auto space-y-3.5 text-xs flex-1">
          {/* Type selector */}
          <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl gap-1 font-bold text-[11px]">
            <button
              type="button"
              onClick={() => setTransType('expense')}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
                transType === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" /> 支出
            </button>
            <button
              type="button"
              onClick={() => setTransType('income')}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
                transType === 'income' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> 收入
            </button>
            <button
              type="button"
              onClick={() => setTransType('transfer')}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
                transType === 'transfer' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> 转账
            </button>
          </div>

          {/* Amount input */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">
              交易金额 (元):
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-base font-bold font-mono text-slate-400">¥</span>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Merchant */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-emerald-500" /> 商户 / 交易对象:
            </label>
            <input
              type="text"
              required
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="例如：麦当劳、牛肉火锅"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Account selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-500" /> 关联账户:
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-[11px]"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} (余额: ¥{a.balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Category selector */}
            {transType !== 'transfer' && (
              <div>
                <label className="text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-emerald-500" /> 消费分类:
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-[11px]"
                >
                  {filteredCategories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Date & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" /> 交易时间:
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="YYYY-MM-DD HH:mm"
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-[11px] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-emerald-500" /> 备注说明:
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="添加备注..."
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[11px] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2.5 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="py-2.5 px-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 font-bold flex items-center gap-1 text-[11px] transition active:scale-95 flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? '删除中' : '删除'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95 text-center"
            >
              取消
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition active:scale-95 whitespace-nowrap"
            >
              {saving ? '保存中...' : '保存修改'}
              <Check className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
