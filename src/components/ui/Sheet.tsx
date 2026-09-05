// Beauty CRM v0.4.0 — Sheet 元件（mobile bottom sheet）
// 對齊 DESIGN §3.6
//
// 對齊 AddTreatmentSheet 既有風格：mobile 用 bottom sheet（單手可達）

import { useEffect, type CSSProperties, type ReactNode } from 'react';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  /** footer slot；通常放按鈕列 */
  footer?: ReactNode;
  closeAriaLabel?: string;
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
  left: 0,
  right: 0,
  bottom: 0,
  background: 'var(--bg-card)',
  borderTopLeftRadius: 'var(--radius-xl)',
  borderTopRightRadius: 'var(--radius-xl)',
  padding: 'var(--space-4)',
  paddingBottom: 'max(var(--space-4), env(safe-area-inset-bottom))',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: 'var(--shadow-sheet)',
  zIndex: 'var(--z-modal)' as unknown as number,
  animation: 'slideUp var(--duration-base) var(--ease-standard)',
};

const handleBar: CSSProperties = {
  width: 40,
  height: 4,
  borderRadius: 'var(--radius-full)',
  background: 'var(--border-medium)',
  margin: '0 auto var(--space-3)',
};

export default function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  closeAriaLabel = '關閉',
  testId,
}: SheetProps) {
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
        aria-labelledby={title ? `${testId ?? 'sheet'}-title` : undefined}
        data-testid={testId}
        style={panelStyle}
      >
        <div aria-hidden="true" style={handleBar} />
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
              id={`${testId ?? 'sheet'}-title`}
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
