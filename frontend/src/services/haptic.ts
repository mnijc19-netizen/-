/**
 * Haptic Feedback Service
 * 全局全平台触感反馈引擎：同时支持 Android/Chrome (navigator.vibrate) 与 iOS Safari (Web Audio Haptic Impulse)
 */

class HapticFeedbackService {
  private storageKey = 'smartwealth_haptic_enabled_v1';
  private audioCtx: any = null;

  private getAudioContext(): any {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Play an ultra-low frequency subtle physical haptic tap impulse (works on iOS & WebKit)
   */
  private playIosHapticPulse(frequency = 80, duration = 0.04, gainLevel = 0.15): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gain.gain.setValueAtTime(gainLevel, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * 是否启用了触感反馈（默认开启）
   */
  isHapticEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  }

  /**
   * 设置触感反馈开关并持久化
   */
  setHapticEnabled(enabled: boolean): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, enabled ? 'true' : 'false');
      if (enabled) {
        this.toggle();
      }
    } catch {
      // Ignore localstorage errors
    }
  }

  /**
   * 底层全平台震动触发器
   */
  trigger(pattern: number | number[] = 15, iosFreq = 85, iosDuration = 0.035, iosGain = 0.2): void {
    if (!this.isHapticEnabled()) return;

    // 1. Android & Chrome Vibration API
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore
      }
    }

    // 2. iOS Safari & WebKit Physical Sub-Bass Haptic Impulse
    this.playIosHapticPulse(iosFreq, iosDuration, iosGain);
  }

  /**
   * 开关切换触感 (Toggle Switch)
   */
  toggle(): void {
    this.trigger([16, 24], 90, 0.035, 0.2);
  }

  /**
   * 轻触选中 / 切换标签 / 选项点击 (Light Selection)
   */
  selection(): void {
    this.trigger(12, 110, 0.025, 0.15);
  }

  /**
   * 按钮敲击 / 模态框展开 (Medium Impact)
   */
  impact(): void {
    this.trigger(22, 75, 0.045, 0.25);
  }

  /**
   * 成功保存 / 操作完成 (Success Haptic)
   */
  success(): void {
    this.trigger([15, 30, 15], 130, 0.05, 0.25);
  }

  /**
   * 警告 / 隐藏 / 移除 (Warning Haptic)
   */
  warning(): void {
    this.trigger([30, 40, 30], 60, 0.06, 0.3);
  }
}

export const haptic = new HapticFeedbackService();
