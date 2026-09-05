// 測試 Sheet 元件

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import Sheet from '@/components/ui/Sheet';

const noop = () => {
  // intentionally empty
};

describe('Sheet', () => {
  it('AC: open=false 不渲染 DOM', () => {
    const html = renderToString(
      createElement(Sheet, { open: false, onClose: noop }, 'children'),
    );
    expect(html).toBe('');
  });

  it('AC: open=true 渲染底部抽屜 + 圓角 16px + role=dialog', () => {
    const html = renderToString(
      createElement(Sheet, { open: true, onClose: noop, title: '新增' }, 'body'),
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('新增');
    expect(html).toContain('var(--radius-xl)');
    expect(html).toContain('border-top-left-radius:var(--radius-xl)');
  });

  it('AC: 含 handle bar', () => {
    const html = renderToString(
      createElement(Sheet, { open: true, onClose: noop }, 'x'),
    );
    expect(html).toContain('width:40px');
    expect(html).toContain('height:4px');
  });

  it('AC: 含 close 按鈕', () => {
    const html = renderToString(
      createElement(Sheet, { open: true, onClose: noop, title: 't', closeAriaLabel: '關閉抽屜' }),
    );
    expect(html).toContain('aria-label="關閉抽屜"');
  });

  it('AC: footer 渲染於 sheet 內', () => {
    const html = renderToString(
      createElement(
        Sheet,
        { open: true, onClose: noop, footer: createElement('button', null, '送出') },
      ),
    );
    expect(html).toContain('送出');
  });
});
