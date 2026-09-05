// Beauty CRM v0.4.0 — Toast 元件 + Provider + toast.* helper
// 對齊 DESIGN §3.7
//
// 用法：
//   <ToastProvider>{children}</ToastProvider>     // 在 root layout
//   import { toast } from '@/components/ui/Toast';
//   toast.success('已儲存');

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import Icon, { type IconName } from './Icon';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  durationMs: number;
}

interface ToastContextValue {
  push: (variant: ToastVariant, message: string, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // SSR / 沒有 provider 時回傳 no-op，避免拋例外
    if (typeof window === 'undefined') {
      return { push: () => {} };
    }
    throw new Error('useToast must be used within <ToastProvider>');
  }
  return ctx;
}

const variantToIcon: Record<ToastVariant, IconName> = {
  success: 'Check',
  error: 'X',
  info: 'BellRing',
  warning: 'BellRing',
};

const variantColor: Record<ToastVariant, { bg: string; fg: string; border: string }> = {
  success: { bg: 'var(--success-bg)', fg: 'var(--success)', border: 'var(--success)' },
  error: { bg: 'var(--danger-bg)', fg: 'var(--danger)', border: 'var(--danger)' },
  info: { bg: 'var(--info-bg)', fg: 'var(--info)', border: 'var(--info)' },
  warning: { bg: 'var(--warning-bg)', fg: 'var(--warning)', border: 'var(--warning)' },
};

const toastContainerStyle: CSSProperties = {
  position: 'fixed',
  top: 16,
  right: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  zIndex: 'var(--z-toast)' as unknown as number,
  pointerEvents: 'none',
  maxWidth: 360,
};

function ToastView({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const color = variantColor[item.variant];
  const style: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: '12px 16px',
    background: color.bg,
    color: color.fg,
    border: `1px solid ${color.border}`,
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-md)',
    fontSize: 'var(--text-body)',
    fontWeight: 500,
    pointerEvents: 'auto',
    animation: 'slideUp var(--duration-base) var(--ease-standard)',
    minWidth: 240,
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (item.durationMs <= 0) return;
    const t = window.setTimeout(() => onDismiss(item.id), item.durationMs);
    return () => window.clearTimeout(t);
  }, [item.id, item.durationMs, onDismiss]);

  return (
    <div role="status" aria-live="polite" data-variant={item.variant} style={style}>
      <Icon name={variantToIcon[item.variant]} size={16} />
      <span style={{ flex: 1 }}>{item.message}</span>
      <button
        type="button"
        aria-label="關閉通知"
        onClick={() => onDismiss(item.id)}
        style={{
          background: 'transparent',
          border: 'none',
          color: color.fg,
          cursor: 'pointer',
          padding: 0,
          lineHeight: 1,
          fontSize: 16,
        }}
      >
        ✕
      </button>
    </div>
  );
}

export interface ToastProviderProps {
  children: ReactNode;
  /** 預設 duration（ms）；預設 4000 */
  defaultDurationMs?: number;
}

export function ToastProvider({ children, defaultDurationMs = 4000 }: ToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const push = useCallback(
    (variant: ToastVariant, message: string, durationMs?: number) => {
      counter.current += 1;
      const id = `t-${Date.now()}-${counter.current}`;
      const item: ToastItem = {
        id,
        variant,
        message,
        durationMs: durationMs ?? defaultDurationMs,
      };
      setItems((prev) => [...prev, item]);
    },
    [defaultDurationMs],
  );

  const onDismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 監聽全域 beauty-crm:toast event（讓 module-level toast.* helper 也能觸發）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ variant: ToastVariant; message: string; durationMs?: number }>).detail;
      if (!detail) return;
      push(detail.variant, detail.message, detail.durationMs);
    };
    window.addEventListener('beauty-crm:toast', handler);
    return () => window.removeEventListener('beauty-crm:toast', handler);
  }, [push]);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div aria-live="polite" aria-relevant="additions" style={toastContainerStyle}>
        {items.map((item) => (
          <ToastView key={item.id} item={item} onDismiss={onDismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ============================================================
// toast.* helpers（client-side 友善）
// ============================================================

/**
 * 全域 toast helper。
 * 在沒有 ToastProvider 環境下會 silent fail（不拋例外），
 * 方便 SSR / unit test 用。
 */
export const toast = {
  success: (msg: string, durationMs?: number) => dispatchToast('success', msg, durationMs),
  error: (msg: string, durationMs?: number) => dispatchToast('error', msg, durationMs),
  info: (msg: string, durationMs?: number) => dispatchToast('info', msg, durationMs),
  warning: (msg: string, durationMs?: number) => dispatchToast('warning', msg, durationMs),
};

function dispatchToast(variant: ToastVariant, message: string, durationMs?: number) {
  if (typeof window === 'undefined') return;
  // 透過 CustomEvent 讓 ToastProvider 監聽（避免直接 import React 模組造成循環）
  const event = new CustomEvent('beauty-crm:toast', {
    detail: { variant, message, durationMs },
  });
  window.dispatchEvent(event);
}
