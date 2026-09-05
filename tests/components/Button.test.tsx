// 測試 Button 元件
// 沿用既有 pattern：SSR markup 測試

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import Button from '@/components/ui/Button';

describe('Button', () => {
  it('AC: 預設 variant=primary, size=md 渲染 type=button', () => {
    const html = renderToString(createElement(Button, null, '儲存'));
    expect(html).toContain('type="button"');
    expect(html).toContain('data-variant="primary"');
    expect(html).toContain('data-size="md"');
    expect(html).toContain('儲存');
  });

  it('AC: variant=secondary 背景白底、邊框 medium', () => {
    const html = renderToString(createElement(Button, { variant: 'secondary' }, '次要'));
    expect(html).toContain('data-variant="secondary"');
    expect(html).toContain('background:var(--bg-card)');
    expect(html).toContain('var(--border-medium)');
  });

  it('AC: variant=danger 紅色文字 + 紅色邊框', () => {
    const html = renderToString(createElement(Button, { variant: 'danger' }, '刪除'));
    expect(html).toContain('data-variant="danger"');
    expect(html).toContain('color:var(--danger)');
  });

  it('AC: variant=icon-only 適合小圖示按鈕', () => {
    const html = renderToString(
      createElement(Button, { variant: 'icon-only', ariaLabel: '關閉' }, '✕'),
    );
    expect(html).toContain('data-variant="icon-only"');
    expect(html).toContain('aria-label="關閉"');
  });

  it('AC: size=lg mobile CTA 高 48px', () => {
    const html = renderToString(createElement(Button, { size: 'lg' }, '行動'));
    expect(html).toContain('data-size="lg"');
    expect(html).toContain('height:48px');
  });

  it('AC: size=sm 32px', () => {
    const html = renderToString(createElement(Button, { size: 'sm' }, '小'));
    expect(html).toContain('data-size="sm"');
    expect(html).toContain('height:32px');
  });

  it('AC: disabled 套用 opacity:0.5 + cursor:not-allowed', () => {
    const html = renderToString(createElement(Button, { disabled: true }, 'x'));
    expect(html).toContain('disabled=""');
    expect(html).toContain('opacity:0.5');
    expect(html).toContain('cursor:not-allowed');
  });

  it('AC: loading 顯示「處理中…」+ aria-busy=true', () => {
    const html = renderToString(createElement(Button, { loading: true }, '儲存'));
    expect(html).toContain('處理中…');
    expect(html).toContain('aria-busy="true"');
  });

  it('AC: fullWidth 套 width:100%', () => {
    const html = renderToString(createElement(Button, { fullWidth: true }, 'x'));
    expect(html).toContain('width:100%');
    expect(html).toContain('data-fullwidth="true"');
  });

  it('AC: type=submit / reset 保留', () => {
    const html = renderToString(
      createElement(Button, { type: 'submit' }, '送出'),
    );
    expect(html).toContain('type="submit"');
  });
});
