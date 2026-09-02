import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Images, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  Plus, 
  Wallet, 
  Building2, 
  TrendingUp, 
  CreditCard,
  Coins,
  Building,
  Check,
  Edit2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Account, AccountType } from '../types';
import { api } from '../api/client';
import { parseBalanceScreenshotWithAi, ExtractedBalanceResult } from '../services/aiParser';
import { localStore } from '../services/localStore';
import { optimizeImageForAi } from '../services/imageOptimizer';
import { BrandLogo } from './BrandLogo';
import { BottomSheet } from './common/BottomSheet';
import { haptic } from '../services/haptic';

interface BatchBalanceItem {
  id: string;
  file: File | null;
  previewUrl: string;
  fileName: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  errorMsg?: string;
  selected: boolean;
  platform: string;
  accountType: AccountType;
  balance: number;
  currency: string;
  bankName?: string;
  cardLast4?: string;
  matchedAccountId?: string;
  isNewAccount: boolean;
}

interface BatchBalanceOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingAccounts: Account[];
}

export const BatchBalanceOcrModal: React.FC<BatchBalanceOcrModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingAccounts
}) => {
  const [items, setItems] = useState<BatchBalanceItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert image file to compressed base64 Data URL
  const fileToDataUrl = async (file: File): Promise<string> => {
    return optimizeImageForAi(file);
  };

  // Match platform name to existing account
  const findMatchingAccount = (platform: string, type: AccountType): Account | undefined => {
    const pLower = platform.toLowerCase();
    return existingAccounts.find(acc => {
      const aLower = acc.name.toLowerCase();
      if (pLower.includes('花呗') && aLower.includes('花呗')) return true;
      if (pLower.includes('借呗') && aLower.includes('借呗')) return true;
      if (pLower.includes('白条') && aLower.includes('白条')) return true;
      if (pLower.includes('美团') && aLower.includes('美团')) return true;
      if (pLower.includes('抖音') && aLower.includes('抖音')) return true;
      if (pLower.includes('分付') && aLower.includes('分付')) return true;
      if (pLower.includes('零钱') && (aLower.includes('微信') || aLower.includes('零钱'))) return true;
      if (pLower.includes('余额宝') && (aLower.includes('支付宝') || aLower.includes('余额宝'))) return true;
      if (pLower.includes('支付宝') && aLower.includes('支付宝')) return true;
      if (pLower.includes('招商') && aLower.includes('招商')) return true;
      if (pLower.includes('工商') && aLower.includes('工行') || aLower.includes('工商')) return true;
      if (pLower.includes('建设') && aLower.includes('建行') || aLower.includes('建设')) return true;
      if (pLower.includes('理财') && aLower.includes('理财')) return true;
      if (pLower.includes('天天基金') && aLower.includes('基金')) return true;
      return aLower.includes(pLower) || pLower.includes(aLower);
    });
  };

  // Handle Multi-file upload
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    haptic.selection();
    const newItems: BatchBalanceItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: `batch-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        file,
        previewUrl,
        fileName: file.name,
        status: 'pending',
        selected: true,
        platform: '正在智能识别...',
        accountType: 'wallet',
        balance: 0,
        currency: 'CNY',
        isNewAccount: true
      });
    }

    const allQueue = [...items, ...newItems];
    setItems(allQueue);
    // Trigger TRUE parallel concurrency
    processQueueParallel(allQueue);
  };

  // Process items with TRUE PARALLEL CONCURRENCY (Promise.allSettled)
  const processQueueParallel = async (queue: BatchBalanceItem[]) => {
    setProcessing(true);

    const pendingItems = queue.filter(item => item.status !== 'success');
    if (pendingItems.length === 0) {
      setProcessing(false);
      return;
    }

    // Immediately set all pending items to processing state
    setItems(prev => prev.map(it => {
      if (it.status !== 'success') {
        return { ...it, status: 'processing' };
      }
      return it;
    }));

    // Launch concurrent parallel workers
    await Promise.allSettled(
      pendingItems.map(async (item) => {
        try {
          let base64 = item.previewUrl;
          if (item.file) {
            base64 = await fileToDataUrl(item.file);
          }

          // 1. Concurrent AI multimodal parsing
          let res: ExtractedBalanceResult | null = await parseBalanceScreenshotWithAi(base64);

          // 2. Fallback to local offline balance screenshot parser
          if (!res || res.balance === undefined || isNaN(res.balance)) {
            const { extractOcrRawText } = await import('../services/imageOcr');
            const { parseOfflineBalanceScreenshot } = await import('../services/balanceScreenshotParser');
            const rawText = await extractOcrRawText(base64);
            if (rawText) {
              res = parseOfflineBalanceScreenshot(rawText);
            }
          }

          if (res && res.balance >= 0) {
            const matched = findMatchingAccount(res.platform, res.accountType);
            setItems(prev => prev.map(it => it.id === item.id ? {
              ...it,
              platform: res!.platform,
              accountType: res!.accountType,
              balance: res!.balance,
              currency: res!.currency,
              bankName: res!.bankName,
              cardLast4: res!.cardLast4,
              matchedAccountId: matched ? matched.id : undefined,
              isNewAccount: !matched,
              status: 'success'
            } : it));
            haptic.selection();
          } else {
            setItems(prev => prev.map(it => it.id === item.id ? {
              ...it,
              platform: '资产账户',
              status: 'failed',
              errorMsg: '未能提取到准确金额，可手动填写'
            } : it));
          }
        } catch (err: any) {
          setItems(prev => prev.map(it => it.id === item.id ? {
            ...it,
            platform: '资产账户',
            status: 'failed',
            errorMsg: err.message || '识别超时'
          } : it));
        }
      })
    );

    setProcessing(false);
    haptic.success();
  };

  // Handle item property changes
  const updateItem = (id: string, updates: Partial<BatchBalanceItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeItem = (id: string) => {
    haptic.selection();
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Batch Save & Create/Update Accounts
  const handleBatchSave = async () => {
    const selectedItems = items.filter(i => i.selected && i.balance >= 0);
    if (selectedItems.length === 0) {
      alert('请至少选择一个已识别并确认金额的账户');
      return;
    }

    setSaving(true);
    try {
      let createdCount = 0;
      let updatedCount = 0;

      for (const item of selectedItems) {
        if (!item.isNewAccount && item.matchedAccountId) {
          // Update existing account
          await api.updateAccount(item.matchedAccountId, {
            balance: item.balance,
            bank_name: item.bankName,
            card_last4: item.cardLast4
          });
          updatedCount++;
        } else {
          // Create new account
          await api.createAccount({
            name: item.platform || '新增资产账户',
            type: item.accountType,
            currency: item.currency || 'CNY',
            balance: item.balance,
            initial_balance: item.balance,
            bank_name: item.bankName,
            card_last4: item.cardLast4,
            note: `通过 AI 截图批量建立于 ${new Date().toLocaleDateString()}`
          });
          createdCount++;
        }
      }

      haptic.success();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      onSuccess();
      onClose();
    } catch (err: any) {
      haptic.warning();
      alert(err.message || '批量建账失败');
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = items.filter(i => i.selected && i.status === 'success').length;
  const liabilityTypes = ['credit', 'loan', 'huabei', 'baitiao', 'meituan_pay', 'douyin_pay', 'jiebei', 'fenfu'];
  const totalBalanceSum = items
    .filter(i => i.selected && i.status === 'success')
    .reduce((sum, i) => {
      const isLiability = liabilityTypes.includes(i.accountType);
      return sum + (isLiability ? -i.balance : i.balance);
    }, 0);

  const getAccountTypeLabel = (type: AccountType) => {
    switch (type) {
      case 'wallet': return '第三方钱包 (微信/支付宝)';
      case 'bank': return '银行储蓄卡';
      case 'credit': return '信用卡';
      case 'investment': return '股票/基金投资';
      case 'huabei': return '花呗待还';
      case 'baitiao': return '京东白条待还';
      case 'meituan_pay': return '美团月付待还';
      case 'douyin_pay': return '抖音月付待还';
      case 'jiebei': return '借呗本金';
      case 'fenfu': return '微信分付';
      default: return '其他资产';
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="📸 批量多图识余额开账"
      description="多截图真高并发解析 · 一键快速建账对齐"
      maxHeightClass="max-h-[94dvh]"
      contentClassName="p-4 sm:p-5 space-y-4"
    >
      {/* Upload Dropzone */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-purple-300 dark:border-purple-800/80 hover:border-purple-500 rounded-3xl p-5 text-center cursor-pointer bg-purple-50/40 dark:bg-purple-950/20 transition group active:scale-98"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFilesSelected}
        />
        <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 flex items-center justify-center mx-auto mb-2.5 group-hover:scale-105 transition shadow-xs">
          <Upload className="w-5 h-5" />
        </div>
        <div className="text-xs font-black text-slate-800 dark:text-slate-200">
          点击选取或拖拽上传多张余额截图
        </div>
        <p className="text-[10.5px] text-slate-400 mt-1 leading-relaxed">
          支持微信、支付宝、银行卡、白条/花呗/月付、券商等，全部并行同时识别！
        </p>
      </div>

      {/* Concurrent Processing Indicator */}
      {processing && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-teal-500/15 border border-purple-200 dark:border-purple-800 flex items-center justify-between text-xs text-purple-800 dark:text-purple-300 animate-pulse">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <span className="font-bold">⚡ AI 正在全通道高并发并行分析多张图片...</span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-purple-500/20 px-2 py-0.5 rounded-full">
            PARALLEL
          </span>
        </div>
      )}

      {/* Recognized Items List */}
      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
            <span>已识别资产清单 ({items.length} 张图片)</span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-bold text-[11px]"
            >
              <Plus className="w-3.5 h-3.5" /> 继续添加截图
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <div 
                key={item.id}
                className={`p-3.5 rounded-2xl border transition shadow-xs ${
                  item.status === 'processing'
                    ? 'border-purple-300 dark:border-purple-800 bg-purple-50/20 dark:bg-purple-950/10'
                    : item.status === 'success'
                    ? 'border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-slate-800/80'
                    : 'border-rose-200 dark:border-rose-800/60 bg-rose-50/10 dark:bg-rose-950/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={(e) => updateItem(item.id, { selected: e.target.checked })}
                    className="mt-2.5 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 flex-shrink-0"
                  />

                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 border border-slate-200/80 dark:border-slate-700 relative">
                    {item.previewUrl ? (
                      <img 
                        src={item.previewUrl} 
                        alt="Screenshot Preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Images className="w-6 h-6" />
                      </div>
                    )}
                    {item.status === 'processing' && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <BrandLogo type={item.accountType} name={item.platform} className="w-4 h-4 flex-shrink-0" />
                        <input
                          type="text"
                          value={item.platform}
                          disabled={item.status === 'processing'}
                          onChange={(e) => updateItem(item.id, { platform: e.target.value })}
                          placeholder="账户名称"
                          className="font-bold text-xs bg-transparent text-slate-900 dark:text-white border-b border-dashed border-slate-300 dark:border-slate-700 focus:outline-none focus:border-purple-500 truncate w-full"
                        />
                      </div>
                      
                      {/* Match Status Badge */}
                      {item.status === 'success' && (
                        <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
                          item.isNewAccount
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        }`}>
                          {item.isNewAccount ? '✨ 新建' : '🔄 对齐'}
                        </span>
                      )}
                    </div>

                    {/* Account Type Selector */}
                    <select
                      value={item.accountType}
                      disabled={item.status === 'processing'}
                      onChange={(e) => updateItem(item.id, { accountType: e.target.value as AccountType })}
                      className="w-full text-[10.5px] bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-purple-500"
                    >
                      <option value="wallet">第三方钱包 (微信/支付宝)</option>
                      <option value="bank">银行储蓄卡</option>
                      <option value="credit">信用卡</option>
                      <option value="investment">股票/基金投资</option>
                      <option value="huabei">花呗待还</option>
                      <option value="baitiao">京东白条待还</option>
                      <option value="meituan_pay">美团月付待还</option>
                      <option value="douyin_pay">抖音月付待还</option>
                      <option value="jiebei">借呗本金</option>
                      <option value="fenfu">微信分付</option>
                      <option value="cash">现金及其他</option>
                    </select>

                    {item.status === 'failed' && (
                      <div className="text-[10px] text-rose-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        <span>{item.errorMsg || '识别失败，请手动输入金额'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Amount Row */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1 max-w-[200px]">
                    <span className="text-xs font-bold text-slate-400">¥</span>
                    <input
                      type="number"
                      step="0.01"
                      value={item.balance || ''}
                      onChange={(e) => updateItem(item.id, { balance: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="w-full font-mono font-black text-sm text-slate-900 dark:text-white bg-slate-100/80 dark:bg-slate-700/60 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition flex-shrink-0 active:scale-90"
                    title="移除此项"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky Bottom Action Card */}
      <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800">
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between px-1">
          <span>
            已选定 <strong className="text-purple-600 dark:text-purple-400 font-mono">{selectedCount}</strong> 个账户
          </span>
          <span>
            资产总额约 <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">¥{totalBalanceSum.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</strong>
          </span>
        </div>

        <button
          type="button"
          disabled={saving || selectedCount === 0 || processing}
          onClick={handleBatchSave}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-600 hover:from-purple-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50"
        >
          <Check className="w-4 h-4 stroke-[2.5]" />
          <span>{saving ? '正在批量写入账户...' : `一键对齐开账与更新全部余额 (${selectedCount})`}</span>
        </button>
      </div>
    </BottomSheet>
  );
};
