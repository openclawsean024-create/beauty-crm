// Beauty CRM v0.4.0 — EmptyState 元件
// 對齊 DESIGN §3.9

import type { CSSProperties, ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  testId?: string;
}

const wrapperStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'var(--space-6) var(--space-4)',
  textAlign: 'center',
  background: 'var(--bg-card)',
  border: '1px dashed var(--border-light)',
  borderRadius: 'var(--radius-lg)',
  color: 'var(--text-secondary)',
};

export default function EmptyState({ icon, title, description, action, testId }: EmptyStateProps) {
  return (
    <div data-testid={testId} style={wrapperStyle}>
      {icon && (
        <div
          aria-hidden="true"
          style={{
            color: 'var(--text-muted)',
            marginBottom: 'var(--space-3)',
            fontSize: 32,
          }}
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          fontSize: 'var(--text-h4)',
          color: 'var(--text-primary)',
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontSize: 'var(--text-body)',
            color: 'var(--text-muted)',
            marginBottom: action ? 'var(--space-3)' : 0,
            maxWidth: 360,
          }}
        >
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
