import React from 'react';
import { 
  Sparkles, 
  Camera, 
  PieChart, 
  Smartphone, 
  ArrowRight, 
  Bot,
  ExternalLink,
  Gift,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BottomSheet } from './common/BottomSheet';
import { haptic } from '../services/haptic';

interface OnboardingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBatchBalance: () => void;
  onOpenBudgets: () => void;
  onOpenIphoneShortcut: () => void;
  onOpenAiChat: () => void;
  onNavigateToBackup?: () => void;
}

export const OnboardingGuideModal: React.FC<OnboardingGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenBatchBalance,
  onOpenBudgets,
  onOpenIphoneShortcut,
  onOpenAiChat,
  onNavigateToBackup
}) => {
  const handleFinish = () => {
    haptic.success();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    onClose();
  };

  const steps = [
    {
      step: 1,
      title: '📸 多图批量开账 · 10秒对齐总资产',
      desc: '支持一次性选择微信、支付宝、银行卡或证券持仓截图，AI 自动并行提取各平台余额，一键对齐开账！',
      icon: Camera,
      color: 'from-purple-500 to-indigo-600',
      actionText: '立即拍照/选图开账',
      onAction: () => {
        haptic.selection();
        onClose();
        onOpenBatchBalance();
      }
    },
    {
      step: 2,
      title: '🤖 开启 AI 智能大脑 · 永久免费资源包',
      desc: '系统支持智谱 AI、DeepSeek 等大模型。智谱新注册送 1800 万资源包，GLM-4V-Flash 视觉看图永久 100% 免费！点击一键直达申请。',
      icon: Bot,
      color: 'from-violet-500 to-fuchsia-600',
      actionText: '去申请免费 Key / 体验',
      onAction: () => {
        haptic.selection();
        onClose();
        onOpenAiChat();
      },
      externalLink: 'https://open.bigmodel.cn/'
    },
    {
      step: 3,
      title: '⚡ iPhone 硬件级 2步秒跳记账',
      desc: '付完款长按侧键截屏，0 秒直跳网页并由底部抽屉直接弹出识别好的入账卡片，点一次「保存」即入库！',
      icon: Smartphone,
      color: 'from-emerald-500 to-teal-600',
      actionText: '查看 2 步极速配置',
      onAction: () => {
        haptic.selection();
        onClose();
        onOpenIphoneShortcut();
      }
    },
    {
      step: 4,
      title: '📊 设定月度预算与存钱心愿',
      desc: '为餐饮、购物设定合理预算，或立项存钱小目标。实时监控进度，超支前自动预警。',
      icon: PieChart,
      color: 'from-blue-500 to-cyan-600',
      actionText: '去设定预算',
      onAction: () => {
        haptic.selection();
        onClose();
        onOpenBudgets();
      }
    }
  ];

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="✨ 欢迎使用 斌斌钱包"
      description="极智全域个人资产智能财务管理系统 · 3步开启"
      maxHeightClass="max-h-[92dvh]"
      contentClassName="p-4 sm:p-5 space-y-3"
    >
      {/* Welcome Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-teal-500/10 border border-purple-200 dark:border-purple-800/50 space-y-1">
        <div className="text-xs font-black text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
          <Gift className="w-4 h-4 text-purple-500" />
          <span>保姆式新手启程指南</span>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
          零摩擦记账 · 全域资产对账 · 消费信贷自动分流 · 本地私密安全加密。跟着以下步骤，10 秒内即可完全上手！
        </p>
      </div>

      {/* Step Cards List */}
      <div className="space-y-2.5">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <div 
              key={s.step} 
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 hover:border-purple-300 dark:hover:border-purple-700 transition"
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

              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60">
                {s.externalLink ? (
                  <a
                    href={s.externalLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-violet-600 dark:text-violet-400 font-bold hover:underline flex items-center gap-0.5"
                  >
                    <span>智谱开放平台官网 (1秒免费领)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-[10px] text-slate-400">
                    新手首推
                  </span>
                )}
                <button
                  type="button"
                  onClick={s.onAction}
                  className="px-3 py-1 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-[10.5px] active:scale-95 transition flex items-center gap-1 shadow-xs"
                >
                  <span>{s.actionText}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Done button */}
      <button
        type="button"
        onClick={handleFinish}
        className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-98 transition flex items-center justify-center gap-1.5"
      >
        <CheckCircle2 className="w-4 h-4" />
        <span>全部了解，开始使用 斌斌钱包！</span>
      </button>
    </BottomSheet>
  );
};
