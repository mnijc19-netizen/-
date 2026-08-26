import React, { useState } from 'react';
import { 
  Smartphone, 
  Sparkles, 
  Zap, 
  Copy, 
  Check, 
  X, 
  MessageSquare, 
  Fingerprint,
  Camera,
  CheckCircle2,
  ArrowRight,
  Code,
  Cloud,
  BellRing,
  HelpCircle
} from 'lucide-react';

interface IphoneShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IphoneShortcutModal: React.FC<IphoneShortcutModalProps> = ({ isOpen, onClose }) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [activeTab, setActiveTab] = useState<'silent_cloud' | 'pwa_guide' | 'sms'>('silent_cloud');

  const baseShortcutUrl = `https://mnijc19-netizen.github.io/-/?text=`;

  const sampleJsonTemplate = `[
  {
    "merchant": "沙县小吃",
    "amount": 20.00,
    "category": "餐饮美食",
    "type": "expense",
    "note": "iOS 快捷指令静默记账"
  }
]`;

  const handleCopy = (text: string, type: 'url' | 'json') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh] my-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  iPhone 极速记账与桌面 App
                </h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> 终极方案
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                侧键截图静默云记账 + 桌面 100% 全屏沉浸
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

        {/* Tab Selection */}
        <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-slate-800/80 m-4 mb-0 rounded-2xl text-xs gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('silent_cloud')}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
              activeTab === 'silent_cloud' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" /> ⚡ 侧键静默记账
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pwa_guide')}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
              activeTab === 'pwa_guide' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> 📲 桌面全屏 App
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sms')}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
              activeTab === 'sms' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> ✉️ 短信自动记
          </button>
        </div>

        {/* Step Guide Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Method 1: Silent Cloud Ingest (The Ultimate Solution) */}
          {activeTab === 'silent_cloud' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-emerald-500/10 border border-indigo-200 dark:border-indigo-800 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-xs text-indigo-900 dark:text-indigo-200">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  终极 AI 视觉记账：灵动岛当场播报金额 + 桌面无缝秒同步
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  截屏后<strong>AI 视觉大模型 0.8 秒自动识破日报干扰</strong>，精准提取商户与金额，<strong>灵动岛当场震动播报</strong>，并存入云端队列（几天不打开也不会丢）！
                </p>
              </div>

              {/* Verified Visual Pipeline */}
              <div className="space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pb-1">
                  <Zap className="w-4 h-4 text-indigo-500" />
                  快捷指令 4 个动作清单（已预置授权与防超时）：
                </div>

                {/* Step 1 */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-center leading-5 font-mono text-[10px] font-bold">1</span>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">截屏</div>
                      <div className="text-[10px] text-slate-400">搜索并添加动作「截屏」</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">系统</span>
                </div>

                {/* Step 2 */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-center leading-5 font-mono text-[10px] font-bold">2</span>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">从 [截屏] 中提取文本</div>
                      <div className="text-[10px] text-slate-400">搜索添加「从图像中提取文本」</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-mono">OCR 提取</span>
                </div>

                {/* Step 3: Get Contents of URL (Write to GitHub Gist) */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-center leading-5 font-mono text-[10px] font-bold">3</span>
                    <div>
                      <div className="font-bold text-indigo-900 dark:text-indigo-200">获取 URL 的内容 (写入 GitHub Gist)</div>
                      <div className="text-[10px] text-slate-400">方法选 <strong>PATCH</strong>（100% 官方 CORS 通行）</div>
                    </div>
                  </div>

                  {/* URL */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                      <span>URL 地址：</span>
                      <button
                        type="button"
                        onClick={() => handleCopy('https://api.github.com/gists/19112eef901e903254dedab4765f135b', 'url')}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                      >
                        {copiedUrl ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                        {copiedUrl ? '已复制' : '复制专属 Gist URL'}
                      </button>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[9px] text-purple-600 dark:text-purple-400 break-all">
                      https://api.github.com/gists/19112eef901e903254dedab4765f135b
                    </div>
                  </div>

                  {/* Headers */}
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 font-bold">头部 (Headers) 添加 3 行：</div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[9px] text-slate-700 dark:text-slate-300 space-y-1">
                      <div>① <code>Authorization</code> : <code>token ghp_你的Token</code></div>
                      <div>② <code>User-Agent</code> : <code>iOS-Shortcut</code></div>
                      <div>③ <code>Content-Type</code> : <code>application/json</code></div>
                    </div>
                  </div>

                  {/* Request Body */}
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 font-bold">请求体 (Request Body)：</div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[9px] text-slate-600 dark:text-slate-300">
                      类型选 <strong>JSON</strong> ➔ 键填 <code>files</code> ➔ 字典 <code>smartwealth_inbox.json</code> ➔ <code>content</code> ➔ <code>{'[{"raw_text":"[图像中的文本]"}]'}</code>
                    </div>
                  </div>
                </div>

                {/* Step 4: Haptic Feedback / Dynamic Island */}
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-center leading-5 font-mono text-[10px] font-bold">4</span>
                    <div>
                      <div className="font-bold text-emerald-900 dark:text-emerald-200">提供触感反馈 / 灵动岛</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">添加「提供触感反馈」，类型选「成功」</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono">震动收尾</span>
                </div>
              </div>

              {/* Hardware Binding */}
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  绑定到侧边操作按钮 (Action Button) / 轻点背面
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                  在 iPhone「设置」➔「操作按钮」中选择此快捷指令即可。付款后按一下侧边键，1 秒完成！
                </p>
              </div>
            </div>
          )}

          {/* Method 2: PWA Fullscreen App Guide */}
          {activeTab === 'pwa_guide' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <Smartphone className="w-4 h-4 text-blue-500" />
                  如何安装 100% 全屏沉浸的桌面 App
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  通过 Safari 的 WebApp 规范，彻底移除底部网址栏，变成跟 App Store 原生应用一模一样的体验！
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

          {/* Method 3: SMS Automation */}
          {activeTab === 'sms' && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  收到银行扣款短信【0步全自动入账】
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  银行短信一到达，手机后台自动完成记账，无需打开任何界面！
                </p>
              </div>

              <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-500 dark:text-slate-400">
                    <li>打开「快捷指令」App 底部的 <strong>「自动化」</strong> 标签。</li>
                    <li>点击右上角 <strong>「+」</strong>，选择 <strong>「信息」</strong>。</li>
                    <li>内容包含中填入 <strong>「支出」或「消费」或「银行」</strong>，勾选 <strong>「立即运行」</strong>。</li>
                    <li>动作添加 <strong>「打开 URL」</strong>，填入：<br />
                      <code className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold break-all">
                        {baseShortcutUrl}[快捷指令输入]
                      </code>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <span className="text-[10px] text-slate-400">
            坚果云免费同步 + 桌面全屏沉浸
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md active:scale-95"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
