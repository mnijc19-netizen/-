import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Database, 
  RotateCcw, 
  Download, 
  Upload, 
  ShieldCheck, 
  Trash2, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api/client';
import { RecurringRule, Account, Category } from '../types';

interface SettingsPageProps {
  accounts: Account[];
  categories: Category[];
  onRefresh: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ accounts, categories, onRefresh }) => {
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState('expense');
  const [ruleAmount, setRuleAmount] = useState('');
  const [ruleAccountId, setRuleAccountId] = useState(accounts[0]?.id || '');
  const [ruleCategoryId, setRuleCategoryId] = useState('');
  const [ruleDay, setRuleDay] = useState('10');
  const [ruleFrequency, setRuleFrequency] = useState('monthly');
  const [ruleNote, setRuleNote] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const loadRecurring = () => {
    api.getRecurringRules().then(setRecurringRules).catch(() => {});
  };

  useEffect(() => {
    loadRecurring();
  }, []);

  const handleSeedDemo = async () => {
    if (confirm('载入逼真演示数据将重置并生成包含多银行、支付宝/微信、投资、房贷、心愿目标等全场景测试数据，是否继续？')) {
      setLoading(true);
      try {
        await api.seedDemo();
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setStatusMsg('全场景高拟真财务数据已成功加载！');
        onRefresh();
        loadRecurring();
      } catch (e: any) {
        alert(e.message || '加载失败');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleClearData = async () => {
    if (confirm('⚠️ 警告：确定要清空所有数据吗？此操作将移除所有账户和流水！')) {
      setLoading(true);
      try {
        await api.clearData();
        setStatusMsg('所有数据已清空');
        onRefresh();
        loadRecurring();
      } catch (e: any) {
        alert(e.message || '清空失败');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleExportBackup = async () => {
    try {
      const data = await api.exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SmartWealth_FullBackup_${new Date().toISOString().substring(0, 10)}.json`;
      link.click();
    } catch (e: any) {
      alert('导出备份失败');
    }
  };

  const handleRestoreBackup = async (file: File) => {
    if (!confirm('恢复备份将覆盖当前系统数据，是否继续？')) return;
    setLoading(true);
    try {
      const res = await api.restoreBackup(file);
      alert(res.message);
      onRefresh();
      loadRecurring();
    } catch (e: any) {
      alert(e.message || '恢复失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteRecurring = async () => {
    try {
      const res = await api.executeRecurringRules();
      alert(`已自动执行 ${res.executed_count} 笔周期记账！`);
      onRefresh();
    } catch (e: any) {
      alert('执行失败');
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addRecurringRule({
        name: ruleName,
        type: ruleType,
        amount: parseFloat(ruleAmount) || 0,
        account_id: ruleAccountId,
        category_id: ruleCategoryId || undefined,
        frequency: ruleFrequency,
        day_of_period: parseInt(ruleDay) || 1,
        is_active: 1,
        note: ruleNote || undefined
      });
      setModalOpen(false);
      setRuleName('');
      setRuleAmount('');
      loadRecurring();
    } catch (e: any) {
      alert(e.message || '保存失败');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-500" />
          系统设置、数据管理与隐私安全
        </h2>
        <p className="text-xs text-slate-400">
          本地优先架构保证 100% 数据隐私安全，支持一键备份还原与周期自动记账
        </p>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {statusMsg}
        </div>
      )}

      {/* Privacy Guarantee Box */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 space-y-2">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
          <ShieldCheck className="w-5 h-5" />
          <span>100% 本地存储与私有化保障</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          本系统的所有账户信息、交易流水与短信解析均运行在您的本机本地 SQLite 数据库中，不经过任何第三方云端服务器，保障资产与财务数据绝对私密。
        </p>
      </div>

      {/* Demo Data & Reset Controls */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-500" />
          演示数据与快速重置
        </h3>
        <p className="text-xs text-slate-400">
          一键载入逼真的多银行、支付宝、微信、证券、基金、房贷等全维度示例数据，便于体验系统所有大盘与桑基图功能。
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={handleSeedDemo}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-2 transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4" /> 一键重新载入全功能演示数据
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleClearData}
            className="px-4 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 flex items-center gap-2 transition"
          >
            <Trash2 className="w-4 h-4" /> 清空所有数据
          </button>
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Download className="w-4 h-4 text-emerald-500" />
          数据全量备份与还原
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              导出全量 JSON 备份
            </div>
            <p className="text-[11px] text-slate-400">
              将所有账户、流水、分类、预算与持仓导出为单文件备份
            </p>
            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> 立即导出备份
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              从备份文件恢复
            </div>
            <p className="text-[11px] text-slate-400">
              选择之前导出的 JSON 备份文件还原系统
            </p>
            <label className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> 选择备份并恢复
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleRestoreBackup(e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Recurring Rules Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              周期性与固定收支自动记账规则
            </h3>
            <p className="text-xs text-slate-400">
              每月自动记录工资、房贷月供、固定订阅（iCloud/网易云/视频会员等），彻底减负
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExecuteRecurring}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1"
            >
              <Play className="w-3.5 h-3.5" /> 立即检查并触发
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> 新建规则
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {recurringRules.map(r => (
            <div key={r.id} className="py-3 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">{r.name}</div>
                <div className="text-[11px] text-slate-400">
                  {r.frequency === 'monthly' ? `每月 ${r.day_of_period} 日` : '每日'} • {r.note || '自动记账'}
                  {r.last_executed && ` (上次执行: ${r.last_executed})`}
                </div>
              </div>
              <div className="font-mono font-bold text-slate-900 dark:text-white">
                {r.type === 'income' ? '+' : '-'}¥{r.amount.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Recurring Rule Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                添加周期性自动记账规则
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">规则名称</label>
                <input
                  type="text"
                  required
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="例如：每月工资入账、房贷月供扣除、Netflix订阅"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1">收支类型</label>
                  <select
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="expense">固定支出 📉</option>
                    <option value="income">固定收入 📈</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">金额 (¥)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={ruleAmount}
                    onChange={(e) => setRuleAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1">扣款/入账账户</label>
                  <select
                    value={ruleAccountId}
                    onChange={(e) => setRuleAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">每月执行日期 (1~31日)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={ruleDay}
                    onChange={(e) => setRuleDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1">备注说明</label>
                <input
                  type="text"
                  value={ruleNote}
                  onChange={(e) => setRuleNote(e.target.value)}
                  placeholder="添加说明..."
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
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  保存规则
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
