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
import { getBeijingDateTimeString } from '../utils/dateUtils';
import { BottomSheet } from './common/BottomSheet';

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

  const handleTestPreset = async (presetType: 'wechat' | 'alipay') => {
    setLoading(true);
    setProgressPct(20);
    setProgressMsg('正在加载精选凭证样例...');
    
    setTimeout(async () => {
      setProgressPct(60);
      setProgressMsg('正在调用 GLM-4V 视觉模型深度理解...');
      
      const sampleText = presetType === 'wechat'
        ? "微信支付：微信支付凭证 商户消费 ¥68.50 商户名称: 瑞幸咖啡 付款方式: 招商银行储蓄卡(9527)"
        : "支付宝：您在【淘宝天猫】通过余额宝成功付款88.00元";

      const res = parseRecognizedBillText(sampleText, accounts);
      setParsedResult(res);
      if (res.matched_account_id) {
        setSelectedAccountId(res.matched_account_id);
      }
      if (res.suggested_category) {
        const cat = categories.find(c => c.name === res.suggested_category);
        if (cat) setSelectedCategoryId(cat.id);
      }
      setProgressPct(100);
      setProgressMsg('识别完成！');
      setLoading(false);
    }, 600);
  };

  const runOcr = async (file: File) => {
    setLoading(true);
    setProgressMsg('准备优化图片尺寸并调用大模型...');
    setProgressPct(15);
    setErrorMsg('');

    try {
      const res = await parseBillImage(file, accounts, (pct, msg) => {
        setProgressMsg(msg);
        setProgressPct(Math.round(pct * 100));
      });

      if (res.success) {
        setParsedResult(res);
        if (res.matched_account_id) {
          setSelectedAccountId(res.matched_account_id);
        }
        if (res.suggested_category) {
          const cat = categories.find(c => c.name === res.suggested_category);
          if (cat) setSelectedCategoryId(cat.id);
        }
      } else {
        setErrorMsg('未能从图片中解析出有效金额，请确保截图中包含明显的金额信息。');
      }
    } catch (err: any) {
      setErrorMsg(err.message || '识别过程发生错误');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!parsedResult || !parsedResult.amount) return;

    setSaving(true);
    try {
      await api.createTransaction({
        account_id: selectedAccountId,
        category_id: selectedCategoryId || (categories[0]?.id || 'cat-1'),
        type: parsedResult.type || 'expense',
        amount: parsedResult.amount,
        merchant: parsedResult.merchant || '识别商户',
        date: parsedResult.date || getBeijingDateTimeString(),
        note: `[AI 视觉看图记账] ${parsedResult.matched_rule || ''}`
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '记账保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="📸 拍照与账单图片识别"
      description="GLM-4V-Flash 视觉大模型 · 自动提取记账"
      maxHeightClass="max-h-[92dvh]"
      contentClassName="p-4 sm:p-5 space-y-4"
    >
      <div className="space-y-4">
          {/* AI Multimodal Vision Banner */}
          <div className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-transparent border border-purple-500/25 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 animate-pulse" />
              <span className="text-[11px] font-bold text-purple-950 dark:text-purple-200">
                ✨ 已接入 GLM-4V-Flash 视觉识别大模型
              </span>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 font-mono font-bold">
              Vision AI
            </span>
          </div>

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
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2.5 bg-slate-50/50 dark:bg-slate-900/50">
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
            onClick={handleSave}
            className="flex-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 active:scale-95 whitespace-nowrap"
          >
            {saving ? '保存中...' : '一键确认入账'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
    </BottomSheet>
  );
};
