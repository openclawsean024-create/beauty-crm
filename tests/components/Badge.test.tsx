// 測試 Badge 元件

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import Badge from '@/components/ui/Badge';

describe('Badge', () => {
  it('AC: 預設 variant=default 顯示子內容 + 圓角 full', () => {
    const html = renderToString(createElement(Badge, null, '預設'));
    expect(html).toContain('預設');
    expect(html).toContain('data-variant="default"');
    expect(html).toContain('var(--radius-full)');
  });

  it('AC: variant=success 綠色背景 + 文字', () => {
    const html = renderToString(createElement(Badge, { variant: 'success' }, '已儲存'));
    expect(html).toContain('data-variant="success"');
    expect(html).toContain('var(--success-bg)');
    expect(html).toContain('var(--success)');
  });

  it('AC: variant=warning 黃色', () => {
    const html = renderToString(createElement(Badge, { variant: 'warning' }, '即將到期'));
    expect(html).toContain('var(--warning-bg)');
    expect(html).toContain('var(--warning)');
  });

  it('AC: variant=danger 紅色', () => {
    const html = renderToString(createElement(Badge, { variant: 'danger' }, '過期'));
    expect(html).toContain('var(--danger-bg)');
    expect(html).toContain('var(--danger)');
  });

  it('AC: variant=info 藍灰', () => {
    const html = renderToString(createElement(Badge, { variant: 'info' }, '提示'));
    expect(html).toContain('var(--info-bg)');
    expect(html).toContain('var(--info)');
  });

  it('AC: variant=accent 粉橘 accent', () => {
    const html = renderToString(createElement(Badge, { variant: 'accent' }, 'VIP'));
    expect(html).toContain('var(--accent-bg)');
    expect(html).toContain('var(--accent-primary)');
  });

  it('AC: size=sm 高度 20px', () => {
    const html = renderToString(createElement(Badge, { size: 'sm' }, 'x'));
    expect(html).toContain('height:20px');
  });

  it('AC: size=md 高度 24px', () => {
    const html = renderToString(createElement(Badge, { size: 'md' }, 'x'));
    expect(html).toContain('height:24px');
  });
});
