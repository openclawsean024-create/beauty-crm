// Beauty CRM v0.4.0 — Input / Textarea / Select 元件
// 對齊 DESIGN §3.3

import type {
  ChangeEventHandler,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

export interface FieldWrapperProps {
  id: string;
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
  children: ReactNode;
}

function FieldWrapper({ id, label, required, error, hint, fullWidth, children }: FieldWrapperProps) {
  const wrapperStyle: CSSProperties = {
    display: fullWidth === false ? 'inline-block' : 'block',
    marginBottom: 'var(--space-3)',
    width: fullWidth === false ? 'auto' : '100%',
  };
  const labelStyle: CSSProperties = {
    display: 'block',
    fontSize: 'var(--text-caption)',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: 4,
  };
  return (
    <div style={wrapperStyle}>
      {label && (
        <label htmlFor={id} style={labelStyle}>
          {label}
          {required && (
            <span aria-hidden="true" style={{ color: 'var(--danger)', marginLeft: 2 }}>
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p
          role="alert"
          aria-live="polite"
          style={{
            fontSize: 'var(--text-caption)',
            color: 'var(--danger)',
            marginTop: 4,
          }}
        >
          {error}
        </p>
      ) : hint ? (
        <p
          style={{
            fontSize: 'var(--text-caption)',
            color: 'var(--text-muted)',
            marginTop: 4,
          }}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const fieldInputStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  height: 40,
  padding: '0 12px',
  border: '1px solid var(--border-medium)',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-body)',
  fontFamily: 'inherit',
  color: 'var(--text-primary)',
  background: 'var(--bg-card)',
  transition: 'border-color var(--duration-fast) var(--ease-standard)',
};

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'> {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
  value?: string | number;
  onChange?: ChangeEventHandler<HTMLInputElement>;
}

export default function Input({
  id,
  label,
  required,
  error,
  hint,
  fullWidth = true,
  value,
  onChange,
  placeholder,
  type = 'text',
  ...rest
}: InputProps) {
  const inputId = id ?? `input-${Math.random().toString(36).slice(2, 8)}`;
  const inputStyle: CSSProperties = {
    ...fieldInputStyle,
    borderColor: error ? 'var(--danger)' : fieldInputStyle.borderColor,
  };
  return (
    <FieldWrapper id={inputId} label={label} required={required} error={error} hint={hint} fullWidth={fullWidth}>
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? 'true' : undefined}
        style={inputStyle}
        {...rest}
      />
    </FieldWrapper>
  );
}

// ============================================================
// Textarea
// ============================================================

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
  value?: string;
  onChange?: ChangeEventHandler<HTMLTextAreaElement>;
}

const textareaBaseStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  minHeight: 80,
  padding: '8px 12px',
  border: '1px solid var(--border-medium)',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-body)',
  fontFamily: 'inherit',
  color: 'var(--text-primary)',
  background: 'var(--bg-card)',
  resize: 'vertical',
  transition: 'border-color var(--duration-fast) var(--ease-standard)',
};

export function Textarea({
  id,
  label,
  required,
  error,
  hint,
  fullWidth = true,
  value,
  onChange,
  placeholder,
  rows = 3,
  ...rest
}: TextareaProps) {
  const tid = id ?? `textarea-${Math.random().toString(36).slice(2, 8)}`;
  const style: CSSProperties = {
    ...textareaBaseStyle,
    borderColor: error ? 'var(--danger)' : textareaBaseStyle.borderColor,
  };
  return (
    <FieldWrapper id={tid} label={label} required={required} error={error} hint={hint} fullWidth={fullWidth}>
      <textarea
        id={tid}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={rows}
        aria-required={required || undefined}
        aria-invalid={error ? 'true' : undefined}
        style={style}
        {...rest}
      />
    </FieldWrapper>
  );
}

// ============================================================
// Select
// ============================================================

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size'> {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
  options: SelectOption[];
  value?: string;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  placeholder?: string;
}

const selectBaseStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  height: 40,
  padding: '0 12px',
  border: '1px solid var(--border-medium)',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-body)',
  fontFamily: 'inherit',
  color: 'var(--text-primary)',
  background: 'var(--bg-card)',
  transition: 'border-color var(--duration-fast) var(--ease-standard)',
};

export function Select({
  id,
  label,
  required,
  error,
  hint,
  fullWidth = true,
  options,
  value,
  onChange,
  placeholder,
  ...rest
}: SelectProps) {
  const sid = id ?? `select-${Math.random().toString(36).slice(2, 8)}`;
  const style: CSSProperties = {
    ...selectBaseStyle,
    borderColor: error ? 'var(--danger)' : selectBaseStyle.borderColor,
  };
  return (
    <FieldWrapper id={sid} label={label} required={required} error={error} hint={hint} fullWidth={fullWidth}>
      <select
        id={sid}
        value={value}
        onChange={onChange}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? 'true' : undefined}
        style={style}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}
