import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Bot, 
  FileSpreadsheet, 
  FlaskConical, 
  Clipboard, 
  CheckCircle2, 
  AlertCircle, 
  UploadCloud, 
  Smartphone, 
  ArrowRight,
  Wallet,
  Tag,
  ShieldCheck
} from 'lucide-react';
import { api } from '../api/client';
import { Account, Category, ParsedTransactionResult } from '../types';

interface SmartParserPageProps {
  accounts: Account[];
  categories: Category[];
  onRefresh: () => void;
}

const PRESET_SMS_LIST = [
  { bank: "招商银行", type: "消费支出", text: "【招商银行】您账户9527于08月25日14:30在美团消费支出人民币58.00元，余额12345.67元" },
  { bank: "工商银行", type: "工资入账", text: "【工商银行】您尾号8888卡于8月10日10:00转入18500.00元来自某科技公司[工银信使]" },
  { bank: "建设银行", type: "转账支出", text: "【建设银行】您尾号1234的储蓄卡账户8月25日10:30向张三转账支出1000.00元，活期余额5432.10元" },
  { bank: "微信支付", type: "商户凭证", text: "微信支付：微信支付凭证 商户消费 ¥68.50 商户名称: 瑞幸咖啡 付款方式: 招商银行储蓄卡(9527)" },
  { bank: "支付宝", type: "淘宝消费", text: "支付宝：您在【淘宝天猫】通过余额宝成功付款88.00元" },
  { bank: "自然语言", type: "一句话语音", text: "昨晚在海底捞吃了320招行信用卡" },
  { bank: "农业银行", type: "快捷支付", text: "【农业银行】您尾号5678账户于08月25日09:15完成一笔财付通快捷支付，金额28.50元，余额8888.00元" }
];

