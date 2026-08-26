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
  ShieldCheck,
  Search,
  Filter,
  CheckSquare,
  Square,
  Calendar,
  RotateCcw,
  FileText,
  Check,
  Download,
  Wand2,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api/client';
import { Account, Category, ParsedTransactionResult } from '../types';
import { getBeijingDateTimeString } from '../utils/dateUtils';
import { parseBillExcelOrCsv, executeImportBillTransactions, ParsedBillResult, ParsedBillItem } from '../services/billExcelParser';
import { batchCorrectCategories } from '../services/aiCategoryService';

interface SmartParserPageProps {
  accounts: Account[];
  categories: Category[];
  onRefresh: () => void;
  onNavigate?: (page: string) => void;
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

export const SmartParserPage: React.FC<SmartParserPageProps> = ({ accounts, categories, onRefresh, onNavigate }) => {
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

  // Excel / CSV Tab States
  const [billFile, setBillFile] = useState<File | null>(null);
  const [parsingBill, setParsingBill] = useState(false);
  const [parsedBill, setParsedBill] = useState<ParsedBillResult | null>(null);
  const [csvAccountId, setCsvAccountId] = useState(accounts[0]?.id || '');
  const [billFilter, setBillFilter] = useState<'all' | 'expense' | 'income' | 'duplicate'>('all');
  const [billKeyword, setBillKeyword] = useState('');
  const [importing, setImporting] = useState(false);
  const [importSuccessData, setImportSuccessData] = useState<{ count: number; totalExpense: number; totalIncome: number; accountName: string } | null>(null);
  const [parseError, setParseError] = useState('');

  // AI correction states
  const [aiCorrecting, setAiCorrecting] = useState(false);
  const [aiCorrectProgress, setAiCorrectProgress] = useState(0);
  const [aiCorrectTotal, setAiCorrectTotal] = useState(0);
  const [aiCorrectedCount, setAiCorrectedCount] = useState(0);

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
        date: parsedResult.date || getBeijingDateTimeString(),
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

  const handleFileSelect = async (file: File) => {
    setBillFile(file);
    setParsingBill(true);
    setParseError('');
    setImportSuccessData(null);
    try {
      const result = await parseBillExcelOrCsv(file);
      setParsedBill(result);

      // Auto-match account
      if (result.channel === 'wechat') {
        const wechatAcc = accounts.find(a => a.name.includes('微信'));
        if (wechatAcc) setCsvAccountId(wechatAcc.id);
      } else if (result.channel === 'alipay') {
        const alipayAcc = accounts.find(a => a.name.includes('支付宝'));
        if (alipayAcc) setCsvAccountId(alipayAcc.id);
      }
    } catch (e: any) {
      setParseError(e.message || '账单解析失败，请确保为微信或支付宝官方导出的 Excel 或 CSV 文件');
      setParsedBill(null);
    } finally {
      setParsingBill(false);
    }
  };

  const handleToggleItem = (itemId: string) => {
    if (!parsedBill) return;
    setParsedBill({
      ...parsedBill,
      items: parsedBill.items.map(item => item.id === itemId ? { ...item, selected: !item.selected } : item)
    });
  };

  const handleSelectAll = (select: boolean) => {
    if (!parsedBill) return;
    setParsedBill({
      ...parsedBill,
      items: parsedBill.items.map(item => ({ ...item, selected: select }))
    });
  };

  const handleSelectOnlyType = (type: 'expense' | 'income') => {
    if (!parsedBill) return;
    setParsedBill({
      ...parsedBill,
      items: parsedBill.items.map(item => ({ ...item, selected: item.type === type && !item.isDuplicate }))
    });
  };

  const handleChangeItemCategory = (itemId: string, newCat: string) => {
    if (!parsedBill) return;
    setParsedBill({
      ...parsedBill,
      items: parsedBill.items.map(item => item.id === itemId ? { ...item, category: newCat } : item)
    });
  };

  // AI 批量修正低置信度条目的分类
  const handleAiBatchCorrect = async () => {
    if (!parsedBill) return;
    // Only correct low-confidence items (< 0.5)
    const lowConfItems = parsedBill.items.filter(i => i.categoryConfidence < 0.5 && !i.aiCorrected);
    if (lowConfItems.length === 0) {
      alert('✅ 所有条目分类置信度已足够高，无需 AI 修正');
      return;
    }

    setAiCorrecting(true);
    setAiCorrectProgress(0);
    setAiCorrectTotal(lowConfItems.length);
    setAiCorrectedCount(0);

    try {
      const correctionMap = await batchCorrectCategories(
        lowConfItems.map(i => ({ id: i.id, merchant: i.merchant, category: i.category, type: i.type })),
        (processed, total) => {
          setAiCorrectProgress(processed);
        }
      );

      let corrected = 0;
      setParsedBill({
        ...parsedBill,
        items: parsedBill.items.map(item => {
          const correction = correctionMap.get(item.id);
          if (correction && correction.category !== item.category) {
            corrected++;
            return {
              ...item,
              category: correction.category,
              categoryConfidence: correction.confidence,
              categoryReason: correction.reason,
              isPersonTransfer: correction.isPersonTransfer,
              aiCorrected: true
            };
          }
          return item;
        })
      });
      setAiCorrectedCount(corrected);
    } catch (e) {
      console.error('AI batch correction failed:', e);
    } finally {
      setAiCorrecting(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!parsedBill) return;
    const selectedItems = parsedBill.items.filter(i => i.selected);
    if (selectedItems.length === 0) {
      alert('请至少勾选一笔要导入的流水记录');
      return;
    }
    const targetAcc = accounts.find(a => a.id === csvAccountId) || accounts[0];
    if (!targetAcc) {
      alert('请选择目标入账账户');
      return;
    }

    setImporting(true);
    try {
      const res = await executeImportBillTransactions(parsedBill.items, targetAcc.id);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}

      setImportSuccessData({
        count: res.importedCount,
        totalExpense: res.totalExpense,
        totalIncome: res.totalIncome,
        accountName: targetAcc.name
      });
      onRefresh();
    } catch (e: any) {
      alert('导入失败: ' + (e.message || '未知错误'));
    } finally {
      setImporting(false);
    }
  };

  const visibleItems = (parsedBill?.items || []).filter(item => {
    if (billFilter === 'expense' && item.type !== 'expense') return false;
    if (billFilter === 'income' && item.type !== 'income') return false;
    if (billFilter === 'duplicate' && !item.isDuplicate) return false;

    if (billKeyword.trim()) {
      const q = billKeyword.trim().toLowerCase();
      const match = item.merchant.toLowerCase().includes(q) ||
                    item.product.toLowerCase().includes(q) ||
                    item.category.toLowerCase().includes(q) ||
                    item.orderId.toLowerCase().includes(q) ||
                    String(item.amount).includes(q);
      if (!match) return false;
    }
    return true;
  });

  const selectedCount = (parsedBill?.items || []).filter(i => i.selected).length;
  const selectedExpense = (parsedBill?.items || []).filter(i => i.selected && i.type === 'expense').reduce((s, i) => s + i.amount, 0);
  const selectedIncome = (parsedBill?.items || []).filter(i => i.selected && i.type === 'income').reduce((s, i) => s + i.amount, 0);
  const duplicateCount = (parsedBill?.items || []).filter(i => i.isDuplicate).length;

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
            <FileSpreadsheet className="w-3.5 h-3.5" /> 微信/支付宝Excel·CSV导入
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

      {/* Tab 2: Batch Excel & CSV Official Bill Import Workbench */}
      {activeTab === 'csv' && (
        <div className="space-y-6">
          {/* State 1: Success Banner after Import */}
          {importSuccessData && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 border border-emerald-300 dark:border-emerald-700/60 shadow-lg text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  🎉 账单批量入账成功！
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  已成功将 <b className="text-emerald-600 dark:text-emerald-400">{importSuccessData.count} 笔</b> 官方账单流水写入记账明细，并已同步更新【{importSuccessData.accountName}】的资金余额与全网净资产！
                </p>
              </div>

              <div className="inline-flex items-center gap-4 p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-mono">
                <div>
                  <span className="text-slate-400">总支出: </span>
                  <span className="font-bold text-rose-500">-¥{importSuccessData.totalExpense.toFixed(2)}</span>
                </div>
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
                <div>
                  <span className="text-slate-400">总收入: </span>
                  <span className="font-bold text-emerald-500">+¥{importSuccessData.totalIncome.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setParsedBill(null);
                    setBillFile(null);
                    setImportSuccessData(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> 继续导入其他账单
                </button>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('transactions')}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                  >
                    <span>查看记账明细</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* State 2: No parsed bill yet -> Upload Dropzone */}
          {!parsedBill && !importSuccessData && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                      零误差 · 本地秒解
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      微信 / 支付宝官方 Excel & CSV 账单导入
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    支持直接上传手机微信（个人对账单）或支付宝导出的 Excel (<b>.xlsx / .xls</b>) 或 <b>.csv</b> 文件。纯浏览器高精度硬核提取金额与时间，结合 AI 语义智能分类与重复记录自动剔除！
                  </p>
                </div>

                {/* Drag & Drop File Area */}
                <label className={`relative block p-10 border-2 border-dashed rounded-3xl text-center cursor-pointer transition ${
                  parsingBill 
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' 
                    : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50/60 dark:bg-slate-800/30'
                }`}>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.txt"
                    className="hidden"
                    disabled={parsingBill}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 flex items-center justify-center shadow-inner">
                      {parsingBill ? (
                        <RotateCcw className="w-7 h-7 animate-spin" />
                      ) : (
                        <UploadCloud className="w-7 h-7" />
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-emerald-600 hover:underline">
                        {parsingBill ? '正在高精度解析账单数据...' : '点击选择微信/支付宝导出的 Excel 或 CSV 文件'}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-1">
                        支持格式：.xlsx、.xls、.csv · 拖拽文件到这里亦可秒级识别
                      </p>
                    </div>
                  </div>
                </label>

                {parseError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{parseError}</span>
                  </div>
                )}

                {/* Guide Tips Accordion / Box */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3 text-xs">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    <span>官方账单如何导出？（1分钟教程）</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-slate-600 dark:text-slate-400">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span>🟢 微信支付账单导出</span>
                      </div>
                      <p className="leading-relaxed">
                        微信 ➔ 我 ➔ 服务 ➔ 钱包 ➔ 右上角【账单】➔ 右上角【常见问题】➔【下载账单】➔【用于个人对账】➔ 发送至邮箱解压后上传即可。
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                      <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <span>🔵 支付宝账单导出</span>
                      </div>
                      <p className="leading-relaxed">
                        支付宝 ➔ 我的 ➔【账单】➔ 右上角三个点【...】➔【开具交易流水证明】➔【用于个人对账】➔ 导出为 Excel 或 CSV 后上传即可。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* State 3: Parsed Bill Preview & Interactive Management Workbench */}
          {parsedBill && !importSuccessData && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Header Overview Card */}
              <div className={`p-5 rounded-3xl border shadow-sm ${
                parsedBill.channel === 'wechat'
                  ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/8 to-transparent border-emerald-300 dark:border-emerald-800'
                  : 'bg-gradient-to-r from-blue-500/10 via-indigo-500/8 to-transparent border-blue-300 dark:border-blue-800'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-700/60 pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center font-black text-sm shadow-md ${
                      parsedBill.channel === 'wechat' ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-blue-600 shadow-blue-500/20'
                    }`}>
                      {parsedBill.channel === 'wechat' ? '微' : '支'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                          {parsedBill.channelName}
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300">
                          {billFile?.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>账单时间范围：{parsedBill.dateRange.start || '未知'} 至 {parsedBill.dateRange.end || '未知'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Account Selector */}
                  <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 p-1.5 px-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                    <span className="text-slate-400 text-[11px] flex-shrink-0">入账账户:</span>
                    <select
                      value={csvAccountId}
                      onChange={(e) => setCsvAccountId(e.target.value)}
                      className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none text-xs"
                    >
                      {accounts.map(a => (
                        <option key={a.id} value={a.id} className="dark:bg-slate-900 text-slate-900 dark:text-white">
                          {a.name} (余额 ¥{a.balance.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4 Stats Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3.5">
                  <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-center overflow-hidden">
                    <div className="text-[10px] text-slate-400 font-medium truncate">总识别明细</div>
                    <div className="text-base font-black font-mono text-slate-900 dark:text-white mt-0.5 truncate">
                      {parsedBill.totalCount}<span className="text-[10px] font-normal ml-0.5">笔</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-center overflow-hidden">
                    <div className="text-[10px] text-slate-400 font-medium truncate">支出({parsedBill.expenseCount}笔)</div>
                    <div className="text-sm font-black font-mono text-rose-500 mt-0.5 truncate">
                      ¥{parsedBill.totalExpense.toFixed(0)}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-center overflow-hidden">
                    <div className="text-[10px] text-slate-400 font-medium truncate">收入({parsedBill.incomeCount}笔)</div>
                    <div className="text-sm font-black font-mono text-emerald-500 mt-0.5 truncate">
                      ¥{parsedBill.totalIncome.toFixed(0)}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-center overflow-hidden">
                    <div className="text-[10px] text-slate-400 font-medium truncate">⚡ 去重拦截</div>
                    <div className="text-base font-black font-mono text-amber-500 mt-0.5 truncate">
                      {duplicateCount}<span className="text-[10px] font-normal ml-0.5">笔</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter & Toolbar */}
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5 text-xs">
                {/* Row 1: Filter tabs */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'all', label: `全部 (${parsedBill.totalCount})` },
                    { id: 'expense', label: `支出 (${parsedBill.expenseCount})` },
                    { id: 'income', label: `收入 (${parsedBill.incomeCount})` },
                    { id: 'duplicate', label: `已重复 (${duplicateCount})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setBillFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition flex-shrink-0 ${
                        billFilter === tab.id
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Row 2: Quick Select + Search */}
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0 flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-medium mr-0.5">勾选：</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAll(true)}
                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 active:scale-95 transition"
                      title="全部勾选（含已重复条目）"
                    >
                      全部
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectOnlyType('expense')}
                      className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-800/50 hover:bg-rose-100 text-[11px] font-bold text-rose-600 dark:text-rose-400 active:scale-95 transition"
                      title="仅勾选支出类（不计收入、不计已重复）"
                    >
                      仅支出
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAll(false)}
                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-400 active:scale-95 transition"
                      title="取消全部勾选"
                    >
                      取消
                    </button>
                  </div>

                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={billKeyword}
                      onChange={(e) => setBillKeyword(e.target.value)}
                      placeholder="搜索商户/单号..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
                    />
                  </div>

                  {/* AI 一键修正按钮 */}
                  {(() => {
                    const lowConfCount = parsedBill?.items.filter(i => i.categoryConfidence < 0.5 && !i.aiCorrected).length || 0;
                    return lowConfCount > 0 ? (
                      <button
                        type="button"
                        onClick={handleAiBatchCorrect}
                        disabled={aiCorrecting}
                        className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:opacity-60 text-white text-[11px] font-bold transition active:scale-95"
                        title={`${lowConfCount} 笔分类置信度低，AI 帮你修正`}
                      >
                        <Wand2 className="w-3 h-3" />
                        AI修正 <span className="bg-white/25 rounded px-1">{lowConfCount}</span>
                      </button>
                    ) : aiCorrectedCount > 0 ? (
                      <span className="flex-shrink-0 text-[10px] text-violet-500 font-medium flex items-center gap-0.5">
                        <Sparkles className="w-3 h-3" /> 已修正 {aiCorrectedCount} 笔
                      </span>
                    ) : null;
                  })()}
                </div>

                {/* AI 修正进度条 */}
                {aiCorrecting && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-violet-500">
                      <span className="flex items-center gap-1">
                        <Bot className="w-3 h-3 animate-pulse" /> AI 正在识别分类…
                      </span>
                      <span>{aiCorrectProgress}/{aiCorrectTotal}</span>
                    </div>
                    <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all duration-300"
                        style={{ width: `${aiCorrectTotal > 0 ? (aiCorrectProgress / aiCorrectTotal) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Transactions List */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
                <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                  {visibleItems.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs">
                      没有符合筛选条件的明细流水
                    </div>
                  ) : (
                    visibleItems.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleItem(item.id)}
                        className={`p-3 sm:px-4 flex items-center justify-between gap-3 cursor-pointer transition hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${
                          item.selected ? 'bg-emerald-50/30 dark:bg-emerald-950/15' : 'opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Checkbox */}
                          <div className="flex-shrink-0 text-emerald-600">
                            {item.selected ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[140px] sm:max-w-[240px]">
                                {item.merchant}
                              </span>
                              {item.isDuplicate && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold flex-shrink-0">
                                  已存在
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono">{item.date.slice(5, 16)}</span>
                              {item.product && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[120px]">{item.product}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>{item.channel}</span>
                            </div>
                          </div>
                        </div>

                        {/* Category & Amount */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <div className="flex items-center gap-1">
                            {/* Low confidence warning */}
                            {item.categoryConfidence < 0.5 && !item.aiCorrected && (
                              <span title={`分类置信度低 (${Math.round(item.categoryConfidence * 100)}%)，建议用 AI 修正`}>
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                              </span>
                            )}
                            {/* AI corrected badge */}
                            {item.aiCorrected && (
                              <span className="text-[9px] text-violet-500 flex items-center gap-0.5 font-bold">
                                <Sparkles className="w-2.5 h-2.5" /> AI
                              </span>
                            )}
                            {/* Personal transfer badge */}
                            {item.isPersonTransfer && (
                              <span title="识别为个人转账" className="text-[9px] text-blue-400">👤</span>
                            )}
                            <select
                              value={item.category}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleChangeItemCategory(item.id, e.target.value)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border focus:outline-none ${
                                item.categoryConfidence >= 0.8
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                  : item.categoryConfidence >= 0.5
                                  ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50'
                                  : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50'
                              }`}
                            >
                              {categories.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="font-mono font-black text-xs sm:text-sm min-w-[70px] text-right">
                            {item.type === 'expense' ? (
                              <span className="text-slate-900 dark:text-white">-¥{item.amount.toFixed(2)}</span>
                            ) : (
                              <span className="text-emerald-500">+¥{item.amount.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Sticky Action Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-850/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="text-slate-500 dark:text-slate-400">已勾选：</span>
                    <b className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{selectedCount}</b>
                    <span className="text-slate-400 text-[11px] ml-1">笔</span>
                    <span className="mx-2 text-slate-300 dark:text-slate-700">|</span>
                    <span className="text-slate-400 text-[11px]">
                      支出: <b className="text-rose-500 font-mono">¥{selectedExpense.toFixed(2)}</b> • 收入: <b className="text-emerald-500 font-mono">¥{selectedIncome.toFixed(2)}</b>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setParsedBill(null);
                        setBillFile(null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 transition"
                    >
                      重新选文件
                    </button>
                    <button
                      type="button"
                      disabled={importing || selectedCount === 0}
                      onClick={handleExecuteImport}
                      className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      {importing ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                          <span>正在批量入账...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>确认批量导入选中的 {selectedCount} 笔流水</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
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
