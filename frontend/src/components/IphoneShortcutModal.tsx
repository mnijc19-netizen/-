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
  Lock
} from 'lucide-react';
import { haptic } from '../services/haptic';

interface IphoneShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IphoneShortcutModal: React.FC<IphoneShortcutModalProps> = ({ isOpen, onClose }) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<'shortcut' | 'pwa'>('shortcut');

  // Generic universal URL that works for any user
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin + window.location.pathname
    : 'https://mnijc19-netizen.github.io/-/';
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const universalShortcutUrl = `${cleanBaseUrl}/?text=[图像中的文本]`;

  const handleCopyUrl = () => {
    haptic.selection();
    navigator.clipboard.writeText(universalShortcutUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleOpenShortcutsApp = () => {
    haptic.impact();
    window.location.href = 'shortcuts://';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh] my-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  iPhone 极速记账
                </h3>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  零门槛
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                截屏自动识字入账 · 彻底告别手动输入
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
        <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 m-4 mb-0 rounded-2xl text-xs gap-1">
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setActiveTab('shortcut');
            }}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'shortcut' 
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> ⚡ 快捷指令自动记
          </button>
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setActiveTab('pwa');
            }}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'pwa' 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> 📲 添加到主屏幕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1 text-xs">
          {/* Tab 1: Shortcut */}
          {activeTab === 'shortcut' && (
            <div className="space-y-3">
              {/* How it works flow */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  使用流程（仅需 1 秒）：
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                  <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <div className="text-base">📸</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">1. 付款截屏</div>
                    <div className="text-slate-400 text-[9px]">按侧键截屏</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <div className="text-base">🤖</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">2. 自动识字</div>
                    <div className="text-slate-400 text-[9px]">AI识别商户金额</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <div className="text-base">🎉</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">3. 秒级入账</div>
                    <div className="text-slate-400 text-[9px]">自动记录并弹窗</div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleOpenShortcutsApp}
                  className="w-full py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-98 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>一键打开 iPhone 快捷指令 App</span>
                </button>
              </div>

              {/* Ultra Clear Setup Guide */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                  在快捷指令中只需 2 个动作（无需配置任何密钥）：
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-center leading-5 font-mono text-[10px] font-bold flex-shrink-0">1</span>
                    <span>搜索并添加动作：<strong>「截屏」➔「从图像中提取文本」</strong></span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-center leading-5 font-mono text-[10px] font-bold flex-shrink-0">2</span>
                        <span>搜索添加：<strong>「打开 URL」</strong>（填入下方链接）</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 active:scale-95 transition shadow-2xs"
                      >
                        {copiedUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedUrl ? '已复制' : '一键复制 URL'}</span>
                      </button>
                    </div>

                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[9.5px] text-emerald-700 dark:text-emerald-400 break-all select-all">
                      {universalShortcutUrl}
                    </div>
                  </div>
                </div>
              </div>

              {/* Side Button / Back Tap Setup */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                <div className="font-bold text-slate-700 dark:text-slate-300 text-[10px] flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-indigo-500" />
                  <span>便捷触发技巧：</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed pl-4">
                  在 iPhone「设置」➔「辅助功能」➔「触控」➔「轻点背面」中绑定该指令，敲击手机背面 2 下即可极速记账！
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: PWA */}
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
