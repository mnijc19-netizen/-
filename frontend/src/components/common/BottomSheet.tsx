import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { haptic } from '../../services/haptic';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  maxHeightClass?: string;
  showHandle?: boolean;
  contentClassName?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  description,
  headerActions,
  children,
  maxHeightClass = 'max-h-[92dvh]',
  showHandle = true,
  contentClassName = 'p-4 sm:p-5'
}) => {
  const [mounted, setMounted] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Trigger smooth enter/exit animations
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      haptic.sheetOpen();
      // Lock background scrolling on iOS Safari
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      const timer = setTimeout(() => {
        setMounted(false);
      }, 280);
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);

  // Touch gesture handlers for pull-down to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    // Only allow drag-to-dismiss when initiated on drag handle or header
    startYRef.current = e.touches[0].clientY;
    currentYRef.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) {
      // Damped downward pull
      setDragY(delta * 0.75);
    } else {
      // Rubber-band resistance upward
      setDragY(delta * 0.15);
    }
    currentYRef.current = e.touches[0].clientY;
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    const delta = currentYRef.current - startYRef.current;
    if (delta > 90) {
      // Pulled down enough to dismiss
      haptic.sheetClose();
      onClose();
    }
    setDragY(0);
  }, [isDragging, onClose]);

  if (!isOpen && !mounted) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col justify-end transition-opacity duration-250 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop overlay with blur */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={() => {
          haptic.selection();
          onClose();
        }}
        aria-hidden="true"
      />

      {/* iOS BottomSheet Sheet Panel */}
      <div
        ref={sheetRef}
        style={{
          transform: isDragging 
            ? `translate3d(0, ${Math.max(0, dragY)}px, 0)`
            : isOpen 
              ? 'translate3d(0, 0, 0)' 
              : 'translate3d(0, 100%, 0)',
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        className={`relative w-full max-w-lg mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-t-[28px] border-t border-slate-200/80 dark:border-slate-800/80 shadow-2xl flex flex-col ${maxHeightClass} pb-[env(safe-area-inset-bottom,16px)]`}
      >
        {/* Drag Handle & Header Touch Area */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="pt-3 pb-2 px-5 select-none cursor-grab active:cursor-grabbing shrink-0"
        >
          {showHandle && (
            <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-2.5 transition-colors" />
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              {title && (
                <div className="text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {title}
                </div>
              )}
              {description && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {description}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {headerActions}
              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition active:scale-90"
                aria-label="关闭"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className={`overflow-y-auto overscroll-contain flex-1 ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
};
