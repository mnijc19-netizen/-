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
  Key
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
  content: `您好！我是您的 **斌斌 AI 财务智能助手**。我已接入您的实时账本，不仅能为您分析收支与制定存钱计划，还能**直接帮您操控账本**！

您可以直接对我下达指令：
• **帮我记账**：“中午在瑞幸咖啡微信付了 9.9 元”
• **查账问答**：“这个月餐饮美食花了多少钱？”、“我现在的净资产是多少？”
• **存钱计划**：“我想在6个月内存够3万元买相机，帮我制定省钱计划并立项”
• **导出账本**：“帮我导出账本”`,
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
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    const userMsg: AgentChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
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
        goals
      );

      let actionResult: any = undefined;

      // Execute Action if AI requested
      if (response.action && response.action.type !== 'none') {
        const act = response.action;
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

          await api.createTransaction({
            type: act.payload.type || 'expense',
            amount: Math.abs(parseFloat(act.payload.amount) || 0),
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
        } else if (act.type === 'create_goal' && act.payload) {
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
        } else if (act.type === 'export_data') {
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
                <div className="whitespace-pre-wrap">{m.content}</div>

                {/* Render Action Result Card */}
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
              <span>AI 思考与账本同步中...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            '🍱 这个月吃饭花了多少？',
            '💡 帮我制定月存2000省钱计划',
            '🛒 中午在喜茶微信付了19元',
            '📊 总结我目前的财务健康状况',
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

        {/* Input Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={config.apiKey ? "输入指令，如：帮我记一笔、查账、存钱计划..." : "请先在设置中填入 API Key 后即可聊天"}
              className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20 hover:from-purple-500 hover:to-indigo-500 active:scale-95 transition disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
