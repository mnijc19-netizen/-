import React, { useState } from 'react';
import { 
  PieChart, 
  AlertTriangle, 
  CheckCircle2, 
  AlertOctagon, 
  Plus, 
  Sparkles, 
  Calendar, 
  TrendingDown,
  X
} from 'lucide-react';
import { api } from '../api/client';
import { Budget, Category } from '../types';
import { getBeijingMonthString } from '../utils/dateUtils';

interface BudgetsPageProps {
  budgets: Budget[];
  categories: Category[];
  onRefresh: () => void;
}

export const BudgetsPage: React.FC<BudgetsPageProps> = ({ budgets, categories, onRefresh }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [period, setPeriod] = useState(() => getBeijingMonthString());
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [threshold, setThreshold] = useState('0.8');
  const [saving, setSaving] = useState(false);

  const expenseCategories = categories.filter(c => c.type === 'expense');

  const overallBudget = budgets.find(b => !b.category_id);
  const categoryBudgets = budgets.filter(b => b.category_id);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (!numAmt || numAmt <= 0) return;
    setSaving(true);
    try {
      await api.setBudget({
        period,
        category_id: categoryId || undefined,
        amount: numAmt,
        alert_threshold: parseFloat(threshold) || 0.8
      });
      setModalOpen(false);
      setAmount('');
      onRefresh();
    } catch (e: any) {
      alert(e.message || '设置失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-emerald-500" />
            预算监控与风控预警
          </h2>
          <p className="text-xs text-slate-400">
            按月度与分类设定支出上限，实时进度环与多阶段超支预警
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCategoryId(null);
            setAmount('');
            setModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> 设置/调整预算
        </button>
      </div>

      {/* Overall Monthly Budget Hero Card */}
      {overallBudget && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {overallBudget.period} 月度总预算监控
                </span>
                {overallBudget.status === 'danger' && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 text-[10px] font-bold flex items-center gap-1">
                    <AlertOctagon className="w-3 h-3" /> 已超支
                  </span>
                )}
                {overallBudget.status === 'warning' && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 text-[10px] font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> 预警中
                  </span>
                )}
                {overallBudget.status === 'normal' && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> 良好
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-4">
                <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                  ¥{overallBudget.spent_amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-400">
                  / 总预算 ¥{overallBudget.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                剩余可用额度：
                <strong className={`font-mono ${overallBudget.remaining_amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                  ¥{overallBudget.remaining_amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            <div className="text-right">
              <div className="text-4xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {overallBudget.spent_percentage}%
              </div>
              <div className="text-[11px] text-slate-400">已消耗总额度</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full mt-6 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                overallBudget.status === 'danger' 
                  ? 'bg-rose-500' 
                  : overallBudget.status === 'warning' 
                  ? 'bg-amber-500' 
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, overallBudget.spent_percentage)}%` }}
            />
          </div>
        </div>
      )}

      {/* Category Budgets Grid */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
          <span>核心品类预算追踪</span>
          <span className="text-xs font-normal text-slate-400">({categoryBudgets.length} 个分类)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryBudgets.map(b => (
            <div 
              key={b.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {b.category_name}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  b.status === 'danger' ? 'bg-rose-100 dark:bg-rose-950 text-rose-500' :
                  b.status === 'warning' ? 'bg-amber-100 dark:bg-amber-950 text-amber-500' :
                  'bg-emerald-100 dark:bg-emerald-950 text-emerald-500'
                }`}>
                  {b.spent_percentage}%
                </span>
              </div>

              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-400">已用: ¥{b.spent_amount.toFixed(2)}</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">限额: ¥{b.amount.toFixed(2)}</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    b.status === 'danger' ? 'bg-rose-500' :
                    b.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, b.spent_percentage)}%` }}
                />
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>剩余</span>
                <span className={`font-bold font-mono ${b.remaining_amount >= 0 ? 'text-slate-700 dark:text-slate-300' : 'text-rose-500'}`}>
                  ¥{b.remaining_amount.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                设置/调整预算
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">月份</label>
                <input
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1">预算目标分类 (留空为月度总预算)</label>
                <select
                  value={categoryId || ''}
                  onChange={(e) => setCategoryId(e.target.value || null)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">全部分类月度总预算</option>
                  {expenseCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-500 block mb-1">预算金额 (¥)</label>
                <input
                  type="number"
                  step="100"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="例如：5000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 dark:text-slate-300 font-bold">
                    超支预警线 (消费达到多少时提醒)
                  </label>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900/50 text-[11px]">
                    已用达 {Math.round(parseFloat(threshold || '0.8') * 100)}% 提醒
                  </span>
                </div>

                {/* 4 Quick Preset Chips */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: '70% 提前', val: '0.7' },
                    { label: '80% 推荐', val: '0.8' },
                    { label: '90% 临界', val: '0.9' },
                    { label: '100% 满额', val: '1.0' }
                  ].map(p => {
                    const isSelected = Math.abs(parseFloat(threshold || '0.8') - parseFloat(p.val)) < 0.01;
                    return (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setThreshold(p.val)}
                        className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition text-center active:scale-95 ${
                          isSelected
                            ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400">
                  当月累计消费达到预算的 {Math.round(parseFloat(threshold || '0.8') * 100)}% 时，系统将在首页自动标黄预警
                </p>
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
                  {saving ? '保存中...' : '保存预算'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
