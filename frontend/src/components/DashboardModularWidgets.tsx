import React, { useState, useRef, useEffect } from 'react';
import { 
  CreditCard, 
  PieChart, 
  Target, 
  Calendar, 
  TrendingUp, 
  BarChart3, 
  Settings, 
  Check, 
  Plus, 
  X, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw, 
  ChevronRight, 
  GripVertical,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
  Lock,
  ReceiptText,
  Wallet,
  TrendingDown,
  Camera,
  ArrowRight
} from 'lucide-react';
import { 
  DashboardWidgetConfig, 
  DEFAULT_DASHBOARD_WIDGETS, 
  localStore 
} from '../services/localStore';
import { calculateMonthlyCashflowPlan } from '../services/repaymentScheduler';
import { haptic } from '../services/haptic';

interface DashboardModularWidgetsProps {
  privacyMode: boolean;
  onNavigateTo: (page: string) => void;
  onOpenQuickTx?: () => void;
  onOpenBatchBalance?: () => void;
}

export const DashboardModularWidgets: React.FC<DashboardModularWidgetsProps> = ({
  privacyMode,
  onNavigateTo,
  onOpenQuickTx,
  onOpenBatchBalance
}) => {
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(() => localStore.getDashboardWidgets());
  const [isEditing, setIsEditing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeDragIdx, setActiveDragIdx] = useState<number | null>(null);

  // Privacy State: Customizable Default Gaussian blur!
  const [debtsDefaultBlur, setDebtsDefaultBlur] = useState<boolean>(() => localStore.getDebtsDefaultBlur());
  const [debtsPrivacyRevealed, setDebtsPrivacyRevealed] = useState<boolean>(() => !localStore.getDebtsDefaultBlur());

  // Sync with global privacy mode toggle
  useEffect(() => {
    if (privacyMode) {
      setDebtsPrivacyRevealed(false);
    }
  }, [privacyMode]);

  // Long press refs to strictly distinguish scrolling from deliberate long-press
  const pressTimerRef = useRef<any>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isLongPressActive = useRef(false);

  // Unified Safe Navigation Handler: Strictly BLOCKED when in edit mode!
  const safeNavigate = (page: string) => {
    if (isEditing || isLongPressActive.current) return;
    haptic.selection();
    onNavigateTo(page);
  };

  // Save changes
  const updateWidgets = (newItems: DashboardWidgetConfig[]) => {
    setWidgets(newItems);
    localStore.saveDashboardWidgets(newItems);
  };

  // 1. Strict Scroll-Safe Long Press Handlers
  const handleCardTouchStart = (e: React.TouchEvent, index: number) => {
    if (isEditing) return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    isLongPressActive.current = false;

    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
    }

    pressTimerRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      setIsEditing(true);
      haptic.impact();
    }, 700);
  };

  const handleCardTouchMove = (e: React.TouchEvent) => {
    if (isEditing) return;
    if (!touchStartPos.current) return;
    
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);

    if (dx > 8 || dy > 8) {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
    }
  };

  const handleCardTouchEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    touchStartPos.current = null;
    setTimeout(() => {
      isLongPressActive.current = false;
    }, 150);
  };

  // 2. Buttery Smooth Mobile Touch Drag-and-Drop Reordering
  const currentDragIdxRef = useRef<number | null>(null);

  const handleGripTouchStart = (e: React.TouchEvent, index: number) => {
    e.stopPropagation();
    currentDragIdxRef.current = index;
    setActiveDragIdx(index);
    haptic.impact();
  };

  const handleGripTouchMove = (e: React.TouchEvent) => {
    if (currentDragIdxRef.current === null) return;
    e.preventDefault();

    const touch = e.touches[0];
    const elemUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!elemUnderTouch) return;

    const targetCard = elemUnderTouch.closest('[data-widget-index]');
    if (!targetCard) return;

    const targetIdxStr = targetCard.getAttribute('data-widget-index');
    if (targetIdxStr === null) return;

    const targetIdx = parseInt(targetIdxStr, 10);
    const fromIdx = currentDragIdxRef.current;

    if (!isNaN(targetIdx) && targetIdx !== fromIdx && fromIdx !== null) {
      const enabledList = widgets.filter(w => w.enabled);
      if (fromIdx >= 0 && fromIdx < enabledList.length && targetIdx >= 0 && targetIdx < enabledList.length) {
        const enabledItemA = enabledList[fromIdx];
        const enabledItemB = enabledList[targetIdx];

        const idxA = widgets.findIndex(w => w.id === enabledItemA.id);
        const idxB = widgets.findIndex(w => w.id === enabledItemB.id);

        if (idxA !== -1 && idxB !== -1) {
          const newWidgets = [...widgets];
          const temp = newWidgets[idxA];
          newWidgets[idxA] = newWidgets[idxB];
          newWidgets[idxB] = temp;

          currentDragIdxRef.current = targetIdx;
          setActiveDragIdx(targetIdx);
          updateWidgets(newWidgets);
          haptic.selection();
        }
      }
    }
  };

  const handleGripTouchEnd = () => {
    currentDragIdxRef.current = null;
    setActiveDragIdx(null);
  };

  // 3. Move item up / down via button
  const moveWidget = (index: number, direction: 'up' | 'down') => {
    const enabledList = widgets.filter(w => w.enabled);
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= enabledList.length) return;

    const itemA = enabledList[index];
    const itemB = enabledList[targetIdx];

    const idxA = widgets.findIndex(w => w.id === itemA.id);
    const idxB = widgets.findIndex(w => w.id === itemB.id);

    if (idxA !== -1 && idxB !== -1) {
      const newWidgets = [...widgets];
      const temp = newWidgets[idxA];
      newWidgets[idxA] = newWidgets[idxB];
      newWidgets[idxB] = temp;
      updateWidgets(newWidgets);
      haptic.selection();
    }
  };

  // 4. Toggle enable (Switch)
  const toggleWidgetEnabled = (id: string) => {
    haptic.toggle();
    const newItems = widgets.map(w => 
      w.id === id ? { ...w, enabled: !w.enabled } : w
    );
    updateWidgets(newItems);
  };

  // 5. Reset to default
  const handleReset = () => {
    haptic.warning();
    updateWidgets(DEFAULT_DASHBOARD_WIDGETS);
  };

  // Helper amount formatter
  const formatAmount = (val: number) => {
    return (val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // 100% Real Dynamic Data Sources from LocalStore (Zero fake hardcoded mock numbers)
  const debts = localStore.getDebts();
  const activeDebts = debts.filter(d => (d.remaining_principal || 0) > 0);
  const budgets = localStore.getBudgets();
  const goals = localStore.getGoals();
  const investments = localStore.getInvestments();
  const transactions = localStore.getTransactions();
  const recentTransactions = transactions.slice(0, 6);

  // Real Budget Calculations
  const totalBudget = budgets.reduce((acc, b) => acc + (b.amount || 0), 0);
  const currentMonthExpenses = transactions
    .filter(t => t.type === 'expense' && t.category_name !== '余额校准' && t.category_name !== '账户校准')
    .reduce((acc, t) => acc + t.amount, 0);
  const budgetSpentPct = totalBudget > 0 ? Math.min(100, Math.round((currentMonthExpenses / totalBudget) * 100)) : 0;
  const budgetRemaining = Math.max(0, totalBudget - currentMonthExpenses);

  // Real Goal Calculations
  const primaryGoal = goals.length > 0 ? goals[0] : null;
  const goalPct = primaryGoal && primaryGoal.target_amount > 0 
    ? Math.min(100, Math.round((primaryGoal.current_amount / primaryGoal.target_amount) * 100)) 
    : 0;

  // Real Investment Calculations
  const totalInvMarket = investments.reduce((acc, inv) => acc + (inv.market_value || inv.cost_price || 0), 0);
  const totalInvCost = investments.reduce((acc, inv) => acc + (inv.cost_price || inv.market_value || 0), 0);
  const totalInvProfit = totalInvMarket - totalInvCost;
  const invProfitPct = totalInvCost > 0 ? (totalInvProfit / totalInvCost) * 100 : 0;

  // Real Cashflow Planner Calculations
  const cashflowPlan = calculateMonthlyCashflowPlan(debts, budgets, transactions);
  const hasCashflowData = cashflowPlan.totalIncome > 0 || cashflowPlan.thisMonthDueAmount > 0 || currentMonthExpenses > 0;

  // Real Category Analytics Calculations
  const expenseTransactions = transactions.filter(t => t.type === 'expense' && t.category_name !== '余额校准' && t.category_name !== '账户校准');
  const catMap: Record<string, number> = {};
  let totalCatExpenses = 0;
  for (const tx of expenseTransactions) {
    const cat = tx.category_name || '其他支出';
    catMap[cat] = (catMap[cat] || 0) + tx.amount;
    totalCatExpenses += tx.amount;
  }
  const topCategories = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  // Enabled & Hidden widgets
  const enabledWidgets = widgets.filter(w => w.enabled);
  const hiddenWidgets = widgets.filter(w => !w.enabled);

  // Render specific widget content
  const renderWidgetContent = (type: string) => {
    switch (type) {
      case 'debts':
        return (
          <div className="space-y-2.5">
            {/* Header: Clean title with no cluttered buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>💳 分期待还</span>
                  {activeDebts.length > 0 && (
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({activeDebts.length}笔)
                    </span>
                  )}
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  safeNavigate('planner');
                }}
                disabled={isEditing}
                className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5 disabled:opacity-40 disabled:pointer-events-none"
              >
                <span>分期管理</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {activeDebts.length > 0 ? (
              <div className="space-y-2">
                {activeDebts.map((d) => (
                  <div 
                    key={d.id} 
                    onClick={() => {
                      if (!isEditing) {
                        haptic.toggle();
                        setDebtsPrivacyRevealed(!debtsPrivacyRevealed);
                      }
                    }}
                    className={`p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-rose-200/50 dark:border-rose-900/40 flex items-center justify-between shadow-xs transition relative overflow-hidden select-none ${
                      isEditing ? 'cursor-default' : 'hover:border-rose-400 cursor-pointer active:scale-[0.99]'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{d.name}</span>
                        {d.is_repaid_this_month ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> 本月已还
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-rose-500 text-white font-bold">
                            第 {d.current_installment || 1}/{d.total_installments || 3} 期
                          </span>
                        )}
                      </div>

                      {/* Gaussian Blurred Details: Tap card to toggle blur/unblur */}
                      <div 
                        style={{
                          filter: debtsPrivacyRevealed ? 'none' : 'blur(5.5px)',
                          transition: 'filter 0.35s ease, opacity 0.35s ease'
                        }}
                        className={`text-[10px] text-slate-400 select-none ${!debtsPrivacyRevealed ? 'opacity-80' : 'opacity-100'}`}
                      >
                        还款日: 每月{d.repay_day || 4}日 · 总待还: ¥{formatAmount(d.remaining_principal || 0)}
                      </div>
                    </div>

                    {/* Gaussian Blurred Amount: Tap card to toggle blur/unblur */}
                    <div className="text-right">
                      <div 
                        style={{
                          filter: debtsPrivacyRevealed ? 'none' : 'blur(6.5px)',
                          transition: 'filter 0.35s ease, opacity 0.35s ease'
                        }}
                        className={`text-xs font-mono font-bold text-rose-600 dark:text-rose-400 select-none ${!debtsPrivacyRevealed ? 'opacity-85' : 'opacity-100'}`}
                      >
                        ¥{formatAmount(d.monthly_payment || 0)}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {d.is_repaid_this_month ? '当期已结清' : '当期应还'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div 
                onClick={() => safeNavigate('planner')}
                className={`p-3 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-dashed border-rose-200 dark:border-rose-900/40 flex items-center justify-between text-slate-500 transition ${
                  isEditing ? 'cursor-default' : 'hover:text-rose-600 cursor-pointer'
                }`}
              >
                <span className="text-[11px]">暂无待还分期负债，点击一键添加白条/花呗/月供</span>
                <Plus className="w-4 h-4 text-rose-500" />
              </div>
            )}
          </div>
        );

      case 'budgets':
        return (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <PieChart className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  📊 本月预算 {budgets.length > 0 ? `(${budgets.length}项)` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  safeNavigate('budgets');
                }}
                disabled={isEditing}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 disabled:opacity-40 disabled:pointer-events-none"
              >
                <span>预算管理</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {totalBudget > 0 ? (
              <div 
                onClick={() => safeNavigate('budgets')}
                className={`p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-blue-200/50 dark:border-blue-900/40 space-y-2 transition ${
                  isEditing ? 'cursor-default' : 'hover:border-blue-400 cursor-pointer active:scale-[0.99]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    已用 <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">¥{formatAmount(currentMonthExpenses)}</span>
                    <span className="text-slate-400 font-normal text-[10px] ml-1">/ 预算 ¥{formatAmount(totalBudget)}</span>
                  </div>
                  <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    剩余 ¥{formatAmount(budgetRemaining)} ({100 - budgetSpentPct}%)
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      budgetSpentPct > 90 ? 'bg-rose-500' : budgetSpentPct > 70 ? 'bg-amber-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                    }`}
                    style={{ width: `${budgetSpentPct}%` }}
                  />
                </div>
              </div>
            ) : (
              <div 
                onClick={() => safeNavigate('budgets')}
                className={`p-3 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-dashed border-blue-200 dark:border-blue-900/40 flex items-center justify-between text-slate-500 transition ${
                  isEditing ? 'cursor-default' : 'hover:text-blue-600 cursor-pointer'
                }`}
              >
                <span className="text-[11px]">暂未设置月度预算，点击设定每月消费限额与超支预警</span>
                <Plus className="w-4 h-4 text-blue-500" />
              </div>
            )}
          </div>
        );

      case 'goals':
        return (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <Target className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  🎯 存钱目标 {goals.length > 0 ? `(${goals.length}个)` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  safeNavigate('goals');
                }}
                disabled={isEditing}
                className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5 disabled:opacity-40 disabled:pointer-events-none"
              >
                <span>心愿单</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {primaryGoal ? (
              <div 
                onClick={() => safeNavigate('goals')}
                className={`p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-purple-200/50 dark:border-purple-900/40 space-y-2 transition ${
                  isEditing ? 'cursor-default' : 'hover:border-purple-400 cursor-pointer active:scale-[0.99]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>🌟 {primaryGoal.name}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-bold">
                      进度 {goalPct}%
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    已存 ¥{formatAmount(primaryGoal.current_amount)} / 目标 ¥{formatAmount(primaryGoal.target_amount)}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${goalPct}%` }}
                  />
                </div>
              </div>
            ) : (
              <div 
                onClick={() => safeNavigate('goals')}
                className={`p-3 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-dashed border-purple-200 dark:border-purple-900/40 flex items-center justify-between text-slate-500 transition ${
                  isEditing ? 'cursor-default' : 'hover:text-purple-600 cursor-pointer'
                }`}
              >
                <span className="text-[11px]">暂无存钱心愿，点击设立第 1 个心愿单（如换电脑/备用金）</span>
                <Plus className="w-4 h-4 text-purple-500" />
              </div>
            )}
          </div>
        );

      case 'planner':
        return (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  📅 资金规划
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  safeNavigate('planner');
                }}
                disabled={isEditing}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 disabled:opacity-40 disabled:pointer-events-none"
              >
                <span>规划大厅</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {hasCashflowData ? (
              <div 
                onClick={() => safeNavigate('planner')}
                className={`p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-emerald-200/50 dark:border-emerald-900/40 grid grid-cols-3 gap-2 text-center transition ${
                  isEditing ? 'cursor-default' : 'hover:border-emerald-400 cursor-pointer active:scale-[0.99]'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="text-[10px] text-slate-400">预计月入</div>
                  <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    ¥{formatAmount(cashflowPlan.totalIncome || cashflowPlan.recordedIncome)}
                  </div>
                </div>
                <div className="space-y-0.5 border-x border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400">刚性支出+待还</div>
                  <div className="text-xs font-mono font-bold text-rose-500">
                    -¥{formatAmount(cashflowPlan.thisMonthDueAmount + (cashflowPlan.livingExpensesSpent || currentMonthExpenses))}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" /> 自由现金流
                  </div>
                  <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ¥{formatAmount(cashflowPlan.safeFreeCashflow)}
                  </div>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => safeNavigate('planner')}
                className={`p-3 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-dashed border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between text-slate-500 transition ${
                  isEditing ? 'cursor-default' : 'hover:text-emerald-600 cursor-pointer'
                }`}
              >
                <span className="text-[11px]">暂未设定月度资金规划，点击开启薪资与自由现金流测算</span>
                <Plus className="w-4 h-4 text-emerald-500" />
              </div>
            )}
          </div>
        );

      case 'investments':
        return (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  💰 投资理财 {investments.length > 0 ? `(${investments.length}个)` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  safeNavigate('investments');
                }}
                disabled={isEditing}
                className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 disabled:opacity-40 disabled:pointer-events-none"
              >
                <span>持仓明细</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {investments.length > 0 && totalInvMarket > 0 ? (
              <div 
                onClick={() => safeNavigate('investments')}
                className={`p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-amber-200/50 dark:border-amber-900/40 flex items-center justify-between transition ${
                  isEditing ? 'cursor-default' : 'hover:border-amber-400 cursor-pointer active:scale-[0.99]'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    券商与基金总市值
                  </div>
                  <div className="text-[10px] text-slate-400">
                    共 {investments.length} 个持仓标的
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                    ¥{formatAmount(totalInvMarket)}
                  </div>
                  <div className={`text-[9px] font-bold ${totalInvProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {totalInvProfit >= 0 ? '+' : ''}¥{formatAmount(totalInvProfit)} ({invProfitPct >= 0 ? '+' : ''}{invProfitPct.toFixed(2)}%)
                  </div>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => safeNavigate('investments')}
                className={`p-3 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-dashed border-amber-200 dark:border-amber-900/40 flex items-center justify-between text-slate-500 transition ${
                  isEditing ? 'cursor-default' : 'hover:text-amber-600 cursor-pointer'
                }`}
              >
                <span className="text-[11px]">暂无持仓资产，点击添加券商/基金/股票持仓</span>
                <Plus className="w-4 h-4 text-amber-500" />
              </div>
            )}
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                  <BarChart3 className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  📈 支出分类
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  safeNavigate('analytics');
                }}
                disabled={isEditing}
                className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5 disabled:opacity-40 disabled:pointer-events-none"
              >
                <span>图表透视</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {topCategories.length > 0 && totalCatExpenses > 0 ? (
              <div 
                onClick={() => safeNavigate('analytics')}
                className={`p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-teal-200/50 dark:border-teal-900/40 space-y-2 transition ${
                  isEditing ? 'cursor-default' : 'hover:border-teal-400 cursor-pointer active:scale-[0.99]'
                }`}
              >
                {topCategories.map(([cat, amount]) => {
                  const pct = Math.round((amount / totalCatExpenses) * 100);
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-700 dark:text-slate-300 font-bold">{cat} ({pct}%)</span>
                        <span className="font-mono text-slate-500">¥{formatAmount(amount)}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div 
                onClick={() => safeNavigate('analytics')}
                className={`p-3 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-dashed border-teal-200 dark:border-teal-900/40 flex items-center justify-between text-slate-500 transition ${
                  isEditing ? 'cursor-default' : 'hover:text-teal-600 cursor-pointer'
                }`}
              >
                <span className="text-[11px]">本月暂无日常消费，记一笔账后即可查看分类透视</span>
                <Plus className="w-4 h-4 text-teal-500" />
              </div>
            )}
          </div>
        );

      case 'transactions':
        return (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-slate-500/15 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
                  <ReceiptText className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  📝 最新明细 ({transactions.length})
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  safeNavigate('transactions');
                }}
                disabled={isEditing}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 disabled:opacity-40 disabled:pointer-events-none"
              >
                <span>全部明细</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="py-6 text-center space-y-3 bg-white/60 dark:bg-slate-900/60 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <ReceiptText className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    暂无记账记录
                  </div>
                  <p className="text-[10px] text-slate-400">
                    选择一种快捷方式，立即开启全新账本：
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto pt-1 px-3">
                  <button
                    type="button"
                    disabled={isEditing}
                    onClick={() => {
                      if (!isEditing) onOpenBatchBalance?.();
                    }}
                    className="p-2 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-[10px] font-bold flex items-center justify-center gap-1.5 hover:bg-purple-100 transition active:scale-95 disabled:opacity-50"
                  >
                    <Camera className="w-3.5 h-3.5 text-purple-600" />
                    <span>📸 批量识余额</span>
                  </button>

                  <button
                    type="button"
                    disabled={isEditing}
                    onClick={() => {
                      if (!isEditing) onOpenQuickTx?.();
                    }}
                    className="p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition active:scale-95 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>⚡ 记第一笔账</span>
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => safeNavigate('transactions')}
                className={`p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 divide-y divide-slate-100 dark:divide-slate-800/80 transition ${
                  isEditing ? 'cursor-default' : 'hover:border-slate-400 cursor-pointer active:scale-[0.99]'
                }`}
              >
                {recentTransactions.map(tx => (
                  <div key={tx.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
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
                        <div className="text-[10px] text-slate-400 truncate">
                          {tx.date.substring(5, 16)} • {tx.account_name || '默认账户'}
                        </div>
                      </div>
                    </div>

                    <div className={`text-xs font-bold font-mono flex-shrink-0 ${
                      tx.category_name === '余额校准' 
                        ? 'text-amber-600 dark:text-amber-400'
                        : tx.type === 'income' 
                          ? 'text-emerald-500' 
                          : 'text-slate-900 dark:text-white'
                    }`}>
                      {privacyMode 
                        ? '••••' 
                        : `${tx.type === 'income' ? '+' : '-'}¥${tx.amount.toFixed(2)}`
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Widget background class mapping
  const getWidgetBgClass = (type: string) => {
    switch (type) {
      case 'debts':
        return 'bg-gradient-to-br from-rose-500/10 via-amber-500/10 to-indigo-500/10 border-rose-200/70 dark:border-rose-800/50';
      case 'budgets':
        return 'bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-cyan-500/10 border-blue-200/70 dark:border-blue-800/50';
      case 'goals':
        return 'bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-indigo-500/10 border-purple-200/70 dark:border-purple-800/50';
      case 'planner':
        return 'bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border-emerald-200/70 dark:border-emerald-800/50';
      case 'investments':
        return 'bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-yellow-500/10 border-amber-200/70 dark:border-amber-800/50';
      case 'analytics':
        return 'bg-gradient-to-br from-teal-500/10 via-emerald-500/10 to-blue-500/10 border-teal-200/70 dark:border-teal-800/50';
      case 'transactions':
        return 'bg-gradient-to-br from-slate-500/10 via-indigo-500/5 to-slate-500/10 border-slate-200/80 dark:border-slate-800/80';
      default:
        return 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800';
    }
  };

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            ✨ 首页卡片
          </span>
          {isEditing ? (
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold animate-pulse flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> 拖动手柄实时调序 · 点击已暂停
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 hidden sm:inline">长按或点右侧设置调序</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <button
              type="button"
              onClick={() => {
                haptic.success();
                setIsEditing(false);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-600/20 active:scale-95 transition"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" /> 完成
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  setModalOpen(true);
                }}
                className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 py-1 px-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <Settings className="w-3 h-3" />
                <span>自定义</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  setIsEditing(true);
                }}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline py-1 px-2"
              >
                排序
              </button>
            </>
          )}
        </div>
      </div>

      {/* Render Enabled Horizontal Widgets with Fluid Spring Transition */}
      <div className="space-y-3">
        {enabledWidgets.map((item, idx) => {
          const isCurrentDrag = activeDragIdx === idx;

          return (
            <div
              key={item.id}
              data-widget-index={idx}
              onTouchStart={(e) => handleCardTouchStart(e, idx)}
              onTouchMove={handleCardTouchMove}
              onTouchEnd={handleCardTouchEnd}
              style={{
                transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease, opacity 0.2s ease'
              }}
              className={`p-4 rounded-3xl border shadow-sm relative select-none ${getWidgetBgClass(item.id)} ${
                isEditing 
                  ? 'ring-2 ring-indigo-500/40 bg-white/95 dark:bg-slate-900/95 shadow-md' 
                  : ''
              } ${isCurrentDrag ? 'scale-[1.03] shadow-2xl ring-4 ring-indigo-600/90 bg-white dark:bg-slate-800 z-30 opacity-95 -translate-y-1' : ''}`}
            >
              {/* Top Edit Controls */}
              {isEditing && (
                <div className="absolute -top-2.5 -right-2 z-10 flex items-center gap-1 animate-in zoom-in-75 duration-200">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWidgetEnabled(item.id);
                    }}
                    className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md hover:scale-110 active:scale-90 transition"
                    title="从首页隐藏此看板"
                  >
                    <X className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>
              )}

              {/* Widget Inner Content */}
              <div className={isEditing ? 'pointer-events-none opacity-90' : ''}>
                {renderWidgetContent(item.id)}
              </div>

              {/* Edit Mode Reorder Bar with Fluid Touch Grip Handle */}
              {isEditing && (
                <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-200/60 dark:border-slate-700/60">
                  {/* Dedicated Touch Drag Grip Handle */}
                  <div
                    onTouchStart={(e) => handleGripTouchStart(e, idx)}
                    onTouchMove={handleGripTouchMove}
                    onTouchEnd={handleGripTouchEnd}
                    className={`flex items-center gap-2 py-2 px-3.5 rounded-2xl transition-all select-none touch-none shadow-xs ${
                      isCurrentDrag 
                        ? 'bg-indigo-600 text-white scale-105 shadow-md' 
                        : 'bg-slate-200/90 dark:bg-slate-700/90 text-slate-700 dark:text-slate-200 active:bg-indigo-600 active:text-white'
                    }`}
                  >
                    <GripVertical className={`w-4 h-4 ${isCurrentDrag ? 'text-white' : 'text-indigo-500 dark:text-indigo-400'}`} />
                    <span className="text-[11px] font-bold">按住拖动换位</span>
                  </div>

                  {/* 1-Tap Touch Reorder Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveWidget(idx, 'up');
                      }}
                      className="py-2 px-3 rounded-2xl bg-slate-200/90 dark:bg-slate-700/90 text-slate-700 dark:text-slate-200 hover:bg-indigo-500 hover:text-white disabled:opacity-20 disabled:pointer-events-none active:scale-95 transition flex items-center gap-1 text-[11px] font-bold shadow-xs"
                      title="上移"
                    >
                      <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" /> 上移
                    </button>
                    <button
                      type="button"
                      disabled={idx === enabledWidgets.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveWidget(idx, 'down');
                      }}
                      className="py-2 px-3 rounded-2xl bg-slate-200/90 dark:bg-slate-700/90 text-slate-700 dark:text-slate-200 hover:bg-indigo-500 hover:text-white disabled:opacity-20 disabled:pointer-events-none active:scale-95 transition flex items-center gap-1 text-[11px] font-bold shadow-xs"
                      title="下移"
                    >
                      <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" /> 下移
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add more widgets button in edit mode */}
        {isEditing && hiddenWidgets.length > 0 && (
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setModalOpen(true);
            }}
            className="w-full p-4 rounded-3xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <div className="w-7 h-7 rounded-xl bg-indigo-500/15 flex items-center justify-center font-bold">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold">添加隐藏看板 (+{hiddenWidgets.length})</span>
          </button>
        )}
      </div>

      {/* Customization Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    自定义首页卡片
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    勾选需要在首页展示的横版信息卡片并调整顺序
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  setModalOpen(false);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-slate-100 dark:divide-slate-800">
              {widgets.map((item, idx) => (
                <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {item.subtitle}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Move Up/Down */}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveWidget(idx, 'up')}
                      className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-500 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition"
                      title="向上移动"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === widgets.length - 1}
                      onClick={() => moveWidget(idx, 'down')}
                      className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-500 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition"
                      title="向下移动"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => toggleWidgetEnabled(item.id)}
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                        item.enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        item.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 🔒 Privacy Configuration Option */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-rose-500" />
                  <span>分期卡片默认高斯模糊</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  开启后进入网站默认遮蔽分期金额，点按卡片可随时解密/再遮挡
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  haptic.toggle();
                  const next = !debtsDefaultBlur;
                  setDebtsDefaultBlur(next);
                  localStore.saveDebtsDefaultBlur(next);
                  setDebtsPrivacyRevealed(!next);
                }}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 flex-shrink-0 ${
                  debtsDefaultBlur ? 'bg-rose-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  debtsDefaultBlur ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 active:scale-95 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>恢复默认布局</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  haptic.success();
                  setModalOpen(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition"
              >
                保存设置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