export const SmartParserPage: React.FC<SmartParserPageProps> = ({ accounts, categories, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'csv' | 'rules'>('text');

  // Text Tab States
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedTransactionResult | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // CSV Tab States
  const [csvChannel, setCsvChannel] = useState<'wechat' | 'alipay'>('wechat');
  const [csvAccountId, setCsvAccountId] = useState(accounts[0]?.id || '');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [csvResultMsg, setCsvResultMsg] = useState('');

  // Rules Tab States
  const [builtinRules, setBuiltinRules] = useState<any[]>([]);

  useEffect(() => {
    api.getBuiltinRules().then(setBuiltinRules).catch(() => {});
  }, []);

  const handleParse = async (text: string) => {
    if (!text.trim()) {
      setParsedResult(null);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.parseText(text);
      setParsedResult(res);
      if (res.matched_account_id) {
        setSelectedAccountId(res.matched_account_id);
      }
      if (res.suggested_category) {
        const found = categories.find(c => c.name === res.suggested_category);
        if (found) setSelectedCategoryId(found.id);
      }
    } catch (e: any) {
      setErrorMsg(e.message || '识别失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setInputText(clipText);
        handleParse(clipText);
      }
    } catch (e) {
      alert("请直接在文本框按 Ctrl+V 粘贴文本");
    }
  };

  const handleSaveTransaction = async () => {
    if (!parsedResult || !parsedResult.amount) return;
    setSaving(true);
    setErrorMsg('');
    try {
      const catObj = categories.find(c => c.id === selectedCategoryId);
      await api.createTransaction({
        type: parsedResult.type || 'expense',
        amount: parsedResult.amount,
        account_id: selectedAccountId || accounts[0].id,
        category_id: selectedCategoryId || undefined,
        category_name: catObj ? catObj.name : parsedResult.suggested_category || '日常消费',
        date: parsedResult.date || new Date().toISOString().replace('T', ' ').substring(0, 16),
        merchant: parsedResult.merchant || '智能记账商户',
        note: parsedResult.note || '由智能文本识别生成',
        source: 'sms_parser',
        raw_text: parsedResult.raw_text
      });

      setSuccessMsg(`已成功记账：¥${parsedResult.amount} (${parsedResult.merchant || '消费'})`);
      setInputText('');
      setParsedResult(null);
      onRefresh();
    } catch (e: any) {
      setErrorMsg(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleCsvImport = async () => {
    if (!csvFile) {
      alert('请先选择账单 CSV 文件');
      return;
    }
    setImporting(true);
    setCsvResultMsg('');
    try {
      const res = await api.importCsv(csvChannel, csvAccountId, csvFile);
      setCsvResultMsg(res.message);
      onRefresh();
    } catch (e: any) {
      alert(e.message || '导入失败');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            智能识别与批量记账中心
          </h2>
          <p className="text-xs text-slate-400">
            支持手机扣款短信/通知提取、微信支付宝账单批量导入与模板规则实验室
          </p>
        </div>

        {/* Sub tabs */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'text' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> 短信/通知识别
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('csv')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'csv' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> 账单CSV批量导入
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'rules' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" /> 银行规则实验室
          </button>
        </div>
      </div>

      {/* Tab 1: Text / SMS Parser */}
      {activeTab === 'text' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Input & Test Samples */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  粘贴银行短信、微信支付凭证或自然语言
                </span>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1 hover:bg-emerald-100"
                >
                  <Clipboard className="w-3.5 h-3.5" /> 读取剪贴板
                </button>
              </div>

              <textarea
                rows={4}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  handleParse(e.target.value);
                }}
                placeholder="例如：【招商银行】您账户9527于08月25日14:30在美团消费支出人民币58.00元，余额12345.67元..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />

              {/* Preset bank templates */}
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-2">
                  点击直接载入预设样本测试：
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRESET_SMS_LIST.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setInputText(sample.text);
                        handleParse(sample.text);
                      }}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-left transition flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {sample.bank} • {sample.type}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                          {sample.text}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Parsed Result Card */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-emerald-500" />
                  智能提取结果
                </h3>
                {parsedResult && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                    匹配度 {Math.round(parsedResult.confidence * 100)}%
                  </span>
                )}
              </div>

              {parsedResult ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">提取金额</span>
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        ¥{parsedResult.amount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-emerald-100 dark:border-emerald-900/50">
                      <span className="text-slate-400">商户/对手</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{parsedResult.merchant || '日常消费'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">交易时间</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{parsedResult.date || '实时'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">匹配卡号</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{parsedResult.card_last4 ? `*${parsedResult.card_last4}` : '未指定'}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                        <Wallet className="w-3.5 h-3.5 text-emerald-500" /> 入账/扣款账户
                      </label>
                      <select
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                      >
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.balance.toFixed(2)}) {a.card_last4 ? `[*${a.card_last4}]` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-emerald-500" /> 消费分类
                      </label>
                      <select
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                      >
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={saving || !parsedResult.amount}
                      onClick={handleSaveTransaction}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      {saving ? '正在入账...' : '一键确认入账'}
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs leading-relaxed">
                  在左侧输入或粘贴任意银行短信/通知，此处将自动展示提取的财务要素
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {errorMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Batch CSV Import */}
      {activeTab === 'csv' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                微信 / 支付宝官方账单 CSV 批量导入
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                支持直接将手机微信/支付宝导出的「个人对账单明细 CSV」文件拖拽上传，系统自动去重、自动分类！
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  账单文件来源渠道
                </label>
                <select
                  value={csvChannel}
                  onChange={(e) => setCsvChannel(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                >
                  <option value="wechat">微信支付 (WeChat Pay CSV)</option>
                  <option value="alipay">支付宝 (Alipay CSV)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  关联入账账户
                </label>
                <select
                  value={csvAccountId}
                  onChange={(e) => setCsvAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Drag & Drop File Area */}
            <div className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center space-y-3 bg-slate-50/50 dark:bg-slate-800/30">
              <UploadCloud className="w-10 h-10 mx-auto text-emerald-500" />
              <div>
                <label className="cursor-pointer text-xs font-bold text-emerald-600 hover:text-emerald-500">
                  <span>点击选择 CSV 账单文件</span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setCsvFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
                <span className="text-xs text-slate-400"> 或拖拽文件至此处</span>
              </div>
              {csvFile && (
                <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  已选择: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={!csvFile || importing}
              onClick={handleCsvImport}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              {importing ? '正在解析并批量导入...' : '开始批量导入与去重入账'}
            </button>

            {csvResultMsg && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium">
                {csvResultMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Built-in Rules Library */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              已内置国内主流银行及第三方支付短信匹配规则库
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              系统内置针对招商、工商、建设、农业、中国银行、微信、支付宝等银行机构的高性能命名捕获正则引擎。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {builtinRules.map((r, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{r.bank} • {r.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      {r.type === 'expense' ? '支出' : '收入'}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate bg-slate-100 dark:bg-slate-900 p-1.5 rounded">
                    {r.pattern}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
