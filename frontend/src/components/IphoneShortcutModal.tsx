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
  CheckCircle2
} from 'lucide-react';

interface IphoneShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IphoneShortcutModal: React.FC<IphoneShortcutModalProps> = ({ isOpen, onClose }) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<'screen' | 'sms' | 'clipboard'>('screen');

  const baseShortcutUrl = `https://mnijc19-netizen.github.io/-/?text=`;
  const clipboardUrl = `https://mnijc19-netizen.github.io/-/?cb=1`;

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
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
                iPhone 长按直接记账设置
              </h3>
              <p className="text-[11px] text-slate-400">
                付完款长按侧边按键，无需任何点击，直接自动入账！
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
            onClick={() => setActiveTab('screen')}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
              activeTab === 'screen' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Camera className="w-3.5 h-3.5" /> 截屏直存 (推荐)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('clipboard')}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
              activeTab === 'clipboard' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5" /> 剪贴板直存
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sms')}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
              activeTab === 'sms' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> 短信全自动
          </button>
        </div>

        {/* Step Guide Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Method 1: Screen OCR -> Auto Ingest */}
          {activeTab === 'screen' && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  付完款长按侧边按钮（仅需正确配置 1 个变量）
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  系统会自动读取屏幕中的微信/支付宝账单卡片，<strong>打开后无需任何点击，0.5秒直接存入！</strong>
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-center leading-5 text-[10px]">1</span>
                    动作一：获取屏幕文本
                  </div>
                  <div className="pl-7 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                    <div>• 搜索并添加：<strong>「获取屏幕内容」</strong>（或「获取最新的屏幕快照」）</div>
                    <div>• 接着添加：<strong>「从图像中提取文本」</strong></div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-center leading-5 text-[10px]">2</span>
                    动作二：打开网址并传入变量 (关键步骤)
                  </div>
                  <div className="pl-7 text-[11px] text-slate-600 dark:text-slate-300 space-y-2">
                    <div>搜索并添加 <strong>「打开 URL」</strong>，在网址框输入前缀后，<strong>点击键盘上方的蓝色「提取的文本」变量</strong>：</div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-[10px] flex items-center justify-between">
                      <span className="truncate pr-2 font-bold text-indigo-600 dark:text-indigo-400">
                        {baseShortcutUrl}<span className="bg-indigo-100 dark:bg-indigo-900 px-1 py-0.5 rounded text-indigo-700 dark:text-indigo-200">[提取的文本]</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(baseShortcutUrl)}
                        className="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 text-[10px] font-bold flex items-center gap-1 flex-shrink-0"
                      >
                        {copiedUrl ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        {copiedUrl ? '已复制前缀' : '复制前缀'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-center leading-5 text-[10px]">3</span>
                    绑定到 iPhone 操作按钮 / 双击背面
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-7">
                    打开 iPhone「设置」→「操作按钮」（或「辅助功能」→「触控」→「轻点背面」）绑定该快捷指令！
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Method 2: Instant Clipboard Ingest */}
          {activeTab === 'clipboard' && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4 text-blue-500" />
                  最省心：直接打开即读取剪贴板并自动入账
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  只要剪贴板里有微信支付通知或银行短信，打开这个网址<strong>瞬间自动入账</strong>！
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  快捷指令只需 1 个动作：
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                  <div>添加动作 <strong>「打开 URL」</strong>，填入下方直通网址：</div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-[10px] flex items-center justify-between">
                    <span className="truncate pr-2 font-bold text-blue-600 dark:text-blue-400">
                      {clipboardUrl}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(clipboardUrl)}
                      className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 text-[10px] font-bold flex items-center gap-1 flex-shrink-0"
                    >
                      {copiedUrl ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      {copiedUrl ? '已复制' : '复制网址'}
                    </button>
                  </div>
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
                  银行短信一到达，手机自动完成记账，无需打开任何界面！
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
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <span className="text-[10px] text-slate-400">
            打开后 0 点击自动写入，伴随礼花与提示
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
