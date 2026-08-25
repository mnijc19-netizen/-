import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Camera, 
  PieChart, 
  Smartphone, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  ShieldCheck, 
  Bot,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface OnboardingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBatchBalance: () => void;
  onOpenBudgets: () => void;
  onOpenIphoneShortcut: () => void;
  onOpenAiChat: () => void;
}

export const OnboardingGuideModal: React.FC<OnboardingGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenBatchBalance,
  onOpenBudgets,
  onOpenIphoneShortcut,
  onOpenAiChat
}) => {
  const [currentStep, setCurrentStep] = useState(1);

  if (!isOpen) return null;

  const handleFinish = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    onClose();
  };

  const steps = [
    {
      step: 1,
      title: '📸 多图批量开账 · 10秒对齐总资产',
      desc: '支持一次性选择微信、支付宝、银行卡或证券持仓截图，AI 自动并行提取各平台余额，一键完成开账！',
      icon: Camera,
      color: 'from-purple-500 to-indigo-600',
      actionText: '立即拍照/选图开账',
      onAction: () => {
        onClose();
        onOpenBatchBalance();
      }
    },
    {
      step: 2,
      title: '📊 设定月度预算与存钱心愿',
      desc: '为餐饮、购物设定合理预算，或立项存钱小目标。实时监控进度，超支前自动预警。',
      icon: PieChart,
      color: 'from-blue-500 to-cyan-600',
      actionText: '去设定预算',
      onAction: () => {
        onClose();
        onOpenBudgets();
      }
    },
    {
      step: 3,
      title: '📱 iPhone 硬件级一键秒记',
      desc: '支持 iPhone 操作按钮 (Action Button) 或轻点背面双击，付完款长按侧键 0 步自动存入账本。',
      icon: Smartphone,
      color: 'from-emerald-500 to-teal-600',
      actionText: '查看配置教程',
      onAction: () => {
        onClose();
        onOpenIphoneShortcut();
      }
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-br from-purple-600 via-indigo-600 to-slate-900 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold tracking-wider uppercase">
              新手引导
            </span>
            <span className="text-[10px] text-purple-200">3 步开启极智财务</span>
          </div>

          <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
            ✨ 欢迎使用 斌斌账本
          </h3>
          <p className="text-xs text-purple-100/90 mt-1">
            零摩擦记账 · 全资产对账 · 私密安全
          </p>
        </div>

        {/* Step Cards List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-50/50 dark:bg-slate-950/30">
          {steps.map(s => {
            const Icon = s.icon;
            return (
              <div 
                key={s.step} 
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-2 hover:border-purple-300 dark:hover:border-purple-700 transition"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${s.color} text-white flex items-center justify-center flex-shrink-0 shadow-md`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {s.title}
                      </h4>
                      <span className="text-[10px] font-bold font-mono text-purple-600 dark:text-purple-400">
                        STEP {s.step}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={s.onAction}
                    className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-purple-600 hover:text-white text-slate-700 dark:text-slate-200 text-[10px] font-bold transition flex items-center gap-1 active:scale-95"
                  >
                    <span>{s.actionText}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>数据完全保留在手机本地</span>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-purple-500/25 hover:from-purple-500 hover:to-indigo-500 active:scale-95 transition flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>进入我的账本</span>
          </button>
        </div>
      </div>
    </div>
  );
};
