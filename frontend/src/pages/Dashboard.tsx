import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ShieldCheck, 
  CreditCard, 
  Sparkles, 
  ArrowRight, 
  Plus, 
  Activity, 
  CheckCircle2, 
  Camera,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { DashboardAnalytics, Transaction, Account, Category } from '../types';
import { api } from '../api/client';

interface DashboardProps {
  analytics: DashboardAnalytics | null;
  accounts: Account[];
  transactions: Transaction[];
  onOpenSmartParser: () => void;
  onOpenQuickTx: () => void;
  onOpenSnapshot: () => void;
  onNavigateTo: (page: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  analytics,
  accounts,
  transactions,
  onOpenSmartParser,
  onOpenQuickTx,
  onOpenSnapshot,
  onNavigateTo
}) => {
  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Monthly trend chart options
  const trendOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['收入', '支出', '结余'],
      textStyle: { color: '#94a3b8' },
      top: 0
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: analytics.monthly_trends.map(t => t.month),
      axisLine: { lineStyle: { color: '#64748b' } },
      axisLabel: { color: '#94a3b8', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#64748b' } },
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.1)' } },
      axisLabel: { color: '#94a3b8', fontSize: 11 }
    },
    series: [
      {
        name: '收入',
        type: 'bar',
        barMaxWidth: 18,
        itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
        data: analytics.monthly_trends.map(t => t.income)
      },
      {
        name: '支出',
        type: 'bar',
        barMaxWidth: 18,
        itemStyle: { color: '#f43f5e', borderRadius: [4, 4, 0, 0] },
        data: analytics.monthly_trends.map(t => t.expense)
      },
      {
        name: '结余',
        type: 'line',
        smooth: true,
        itemStyle: { color: '#6366f1' },
        lineStyle: { width: 3 },
        data: analytics.monthly_trends.map(t => t.savings)
      }
    ]
  };

  // Asset Distribution Doughnut
  const assetDoughnutOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ¥{c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: { color: '#94a3b8', fontSize: 11 }
    },
    color: ['#10b981', '#3b82f6', '#8b5cf6', '#06b6d4', '#f43f5e'],
    series: [
      {
        name: '资产配置',
        type: 'pie',
        radius: ['50%', '75%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 12, fontWeight: 'bold' }
        },
        data: [
          { value: analytics.asset_breakdown.liquid, name: '流动资金' },
          { value: analytics.asset_breakdown.investment, name: '投资理财' },
          { value: analytics.asset_breakdown.fixed, name: '固定资产' },
          { value: analytics.asset_breakdown.receivable, name: '债权应收' },
          { value: analytics.asset_breakdown.liabilities, name: '负债信贷' }
        ]
      }
    ]
  };

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Welcome & Zero-Friction Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white shadow-xl shadow-emerald-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>智能全资产财务中枢已就绪</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            掌控全局财富，开启无感记账
          </h1>
          <p className="text-emerald-100 text-xs lg:text-sm max-w-xl">
            复制任意银行扣款短信或微信支付宝通知即可秒级提取记账；或通过「余额快照」免去逐笔繁琐。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <button
            type="button"
            onClick={onOpenSmartParser}
            className="px-4 py-2.5 rounded-2xl bg-white text-emerald-800 text-xs font-bold shadow-lg hover:bg-emerald-50 transition active:scale-95 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>粘贴短信/通知记账</span>
          </button>
          <button
            type="button"
            onClick={onOpenSnapshot}
            className="px-4 py-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 text-white text-xs font-bold hover:bg-white/25 transition active:scale-95 flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            <span>懒人余额快照</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Worth */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">全局净资产 (Net Worth)</span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            ¥{analytics.net_worth.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">总资产: ¥{analytics.total_assets.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}</span>
            <span className="text-rose-500">负债: ¥{analytics.total_liabilities.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        {/* Monthly Income */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">本月总收入</span>
            <div className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-500">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
            +¥{analytics.month_summary.income.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-400">
            <span>储蓄率</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{analytics.month_summary.savings_rate}%</span>
          </div>
        </div>

        {/* Monthly Expense */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">本月总支出</span>
            <div className="p-1 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-500">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-500 font-mono">
            -¥{analytics.month_summary.expense.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-400">
            <span>本月结余</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              ¥{analytics.month_summary.savings.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Financial Health Score */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">财务健康度评分</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {analytics.health_evaluation.score}
            </span>
            <span className="text-xs text-slate-400">/ 100 分 (优良)</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-400">
            <span>备用金覆盖</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{analytics.health_evaluation.emergency_months} 个月</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Flow Trends (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                收支与结余历史趋势 (近6个月)
              </h3>
              <p className="text-xs text-slate-400">监控月度收支平衡与储蓄增长节奏</p>
            </div>
            <button
              onClick={() => onNavigateTo('analytics')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 flex items-center gap-1"
            >
              深度报表 <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-64">
            <ReactECharts option={trendOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>

        {/* Asset Distribution (1 col) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                全域多资产配置结构
              </h3>
              <button
                onClick={() => onNavigateTo('accounts')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-500"
              >
                查看矩阵
              </button>
            </div>
            <p className="text-xs text-slate-400">穿透各大分散账户统一核算</p>
          </div>

          <div className="h-56">
            <ReactECharts option={assetDoughnutOption} style={{ height: '100%', width: '100%' }} />
          </div>

          <div className="text-[11px] text-slate-400 text-center">
            资产负债率: <span className="font-bold text-slate-700 dark:text-slate-300">{analytics.debt_ratio}%</span> (处于安全健康区间)
          </div>
        </div>
      </div>

      {/* Lower Row: Health Diagnostic Tips & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Diagnostic Tips */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
            <Activity className="w-4 h-4" />
            <span>智能财务体检与建议</span>
          </div>

          <div className="space-y-2.5">
            {analytics.health_evaluation.advice.map((adv, idx) => (
              <div 
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{adv}</span>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigateTo('debts')}
              className="w-full py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 transition flex items-center justify-center gap-1.5"
            >
              查看还债雪球与免息期日历 <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Recent Transactions (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                近期流水记录
              </h3>
              <p className="text-xs text-slate-400">实时收支与调拨动态</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenQuickTx}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> 记一笔
              </button>
              <button
                onClick={() => onNavigateTo('transactions')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 flex items-center gap-1"
              >
                全部明细 <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    tx.type === 'income' 
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' 
                      : tx.type === 'transfer'
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                  }`}>
                    {tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : tx.type === 'transfer' ? <Layers className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {tx.merchant || tx.category_name || '收支交易'}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>{tx.date.substring(0, 16)}</span>
                      <span>•</span>
                      <span>{tx.account_name || '主账户'}</span>
                      {tx.source === 'sms_parser' && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px]">
                          短信识别
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className={`text-sm font-bold font-mono ${
                    tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                  }`}>
                    {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '' : '-'}¥{tx.amount.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {tx.category_name || '日常消费'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
