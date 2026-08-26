import React, { useState } from 'react';
import { 
  Calendar, 
  CreditCard, 
  Wallet, 
  PieChart, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Plus, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  Edit3, 
  Trash2, 
  Check, 
  Layers,
  ChevronRight,
  TrendingDown,
  Info,
  X
} from 'lucide-react';
import { Debt, Budget, Transaction, Category } from '../types';
import { 
  calculateMonthlyCashflowPlan, 
  getMonthlyPlanConfig, 
  saveMonthlyPlanConfig, 
  getDebtTargetMonth 
} from '../services/repaymentScheduler';
import { api } from '../api/client';
import { getBeijingMonthString, getBeijingDateTimeString } from '../utils/dateUtils';

interface MonthlyPlannerPageProps {
  debts: Debt[];
  budgets: Budget[];
  transactions: Transaction[];
  categories: Category[];
  onRefresh: () => void;
  onNavigate?: (page: string) => void;
  onOpenAiChat?: () => void;
}

export const MonthlyPlannerPage: React.FC<MonthlyPlannerPageProps> = ({
  debts,
  budgets,
  transactions,
  categories,
  onRefresh,
  onNavigate,
  onOpenAiChat
}) => {
  const [activeTab, setActiveTab] = useState<'this_month' | 'next_month' | 'repaid'>('this_month');
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [salaryInput, setSalaryInput] = useState(() => String(getMonthlyPlanConfig().expected_salary));
  
  // Add Installment Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<any>('huabei');
  const [totalPrincipal, setTotalPrincipal] = useState('');
  const [totalInstallments, setTotalInstallments] = useState('3');
  const [currentInstallment, setCurrentInstallment] = useState('1');
  const [repayDay, setRepayDay] = useState('9');
  const [saving, setSaving] = useState(false);

  const plan = calculateMonthlyCashflowPlan(debts, budgets, transactions);
  const beijingDay = parseInt(getBeijingDateTimeString().slice(8, 10)) || 1;

  // Handle Salary Update
  const handleSaveSalary = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(salaryInput);
    if (!num || num < 0) return;
    saveMonthlyPlanConfig({ expected_salary: num });
    setSalaryModalOpen(false);
    onRefresh();
  };

  // Handle Mark Repaid / Toggle Repaid
  const handleToggleRepaid = async (debt: Debt) => {
    try {
      const nextStatus = !debt.is_repaid_this_month;
      await api.updateDebt(debt.id, { is_repaid_this_month: nextStatus });
      onRefresh();
    } catch (e: any) {
      alert(e.message || '更新失败');
    }
  };

  // Handle Add Installment
  const handleSaveInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    const tot = parseFloat(totalPrincipal);
    if (!tot || tot <= 0) return;
    const periods = parseInt(totalInstallments) || 1;
    const curr = parseInt(currentInstallment) || 1;
    const rDay = parseInt(repayDay) || 10;
    const monthlyPay = Number((tot / periods).toFixed(2));

    setSaving(true);
    try {
      await api.addDebt({
        name: name || '分期账单',
        type,
        total_principal: tot,
        remaining_principal: tot,
        monthly_payment: monthlyPay,
        total_installments: periods,
        current_installment: curr,
        repay_day: rDay,
        is_repaid_this_month: false
      });
      setAddModalOpen(false);
      setName('');
      setTotalPrincipal('');
      onRefresh();
    } catch (e: any) {
      alert(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDebt = async (id: string) => {
    if (confirm('确定删除该笔账单/分期吗？')) {
      await api.deleteDebt(id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-5 pb-36 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
              {plan.period} 资金大厅
            </span>
            <span className="text-[10px] text-slate-400">今日: {beijingDay}号</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-1">
            <Calendar className="w-5 h-5 text-emerald-500" />
            月度资金规划与分期大厅
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            工资入账 • 分期应还 • 消费预算扣除 • 真正剩余安全自由资金
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSalaryInput(String(plan.expectedSalary));
              setSalaryModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1 active:scale-95 border border-slate-200/80 dark:border-slate-700"
          >
            <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
            <span>设预计工资</span>
          </button>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center gap-1 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>加分期/账单</span>
          </button>
        </div>
      </div>

      {/* Hero Master Cashflow Equation Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/20 shadow-xl space-y-4 relative overflow-hidden">
        {/* Glow Refraction */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="text-xs text-indigo-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>本月预计剩余自由可用资金 (安全可支配现金流)</span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight mt-1">
              ¥{plan.safeFreeCashflow.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="flex-shrink-0">
            <span className={`px-3 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 border shadow-sm ${
              plan.healthStatus === 'comfortable'
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                : plan.healthStatus === 'moderate'
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                : 'bg-rose-500/20 border-rose-400/40 text-rose-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                plan.healthStatus === 'comfortable' ? 'bg-emerald-400' :
                plan.healthStatus === 'moderate' ? 'bg-amber-400' : 'bg-rose-400 animate-ping'
              }`} />
              <span>{plan.healthMessage}</span>
            </span>
          </div>
        </div>

        {/* 4-Pillar Breakdown Visualizer */}
        <div className="pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs relative z-10">
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[10px] text-indigo-200">💼 预计入账 (工资)</div>
            <div className="font-bold font-mono text-emerald-400 text-sm mt-0.5">
              +¥{plan.totalIncome.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">已到账: ¥{plan.recordedIncome.toFixed(2)}</div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[10px] text-indigo-200">💳 本月信贷分期应还</div>
            <div className="font-bold font-mono text-rose-400 text-sm mt-0.5">
              -¥{plan.thisMonthDueAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">{plan.thisMonthDebts.length}笔待结清</div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[10px] text-indigo-200">🍱 日常消费已支出</div>
            <div className="font-bold font-mono text-amber-300 text-sm mt-0.5">
              -¥{plan.livingExpensesSpent.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">真实生活流水</div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[10px] text-indigo-200">🛡️ 预留剩余预算</div>
            <div className="font-bold font-mono text-sky-300 text-sm mt-0.5">
              -¥{plan.remainingBudget.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">总额度: ¥{plan.totalBudget.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Credit & Installment Schedule Center */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              分期与还款日程（含花呗/白条/月付/分期）
            </h3>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('this_month')}
              className={`px-2.5 py-1 rounded-lg transition ${
                activeTab === 'this_month'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              本月待还 ({plan.thisMonthDebts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('next_month')}
              className={`px-2.5 py-1 rounded-lg transition ${
                activeTab === 'next_month'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              下月待还 ({plan.nextMonthDebts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('repaid')}
              className={`px-2.5 py-1 rounded-lg transition ${
                activeTab === 'repaid'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              本月已结 ({plan.thisMonthRepaidDebts.length})
            </button>
          </div>
        </div>

        {/* Debts List */}
        {(() => {
          const currentList = 
            activeTab === 'this_month' ? plan.thisMonthDebts :
            activeTab === 'next_month' ? plan.nextMonthDebts : plan.thisMonthRepaidDebts;

          if (currentList.length === 0) {
            return (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {activeTab === 'this_month' ? '本月暂无待还账单，现金流充裕！' :
                   activeTab === 'next_month' ? '下月暂无待还分期安排' : '本月尚未有结清记录'}
                </div>
                <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                  添加花呗、白条或消费分期后，系统会根据还款日自动归入当月或次月还款日程。
                </p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentList.map(debt => {
                const isRepaid = !!debt.is_repaid_this_month;
                const rDay = debt.repay_day || 10;
                const daysLeft = rDay - beijingDay;
                const totalInst = debt.total_installments || 1;
                const currInst = debt.current_installment || 1;

                return (
                  <div
                    key={debt.id}
                    className={`p-3.5 rounded-2xl border transition space-y-3 ${
                      isRepaid
                        ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 opacity-80'
                        : 'bg-white dark:bg-slate-850 border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                          💳
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {debt.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {totalInst > 1 ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold font-mono">
                                第 {currInst}/{totalInst} 期
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                单期账单
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">
                              每月{rDay}号还款
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="font-bold font-mono text-sm text-slate-900 dark:text-white">
                          ¥{(debt.monthly_payment || debt.remaining_principal).toFixed(2)}
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                          总待还: ¥{debt.remaining_principal.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar for installments */}
                    {totalInst > 1 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                          <span>分期偿还进度</span>
                          <span>{Math.round((currInst / totalInst) * 100)}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-indigo-500" 
                            style={{ width: `${Math.min(100, (currInst / totalInst) * 100)}%` }} 
                          />
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs gap-2">
                      <div className="text-[10px] font-mono">
                        {isRepaid ? (
                          <span className="text-emerald-500 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> 本月已还清
                          </span>
                        ) : daysLeft > 0 ? (
                          <span className="text-amber-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> 距还款日还有 {daysLeft} 天
                          </span>
                        ) : daysLeft === 0 ? (
                          <span className="text-rose-500 font-bold flex items-center gap-1">
                            ⚠️ 今日还款日！
                          </span>
                        ) : (
                          <span className="text-slate-400">已过本月还款日</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleRepaid(debt)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition active:scale-95 flex items-center gap-1 ${
                            isRepaid
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-700/40'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>{isRepaid ? '标记未还' : '标记已还'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDebt(debt.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Living Expense Budget Monitoring & Link */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              日常消费预算配额
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.('budgets')}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 hover:underline"
          >
            <span>管理分类预算</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {budgets.slice(0, 4).map(b => {
            const pct = Math.round(b.spent_percentage || 0);
            return (
              <div key={b.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {b.category_name || '月度总预算'}
                  </span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">
                    ¥{b.spent_amount.toFixed(0)} / ¥{b.amount.toFixed(0)}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      pct > 100 ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} 
                    style={{ width: `${Math.min(100, pct)}%` }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Salary Config Modal */}
      {salaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-500" />
                设定每月基准工资与入账
              </h3>
              <button 
                onClick={() => setSalaryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSalary} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  每月预计固定薪资 / 净入账 (元)
                </label>
                <input
                  type="number"
                  step="100"
                  value={salaryInput}
                  onChange={(e) => setSalaryInput(e.target.value)}
                  placeholder="例如 8000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              {/* Preset Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {['5000', '8000', '10000', '15000', '20000'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSalaryInput(val)}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 transition"
                  >
                    ¥{val}
                  </button>
                ))}
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSalaryModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20"
                >
                  保存设置
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Installment / Bill Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                新增分期账单或信贷
              </h3>
              <button 
                onClick={() => setAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInstallment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  账单/平台名称
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="如 花呗分期、京东白条、美团月付、手机分期"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    账单总金额 (元)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={totalPrincipal}
                    onChange={(e) => setTotalPrincipal(e.target.value)}
                    placeholder="如 1200"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    每月固定还款日 (号)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={repayDay}
                    onChange={(e) => setRepayDay(e.target.value)}
                    placeholder="如 9号/10号"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    分期总期数
                  </label>
                  <select
                    value={totalInstallments}
                    onChange={(e) => setTotalInstallments(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none"
                  >
                    <option value="1">单期 (1个月全额还)</option>
                    <option value="3">3 期 (3个月)</option>
                    <option value="6">6 期 (半年)</option>
                    <option value="12">12 期 (1年)</option>
                    <option value="24">24 期 (2年)</option>
                    <option value="36">36 期 (3年)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    当前进行到第几期
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={currentInstallment}
                    onChange={(e) => setCurrentInstallment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold outline-none"
                    required
                  />
                </div>
              </div>

              {/* Realtime Smart Routing Notice */}
              {(() => {
                const rDay = parseInt(repayDay) || 10;
                const isDueThisMonth = beijingDay <= rDay;
                const tot = parseFloat(totalPrincipal) || 0;
                const periods = parseInt(totalInstallments) || 1;
                const perMonth = periods > 0 ? (tot / periods).toFixed(2) : '0.00';

                return (
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 text-[11px] text-indigo-900 dark:text-indigo-200 space-y-1">
                    <div className="flex items-center gap-1 font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>智能归期：每期应还 ¥{perMonth}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      今日为 {beijingDay} 号，还款日为 {rDay} 号。本笔账单将自动归入【
                      <strong className={isDueThisMonth ? 'text-rose-500 font-bold' : 'text-indigo-400'}>
                        {isDueThisMonth ? '本月待还' : '下月待还'}
                      </strong>
                      】日程！
                    </p>
                  </div>
                );
              })()}

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {saving ? '保存中...' : '确认录入'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default MonthlyPlannerPage;
