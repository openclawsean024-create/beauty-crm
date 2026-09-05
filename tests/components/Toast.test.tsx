// 測試 Toast 元件 + helper

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { ToastProvider, toast } from '@/components/ui/Toast';

describe('Toast', () => {
  it('AC: ToastProvider 渲染 children 與 toast 容器', () => {
    const html = renderToString(
      createElement(ToastProvider, null, createElement('div', null, 'main')),
    );
    expect(html).toContain('main');
    expect(html).toContain('aria-live="polite"');
  });

  it('AC: toast 物件有 4 個 method（success / error / info / warning）', () => {
    expect(typeof toast.success).toBe('function');
    expect(typeof toast.error).toBe('function');
    expect(typeof toast.info).toBe('function');
    expect(typeof toast.warning).toBe('function');
  });

  it('AC: SSR 時 toast.* 不拋例外（no-op）', () => {
    // 在 vitest node env（無 window）下呼叫應 silent fail
    expect(() => toast.success('msg')).not.toThrow();
    expect(() => toast.error('err')).not.toThrow();
    expect(() => toast.info('info')).not.toThrow();
    expect(() => toast.warning('warn')).not.toThrow();
  });
});
