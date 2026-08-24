import React, { useState } from 'react';
import { 
  Smartphone, 
  Sparkles, 
  Zap, 
  Copy, 
  Check, 
  X, 
  ArrowRight, 
  MessageSquare, 
  Fingerprint,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface IphoneShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IphoneShortcutModal: React.FC<IphoneShortcutModalProps> = ({ isOpen, onClose }) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  const shortcutUrlTemplate = `https://mnijc19-netizen.github.io/-/?text=`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(shortcutUrlTemplate);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                iPhone 一键极速自动化记账
              </h3>
              <p className="text-[11px] text-slate-400">
                长按操作按钮、轻点背面或收到短信 0 步自动入账
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
            onClick={() => setActiveStep(1)}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
              activeStep === 1 ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5" /> 长按按钮
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(2)}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
              activeStep === 2 ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> 轻点背面
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(3)}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
              activeStep === 3 ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> 短信全自动
          </button>
        </div>

        {/* Step Guide Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Method 1: Action Button */}
          {activeStep === 1 && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  iPhone 15 Pro / 16 操作按钮 (Action Button)
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  付完款长按侧边按钮，直接抓取屏幕或剪贴板扣款信息，<strong>0 秒瞬间入账</strong>！
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-center leading-5 text-[10px]">1</span>
                    打开 iPhone 自带的「快捷指令」App
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-7">
                    点击右上角 <strong>「+」</strong> 新建一个快捷指令，命名为 <strong>「极速记账」</strong>。
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-center leading-5 text-[10px]">2</span>
                    添加两个动作：
                  </div>
                  <div className="pl-7 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                    <div>• 动作一：搜索并添加 <strong>「获取剪贴板」</strong></div>
                    <div>• 动作二：搜索并添加 <strong>「打开 URL」</strong>，填入下方触发网址并附带剪贴板变量：</div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-[10px] flex items-center justify-between">
                      <span className="truncate pr-2">{shortcutUrlTemplate}[剪贴板]</span>
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 text-[10px] font-bold flex items-center gap-1 flex-shrink-0"
                      >
                        {copiedUrl ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        {copiedUrl ? '已复制' : '复制网址'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-center leading-5 text-[10px]">3</span>
                    绑定到 iPhone 操作按钮
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-7">
                    打开 iPhone「设置」→「操作按钮」→ 滑动选择 <strong>「快捷指令」</strong> → 选中刚创建的 <strong>「极速记账」</strong> 即可！
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Method 2: Back Tap */}
          {activeStep === 2 && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4 text-blue-500" />
                  轻点 iPhone 背面两下记账（所有 iPhone 均支持）
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  即使不是 iPhone 15/16，只要手指在手机背面轻轻敲击两下，即可秒速入账！
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    设置路径：
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    打开 iPhone <strong>「设置」</strong> → <strong>「辅助功能」</strong> → <strong>「触控」</strong> → 滑到最底部选择 <strong>「轻点背面」</strong> → 选中 <strong>「轻点两下」</strong> → 绑定上面创建的「极速记账」快捷指令！
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Method 3: SMS Automation */}
          {activeStep === 3 && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  收到银行短信【0 步全自动入账】
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  银行短信一到达，iPhone 后台自动提取并写入账本，无需任何按键与操作！
                </p>
              </div>

              <div className="space-y-3 text-[11px] text-slate-600 dark:text-slate-300">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    自动化配置步骤：
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-500 dark:text-slate-400">
                    <li>打开「快捷指令」App 底部中间的 <strong>「自动化」</strong> 标签。</li>
                    <li>点击右上角 <strong>「+」</strong>，选择 <strong>「信息」</strong>。</li>
                    <li>在发件人或内容包含中填写 <strong>「支出」或「银行」</strong>，勾选 <strong>「立即运行」</strong>。</li>
                    <li>动作添加 <strong>「打开 URL」</strong>，填入：<br />
                      <code className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold break-all">
                        {shortcutUrlTemplate}[快捷指令输入]
                      </code>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <span className="text-[10px] text-slate-400">
            配合 Apple 原生神经引擎识别，准确率 100%
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md active:scale-95"
          >
            知道了，去设置
          </button>
        </div>
      </div>
    </div>
  );
};
