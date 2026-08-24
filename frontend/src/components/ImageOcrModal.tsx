import React, { useState } from 'react';
import { 
  Camera, 
  Image as ImageIcon, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  X, 
  Wallet, 
  Tag, 
  UploadCloud,
  RefreshCw
} from 'lucide-react';
import { parseBillImage, parseRecognizedBillText } from '../services/imageOcr';
import { api } from '../api/client';
import { Account, Category, ParsedTransactionResult } from '../types';

interface ImageOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: Account[];
  categories: Category[];
}

export const ImageOcrModal: React.FC<ImageOcrModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories
}) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPct, setProgressPct] = useState(0);
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

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setImagePreview(url);
      runOcr(file);
    };
    reader.readAsDataURL(file);
  };

  const runOcr = async (file: File) => {
    setLoading(true);
    setErrorMsg('');
    setParsedResult(null);
    try {
      const result = await parseBillImage(file, accounts, (pct, msg) => {
        setProgressPct(Math.round(pct * 100));
        setProgressMsg(msg);
      });
      setParsedResult(result);
      if (result.matched_account_id) {
        setSelectedAccountId(result.matched_account_id);
      } else if (accounts.length > 0) {
        setSelectedAccountId(accounts[0].id);
      }
      if (result.suggested_category) {
        const found = categories.find(c => c.name === result.suggested_category);
        if (found) setSelectedCategoryId(found.id);
        else if (categories.length > 0) setSelectedCategoryId(categories[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || '识别失败，请尝试更清晰的图片');
    } finally {
      setLoading(false);
    }
  };

  // Test with preset simulated bill screenshot
  const handleTestPreset = (type: 'wechat' | 'alipay') => {
    if (type === 'wechat') {
      const sampleText = "微信支付 微信支付凭证 商户消费 -58.00 交易对方: 瑞幸咖啡 付款方式: 招商银行(9527) 交易时间: 2026-08-25 14:30:15";
      const res = parseRecognizedBillText(sampleText, accounts);
      setParsedResult(res);
      if (res.matched_account_id) setSelectedAccountId(res.matched_account_id);
      if (res.suggested_category) {
        const found = categories.find(c => c.name === res.suggested_category);
        if (found) setSelectedCategoryId(found.id);
      }
    } else {
      const sampleText = "支付宝交易提醒 淘宝天猫实付金额: 128.00元 交易时间: 2026-08-25 19:20 付款方式: 余额宝";
      const res = parseRecognizedBillText(sampleText, accounts);
      setParsedResult(res);
      if (res.matched_account_id) setSelectedAccountId(res.matched_account_id);
      if (res.suggested_category) {
        const found = categories.find(c => c.name === res.suggested_category);
        if (found) setSelectedCategoryId(found.id);
      }
    }
  };

  const handleSave = async () => {
    if (!parsedResult || !parsedResult.amount) return;
    setSaving(true);
    try {
      const catObj = categories.find(c => c.id === selectedCategoryId);
      await api.createTransaction({
        type: parsedResult.type || 'expense',
        amount: parsedResult.amount,
        account_id: selectedAccountId || accounts[0]?.id || 'acc-1',
        category_id: selectedCategoryId || undefined,
        category_name: catObj ? catObj.name : parsedResult.suggested_category || '日常消费',
        date: parsedResult.date || new Date().toISOString().substring(0, 16).replace('T', ' '),
        merchant: parsedResult.merchant || '账单图片消费',
        note: parsedResult.note || '由账单图片识别生成',
        source: 'ocr_image',
        raw_text: parsedResult.raw_text
      });

      setImageFile(null);
      setImagePreview(null);
      setParsedResult(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '记账保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                拍照与账单图片识别
              </h3>
              <p className="text-[11px] text-slate-400">
                拍摄小票或上传微信/支付宝账单截图，自动提取要素
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Upload / Camera Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <label className="p-4 rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 flex flex-col items-center justify-center gap-2 cursor-pointer transition active:scale-95 text-center">
              <Camera className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">手机拍照 / 扫小票</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleImageSelect(e.target.files[0]);
                  }
                }}
              />
            </label>

            <label className="p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 flex flex-col items-center justify-center gap-2 cursor-pointer transition active:scale-95 text-center">
              <ImageIcon className="w-6 h-6 text-slate-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">相册选取账单截图</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleImageSelect(e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>

          {/* Quick preset test buttons */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 flex-shrink-0">快速测试示例:</span>
            <button
              type="button"
              onClick={() => handleTestPreset('wechat')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-medium"
            >
              微信凭证示例
            </button>
            <button
              type="button"
              onClick={() => handleTestPreset('alipay')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium"
            >
              支付宝凭证示例
            </button>
          </div>

          {/* Loading Progress State */}
          {loading && (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-3">
              <div className="animate-spin w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full mx-auto" />
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {progressMsg || '正在处理图片中...'}
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

          {/* Parsed Result Display */}
          {parsedResult && !loading && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  已识别财务要素
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 font-medium">
                  {parsedResult.matched_rule}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900">
                  <span className="text-[10px] text-slate-400">识别金额</span>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    ¥{parsedResult.amount?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900">
                  <span className="text-[10px] text-slate-400">商户 / 交易方</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    {parsedResult.merchant || '日常消费'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-emerald-500" /> 确认扣款账户
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-emerald-500" /> 消费分类
                  </label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!parsedResult || !parsedResult.amount || saving}
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 active:scale-95"
          >
            {saving ? '保存中...' : '一键确认入账'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
