// 測試 ProgressBar 元件

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import ProgressBar from '@/components/ui/ProgressBar';

describe('ProgressBar', () => {
  it('AC: value=50 渲染 50% 寬度 fill', () => {
    const html = renderToString(createElement(ProgressBar, { value: 50 }));
    expect(html).toContain('width:50%');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="50"');
  });

  it('AC: value 超過 max 自動 clamp 到 100%', () => {
    const html = renderToString(createElement(ProgressBar, { value: 200, max: 100 }));
    expect(html).toContain('width:100%');
  });

  it('AC: 負值 clamp 到 0%', () => {
    const html = renderToString(createElement(ProgressBar, { value: -10 }));
    expect(html).toContain('width:0%');
  });

  it('AC: variant=default 顯示 accent-primary fill', () => {
    const html = renderToString(createElement(ProgressBar, { value: 30, variant: 'default' }));
    expect(html).toContain('var(--accent-primary)');
  });

  it('AC: variant=success 顯示 success 色', () => {
    const html = renderToString(createElement(ProgressBar, { value: 30, variant: 'success' }));
    expect(html).toContain('var(--success)');
  });

  it('AC: variant=tier 顯示漸層', () => {
    const html = renderToString(createElement(ProgressBar, { value: 30, variant: 'tier' }));
    // React render style 把空格塞進去；用寬鬆比對
    expect(html).toMatch(/linear-gradient\([^)]*E8C5A8[^)]*B85A45[^)]*\)/);
  });

  it('AC: showLabel 顯示百分比', () => {
    const html = renderToString(
      createElement(ProgressBar, { value: 33, showLabel: true, ariaLabel: '升級進度' }),
    );
    expect(html).toContain('33%');
    expect(html).toContain('升級進度');
  });

  it('AC: 圓角 full + 高度 6px', () => {
    const html = renderToString(createElement(ProgressBar, { value: 10 }));
    expect(html).toContain('height:6px');
    expect(html).toContain('var(--radius-full)');
  });
});
