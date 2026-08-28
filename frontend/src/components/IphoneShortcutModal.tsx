import React, { useState } from 'react';
import { 
  Smartphone, 
  Sparkles, 
  Zap, 
  Copy, 
  Check, 
  X, 
  CheckCircle2, 
  ArrowRight, 
  ExternalLink,
  Download,
  Share2,
  Lock,
  Cloud,
  Bot
} from 'lucide-react';
import { githubGistSync } from '../services/githubGistSync';
import { cloudCodeSync } from '../services/cloudCodeSync';
import { localStore } from '../services/localStore';
import { haptic } from '../services/haptic';

interface IphoneShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IphoneShortcutModal: React.FC<IphoneShortcutModalProps> = ({ isOpen, onClose }) => {
  // Auto-create 6-digit sync inbox on open if not created yet
  React.useEffect(() => {
    if (isOpen) {
      const cfg = cloudCodeSync.getConfig();
      if (!cfg.inboxId) {
        cloudCodeSync.createOrBindInbox();
      }
    }
  }, [isOpen]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cloud_code' | 'silent_ai' | 'easy_url' | 'pwa'>('cloud_code');

  // Dynamically retrieve user's configured Gist ID & AI Key from local storage (privacy-safe)
  const codeConfig = cloudCodeSync.getConfig();
  const gistConfig = githubGistSync.getConfig();
  const codeApiUrl = codeConfig.inboxId ? `https://api.restful-api.dev/objects/${codeConfig.inboxId}` : 'https://api.restful-api.dev/objects/请在设置中生成专属同步码';
  const aiConfig = localStore.getAiConfig();
  const userGistId = gistConfig.gistId || '19112eef901e903254dedab4765f135b';
  const gistApiUrl = `https://api.github.com/gists/${userGistId}`;

  // Generic universal URL for easy option
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin + window.location.pathname
    : 'https://mnijc19-netizen.github.io/-/';
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const universalShortcutUrl = `${cleanBaseUrl}/?text=[图像中的文本]`;

  // Zhipu AI Prompt Template for Shortcuts
  const zhipuPromptText = `{\n  "model": "glm-4v-flash",\n  "messages": [\n    {\n      "role": "user",\n      "content": [\n        {\n          "type": "text",\n          "text": "你是一个专业财务记账 AI。请直接分析截图像素，提取真实交易并严格只返回单个纯 JSON 对象 (禁止 markdown): {\\\"amount\\\": 14.05, \\\"merchant\\\": \\\"商户名称\\\", \\\"category\\\": \\\"餐饮美食\\\", \\\"type\\\": \\\"expense\\\"}"\n        },\n        {\n          "type": "image_url",\n          "image_url": {\n            "url": "data:image/jpeg;base64,[Base64 编码内容]"\n          }\n        }\n      ]\n    }\n  ],\n  "temperature": 0.1\n}`;

  const handleCopy = (text: string, key: string) => {
    haptic.selection();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleOpenShortcutsApp = () => {
    haptic.impact();
    window.location.href = 'shortcuts://';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[88vh] my-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-600/10 via-indigo-600/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  iPhone 极速记账与快捷指令
                </h3>
              </div>
              <p className="text-[11px] text-slate-400">
                支持后台静默识图入账 · 几天几十笔打开全自动导入
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              haptic.selection();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-slate-800/80 m-4 mb-0 rounded-2xl text-xs gap-1">
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setActiveTab('cloud_code');
            }}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
              activeTab === 'cloud_code' 
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> ⚡ 6位同步码 (推荐)
          </button>

          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setActiveTab('silent_ai');
            }}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
              activeTab === 'silent_ai' 
                ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" /> 🤖 极客Gist
          </button>

          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setActiveTab('pwa');
            }}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
              activeTab === 'pwa' 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> 📲 桌面全屏
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1 text-xs">
          {/* Tab 0: 6-Digit Sync Code (Zero Account, 100% Free, Silent Sync) */}
          {activeTab === 'cloud_code' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  ⚡ 6 位专属同步码 · 免注册 GitHub · 0 门槛静默入云
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  完全不需要 GitHub 账号或 Token！只需生成一个 6 位专属码，快捷指令在<strong>后台静默写入云信箱</strong>，打开网页自动批量全部导入！
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                    我的同步码状态：
                  </div>
                  <span className="font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    {codeConfig.syncCode ? `同步码: ${codeConfig.syncCode}` : '未生成同步码'}
                  </span>
                </div>

                <div className="space-y-2 text-[11px] text-slate-700 dark:text-slate-300">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span>1. 快捷指令写入接口 (PUT)：</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(codeApiUrl, 'codeUrl')}
                        className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9.5px] flex items-center gap-1 active:scale-95 transition"
                      >
                        {copiedKey === 'codeUrl' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'codeUrl' ? '已复制' : '一键复制接口'}</span>
                      </button>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[9px] text-emerald-600 dark:text-emerald-400 break-all select-all">
                      {codeApiUrl}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span>2. 快捷指令请求体模板 (JSON)：</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(JSON.stringify({ name: `SmartWealth_Inbox_${codeConfig.syncCode || '888666'}`, data: { sync_code: codeConfig.syncCode || '888666', inbox: [{ amount: 18.5, merchant: "商户名称", category: "餐饮美食", type: "expense" }] } }, null, 2), 'codeBody')}
                        className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[9.5px] flex items-center gap-1 active:scale-95 transition"
                      >
                        {copiedKey === 'codeBody' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'codeBody' ? '已复制' : '复制 JSON 模板'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenShortcutsApp}
                className="w-full py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-98 transition"
              >
                <ExternalLink className="w-4 h-4" />
                <span>一键打开 iPhone 快捷指令 App</span>
              </button>
            </div>
          )}
          
          {/* Tab 1: Silent AI + Gist (The User's Favorite Flow!) */}
          {activeTab === 'silent_ai' && (
            <div className="space-y-3">
              {/* Feature Highlights */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-transparent border border-purple-200/80 dark:border-purple-800/60 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  🔥 旗舰方案：智谱 AI 视觉识别 ➔ Gist 静默云端记账
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  随时长按侧键截屏，指令在<strong>后台静默调用智谱 GLM-4V 视觉大模型</strong>精准识图并存入私有云信箱！<strong>哪怕攒了几天几十笔账，一打开网页也会 100% 自动批量全部导入！</strong>
                </p>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleOpenShortcutsApp}
                className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-500/20 active:scale-98 transition"
              >
                <ExternalLink className="w-4 h-4" />
                <span>一键打开 iPhone 快捷指令 App</span>
              </button>

              {/* Step by step instruction */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                  快捷指令 4 大动作结构（支持后台静默运行）：
                </div>

                <div className="space-y-2 text-[11px] text-slate-700 dark:text-slate-300">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      1. 截屏 ➔ 调整大小为 1080 ➔ 用 Base64 编码
                    </div>
                    <div className="text-[10px] text-slate-400">将截图压缩并转为文本格式发给 AI</div>
                  </div>

                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        2. 智谱 AI 视觉识别 (POST)
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(zhipuPromptText, 'zhipu')}
                        className="px-2 py-0.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[9.5px] flex items-center gap-1 active:scale-95 transition"
                      >
                        {copiedKey === 'zhipu' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'zhipu' ? '已复制' : '复制 JSON 模板'}</span>
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      接口: <code className="font-mono text-purple-600 dark:text-purple-400">https://open.bigmodel.cn/api/paas/v4/chat/completions</code>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        3. 写入 GitHub Gist 云信箱 (PATCH)
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(gistApiUrl, 'gist')}
                        className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[9.5px] flex items-center gap-1 active:scale-95 transition"
                      >
                        {copiedKey === 'gist' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'gist' ? '已复制' : '复制 Gist 接口'}</span>
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      接口: <code className="font-mono text-indigo-600 dark:text-indigo-400 break-all">{gistApiUrl}</code>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      4. 使设备振动（成功提醒）
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Easy URL */}
          {activeTab === 'easy_url' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 text-xs">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  免填 Token · 0 门槛极速方案
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  不想配置 Gist 或 Token 的用户，可使用此方案：截屏后手机自动识字并秒开网页完成记账！
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-center leading-5 font-mono text-[10px] font-bold flex-shrink-0">1</span>
                    <span>添加动作：<strong>「截屏」➔「从图像中提取文本」</strong></span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-center leading-5 font-mono text-[10px] font-bold flex-shrink-0">2</span>
                        <span>添加动作：<strong>「打开 URL」</strong>（填入下方链接）</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(universalShortcutUrl, 'url')}
                        className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 active:scale-95 transition shadow-2xs"
                      >
                        {copiedKey === 'url' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'url' ? '已复制' : '一键复制 URL'}</span>
                      </button>
                    </div>

                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[9.5px] text-emerald-700 dark:text-emerald-400 break-all select-all">
                      {universalShortcutUrl}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: PWA */}
          {activeTab === 'pwa' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-1">
                <div className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5 text-xs">
                  <Smartphone className="w-4 h-4 text-indigo-500" />
                  免任何指令 · 原生全屏桌面 App
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  直接把网页存到 iPhone 桌面，享受无网址栏、秒开的原生 App 体验！
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-center leading-6 font-mono text-[11px] font-bold flex-shrink-0">1</span>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">在 Safari 浏览器中打开本站</div>
                    <div className="text-[10px] text-slate-400">确保是在 iPhone 自带的 Safari 中访问</div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-center leading-6 font-mono text-[11px] font-bold flex-shrink-0">2</span>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">点击 Safari 底部的「分享」图标</div>
                    <div className="text-[10px] text-slate-400">方形带向上箭头图标 ➔ 选择「添加到主屏幕」</div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-center leading-6 font-mono text-[11px] font-bold flex-shrink-0">3</span>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">从主屏幕一键秒开</div>
                    <div className="text-[10px] text-slate-400">告别网址栏，体验媲美原生 App</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-500" />
            100% 本地隐私安全 · 零个人凭证依赖
          </span>
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-md active:scale-95 transition"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
