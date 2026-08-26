import React from 'react';
import { 
  LayoutDashboard, 
  WalletCards, 
  ReceiptText, 
  Bot, 
  PieChart, 
  TrendingUp, 
  CreditCard, 
  BarChart3, 
  Target, 
  Settings,
  Sparkles
} from 'lucide-react';

export type PageId = 
  | 'dashboard'
  | 'accounts'
  | 'transactions'
  | 'parser'
  | 'budgets'
  | 'planner'
  | 'investments'
  | 'debts'
  | 'analytics'
  | 'goals'
  | 'settings';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
}

const NAV_ITEMS = [
  { id: 'dashboard' as PageId, label: '财务总览', icon: LayoutDashboard },
  { id: 'accounts' as PageId, label: '资产矩阵', icon: WalletCards },
  { id: 'transactions' as PageId, label: '账单流水', icon: ReceiptText },
  { id: 'parser' as PageId, label: '智能识别中心', icon: Bot, highlight: true },
  { id: 'budgets' as PageId, label: '预算与风控', icon: PieChart },
  { id: 'investments' as PageId, label: '投资理财', icon: TrendingUp },
  { id: 'debts' as PageId, label: '负债与还款', icon: CreditCard },
  { id: 'analytics' as PageId, label: '深度分析', icon: BarChart3 },
  { id: 'goals' as PageId, label: '心愿目标', icon: Target },
  { id: 'settings' as PageId, label: '系统设置', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onSelectPage }) => {
  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md flex flex-col justify-between p-4 hidden md:flex min-h-[calc(100vh-61px)]">
      <div className="space-y-1.5">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
          核心导航
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectPage(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.highlight && !isActive && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Anti-Abandonment Card */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 text-xs">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold mb-1">
          <Sparkles className="w-4 h-4" />
          <span>防放弃懒人技巧</span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          平时无需逐笔记账，微信/支付宝账单直接月度批量拖入，或用余额快照一键对账！
        </p>
      </div>
    </aside>
  );
};
