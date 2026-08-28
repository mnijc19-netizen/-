import React, { useState, useRef } from 'react';
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
  Sparkles
} from 'lucide-react';
import { 
  DashboardWidgetConfig, 
  DEFAULT_DASHBOARD_WIDGETS, 
  localStore 
} from '../services/localStore';

interface DashboardModularWidgetsProps {
  privacyMode: boolean;
  onNavigateTo: (page: string) => void;
}

export const DashboardModularWidgets: React.FC<DashboardModularWidgetsProps> = ({
  privacyMode,
  onNavigateTo
}) => {
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(() => localStore.getDashboardWidgets());
  const [isEditing, setIsEditing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Long press timer
  const pressTimerRef = useRef<any>(null);
  const isLongPressing = useRef(false);

  // Save changes
  const updateWidgets = (newItems: DashboardWidgetConfig[]) => {
    setWidgets(newItems);
    localStore.saveDashboardWidgets(newItems);
  };

  // Start Long Press
  const handleTouchStart = (index: number) => {
    isLongPressing.current = false;
    pressTimerRef.current = setTimeout(() => {
      isLongPressing.current = true;
      setIsEditing(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 450);
  };

  const handleTouchEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  // Move item up / down
  const moveWidget = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= widgets.length) return;

    const newItems = [...widgets];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    updateWidgets(newItems);
  };

  // Toggle enable
  const toggleWidgetEnabled = (id: string) => {
    const newItems = widgets.map(w => 
      w.id === id ? { ...w, enabled: !w.enabled } : w
    );
    updateWidgets(newItems);
  };

  // Reset to default
  const handleReset = () => {
    updateWidgets(DEFAULT_DASHBOARD_WIDGETS);
  };

  // Drag & drop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...widgets];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    updateWidgets(newItems);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Data sources
  const debts = localStore.getDebts();
  const activeDebts = debts.filter(d => (d.remaining_principal || 0) > 0);
  const budgets = localStore.getBudgets();
  const goals = localStore.getGoals();
  const investments = localStore.getInvestments();
  const transactions = localStore.getTransactions();

  // Helper amount formatter
  const formatAmount = (val: number) => {
    if (privacyMode) return '••••';
    return val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Budget calculations
  const totalBudget = budgets.reduce((acc, b) => acc + (b.amount || 0), 0) || 3000;
  const currentMonthExpenses = transactions
    .filter(t => t.type === 'expense' && t.category_name !== '余额校准' && t.category_name !== '账户校准')
    .reduce((acc, t) => acc + t.amount, 0);
  const budgetSpentPct = Math.min(100, Math.round((currentMonthExpenses / totalBudget) * 100));
  const budgetRemaining = Math.max(0, totalBudget - currentMonthExpenses);

  // Goal calculations
  const primaryGoal = goals.length > 0 ? goals[0] : null;
  const goalPct = primaryGoal ? Math.min(100, Math.round((primaryGoal.current_amount / primaryGoal.target_amount) * 100)) : 0;

  // Investment calculations
  const totalInv = investments.reduce((acc, inv) => acc + (inv.market_value || inv.cost_price || 0), 0) || 1966.65;

  // Enabled & Hidden widgets
  const enabledWidgets = widgets.filter(w => w.enabled);
  const hiddenWidgets = widgets.filter(w => !w.enabled);

  // Render specific widget content
  const renderWidgetContent = (type: string) => {
    switch (type) {
      case 'debts':
        return (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  💳 本期待还分期智能看板 {activeDebts.length > 0 ? `(${activeDebts.length}笔)` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTo('planner')}
                className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5"
              >
                <span>资金规划大厅</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {activeDebts.length > 0 ? (
              <div className="space-y-2">
                {activeDebts.map((d) => (
                  <div 
                    key={d.id} 
                    onClick={() => onNavigateTo('planner')}
                    className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-rose-200/50 dark:border-rose-900/40 flex items-center justify-between shadow-xs hover:border-rose-400 transition cursor-pointer"
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
                      <div className="text-[10px] text-slate-400">
                        还款日: 每月{d.repay_day || 4}日 · 总待还: ¥{formatAmount(d.remaining_principal || 0)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                        ¥{formatAmount(d.monthly_payment || 268.02)}
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
                onClick={() => onNavigateTo('planner')}
                className="p-3 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-dashed border-rose-200 dark:border-rose-900/40 flex items-center justify-between text-slate-500 hover:text-rose-600 transition cursor-pointer"
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
                  📊 月度预算实时监控
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTo('budgets')}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <span>预算管理</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div 
              onClick={() => onNavigateTo('budgets')}
              className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-blue-200/50 dark:border-blue-900/40 space-y-2 cursor-pointer hover:border-blue-400 transition"
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
                  🎯 存钱计划与心愿目标 {goals.length > 0 ? `(${goals.length}个)` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTo('goals')}
                className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5"
              >
                <span>心愿大厅</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {primaryGoal ? (
              <div 
                onClick={() => onNavigateTo('goals')}
                className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-purple-200/50 dark:border-purple-900/40 space-y-2 cursor-pointer hover:border-purple-400 transition"
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
                onClick={() => onNavigateTo('goals')}
                className="p-3 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-dashed border-purple-200 dark:border-purple-900/40 flex items-center justify-between text-slate-500 hover:text-purple-600 transition cursor-pointer"
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
                  📅 月度资金规划与自由现金流
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTo('planner')}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
              >
                <span>规划大厅</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div 
              onClick={() => onNavigateTo('planner')}
              className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-emerald-200/50 dark:border-emerald-900/40 grid grid-cols-3 gap-2 text-center cursor-pointer hover:border-emerald-400 transition"
            >
              <div className="space-y-0.5">
                <div className="text-[10px] text-slate-400">预计月入</div>
                <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                  ¥{formatAmount(8500.00)}
                </div>
              </div>
              <div className="space-y-0.5 border-x border-slate-100 dark:border-slate-800">
                <div className="text-[10px] text-slate-400">刚性支出+待还</div>
                <div className="text-xs font-mono font-bold text-rose-500">
                  -¥{formatAmount(3480.00)}
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> 自由现金流
                </div>
                <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  ¥{formatAmount(5020.00)}
                </div>
              </div>
            </div>
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
                  💰 投资理财与基金持仓
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTo('investments')}
                className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5"
              >
                <span>持仓明细</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div 
              onClick={() => onNavigateTo('investments')}
              className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-amber-200/50 dark:border-amber-900/40 flex items-center justify-between cursor-pointer hover:border-amber-400 transition"
            >
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  券商与基金总持仓
                </div>
                <div className="text-[10px] text-slate-400">
                  含华泰证券、天天基金等理财资产
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                  ¥{formatAmount(totalInv)}
                </div>
                <div className="text-[9px] text-emerald-500 font-bold">
                  +¥88.50 (+4.5%)
                </div>
              </div>
            </div>
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
                  📈 支出分类透视分析
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTo('analytics')}
                className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5"
              >
                <span>查看图表</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div 
              onClick={() => onNavigateTo('analytics')}
              className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-teal-200/50 dark:border-teal-900/40 space-y-1.5 cursor-pointer hover:border-teal-400 transition"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-700 dark:text-slate-300 font-bold">🍱 餐饮美食 (48%)</span>
                <span className="font-mono text-slate-500">¥{formatAmount(162.61)}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: '48%' }} />
              </div>
            </div>
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
            ✨ 首页智能财务看板
          </span>
          {isEditing ? (
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold animate-pulse">
              长按拖拽 / 点箭头调序
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 hidden sm:inline">长按卡片可调顺序与隐藏</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm active:scale-95 transition"
            >
              <Check className="w-3.5 h-3.5" /> 完成
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 py-0.5 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Settings className="w-3 h-3" />
                <span>自定义</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline py-0.5 px-1.5"
              >
                排序
              </button>
            </>
          )}
        </div>
      </div>

      {/* Render Enabled Horizontal Widgets */}
      <div className="space-y-3">
        {enabledWidgets.map((item, idx) => (
          <div
            key={item.id}
            draggable={isEditing}
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
            onTouchStart={() => handleTouchStart(idx)}
            onTouchEnd={handleTouchEnd}
            onMouseDown={() => handleTouchStart(idx)}
            onMouseUp={handleTouchEnd}
            className={`p-4 rounded-3xl border shadow-sm relative transition select-none ${getWidgetBgClass(item.id)} ${
              isEditing 
                ? 'cursor-grab active:cursor-grabbing ring-2 ring-indigo-500/40 bg-white/95 dark:bg-slate-900/95 shadow-lg animate-in zoom-in-98 duration-150' 
                : ''
            }`}
          >
            {/* Top Edit Controls */}
            {isEditing && (
              <div className="absolute -top-2 -right-2 z-10 flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWidgetEnabled(item.id);
                  }}
                  className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition"
                  title="从首页隐藏此看板"
                >
                  <X className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>
            )}

            {/* Widget Inner Content */}
            {renderWidgetContent(item.id)}

            {/* Edit Mode Reorder Buttons */}
            {isEditing && (
              <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <GripVertical className="w-3.5 h-3.5" />
                  <span>按住卡片可拖拽调序</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveWidget(idx, 'up');
                    }}
                    className="p-1 px-2 rounded-lg bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-indigo-500 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-1 text-[10px] font-bold"
                    title="上移"
                  >
                    <ArrowUp className="w-3 h-3" /> 上移
                  </button>
                  <button
                    type="button"
                    disabled={idx === enabledWidgets.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveWidget(idx, 'down');
                    }}
                    className="p-1 px-2 rounded-lg bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-indigo-500 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-1 text-[10px] font-bold"
                    title="下移"
                  >
                    <ArrowDown className="w-3 h-3" /> 下移
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add more widgets button in edit mode */}
        {isEditing && hiddenWidgets.length > 0 && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
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
                    自定义首页智能看板
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    勾选需要在首页展示的横版信息卡片并调整顺序
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
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
                onClick={() => setModalOpen(false)}
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
