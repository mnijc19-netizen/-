/**
 * Haptic Feedback Service
 * 全局全平台硬件级触感反馈引擎：
 * 1. iOS Safari (iPhone 16 Pro, iOS 17.4+ / iOS 26.6): 采用 WebKit 硬件级 Taptic Engine (<input type="checkbox" switch> + label.click())
 * 2. Android (Xiaomi 14 Pro, HyperOS / Chrome): 采用已校准的 X 轴线性马达动力学脉冲 (navigator.vibrate >= 35ms)
 * 3. 兜底: Web Audio API 超低频触觉脉冲
 */

class HapticFeedbackService {
  private storageKey = 'smartwealth_haptic_enabled_v1';
  private audioCtx: any = null;
  private iosSwitchLabel: HTMLLabelElement | null = null;
  private isIosDevice = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent || '';
      this.isIosDevice = /iPhone|iPad|iPod/i.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
      // Lazy init iOS switch element on first user touch
      if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', () => this.initIosSwitch());
      } else {
        this.initIosSwitch();
      }
    }
  }

  /**
   * 初始化 iOS Safari 专用的硬件级 Taptic Engine 触发节点
   * 原理：WebKit 在 iOS 17.4+ 对原生 switch 控件点击配有专属 Taptic Engine 系统震动
   */
  private initIosSwitch(): void {
    if (typeof document === 'undefined' || this.iosSwitchLabel) return;
    try {
      const switchId = 'smartwealth-ios-haptic-switch';
      let input = document.getElementById(switchId) as HTMLInputElement | null;
      let label = document.getElementById(switchId + '-lbl') as HTMLLabelElement | null;

      if (!input) {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.setAttribute('switch', '');
        input.id = switchId;
        input.setAttribute('aria-hidden', 'true');
        input.tabIndex = -1;
        input.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-999;';
        document.body.appendChild(input);
      }

      if (!label) {
        label = document.createElement('label');
        label.htmlFor = switchId;
        label.id = switchId + '-lbl';
        label.setAttribute('aria-hidden', 'true');
        label.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-999;';
        document.body.appendChild(label);
      }

      this.iosSwitchLabel = label;
    } catch {
      // Ignore DOM injection issues in strict environments
    }
  }

  /**
   * 触发 iOS Safari 原生 Taptic Engine 震动
   */
  private triggerIosTaptic(): boolean {
    if (!this.iosSwitchLabel) {
      this.initIosSwitch();
    }
    if (this.iosSwitchLabel) {
      try {
        this.iosSwitchLabel.click();
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

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
   * 兜底：超低频物理触感声学脉冲
   */
  private playAudioPulse(frequency = 80, duration = 0.04, gainLevel = 0.15): void {
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
   * 底层全平台震动调度总线
   * - iOS 设备优先激发 Taptic Engine 硬件开关
   * - Android 设备激发 X 轴线性马达动力脉冲 (>= 35ms 克服小米/AAC线性马达启振阈值)
   */
  trigger(pattern: number | number[] = 35, iosFreq = 85, iosDuration = 0.035, iosGain = 0.2): void {
    if (!this.isHapticEnabled()) return;

    // 1. iOS Safari Taptic Engine 优先触发
    if (this.isIosDevice) {
      this.triggerIosTaptic();
    }

    // 2. Android & Chrome 线性马达物理振动 (小米 14 Pro 等需 >= 35ms 启动脉冲)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore
      }
    }

    // 3. Web Audio 触觉伴音增强
    this.playAudioPulse(iosFreq, iosDuration, iosGain);
  }

  /**
   * 开关切换触感 (Toggle Switch)
   */
  toggle(): void {
    this.trigger([35, 40], 90, 0.035, 0.2);
  }

  /**
   * 轻触选中 / 切换标签 / 选项点击 (Light Selection)
   */
  selection(): void {
    this.trigger(35, 110, 0.025, 0.15);
  }

  /**
   * 按钮敲击 / 模态框展开 (Medium Impact)
   */
  impact(): void {
    this.trigger(45, 75, 0.045, 0.25);
  }

  /**
   * 成功保存 / 操作完成 (Success Haptic)
   */
  success(): void {
    this.trigger([35, 45, 35], 130, 0.05, 0.25);
  }

  /**
   * 警告 / 隐藏 / 移除 (Warning Haptic)
   */
  warning(): void {
    this.trigger([55, 60, 55], 60, 0.06, 0.3);
  }

  /**
   * 底部抽屉打开 (Sheet Open)
   */
  sheetOpen(): void {
    this.trigger([35, 30], 80, 0.04, 0.22);
  }

  /**
   * 底部抽屉关闭或下拉消失 (Sheet Close)
   */
  sheetClose(): void {
    this.trigger(35, 95, 0.03, 0.18);
  }
}

export const haptic = new HapticFeedbackService();
