import React, { useState } from 'react';
import { 
  Target, 
  Sparkles, 
  Plus, 
  Trash2, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  X,
  PiggyBank
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Goal } from '../types';
import { api } from '../api/client';

interface GoalsPageProps {
  goals: Goal[];
  onRefresh: () => void;
}

export const GoalsPage: React.FC<GoalsPageProps> = ({ goals, onRefresh }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  
  // Add Goal Form States
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.addGoal({
        name,
        target_amount: parseFloat(targetAmount) || 0,
        current_amount: parseFloat(currentAmount) || 0,
        target_date: targetDate || undefined,
        notes: notes || undefined
      });
      setModalOpen(false);
      setName('');
      setTargetAmount('');
      setCurrentAmount('0');
      onRefresh();
    } catch (e: any) {
      alert(e.message || '添加失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const numAmt = parseFloat(depositAmount);
    if (!numAmt || numAmt <= 0) return;
    setSaving(true);
    try {
      await api.depositToGoal(selectedGoal.id, numAmt);
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 }
      });
      setDepositModalOpen(false);
      setDepositAmount('');
      onRefresh();
    } catch (e: any) {
      alert(e.message || '存入失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定删除此心愿目标吗？')) {
      await api.deleteGoal(id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-500" />
            储蓄心愿单与财务目标
          </h2>
          <p className="text-xs text-slate-400">
            设定心愿目标，系统自动按倒计时测算每月需存入金额与达成进度
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> 创立新目标
        </button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map(goal => {
          const isComplete = goal.is_completed || goal.current_amount >= goal.target_amount;

          return (
            <div 
              key={goal.id}
              className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between gap-5 transition ${
                isComplete 
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-md'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {goal.name}
                      </h4>
                      {goal.target_date && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>目标期: {goal.target_date}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="p-1 rounded text-slate-300 hover:text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress Bar & Amounts */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                      ¥{goal.current_amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-slate-400">
                      / ¥{goal.target_amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, goal.progress_percentage)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400">已完成: <strong>{goal.progress_percentage}%</strong></span>
                    {goal.days_left !== undefined && (
                      <span className="text-slate-400">剩余: <strong>{goal.days_left}</strong> 天</span>
                    )}
                  </div>
                </div>

                {goal.monthly_suggested_save && !isComplete && (
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-xs text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
                    <span>建议每月存入:</span>
                    <strong className="font-mono">¥{goal.monthly_suggested_save.toFixed(2)}</strong>
                  </div>
                )}
              </div>

              {/* Action */}
              <div>
                {isComplete ? (
                  <div className="py-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> 目标已圆满达成！🎉
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGoal(goal);
                      setDepositAmount('');
                      setDepositModalOpen(true);
                    }}
                    className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <PiggyBank className="w-4 h-4" /> 存入心愿资金
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Goal Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                创立储蓄心愿目标
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">心愿目标名称</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：欧洲双人旅行、购买新电脑、家庭应急金"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1">目标总金额 (¥)</label>
                  <input
                    type="number"
                    step="100"
                    required
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="30000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">已筹备金额 (¥)</label>
                  <input
                    type="number"
                    step="100"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1">期望达成日期</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1">备注说明</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="给自己一句激励的话..."
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
                  {saving ? '保存中...' : '创立目标'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {depositModalOpen && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                存入「{selectedGoal.name}」
              </h3>
              <button onClick={() => setDepositModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeposit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">存入金额 (¥)</label>
                <input
                  type="number"
                  step="10"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="例如：500"
                  className="w-full px-4 py-3 text-2xl font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDepositModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {saving ? '存入中...' : '确认存入'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
