// Beauty CRM — 通用 toast (儲存成功、草稿核准等)
'use client';

interface Props {
  message: string | null;
  onDismiss?: () => void;
}

export default function Toast({ message }: Props) {
  return (
    <div
      className={`toast${message ? ' show' : ''}`}
      role="status"
      aria-live="polite"
    >
      ✓ {message ?? ''}
    </div>
  );
}
