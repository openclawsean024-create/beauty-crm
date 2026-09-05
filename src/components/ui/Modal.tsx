// Beauty CRM v0.4.0 — Modal 元件（desktop 中心對話框）
// 對齊 DESIGN §3.6
//
// 使用情境：>= 1024px 桌面用。
// 行動裝置請改用 <Sheet>。

import { useEffect, type CSSProperties, type ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  /** 設定 footer slot；通常放按鈕列 */
  footer?: ReactNode;
  /** max-width（px），預設 560 */
  maxWidth?: number;
  /** close 按鈕 aria-label */
  closeAriaLabel?: string;
  /** test id */
  testId?: string;
}

const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'var(--bg-overlay)',
  zIndex: 'var(--z-modal-backdrop)' as unknown as number,
  animation: 'fadeIn var(--duration-base) var(--ease-standard)',
};

const panelStyle: CSSProperties = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'var(--bg-card)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-5)',
  width: 'min(560px, calc(100vw - 32px))',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: 'var(--shadow-lg)',
  zIndex: 'var(--z-modal)' as unknown as number,
  animation: 'fadeIn var(--duration-base) var(--ease-standard)',
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 560,
  closeAriaLabel = '關閉',
  testId,
}: ModalProps) {
  // ESC 關閉
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', onKey);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', onKey);
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  const panel: CSSProperties = {
    ...panelStyle,
    width: `min(${maxWidth}px, calc(100vw - 32px))`,
  };

  return (
    <>
      <div
        aria-hidden="true"
        data-testid={testId ? `${testId}-backdrop` : undefined}
        onClick={onClose}
        style={backdropStyle}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? `${testId ?? 'modal'}-title` : undefined}
        data-testid={testId}
        style={panel}
      >
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-3)',
            }}
          >
            <h2
              id={`${testId ?? 'modal'}-title`}
              style={{
                fontSize: 'var(--text-h3)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                margin: 0,
              }}
            >
              {title}
            </h2>
            <button
              type="button"
              aria-label={closeAriaLabel}
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: 20,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 4,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        )}
        <div>{children}</div>
        {footer && (
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              justifyContent: 'flex-end',
              marginTop: 'var(--space-4)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
