import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  Zap, 
  X, 
  Send, 
  Check, 
  Key, 
  Eye, 
  EyeOff, 
  Activity, 
  Cpu, 
  TrendingUp, 
  TrendingDown, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Wand2,
  FileSpreadsheet
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api/client';
import { Account, Category, DashboardAnalytics, Transaction } from '../types';
import { localStore, AiConfig } from '../services/localStore';
import { 
  AI_PROVIDERS, 
  testAiConnection, 
  parseMultiTransactionsWithAi, 
  diagnoseFinancesWithAi, 
  AiTestResult, 
  AiExtractedItem 
} from '../services/aiParser';
import { getBeijingDateTimeString } from '../utils/dateUtils';

interface AiHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: Account[];
  categories: Category[];
  analytics: DashboardAnalytics | null;
  transactions: Transaction[];
}

export const AiHubModal: React.FC<AiHubModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories,
  analytics,
  transactions
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'advisor' | 'settings'>('chat');
  
  // Natural Language Input State
  const [inputText, setInputText] = useState('');
  const [extractedList, setExtractedList] = useState<AiExtractedItem[]>([]);
  const [parsing, setParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // AI Advisor State
  const [adviceText, setAdviceText] = useState('');
  const [diagnosing, setDiagnosing] = useState(false);

  // Settings State
  const [aiConfig, setAiConfig] = useState<AiConfig>(() => localStore.getAiConfig());
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<AiTestResult | null>(null);
  const [testingAi, setTestingAi] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);

  if (!isOpen) return null;

  const isConfigured = aiConfig.enabled && !!aiConfig.apiKey && !!aiConfig.apiKey.trim();

  // Quick Preset Prompts
  const PRESET_PROMPTS = [
    "麦当劳花呗付了38.5，顺便充了100话费",
    "打车去机场花了86用招行卡，买了杯星巴克33",
    "昨天在清口清汤面店微信花了15，小王支付宝转我50",
    "今天发了工资8500存入招行卡，还了信用卡2000"
  ];

  const handleProviderSelect = (providerId: string) => {
    const p = AI_PROVIDERS.find(x => x.id === providerId);
    if (p) {
      setAiConfig(prev => ({
        ...prev,
        provider: providerId,
        baseUrl: p.baseUrl || prev.baseUrl,
        model: p.models[0]?.id || prev.model
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

  const handleParseText = async () => {
    if (!inputText.trim()) return;
    if (!isConfigured) {
      setActiveTab('settings');
      setErrorMsg('请先在设置页填入 AI 密钥 (推荐 DeepSeek 或 智谱免费版)');
      return;
    }
    setParsing(true);
    setErrorMsg('');
    setExtractedList([]);
    try {
      const results = await parseMultiTransactionsWithAi(inputText, accounts);
      if (results && results.length > 0) {
        setExtractedList(results);
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      } else {
        setErrorMsg('AI 未能从输入文本中提取到有效账单');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'AI 解析失败');
    } finally {
      setParsing(false);
    }
  };

  const handleBatchSave = async () => {
    if (extractedList.length === 0) return;
    setParsing(true);
    try {
      for (const item of extractedList) {
        const catObj = categories.find(c => c.name === item.category);
        let acc = accounts[0];
        if (/支付宝|花呗/.test(item.channel)) {
          const a = accounts.find(x => x.name.includes('支付宝') || x.id === 'acc-2');
          if (a) acc = a;
        } else if (/微信|零钱/.test(item.channel)) {
          const a = accounts.find(x => x.name.includes('微信') || x.id === 'acc-1');
          if (a) acc = a;
        } else if (/银行|卡/.test(item.channel)) {
          const a = accounts.find(x => x.type === 'bank' || x.id === 'acc-3');
          if (a) acc = a;
        }

        await api.createTransaction({
          type: item.type || 'expense',
          amount: item.amount,
          account_id: acc.id,
          category_id: catObj?.id,
          category_name: item.category || '日常消费',
          date: item.date || getBeijingDateTimeString(),
          merchant: item.merchant,
          note: item.note || `由 ${aiConfig.model} 批量智能记账`,
          source: 'ai_copilot'
        });
      }

      setSuccessMsg(`🎉 成功智能批量存入 ${extractedList.length} 笔明细！`);
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.5 } });
      setExtractedList([]);
      setInputText('');
      onSuccess();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || '写入账本失败');
    } finally {
      setParsing(false);
    }
  };

  const handleDiagnose = async () => {
    if (!isConfigured) {
      setActiveTab('settings');
      setErrorMsg('请先配置 AI API Key');
      return;
    }
    if (!analytics) return;
    setDiagnosing(true);
    setErrorMsg('');
    try {
      const report = await diagnoseFinancesWithAi(analytics, transactions);
      setAdviceText(report);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (err: any) {
      setErrorMsg(err.message || 'AI 诊断生成失败');
    } finally {
      setDiagnosing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] my-auto">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  斌斌 AI 财务智能大脑
                </h3>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  isConfigured 
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300' 
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-300'
                }`}>
                  {isConfigured ? `已就绪 (${aiConfig.model})` : '待填 Key'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                自然语言一句话记多笔 • AI 财务诊断 • 私有加密直连
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 p-1.5 bg-slate-100 dark:bg-slate-800/80 m-4 mb-0 rounded-2xl text-xs gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'chat' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" /> 智能记多笔
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('advisor')}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'advisor' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> AI 财务诊断
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'settings' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" /> 模型与设置
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-rose-600">✕</button>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: Natural Language & Multi-Transaction Ingest */}
          {activeTab === 'chat' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>输入任何口语、复合句子或长账单：</span>
                  <span className="text-[10px] text-indigo-500 font-normal">支持同时包含支出、收入与还款</span>
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="例如：中午在沙县吃了25微信付的，下午喝了喜茶19花呗付的，小李微信还了我50..."
                    className="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Preset Clickable Prompts */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-500" /> 点击填入实测示例：
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {PRESET_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setInputText(prompt)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-left text-[11px] hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700/60 transition truncate"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                disabled={parsing || !inputText.trim()}
                onClick={handleParseText}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 active:scale-98 transition disabled:opacity-50"
              >
                <Bot className="w-4 h-4" />
                {parsing ? 'AI 正在极速深度解析中...' : '让 AI 智能拆解并入账'}
              </button>

              {/* Extracted Transactions Preview */}
              {extractedList.length > 0 && (
                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 space-y-3 animate-in slide-in-from-bottom duration-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      AI 成功拆解出 {extractedList.length} 笔明细：
                    </span>
                    <button
                      type="button"
                      disabled={parsing}
                      onClick={handleBatchSave}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" /> 确认全部存入账本
                    </button>
                  </div>

                  <div className="space-y-2">
                    {extractedList.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shadow-sm">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs ${
                            item.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                          }`}>
                            {item.type === 'income' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate">{item.merchant}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {item.category} • {item.channel} {item.note && `• ${item.note}`}
                            </div>
                          </div>
                        </div>
                        <div className={`font-mono font-bold text-sm ${item.type === 'income' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                          {item.type === 'income' ? '+' : '-'}¥{item.amount.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AI Financial Health Advisor */}
          {activeTab === 'advisor' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-600/10 via-indigo-600/10 to-transparent border border-purple-500/20 space-y-1">
                <div className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  AI 专属财务健康体检与省钱建议
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  AI 将根据您当前的资产负债率、月度储蓄率以及近期消费结构，给出专业的优化规划。
                </p>
              </div>

              {!adviceText ? (
                <button
                  type="button"
                  disabled={diagnosing}
                  onClick={handleDiagnose}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 active:scale-98 transition"
                >
                  <Bot className="w-4 h-4" />
                  {diagnosing ? 'AI 正在深度分析您的财务资产结构...' : '立即生成 AI 财务诊断报告'}
                </button>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-purple-500" /> AI 财务顾问报告
                    </span>
                    <button
                      type="button"
                      onClick={handleDiagnose}
                      disabled={diagnosing}
                      className="text-[10px] text-purple-600 font-bold hover:underline"
                    >
                      {diagnosing ? '重新分析中...' : '重新生成'}
                    </button>
                  </div>
                  <div className="whitespace-pre-line text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                    {adviceText}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AI Model & Key Settings */}
          {activeTab === 'settings' && (
            <div className="space-y-3.5">
              <div>
                <label className="text-slate-500 dark:text-slate-400 block mb-1.5 font-bold">
                  选择 AI 模型服务商 (推荐 DeepSeek 或 智谱免费版)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AI_PROVIDERS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleProviderSelect(p.id)}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                        aiConfig.provider === p.id 
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Base URL & Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1">接口地址 (Base URL)</label>
                  <input
                    type="text"
                    value={aiConfig.baseUrl}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">模型名称 (Model)</label>
                  <input
                    type="text"
                    value={aiConfig.model}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs"
                  />
                </div>
              </div>

              {/* Enable Switch */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">启用 AI 增强解析</div>
                  <div className="text-[10px] text-slate-400">开启后截图与智能文本将优先调用 AI 大模型</div>
                </div>
                <input
                  type="checkbox"
                  checked={aiConfig.enabled}
                  onChange={(e) => setAiConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
              </div>

              {/* Test Result */}
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

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={testingAi}
                  onClick={handleTestAi}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition flex items-center gap-1"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  {testingAi ? '测试中...' : '测试连接'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveAi}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition flex items-center gap-1 shadow-md shadow-indigo-500/20"
                >
                  {aiSaved ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {aiSaved ? '已保存！' : '保存配置'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
