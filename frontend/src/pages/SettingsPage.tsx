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
  X,
  Bot,
  Sparkles,
  Zap,
  Key,
  Eye,
  EyeOff,
  Activity,
  Check,
  Cpu,
  ChevronRight,
  Layers,
  PieChart,
  Target,
  CreditCard,
  TrendingUp,
  BarChart3,
  Cloud,
  CloudUpload,
  Server,
  Lock,
  LockOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api/client';
import { RecurringRule, Account, Category } from '../types';
import { getBeijingDateString } from '../utils/dateUtils';
import { localStore, AiConfig, DEFAULT_AI_CONFIG } from '../services/localStore';
import { AI_PROVIDERS, testAiConnection, AiTestResult } from '../services/aiParser';
import { webdavSync, WebDavConfig } from '../services/webdavSync';

interface SettingsPageProps {
  accounts: Account[];
  categories: Category[];
  onRefresh: () => void;
  liquidGlass?: boolean;
  onToggleLiquidGlass?: (val: boolean) => void;
  onNavigate?: (page: string) => void;
  onOpenOnboarding?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ 
  accounts, 
  categories, 
  onRefresh,
  liquidGlass = false,
  onToggleLiquidGlass,
  onNavigate,
  onOpenOnboarding
}) => {
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
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

  // 🧪 Liquid Glass Unlock State (内测密码: 给斌斌一包辣条)
  const [liquidGlassUnlocked, setLiquidGlassUnlocked] = useState<boolean>(() => localStore.getLiquidGlassUnlocked());
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');

  // 🧪 Laboratory AI Config State
  const [aiConfig, setAiConfig] = useState<AiConfig>(() => localStore.getAiConfig());
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<AiTestResult | null>(null);
  const [testingAi, setTestingAi] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);

  // ☁️ WebDAV Cloud Sync State
  const [webDavConfig, setWebDavConfig] = useState<WebDavConfig>(() => localStore.getWebDavConfig());
  const [webDavModalOpen, setWebDavModalOpen] = useState(false);
  const [webDavTesting, setWebDavTesting] = useState(false);
  const [webDavTestResult, setWebDavTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [webDavSyncing, setWebDavSyncing] = useState(false);
  const [webDavSaved, setWebDavSaved] = useState(false);

  const loadRecurring = () => {
    api.getRecurringRules().then(setRecurringRules).catch(() => {});
  };

  useEffect(() => {
    loadRecurring();
  }, []);

  const handleProviderSelect = (providerId: string) => {
    const p = AI_PROVIDERS.find(x => x.id === providerId);
    if (p) {
      setAiConfig(prev => ({
        ...prev,
        provider: providerId,
        baseUrl: p.baseUrl || prev.baseUrl,
        model: p.model || prev.model
      }));
    }
  };

  const handleSaveAi = () => {
    localStore.saveAiConfig(aiConfig);
    setAiSaved(true);
    setTimeout(() => setAiSaved(false), 2500);
  };

  const handleTestAi = async () => {
    setTestingAi(true);
    setAiTestResult(null);
    try {
      const res = await testAiConnection(aiConfig);
      setAiTestResult(res);
      if (res.success) {
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
      }
    } finally {
      setTestingAi(false);
    }
  };

  const handleToggleAi = (enabled: boolean) => {
    const updated = { ...aiConfig, enabled };
    setAiConfig(updated);
    localStore.saveAiConfig(updated);
  };

  const handleToggleLiquidGlass = (checked: boolean) => {
    if (checked) {
      if (!liquidGlassUnlocked) {
        setUnlockPassword('');
        setUnlockError('');
        setUnlockModalOpen(true);
        return;
      }
      onToggleLiquidGlass?.(true);
    } else {
      onToggleLiquidGlass?.(false);
    }
  };

  const handleVerifyUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = unlockPassword.trim();
    if (trimmed === '给斌斌一包辣条') {
      localStore.saveLiquidGlassUnlocked(true);
      setLiquidGlassUnlocked(true);
      setUnlockModalOpen(false);
      onToggleLiquidGlass?.(true);
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      setStatusMsg('🎉 恭喜！已成功解锁【iOS 液态毛玻璃 UI】内测功能！');
      setTimeout(() => setStatusMsg(''), 4000);
    } else {
      setUnlockError('⚠️ 暗号错误！请输入正确的内测密码（提示：给斌斌一包辣条）');
    }
  };

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
      link.download = `SmartWealth_FullBackup_${getBeijingDateString()}.json`;
      link.click();
    } catch (e: any) {
      alert('导出备份失败');
    }
  };

  const handleRestoreBackup = async (file: File) => {
    if (!confirm('恢复备份将覆盖当前系统数据，是否继续？')) return;
    setLoading(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await api.restoreBackup(json);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setStatusMsg('数据已成功恢复！');
      onRefresh();
      loadRecurring();
    } catch (e: any) {
      alert(`恢复失败: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(ruleAmount);
    if (!amt || amt <= 0) return alert('请输入有效金额');

    const catObj = categories.find(c => c.id === ruleCategoryId);
    try {
      await api.addRecurringRule({
        name: ruleName,
        type: ruleType as any,
        amount: amt,
        account_id: ruleAccountId,
        category_id: ruleCategoryId || undefined,
        frequency: ruleFrequency as any,
        day_of_period: parseInt(ruleDay),
        note: ruleNote,
        is_active: 1
      });
      setModalOpen(false);
      setRuleName('');
      setRuleAmount('');
      loadRecurring();
      onRefresh();
    } catch (err: any) {
      alert(err.message || '创建规则失败');
    }
  };

  const handleExecuteRecurring = async () => {
    try {
      const res = await api.executeRecurringRules();
      if (res.executed_count > 0) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        setStatusMsg(`成功自动执行 ${res.executed_count} 条周期记账规则！`);
        onRefresh();
        loadRecurring();
      } else {
        setStatusMsg('暂无今日需要执行的周期收支规则');
      }
    } catch (e: any) {
      alert('执行失败');
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-500" />
          系统设置与数据中心
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          管理全量数据存储、备份还原、固定周期收支及实验室 AI 智能引擎
        </p>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-between animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {statusMsg}
          </div>
          <button onClick={() => setStatusMsg('')} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 🧪 Laboratory Feature: AI Large Language Model Integration Entry */}
      <div 
        onClick={() => setAiModalOpen(true)}
        className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between cursor-pointer hover:border-indigo-500/50 active:scale-98 transition group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition flex-shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                🧪 实验室特性：AI 智能大模型
              </h3>
              <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400">
                AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {aiConfig.enabled && aiConfig.apiKey 
                ? `已启用 • ${AI_PROVIDERS.find(p => p.id === aiConfig.provider)?.name?.split(' ')[0] || '智谱/DeepSeek'}` 
                : '未配置 • 点击接入 DeepSeek / 智谱 GLM-4V'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-bold ${aiConfig.enabled && aiConfig.apiKey ? 'text-emerald-500' : 'text-slate-400'}`}>
            {aiConfig.enabled && aiConfig.apiKey ? '已开启' : '去配置'}
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
        </div>
      </div>

      {/* 🧪 Laboratory Feature: iOS Liquid Glass UI (液态毛玻璃质感 - 内测加锁保护) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/20 flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                🧪 实验室：iOS 液态毛玻璃 UI
              </h3>
              {liquidGlassUnlocked ? (
                <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <LockOpen className="w-2.5 h-2.5" /> 已解锁
                </span>
              ) : (
                <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> 内测功能
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {liquidGlassUnlocked 
                ? '开启 iOS 拟真磨砂液态玻璃与高光倒角质感' 
                : '内测功能：输入专属密码后解锁并开启'}
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
          <input 
            type="checkbox" 
            checked={liquidGlass}
            onChange={(e) => handleToggleLiquidGlass(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-cyan-600"></div>
        </label>
      </div>

      {/* 📱 Full System Modules Navigation Hub (快捷直达全部功能模块) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            📱 财务系统功能快捷入口
          </h3>
          <span className="text-[10px] text-slate-400">点击直达对应模块</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate?.('budgets')}
            className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-left hover:border-blue-400 active:scale-95 transition space-y-1 group"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition">
              <PieChart className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">📊 月度预算</div>
            <div className="text-[10px] text-slate-400">餐饮/日常限额预警</div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.('goals')}
            className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-left hover:border-purple-400 active:scale-95 transition space-y-1 group"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition">
              <Target className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">🎯 存钱目标</div>
            <div className="text-[10px] text-slate-400">心愿单与备用金计划</div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.('analytics')}
            className="p-3 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/40 text-left hover:border-teal-400 active:scale-95 transition space-y-1 group"
          >
            <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-105 transition">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">📈 财务图表</div>
            <div className="text-[10px] text-slate-400">桑基流向与收支透视</div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.('debts')}
            className="p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-left hover:border-rose-400 active:scale-95 transition space-y-1 group"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-105 transition">
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">💳 负债与还款</div>
            <div className="text-[10px] text-slate-400">雪球/雪崩还债规划</div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.('investments')}
            className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 text-left hover:border-amber-400 active:scale-95 transition space-y-1 group"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">💰 投资持仓</div>
            <div className="text-[10px] text-slate-400">股票基金浮动盈亏</div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.('parser')}
            className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-left hover:border-indigo-400 active:scale-95 transition space-y-1 group"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition">
              <Bot className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">🤖 智能识别</div>
            <div className="text-[10px] text-slate-400">文本与短信自动解析</div>
          </button>
        </div>
      </div>

      {/* AI Settings Modal Popup */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh] my-auto">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      AI 智能大模型设置
                    </h3>
                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-600 dark:text-purple-300">
                      AI
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    支持 DeepSeek / 智谱 GLM-4V / OpenAI
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setAiModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Master Enable/Disable Toggle */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-xs">启用 AI 智能大模型引擎</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">关闭时平滑回退至内置离线引擎</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input 
                    type="checkbox" 
                    checked={aiConfig.enabled}
                    onChange={(e) => handleToggleAi(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Provider Selection */}
              <div>
                <label className="text-slate-500 dark:text-slate-400 block mb-1.5 font-bold">
                  选择 AI 模型服务商
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {AI_PROVIDERS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleProviderSelect(p.id)}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                        aiConfig.provider === p.id 
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-bold'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      {aiConfig.provider === p.id && <Check className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
                    <Key className="w-3.5 h-3.5" /> API Key 密钥
                  </label>
                  <span className="text-[10px] text-indigo-500">
                    {AI_PROVIDERS.find(p => p.id === aiConfig.provider)?.hint}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={aiConfig.apiKey}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="在此粘贴您的 API Key (如 sk-...)"
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Base URL & Model Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1">接口地址 (Base URL)</label>
                  <input
                    type="text"
                    value={aiConfig.baseUrl}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1">模型名称 (Model)</label>
                  <input
                    type="text"
                    value={aiConfig.model}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs"
                  />
                </div>
              </div>

              {/* Test Connection Results Badge */}
              {aiTestResult && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  aiTestResult.success 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-500/30'
                }`}>
                  <Activity className="w-4 h-4 flex-shrink-0" />
                  <span>{aiTestResult.message}</span>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <button
                type="button"
                disabled={testingAi}
                onClick={handleTestAi}
                className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-bold transition flex items-center gap-1 active:scale-95 text-xs"
              >
                <Cpu className="w-3.5 h-3.5" />
                {testingAi ? '测试中...' : '测试连接'}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSaveAi();
                  setTimeout(() => setAiModalOpen(false), 600);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition flex items-center gap-1 shadow-md shadow-indigo-500/20 active:scale-95 text-xs"
              >
                {aiSaved ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                {aiSaved ? '已保存！' : '保存配置'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Data & Danger Zone */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-500" />
          演示数据与快速重置
        </h3>
        <p className="text-xs text-slate-400">
          可以一键载入高拟真财务数据体验系统全部图表，或重置账本为干净的初始状态。
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={handleSeedDemo}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4" /> 载入全场景演示数据
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleClearData}
            className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
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

        {/* ☁️ Private Cloud Sync (WebDAV / 坚果云) */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <div className="font-bold text-xs text-blue-900 dark:text-blue-200">
                ☁️ 私有云同步 (WebDAV / 坚果云)
              </div>
            </div>
            <button
              type="button"
              onClick={() => setWebDavModalOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-blue-600 text-white text-[10px] font-bold shadow-sm hover:bg-blue-500 transition active:scale-95 flex items-center gap-1"
            >
              <Server className="w-3 h-3" /> 配置云盘
            </button>
          </div>
          <p className="text-[11px] text-blue-800/80 dark:text-blue-300">
            支持坚果云、NextCloud 等任意 WebDAV 云盘，数据本地打包上传，实现跨设备安全漫游。
          </p>
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

      {/* WebDAV Cloud Sync Modal */}
      {webDavModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh] my-auto">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    WebDAV 私有云同步设置
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    支持坚果云 / NextCloud / 自建云盘
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setWebDavModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-3.5 flex-1 text-xs">
              <div>
                <label className="text-slate-500 dark:text-slate-400 block mb-1 font-bold">
                  WebDAV 服务器地址 (URL)
                </label>
                <input
                  type="text"
                  value={webDavConfig.url}
                  onChange={(e) => setWebDavConfig(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="例如: https://dav.jianguoyun.com/dav/SmartWealth/"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 block mb-1 font-bold">
                  云盘账号 / 邮箱
                </label>
                <input
                  type="text"
                  value={webDavConfig.user}
                  onChange={(e) => setWebDavConfig(prev => ({ ...prev, user: e.target.value }))}
                  placeholder="例如: your_email@example.com"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 block mb-1 font-bold">
                  应用授权密码 (App Password)
                </label>
                <input
                  type="password"
                  value={webDavConfig.pass}
                  onChange={(e) => setWebDavConfig(prev => ({ ...prev, pass: e.target.value }))}
                  placeholder="在坚果云【账户信息】➔【安全选项】中生成的应用密码"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Test Connection Results Badge */}
              {webDavTestResult && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  webDavTestResult.success 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-500/30'
                }`}>
                  <Activity className="w-4 h-4 flex-shrink-0" />
                  <span>{webDavTestResult.message}</span>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={webDavTesting}
                  onClick={async () => {
                    setWebDavTesting(true);
                    setWebDavTestResult(null);
                    try {
                      const res = await webdavSync.testConnection(webDavConfig);
                      setWebDavTestResult(res);
                      if (res.success) confetti({ particleCount: 40, spread: 40, origin: { y: 0.7 } });
                    } catch (e: any) {
                      setWebDavTestResult({ success: false, message: e.message || '连接失败' });
                    } finally {
                      setWebDavTesting(false);
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-bold transition flex items-center gap-1 active:scale-95 text-xs"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  {webDavTesting ? '测试中...' : '测试连接'}
                </button>

                <button
                  type="button"
                  disabled={webDavSyncing || !webDavConfig.url}
                  onClick={async () => {
                    setWebDavSyncing(true);
                    try {
                      const res = await webdavSync.uploadBackup(webDavConfig);
                      alert(res.message);
                      confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
                    } catch (e: any) {
                      alert(e.message);
                    } finally {
                      setWebDavSyncing(false);
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1 active:scale-95 text-xs disabled:opacity-40"
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  {webDavSyncing ? '上传中...' : '立即云备份'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  localStore.saveWebDavConfig(webDavConfig);
                  setWebDavSaved(true);
                  setTimeout(() => {
                    setWebDavSaved(false);
                    setWebDavModalOpen(false);
                  }, 600);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition flex items-center gap-1 shadow-md shadow-blue-500/20 active:scale-95 text-xs"
              >
                {webDavSaved ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                {webDavSaved ? '已保存！' : '保存配置'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🧪 Liquid Glass Unlock Modal (内测密码解锁弹窗) */}
      {unlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-inner">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      内测功能解锁
                    </h3>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-600 dark:text-cyan-300">
                      实验室
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">iOS 液态毛玻璃 UI</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUnlockModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleVerifyUnlock} className="p-5 space-y-4">
              <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-800 dark:text-cyan-200 text-xs leading-relaxed">
                💡 <span className="font-bold">内测体验须知</span>：液态毛玻璃 UI 属于高拟真视觉渲染实验。请输入暗号解锁体验，<span className="font-bold text-cyan-600 dark:text-cyan-300">解锁后永久有效</span>，后续无需再次输入！
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  🔑 请输入解锁暗号
                </label>
                <input
                  type="text"
                  value={unlockPassword}
                  onChange={(e) => {
                    setUnlockPassword(e.target.value);
                    if (unlockError) setUnlockError('');
                  }}
                  placeholder="请输入暗号（例如：给斌斌一包辣条）"
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none placeholder:text-slate-400"
                />
                {unlockError && (
                  <p className="text-[11px] font-bold text-rose-500 mt-1.5 flex items-center gap-1 animate-in fade-in">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {unlockError}
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUnlockModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold text-xs transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 active:scale-95 transition flex items-center justify-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  解锁并开启
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
