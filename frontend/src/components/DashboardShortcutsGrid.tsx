import React, { useState, useRef } from 'react';
import { 
  Calendar, 
  PieChart, 
  Target, 
  BarChart3, 
  CreditCard, 
  TrendingUp, 
  Bot, 
  Repeat, 
  Camera, 
  Settings, 
  Check, 
  Plus, 
  GripVertical, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw, 
  X
} from 'lucide-react';
import { DashboardShortcutItem, DEFAULT_DASHBOARD_SHORTCUTS, localStore } from '../services/localStore';

interface DashboardShortcutsGridProps {
  onNavigate: (page: string) => void;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Calendar,
  PieChart,
  Target,
  BarChart3,
  CreditCard,
  TrendingUp,
  Bot,
  Repeat,
  Camera
};

export const DashboardShortcutsGrid: React.FC<DashboardShortcutsGridProps> = ({ onNavigate }) => {
  const [shortcuts, setShortcuts] = useState<DashboardShortcutItem[]>(() => localStore.getDashboardShortcuts());
  const [isEditing, setIsEditing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Long press timer ref
  const pressTimerRef = useRef<any>(null);
  const isLongPressing = useRef(false);

  // Save changes to localStorage whenever shortcuts update
  const updateShortcuts = (newItems: DashboardShortcutItem[]) => {
    setShortcuts(newItems);
    localStore.saveDashboardShortcuts(newItems);
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
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= shortcuts.length) return;
    
    const newItems = [...shortcuts];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    updateShortcuts(newItems);
  };

  // Toggle enable
  const toggleItemEnabled = (id: string) => {
    const newItems = shortcuts.map(item => 
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    updateShortcuts(newItems);
  };

  // Reset to default
  const handleReset = () => {
    updateShortcuts(DEFAULT_DASHBOARD_SHORTCUTS);
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newItems = [...shortcuts];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    updateShortcuts(newItems);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const enabledShortcuts = shortcuts.filter(s => s.enabled);
  const hiddenShortcuts = shortcuts.filter(s => !s.enabled);

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
      {/* Header with Edit & Customization triggers */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            📱 常用财务入口
          </span>
          {isEditing ? (
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold animate-pulse">
              长按拖拽 / 点箭头调序
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 hidden sm:inline">长按可自定义排序与隐藏</span>
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

      {/* Grid of Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {enabledShortcuts.map((item, idx) => {
          const Icon = ICON_MAP[item.iconName] || Bot;

          return (
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
              onClick={() => {
                if (!isEditing && !isLongPressing.current) {
                  onNavigate(item.page);
                }
              }}
              className={`p-3 rounded-2xl border text-left transition select-none relative group ${item.bgClass} ${
                isEditing 
                  ? 'cursor-grab active:cursor-grabbing ring-2 ring-indigo-500/40 bg-white/90 dark:bg-slate-800/90 shadow-md animate-in zoom-in-95 duration-150' 
                  : 'cursor-pointer active:scale-95'
              }`}
            >
              {/* Top Edit Controls */}
              {isEditing && (
                <div className="absolute -top-1.5 -right-1.5 z-10 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItemEnabled(item.id);
                    }}
                    className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition"
                    title="从首页隐藏"
                  >
                    <X className="w-3 h-3 stroke-[3]" />
                  </button>
                </div>
              )}

              {/* Card Header: Icon + Badge */}
              <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-xl ${item.iconBgClass} ${item.iconColorClass} flex items-center justify-center group-hover:scale-105 transition flex-shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                {item.badge && !isEditing && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-white/80 dark:bg-slate-800/80 font-bold text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
                    {item.badge}
                  </span>
                )}
                {isEditing && (
                  <div className="flex items-center gap-1 text-slate-400">
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Title & Desc */}
              <div className="mt-2 space-y-0.5">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {item.title}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {item.desc}
                </div>
              </div>

              {/* Edit Mode Manual Step Buttons (for easy 1-tap reordering on mobile) */}
              {isEditing && (
                <div className="flex items-center justify-end gap-1.5 pt-2 mt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveItem(idx, 'up');
                    }}
                    className="p-1 rounded-md bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-indigo-500 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                    title="前移"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === enabledShortcuts.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveItem(idx, 'down');
                    }}
                    className="p-1 rounded-md bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-indigo-500 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                    title="后移"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Add more shortcuts card in edit mode */}
        {isEditing && hiddenShortcuts.length > 0 && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="p-3 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/30 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 flex flex-col items-center justify-center gap-1.5 transition active:scale-95 min-h-[90px]"
          >
            <div className="w-7 h-7 rounded-xl bg-indigo-500/15 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold">添加隐藏入口 ({hiddenShortcuts.length})</span>
          </button>
        )}
      </div>

      {/* Customization Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    自定义首页快捷入口
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    勾选显示在首页的财务模块并调整排序
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

            {/* Shortcuts List */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-slate-100 dark:divide-slate-800">
              {shortcuts.map((item, idx) => {
                const Icon = ICON_MAP[item.iconName] || Bot;

                return (
                  <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl ${item.iconBgClass} ${item.iconColorClass} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                          <span>{item.title}</span>
                          {item.badge && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {item.desc}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Move Up/Down */}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveItem(idx, 'up')}
                        className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-500 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition"
                        title="向上移动"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === shortcuts.length - 1}
                        onClick={() => moveItem(idx, 'down')}
                        className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-500 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition"
                        title="向下移动"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => toggleItemEnabled(item.id)}
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
                );
              })}
            </div>

            {/* Modal Footer */}
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
