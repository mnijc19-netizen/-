import React, { useState, useEffect } from 'react';
import { Sparkles, Clipboard, CheckCircle2, AlertCircle, ArrowRight, X, Smartphone, Bot, Tag, Calendar, Wallet } from 'lucide-react';
import { api } from '../api/client';
import { Account, Category, ParsedTransactionResult } from '../types';
import { getBeijingDateTimeString } from '../utils/dateUtils';

interface SmartParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: Account[];
  categories: Category[];
}

const SAMPLE_TEXTS = [
  {
    label: "招商银行短信",
    text: "【招商银行】您账户9527于08月25日14:30在美团消费支出人民币58.00元，余额12345.67元"
  },
  {
    label: "微信支付凭证",
    text: "微信支付：微信支付凭证 商户消费 ¥68.50 商户名称: 瑞幸咖啡 付款方式: 招商银行储蓄卡(9527)"
  },
  {
    label: "支付宝交易",
    text: "支付宝：您在【淘宝天猫】通过余额宝成功付款88.00元"
  },
  {
    label: "一句话语音记账",
    text: "昨晚在海底捞吃了320招行信用卡"
  },
  {
    label: "工资入账短信",
    text: "【工商银行】您尾号8888卡于8月10日10:00转入18500.00元来自某科技公司[工银信使]"
  }
];

export const SmartParserModal: React.FC<SmartParserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories
}) => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedTransactionResult | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || 'acc-1');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (accounts.length > 0 && (!selectedAccountId || !accounts.find(a => a.id === selectedAccountId))) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, isOpen]);

  // Handle parsing text
  const handleParse = async (textToParse: string) => {
    if (!textToParse.trim()) {
      setParsedResult(null);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.parseText(textToParse);
      setParsedResult(res);
      
      // Auto match account if found
      if (res.matched_account_id) {
        setSelectedAccountId(res.matched_account_id);
      } else if (accounts.length > 0) {
        setSelectedAccountId(accounts[0].id);
      }

      // Auto match category if found
      if (res.suggested_category) {
        const found = categories.find(c => c.name === res.suggested_category);
        if (found) setSelectedCategoryId(found.id);
        else if (categories.length > 0) setSelectedCategoryId(categories[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || '识别失败');
    } finally {
      setLoading(false);
    }
  };

  // Read from clipboard
  const handlePasteClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setInputText(clipText);
        handleParse(clipText);
      }
    } catch (e) {
      alert("请允许剪贴板读取权限，或直接在输入框中按 Ctrl+V 粘贴");
    }
  };

  // Submit transaction
  const handleSaveTransaction = async () => {
    if (!parsedResult || !parsedResult.amount) {
      setErrorMsg('未能识别有效金额，请手动补充');
      return;
    }
    if (!selectedAccountId) {
      setErrorMsg('请选择入账/扣款账户');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const catObj = categories.find(c => c.id === selectedCategoryId);
      await api.createTransaction({
        type: parsedResult.type || 'expense',
        amount: parsedResult.amount,
        account_id: selectedAccountId,
        category_id: selectedCategoryId || undefined,
        category_name: catObj ? catObj.name : parsedResult.suggested_category || '日常消费',
        date: parsedResult.date || getBeijingDateTimeString(),
        merchant: parsedResult.merchant || '智能记账商户',
        note: parsedResult.note || `由智能文本识别生成`,
        source: 'sms_parser',
        raw_text: parsedResult.raw_text
      });

      setInputText('');
      setParsedResult(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[82vh] my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                智能短信与通知记账
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  零摩擦防放弃
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                复制手机扣款短信、微信/支付宝凭证或一句话，自动秒级提取字段
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Sample quick pills */}
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" /> 点击体验预设短信与通知示例：
            </div>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_TEXTS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInputText(sample.text);
                    handleParse(sample.text);
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1"
                >
                  <Smartphone className="w-3 h-3 text-emerald-500" />
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Input Area */}
          <div className="relative">
            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                handleParse(e.target.value);
              }}
              placeholder="在此粘贴任意银行短信、微信支付凭证、支付宝消费通知或自然语言（如：昨晚在海底捞吃了320招行卡）..."
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition text-sm"
            />
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="absolute right-3 bottom-3 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition flex items-center gap-1"
            >
              <Clipboard className="w-3.5 h-3.5 text-emerald-500" />
              粘贴剪贴板
            </button>
          </div>

          {/* Parsed Result Display */}
          {parsedResult && (
            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-4 animate-in fade-in-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                    已智能提取以下财务要素
                  </span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-medium">
                  {parsedResult.matched_rule || 'NLP智能识别'} (置信度 {Math.round(parsedResult.confidence * 100)}%)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                  <div className="text-xs text-slate-400">交易金额</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    ¥{parsedResult.amount?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                  <div className="text-xs text-slate-400">收支类型</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {parsedResult.type === 'expense' ? '支出 📉' : parsedResult.type === 'income' ? '收入 📈' : '转账 🔄'}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                  <div className="text-xs text-slate-400">商户 / 交易对象</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {parsedResult.merchant || '日常消费'}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                  <div className="text-xs text-slate-400">交易时间</div>
                  <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {parsedResult.date || '实时'}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                  <div className="text-xs text-slate-400">推荐分类</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {parsedResult.suggested_category || '日用百货'}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                  <div className="text-xs text-slate-400">变动后余额</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {parsedResult.balance_after ? `¥${parsedResult.balance_after.toFixed(2)}` : '未附带'}
                  </div>
                </div>
              </div>

              {/* Account & Category Confirm/Override */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-emerald-500" /> 确认入账/扣款账户:
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency} 余额: {a.balance.toFixed(2)}) {a.card_last4 ? `[*${a.card_last4}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-emerald-500" /> 确认消费分类:
                  </label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type === 'expense' ? '支出' : '收入'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95 text-center"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!parsedResult || !parsedResult.amount || saving}
            onClick={handleSaveTransaction}
            className="flex-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition active:scale-95 whitespace-nowrap"
          >
            {saving ? '保存中...' : '一键确认并记账'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
