/**
 * 📳 Haptic Feedback Service
 * 全局触感反馈震动引擎，支持开关切换、标签选择、按键确认与成功提示等丰富触感
 */

class HapticFeedbackService {
  private storageKey = 'smartwealth_haptic_enabled_v1';

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
        this.trigger([18, 30]);
      }
    } catch {
      // Ignore localstorage errors
    }
  }

  /**
   * 底层震动触发器
   */
  trigger(pattern: number | number[] = 15): void {
    if (!this.isHapticEnabled()) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Fallback silently
      }
    }
  }

  /**
   * 🔘 开关切换触感 (Toggle Switch)
   */
  toggle(): void {
    this.trigger([16, 24]);
  }

  /**
   * 🎯 轻触选中 / 切换标签 / 选项点击 (Light Tap / Selection)
   */
  selection(): void {
    this.trigger(12);
  }

  /**
   * ⚡ 按钮敲击 / 模态框展开 (Medium Impact)
   */
  impact(): void {
    this.trigger(22);
  }

  /**
   * ✅ 成功保存 / 操作完成 (Success Haptic)
   */
  success(): void {
    this.trigger([15, 30, 15]);
  }

  /**
   * ⚠️ 警告 / 隐藏 / 移除 (Warning Haptic)
   */
  warning(): void {
    this.trigger([30, 40, 30]);
  }
}

export const haptic = new HapticFeedbackService();
