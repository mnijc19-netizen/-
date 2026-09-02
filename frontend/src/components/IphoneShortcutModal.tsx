import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Sparkles, 
  Zap, 
  Copy, 
  Check, 
  ArrowRight, 
  ExternalLink,
  Bot,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { BottomSheet } from './common/BottomSheet';
import { githubGistSync } from '../services/githubGistSync';
import { cloudCodeSync } from '../services/cloudCodeSync';
import { haptic } from '../services/haptic';

interface IphoneShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IphoneShortcutModal: React.FC<IphoneShortcutModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'easy_url' | 'cloud_code' | 'silent_ai' | 'pwa'>('easy_url');

  // Auto-create 6-digit sync inbox on open if not created yet
  useEffect(() => {
    if (isOpen) {
      const cfg = cloudCodeSync.getConfig();
      if (!cfg.inboxId) {
        cloudCodeSync.createOrBindInbox();
      }
    }
  }, [isOpen]);

  const codeConfig = cloudCodeSync.getConfig();
  const gistConfig = githubGistSync.getConfig();
  const codeApiUrl = codeConfig.inboxId 
    ? `https://api.restful-api.dev/objects/${codeConfig.inboxId}` 
    : 'https://api.restful-api.dev/objects/请先生成同步码';

  // Generic universal URL for 2-step instant jump
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin + window.location.pathname
    : 'https://mnijc19-netizen.github.io/-/';
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const universalShortcutUrl = `${cleanBaseUrl}/?text=[图像中的文本]`;

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

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="iPhone 极速记账与快捷指令"
      description="长按侧键秒级入账 · 原生级流畅体验"
      maxHeightClass="max-h-[94dvh]"
      contentClassName="p-4 sm:p-5 space-y-3.5"
    >
      {/* Tab Selection */}
      <div className="grid grid-cols-4 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-xs gap-1 shadow-inner">
        <button
          type="button"
          onClick={() => {
            haptic.selection();
            setActiveTab('easy_url');
          }}
          className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 active:scale-95 ${
            activeTab === 'easy_url' 
              ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>⚡ 2步直跳</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptic.selection();
            setActiveTab('cloud_code');
          }}
          className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 active:scale-95 ${
            activeTab === 'cloud_code' 
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>☁️ 6位码</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptic.selection();
            setActiveTab('silent_ai');
          }}
          className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 active:scale-95 ${
            activeTab === 'silent_ai' 
              ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>🐙 Gist</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptic.selection();
            setActiveTab('pwa');
          }}
          className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 active:scale-95 ${
            activeTab === 'pwa' 
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>📲 桌面</span>
        </button>
      </div>

      {/* Tab 1: 2-Step Instant Jump (Zero Waiting, Native App Feel) */}
      {activeTab === 'easy_url' && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
            <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 text-xs">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              ⚡ 原生级体验：长按侧键秒跳记账卡（0 等待 · 0 门槛）
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              像原生记账 App 一样丝滑！快捷指令仅需 2 个动作，付完款长按手机侧键截屏，瞬间直跳网页并直接弹好填完的入账卡片，点一次「保存」即入库！
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
              <span>快捷指令只需 2 步动作：</span>
            </div>

            <div className="space-y-2 text-[11px] text-slate-700 dark:text-slate-300">
              <div className="flex items-start gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                <div>
                  <div className="font-bold">动作一：截屏 ➔ 从图像提取文本</div>
                  <div className="text-[10px] text-slate-400">iOS 自带识别，0.1 秒完成</div>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold flex items-center justify-between">
                    <span>动作二：打开 URL (带上识别文本)</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(universalShortcutUrl, 'easyUrl')}
                      className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9.5px] flex items-center gap-1 active:scale-95 transition"
                    >
                      {copiedKey === 'easyUrl' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'easyUrl' ? '已复制' : '一键复制 URL'}</span>
                    </button>
                  </div>
                  <div className="text-[9.5px] font-mono text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
                    {universalShortcutUrl}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenShortcutsApp}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-98 transition"
          >
            <ExternalLink className="w-4 h-4" />
            <span>一键打开 iPhone 快捷指令 App 配置</span>
          </button>
        </div>
      )}

      {/* Tab 2: 6-Digit Sync Code (Zero Account, Silent Background Ingestion) */}
      {activeTab === 'cloud_code' && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-1.5">
            <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5 text-xs">
              <Sparkles className="w-4 h-4 text-blue-500" />
              ☁️ 6 位数字同步码：后台静默存入，开网页批量全拉取
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              无需 GitHub 账号与复杂的 Token，直接分配 6 位专属码。快捷指令在后台静默把账单存入云端信箱，哪怕积攒了几十笔，打开网页点击「立即拉取」瞬间批量入账！
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                我的专属同步码：
              </div>
              <span className="font-mono font-bold px-2.5 py-0.5 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 text-sm">
                {codeConfig.syncCode ? `同步码: ${codeConfig.syncCode}` : '已自动生成中...'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-bold">
                <span>写入接口 (PUT 方法)：</span>
                <button
                  type="button"
                  onClick={() => handleCopy(codeApiUrl, 'codeUrl')}
                  className="px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[9.5px] flex items-center gap-1 active:scale-95 transition"
                >
                  {copiedKey === 'codeUrl' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'codeUrl' ? '已复制' : '复制接口'}</span>
                </button>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[9px] text-blue-600 dark:text-blue-400 break-all select-all">
                {codeApiUrl}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenShortcutsApp}
            className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-98 transition"
          >
            <ExternalLink className="w-4 h-4" />
            <span>打开 iPhone 快捷指令填入接口</span>
          </button>
        </div>
      )}

      {/* Tab 3: GitHub Gist (Power Users) */}
      {activeTab === 'silent_ai' && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-1.5">
            <div className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5 text-xs">
              <Bot className="w-4 h-4 text-purple-500" />
              🐙 极客专属：GitHub Gist 原生私有云
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              适合有 GitHub 账号的高阶开发者。100% 官方 CORS 通畅，数据加密存储在自己的私有 Gist 代码片段中。
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-bold">
              当前绑定 Gist ID: <span className="font-mono text-purple-600">{gistConfig.gistId || '未绑定'}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              可在「我的 ➔ 私有云数据同步」中随时更新或创建新 Gist。
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: PWA Desktop Fullscreen */}
      {activeTab === 'pwa' && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-1.5">
            <div className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5 text-xs">
              <Smartphone className="w-4 h-4 text-indigo-500" />
              📲 添加到主屏幕 (获得 100% 原生 App 沉浸体验)
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              无需通过 App Store 下载，直接在 Safari 浏览器中添加到主屏幕，即可享有无地址栏、全屏运行与独立图标的原生体验！
            </p>
          </div>

          <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
              <span>在 Safari 底部点击「分享」按钮 (带有箭头的方框)</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
              <span>向下滑动找到并点击「添加到主屏幕」</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
              <span>点击右上角「添加」，回到桌面即可看到独立的财务管理图标！</span>
            </div>
          </div>
        </div>
      )}
    </BottomSheet>
  );
};
