import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Download, 
  Target, 
  Receipt, 
  Trash2, 
  RefreshCw, 
  TrendingUp, 
  Coins, 
  Lightbulb,
  MessageSquare,
  Key,
  Camera,
  Image as ImageIcon,
  Check,
  WalletCards
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Account, Transaction, Category, Goal } from '../types';
import { api } from '../api/client';
import { localStore } from '../services/localStore';
import { sendAgentMessage, AgentChatMessage } from '../services/aiAgent';
import { getBeijingDateTimeString, getBeijingDateString } from '../utils/dateUtils';

interface AiChatAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  onRefresh: () => void;
  onOpenSettings?: () => void;
}

const DEFAULT_WELCOME_MESSAGE: AgentChatMessage = {
  id: 'welcome-1',
  role: 'assistant',
  content: `您好！我是您的 **斌斌 AI 财务智能助手**。我已接入您的实时账本，不仅能为您分析收支与制定存钱计划，还能**直接帮您看图记账与开账**！

您可以直接对我下达指令或发送图片：
• 📷 **发送账单截图/小票**：直接发图，我将自动提取金额、商户并为您记账；
• 📸 **发送钱包/银行卡余额截图**：发微信零钱、支付宝总资产或银行卡余额，我将自动为您开账或校准余额；
• 💬 **自然语言直接说**：“中午在瑞幸咖啡微信付了 9.9 元”；
• 📊 **查账与存钱计划**：“这个月餐饮花了多少？”、“帮我制定6个月存2万的计划”。`,
  timestamp: getBeijingDateTimeString()
};

