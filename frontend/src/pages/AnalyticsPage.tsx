import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  BarChart3, 
  GitFork, 
  PieChart, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { DashboardAnalytics, SankeyData } from '../types';
import { api } from '../api/client';
import { getBeijingMonthString } from '../utils/dateUtils';

interface AnalyticsPageProps {
  analytics: DashboardAnalytics | null;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ analytics }) => {
  const [sankeyData, setSankeyData] = useState<SankeyData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => getBeijingMonthString());

  useEffect(() => {
    api.getSankeyFlow(selectedMonth).then(setSankeyData).catch(() => {});
  }, [selectedMonth]);

  if (!analytics) return null;

  // Sankey Chart Configuration
  const sankeyOption = sankeyData && sankeyData.nodes.length > 0 ? {
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove'
    },
    series: [
      {
        type: 'sankey',
        layout: 'none',
        emphasis: { focus: 'adjacency' },
        nodeAlign: 'justify',
        nodeWidth: 20,
        nodeGap: 16,
        label: {
          color: '#64748b',
          fontSize: 11,
          fontWeight: 'bold'
        },
        lineStyle: {
          color: 'gradient',
          curveness: 0.5,
          opacity: 0.35
        },
        data: sankeyData.nodes,
        links: sankeyData.links
      }
    ]
  } : null;

  // Category Radar
  const radarOption = {
    tooltip: {},
    radar: {
      indicator: analytics.category_breakdown.slice(0, 6).map(c => ({
        name: c.name,
        max: Math.max(...analytics.category_breakdown.map(i => i.value)) * 1.2 || 5000
      })),
      splitArea: {
        show: true,
        areaStyle: {
          color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.05)']
        }
      }
    },
    series: [
      {
        name: '分类支出画像',
        type: 'radar',
        data: [
          {
            value: analytics.category_breakdown.slice(0, 6).map(c => c.value),
            name: '本月支出分布',
            areaStyle: {
              color: 'rgba(16, 185, 129, 0.3)'
            },
            lineStyle: {
              color: '#10b981',
              width: 2
            },
            itemStyle: {
              color: '#10b981'
            }
          }
        ]
      }
    ]
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-500" />
            深度财务洞察与资金流向桑基图
          </h2>
          <p className="text-xs text-slate-400">
            可视化探索资金从收入源头，流经各大中转账户，最终流向消费与储蓄的全拓扑链路
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">分析月份:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-xs"
          />
        </div>
      </div>

      {/* Sankey Flow Diagram Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitFork className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              资金流向桑基拓扑图 (Cash Flow Topology)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            【收入源】 → 【中转账户】 → 【消费归宿】
          </span>
        </div>

        <div className="h-80">
          {sankeyOption ? (
            <ReactECharts option={sankeyOption} style={{ height: '100%', width: '100%' }} />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-xs">
              该月份暂无足够流向数据生成桑基图
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown & Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-500" />
            消费品类雷达画像
          </h3>
          <div className="h-64">
            <ReactECharts option={radarOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>

        {/* Detailed Category Table */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            支出品类权重明细
          </h3>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {analytics.category_breakdown.map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{cat.name}</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">
                    ¥{cat.value.toFixed(2)} ({cat.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full" 
                    style={{ width: `${cat.percentage}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
