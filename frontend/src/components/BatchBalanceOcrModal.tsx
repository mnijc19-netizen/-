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
  const [aiConfigured, setAiConfigured] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Convert image file to base64 Data URL
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Match platform name to existing account
  const findMatchingAccount = (platform: string, type: AccountType): Account | undefined => {
    const pLower = platform.toLowerCase();
    return existingAccounts.find(acc => {
      const aLower = acc.name.toLowerCase();
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
        platform: file.name.replace(/\.[^/.]+$/, ''),
        accountType: 'wallet',
        balance: 0,
        currency: 'CNY',
        isNewAccount: true
      });
    }

    setItems(prev => [...prev, ...newItems]);
    // Auto trigger recognition
    processQueue([...items, ...newItems]);
  };

  // Process items in parallel
  const processQueue = async (queue: BatchBalanceItem[]) => {
    setProcessing(true);
    const updated = [...queue];

    for (let i = 0; i < updated.length; i++) {
      const item = updated[i];
      if (item.status === 'success') continue;

      item.status = 'processing';
      setItems([...updated]);

      try {
        let base64 = item.previewUrl;
        if (item.file) {
          base64 = await fileToDataUrl(item.file);
        }

        const res: ExtractedBalanceResult | null = await parseBalanceScreenshotWithAi(base64);

        if (res && res.balance >= 0) {
          item.platform = res.platform;
          item.accountType = res.accountType;
          item.balance = res.balance;
          item.currency = res.currency;
          item.bankName = res.bankName;
          item.cardLast4 = res.cardLast4;

          const matched = findMatchingAccount(res.platform, res.accountType);
          if (matched) {
            item.matchedAccountId = matched.id;
            item.isNewAccount = false;
          } else {
            item.matchedAccountId = undefined;
            item.isNewAccount = true;
          }

          item.status = 'success';
        } else {
          // Mock intelligent fallback if offline or no AI key
          item.status = 'failed';
          item.errorMsg = '未能提取到有效余额，请手动输入金额或在设置中配置 AI Key';
        }
      } catch (err: any) {
        item.status = 'failed';
        item.errorMsg = err.message || '识别超时';
      }

      setItems([...updated]);
    }
    setProcessing(false);
  };

  // Handle item property changes
  const updateItem = (id: string, updates: Partial<BatchBalanceItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeItem = (id: string) => {
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

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || '批量建账失败');
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = items.filter(i => i.selected && i.status === 'success').length;
  const totalBalanceSum = items
    .filter(i => i.selected && i.status === 'success')
    .reduce((s, i) => s + (i.accountType === 'credit' ? -i.balance : i.balance), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-purple-500/20">
              <Images className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>📸 AI 批量多图识余额开账</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                  BETA
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                一次性上传微信、支付宝、银行与证券 App 截图，AI 自动提取余额并一键建账
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          {/* Upload Dropzone */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-purple-300 dark:border-purple-800/80 hover:border-purple-500 rounded-3xl p-6 text-center cursor-pointer bg-purple-50/30 dark:bg-purple-950/10 transition group"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFilesSelected}
            />
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
              点击选取或拖拽上传多张余额截图
            </div>
            <p className="text-xs text-slate-400 mt-1">
              支持 iPhone 截屏、微信零钱/零钱通、支付宝余额宝、招商/工行银行卡、基金股票等图片
            </p>
          </div>

          {/* Processing Indicator */}
          {processing && (
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center gap-3 text-xs text-indigo-700 dark:text-indigo-300">
              <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
              <span>AI 多模态视觉模型正在深度分析图片余额...</span>
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
                  className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> 继续添加截图
                </button>
              </div>

              <div className="space-y-2.5">
                {items.map(item => (
                  <div 
                    key={item.id}
                    className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      item.selected 
                        ? 'bg-white dark:bg-slate-900 border-purple-300 dark:border-purple-800 shadow-sm' 
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    {/* Left: Checkbox + Thumbnail + Name/Type Inputs */}
                    <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) => updateItem(item.id, { selected: e.target.checked })}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 flex-shrink-0"
                      />

                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0 relative">
                        <img 
                          src={item.previewUrl} 
                          alt="preview" 
                          className="w-full h-full object-cover" 
                        />
                        {item.status === 'processing' && (
                          <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
                            <RefreshCw className="w-4 h-4 text-white animate-spin" />
                          </div>
                        )}
                        {item.status === 'success' && (
                          <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px]">
                            ✓
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item.platform}
                            onChange={(e) => updateItem(item.id, { platform: e.target.value })}
                            placeholder="平台/账户名称"
                            className="text-xs font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-none px-1 py-0.5 max-w-[160px] truncate"
                          />
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                            item.isNewAccount
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          }`}>
                            {item.isNewAccount ? '✨ 新建' : '🔄 更新'}
                          </span>
                        </div>

                        {/* Account Type Selector */}
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <select
                            value={item.accountType}
                            onChange={(e) => updateItem(item.id, { accountType: e.target.value as AccountType })}
                            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg px-2 py-0.5 text-[11px] border border-slate-200 dark:border-slate-700 focus:outline-none"
                          >
                            <option value="wallet">第三方钱包 (微信/支付宝)</option>
                            <option value="bank">银行储蓄卡</option>
                            <option value="investment">证券与理财基金</option>
                            <option value="crypto">加密资产</option>
                            <option value="credit">信用卡负债</option>
                            <option value="cash">现金</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Right: Editable Balance Amount + Delete Action */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-400">¥</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.balance || ''}
                          onChange={(e) => updateItem(item.id, { balance: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                          className="w-28 sm:w-32 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm text-right focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition flex-shrink-0"
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
        </div>

        {/* Footer Summary & Action Button */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            <span>已选定 </span>
            <span className="font-bold font-mono text-purple-600 dark:text-purple-400">{selectedCount}</span>
            <span> 个账户 • 资产总额约 </span>
            <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
              ¥{totalBalanceSum.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 text-xs font-bold"
            >
              取消
            </button>
            <button
              type="button"
              disabled={saving || selectedCount === 0}
              onClick={handleBatchSave}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-500/25 flex items-center justify-center gap-1.5 transition active:scale-98 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {saving ? '正在批量保存入账...' : `一键开账与更新全部余额 (${selectedCount})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