export const AiChatAssistantModal: React.FC<AiChatAssistantModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  transactions,
  goals,
  onRefresh,
  onOpenSettings
}) => {
  const [messages, setMessages] = useState<AgentChatMessage[]>([DEFAULT_WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const config = localStore.getAiConfig();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [isOpen, messages]);

  if (!isOpen) return null;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    // Reset file input value
    e.target.value = '';
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if ((!text && !selectedImage) || loading) return;

    const currentImg = selectedImage;
    setSelectedImage(null);

    const userMsg: AgentChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text || (currentImg ? '📸 上传了一张图片，请帮我分析处理' : ''),
      imageUrl: currentImg || undefined,
      timestamp: getBeijingDateTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setLoading(true);

    try {
      const response = await sendAgentMessage(
        text,
        messages,
        accounts,
        categories,
        transactions,
        goals,
        currentImg || undefined
      );

      let actionResult: any = undefined;

      // Execute Action if AI requested
      if (response.action && response.action.type !== 'none') {
        const act = response.action;

        // 1. Create Transaction Action
        if (act.type === 'create_transaction' && act.payload) {
          const catObj = categories.find(c => c.name === act.payload.category) || categories[0];
          let accId = accounts[0]?.id || 'acc-1';
          if (/微信/.test(act.payload.channel || '')) {
            const acc = accounts.find(a => a.name.includes('微信')) || accounts[0];
            accId = acc?.id || accId;
          } else if (/支付宝/.test(act.payload.channel || '')) {
            const acc = accounts.find(a => a.name.includes('支付宝')) || accounts[1];
            accId = acc?.id || accId;
          }

          const amt = Math.abs(parseFloat(act.payload.amount) || 0);
          if (amt > 0) {
            await api.createTransaction({
              type: act.payload.type || 'expense',
              amount: amt,
              account_id: accId,
              category_id: catObj?.id,
              category_name: act.payload.category || catObj?.name || '日常消费',
              date: getBeijingDateTimeString(),
              merchant: act.payload.merchant || 'AI 自动记账',
              note: act.payload.note || '由 AI 智能对话助手记账',
              source: 'ai_copilot'
            });

            actionResult = {
              type: 'transaction_created',
              data: act.payload
            };
            confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
            onRefresh();
          }
        } 
        // 2. Update Account Balance Action
        else if (act.type === 'update_balance' && act.payload) {
          const targetBal = parseFloat(act.payload.balance) || 0;
          let matchedAcc = accounts.find(a => a.id === act.payload.account_id);
          
          if (!matchedAcc && act.payload.platform) {
            const pLower = act.payload.platform.toLowerCase();
            matchedAcc = accounts.find(a => {
              const aLower = a.name.toLowerCase();
              if (pLower.includes('微信') && aLower.includes('微信')) return true;
              if (pLower.includes('支付宝') && aLower.includes('支付宝')) return true;
              return aLower.includes(pLower) || pLower.includes(aLower);
            });
          }

          if (matchedAcc) {
            const diff = targetBal - matchedAcc.balance;
            await api.updateAccount(matchedAcc.id, {
              ...matchedAcc,
              balance: targetBal
            });

            // Auto log calibration record if diff != 0
            if (Math.abs(diff) > 0.01) {
              await api.createTransaction({
                type: diff > 0 ? 'income' : 'expense',
                amount: Math.abs(diff),
                account_id: matchedAcc.id,
                category_name: '余额校准',
                date: getBeijingDateTimeString(),
                merchant: `${matchedAcc.name}余额校准`,
                note: `AI 根据截图自动校准余额 (原: ¥${matchedAcc.balance.toFixed(2)} -> 现: ¥${targetBal.toFixed(2)})`,
                source: 'ai_copilot'
              });
            }

            actionResult = {
              type: 'balance_updated',
              data: {
                platform: matchedAcc.name,
                balance: targetBal,
                diff
              }
            };
            confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
            onRefresh();
          } else {
            // If not found, create new account
            await api.createAccount({
              name: act.payload.platform || '新增资产账户',
              type: act.payload.account_type || 'wallet',
              balance: targetBal,
              currency: 'CNY'
            });

            actionResult = {
              type: 'account_created',
              data: {
                name: act.payload.platform || '新增资产账户',
                balance: targetBal
              }
            };
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
            onRefresh();
          }
        }
        // 3. Create Account Action
        else if (act.type === 'create_account' && act.payload) {
          const initBal = parseFloat(act.payload.balance) || 0;
          await api.createAccount({
            name: act.payload.name || 'AI 开账账户',
            type: act.payload.type || 'wallet',
            balance: initBal,
            currency: act.payload.currency || 'CNY'
          });

          actionResult = {
            type: 'account_created',
            data: act.payload
          };
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
          onRefresh();
        }
        // 4. Create Goal Action
        else if (act.type === 'create_goal' && act.payload) {
          await api.addGoal({
            name: act.payload.name || 'AI 存钱计划',
            target_amount: parseFloat(act.payload.target_amount) || 10000,
            current_amount: parseFloat(act.payload.current_amount) || 0,
            target_date: act.payload.deadline || act.payload.target_date || '2026-12-31',
            notes: act.payload.note || act.payload.notes || '由 AI 财务顾问规划制定'
          });

          actionResult = {
            type: 'goal_created',
            data: act.payload
          };
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
          onRefresh();
        } 
        // 5. Export Data Action
        else if (act.type === 'export_data') {
          const data = await api.exportBackup();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `SmartWealth_Export_${getBeijingDateString()}.json`;
          link.click();

          actionResult = {
            type: 'data_exported',
            data: { fileName: `SmartWealth_Export_${getBeijingDateString()}.json` }
          };
        }
      }

      const assistantMsg: AgentChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: getBeijingDateTimeString(),
        actionResult
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errMsg: AgentChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `❌ 请求遇到问题：${err.message || '请检查 AI API Key 与网络连接'}`,
        timestamp: getBeijingDateTimeString()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([DEFAULT_WELCOME_MESSAGE]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col h-[90vh] max-h-[750px]">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/25">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  斌斌 AI 财务智能助手
                </h3>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                  BETA
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                当前大模型: <span className="font-bold text-indigo-600 dark:text-indigo-400">{config.model || '未配置'}</span>
                {!config.apiKey && ' (⚠️ 请先在设置填入 Key)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClearHistory}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="清空对话"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/30 dark:bg-slate-950/20">
          {messages.map(m => (
            <div 
              key={m.id} 
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/15 rounded-br-none'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 shadow-sm rounded-bl-none'
              }`}>
                {/* Render Attached Image */}
                {m.imageUrl && (
                  <div className="mb-2 rounded-xl overflow-hidden border border-white/20 shadow-sm max-w-xs">
                    <img 
                      src={m.imageUrl} 
                      alt="上传截图" 
                      className="max-h-48 w-auto object-contain rounded-xl" 
                    />
                  </div>
                )}

                <div className="whitespace-pre-wrap">{m.content}</div>

                {/* Render Action Result: Transaction Created */}
                {m.actionResult && m.actionResult.type === 'transaction_created' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-[11px]">🎉 已自动记账入库</div>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-300">
                        {m.actionResult.data.merchant} ¥{m.actionResult.data.amount} ({m.actionResult.data.category})
                      </div>
                    </div>
                  </div>
                )}

                {/* Render Action Result: Balance Updated */}
                {m.actionResult && m.actionResult.type === 'balance_updated' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <WalletCards className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-[11px]">✨ 账户余额已成功校准</div>
                      <div className="text-[10px] text-amber-800 dark:text-amber-300">
                        【{m.actionResult.data.platform}】当前最新余额：<span className="font-mono font-bold">¥{m.actionResult.data.balance.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Render Action Result: Account Created */}
                {m.actionResult && m.actionResult.type === 'account_created' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-[11px]">✨ 已为您新建资产账户</div>
                      <div className="text-[10px] text-purple-800 dark:text-purple-300">
                        【{m.actionResult.data.name}】开账余额：<span className="font-mono font-bold">¥{m.actionResult.data.balance.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Render Action Result: Goal Created */}
                {m.actionResult && m.actionResult.type === 'goal_created' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-[11px]">🎯 已为您立项存钱目标</div>
                      <div className="text-[10px] text-indigo-700 dark:text-indigo-300">
                        【{m.actionResult.data.name}】目标 ¥{m.actionResult.data.target_amount} ({m.actionResult.data.note})
                      </div>
                    </div>
                  </div>
                )}

                {/* Render Action Result: Data Exported */}
                {m.actionResult && m.actionResult.type === 'data_exported' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200 flex items-center gap-2">
                    <Download className="w-4 h-4 text-teal-600 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-[11px]">📥 账本备份文件已下载完成</div>
                      <div className="text-[10px] text-teal-700 dark:text-teal-300">
                        文件：{m.actionResult.data.fileName}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[9px] text-slate-400 px-1">
                {m.timestamp}
              </span>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-500" />
              <span>AI 多模态图像识别与账本分析中...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            '📸 发送支付宝/微信余额截图帮我开账',
            '🍱 这个月吃饭花了多少？',
            '💡 帮我制定月存2000省钱计划',
            '🛒 中午在喜茶微信付了19元',
            '📂 导出我的财务账本'
          ].map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => handleSend(chip)}
              className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-[11px] text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 whitespace-nowrap transition active:scale-95 flex-shrink-0"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Image Attachment Preview Bar */}
        {selectedImage && (
          <div className="px-3.5 py-2 bg-purple-50 dark:bg-purple-950/40 border-t border-purple-200 dark:border-purple-800 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <img 
                src={selectedImage} 
                alt="预览" 
                className="w-8 h-8 rounded-lg object-cover border border-purple-300 dark:border-purple-700" 
              />
              <div className="text-[11px] text-purple-900 dark:text-purple-200 font-medium">
                📷 已附加截图（可输入说明或直接点击发送）
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="p-1 rounded-lg text-purple-400 hover:text-purple-700 dark:hover:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageFileChange} 
            />

            {/* Photo / Image Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-400 transition active:scale-95 shadow-sm flex items-center justify-center flex-shrink-0"
              title="上传账单小票或资产余额截图"
            >
              <Camera className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                selectedImage 
                  ? "可输入补充说明，或直接点击发送..." 
                  : config.apiKey 
                    ? "输入指令或点击左侧相机发图..." 
                    : "请先在设置中填入 API Key"
              }
              className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || (!inputText.trim() && !selectedImage)}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20 hover:from-purple-500 hover:to-indigo-500 active:scale-95 transition disabled:opacity-40 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
