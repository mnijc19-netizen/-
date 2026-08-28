import React, { useState } from 'react';
import { 
  Smartphone, 
  Sparkles, 
  Zap, 
  Copy, 
  Check, 
  X, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight, 
  Cloud, 
  ExternalLink,
  ShieldCheck,
  Layers,
  HelpCircle,
  Download
} from 'lucide-react';
import { githubGistSync } from '../services/githubGistSync';
import { haptic } from '../services/haptic';

interface IphoneShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IphoneShortcutModal: React.FC<IphoneShortcutModalProps> = ({ isOpen, onClose }) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'easy_url' | 'silent_cloud' | 'pwa_guide'>('easy_url');

  // Load current user's actual Gist credentials
  const gistConfig = githubGistSync.getConfig();
  const userToken = gistConfig.token || (typeof window !== 'undefined' ? localStorage.getItem('smartwealth_gist_token_v1') || '' : '');
  const userGistId = gistConfig.gistId || '19112eef901e903254dedab4765f135b';
  const gistApiUrl = `https://api.github.com/gists/${userGistId}`;

  const simpleIngestUrl = 'https://mnijc19-netizen.github.io/-/?text=';

  // Pre-compiled full configuration text with user's real credentials (ZERO manual editing required)
  const fullSilentConfigText = `【斌斌钱包 · iPhone 快捷指令专属配置】
1. 动作 1：添加「截屏」
2. 动作 2：添加「从图像中提取文本」
3. 动作 3：添加「获取 URL 的内容」
   - URL 地址：${gistApiUrl}
   - 请求方法：PATCH
   - 头部 (Headers)：
     Authorization : token ${userToken}
     User-Agent : iOS-Shortcut
     Content-Type : application/json
   - 请求体 (Request Body - JSON)：
     files ➔ smartwealth_inbox.json ➔ content ➔ [{"raw_text":"[图像中的文本]"}]
4. 动作 4：添加「提供触感反馈」（成功）`;

  const handleCopy = (text: string, typeKey: string) => {
    haptic.selection();
    navigator.clipboard.writeText(text);
    setCopiedType(typeKey);
    setTimeout(() => setCopiedType(null), 2500);
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
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  iPhone 极速记账与快捷指令
                </h3>
              </div>
              <p className="text-[11px] text-slate-400">
                一键直达 · 免复杂配置 · 100% 可用
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
              setActiveTab('easy_url');
            }}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
              activeTab === 'easy_url' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> ⚡ 极速免配置
          </button>
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setActiveTab('silent_cloud');
            }}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
              activeTab === 'silent_cloud' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" /> ☁️ 静默云同步
          </button>
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setActiveTab('pwa_guide');
            }}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
              activeTab === 'pwa_guide' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> 📲 桌面全屏
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Method 1: Ultra Simple 2-Step (Zero Token, Zero Gist, 100% Reliable) */}
          {activeTab === 'easy_url' && (
            <div className="space-y-3.5">
              {/* Highlight Hero Card */}
              <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-indigo-500/10 border border-emerald-300 dark:border-emerald-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    官方推荐 · 0 门槛 2 步极速方案
                  </span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-2xs">
                    免填密钥 · 即配即用
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  截屏后手机<strong>自动识字并秒开网页 AI 智能记账</strong>，零门槛、零 Token 授权，任何人 10 秒搞定！
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenShortcutsApp}
                    className="flex-1 py-2 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>一键打开快捷指令 App</span>
                  </button>
                </div>
              </div>

              {/* 2 Simple Steps */}
              <div className="space-y-2.5">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pb-0.5">
                  <span>只需添加 2 个动作：</span>
                </div>

                {/* Step 1 */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-center leading-6 font-mono text-[11px] font-bold">1</span>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">截屏 ➔ 从 [截屏] 中提取文本</div>
                      <div className="text-[10px] text-slate-400">搜索添加系统自带的 OCR 识字动作</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-mono">自带 OCR</span>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-center leading-6 font-mono text-[11px] font-bold">2</span>
                      <div>
                        <div className="font-bold text-emerald-900 dark:text-emerald-200">打开 URL（自动入账）</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">搜索添加「打开 URL」，填入下方链接：</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(`${simpleIngestUrl}[图像中的文本]`, 'url')}
                      className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 active:scale-95 transition shadow-2xs"
                    >
                      {copiedType === 'url' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedType === 'url' ? '已复制' : '一键复制 URL'}</span>
                    </button>
                  </div>

                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 font-mono text-[9px] text-emerald-700 dark:text-emerald-300 break-all select-all">
                    {`${simpleIngestUrl}[图像中的文本]`}
                  </div>
                </div>
              </div>

              {/* Hardware Binding Tips */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                  绑定 iPhone 侧键 / 轻点背面（秒级呼出）：
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed pl-5">
                  前往 iPhone「设置」➔「操作按钮」或「辅助功能」➔「触控」➔「轻点背面」，选择刚才创建的快捷指令即可！
                </p>
              </div>
            </div>
          )}

          {/* Method 2: Silent Cloud Sync with Auto-Injected Real Credentials */}
          {activeTab === 'silent_cloud' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-3xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    已为你自动注入专属 Token 与 Gist 链接
                  </span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-500 text-white shadow-2xs">
                    0 手动修改
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  后台静默写入云端信箱，灵动岛震动播报。<strong>下方已全部填入你的真实密钥，点击直接一键复制全部配置！</strong>
                </p>

                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(fullSilentConfigText, 'full_config')}
                    className="flex-1 py-2 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 active:scale-95 transition"
                  >
                    {copiedType === 'full_config' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedType === 'full_config' ? '✨ 专属配置已全部复制！' : '✨ 一键复制我的专属完整配置'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenShortcutsApp}
                    className="py-2 px-3 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1 active:scale-95 transition"
                    title="打开快捷指令"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>打开 App</span>
                  </button>
                </div>
              </div>

              {/* Ready-to-use Parameter Inspection Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  你的专属参数明细（已就绪）：
                </div>

                <div className="space-y-1.5 font-mono text-[9.5px]">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="text-slate-400 font-sans font-bold text-[10px]">1. 专属 Gist 接口 URL (PATCH)：</div>
                    <div className="text-purple-600 dark:text-purple-400 break-all select-all">{gistApiUrl}</div>
                  </div>

                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="text-slate-400 font-sans font-bold text-[10px]">2. 专属授权 Header (Authorization)：</div>
                    <div className="text-emerald-600 dark:text-emerald-400 break-all select-all">token {userToken}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Method 3: PWA Fullscreen App Guide */}
          {activeTab === 'pwa_guide' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <Smartphone className="w-4 h-4 text-blue-500" />
                  安装 100% 全屏沉浸的桌面 App
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  通过 Safari WebApp 规范，彻底移除底部网址栏，变成跟 App Store 原生应用一模一样的体验！
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-center leading-5 font-mono text-[10px] font-bold">1</span>
                    在 Safari 中打开当前网址
                  </div>
                  <p className="text-[10px] text-slate-400 pl-7">确保是在自带的 Safari 浏览器中访问</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-center leading-5 font-mono text-[10px] font-bold">2</span>
                    点击 Safari 底部的「分享」图标（方形带向上箭头）
                  </div>
                  <p className="text-[10px] text-slate-400 pl-7">滑动找到并点击「添加到主屏幕」</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-center leading-5 font-mono text-[10px] font-bold">3</span>
                    从主屏幕图标启动
                  </div>
                  <p className="text-[10px] text-slate-400 pl-7">页面将以独立原生全屏窗口启动，没有任何网址栏！</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <span className="text-[10px] text-slate-400">
            支持 iPhone 侧边操作按钮与双击背面
          </span>
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md active:scale-95 transition"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
