// 測試 Skeleton 元件

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import Skeleton from '@/components/ui/Skeleton';

describe('Skeleton', () => {
  it('AC: 預設 width=100% + bg-secondary + 動畫', () => {
    const html = renderToString(createElement(Skeleton, { height: 16 }));
    expect(html).toContain('width:100%');
    expect(html).toContain('var(--bg-secondary)');
    expect(html).toContain('skeleton-pulse');
  });

  it('AC: 自訂 width 為數字時轉成 px', () => {
    const html = renderToString(createElement(Skeleton, { height: 12, width: 200 }));
    expect(html).toContain('width:200px');
  });

  it('AC: 自訂 width 為字串時直接用', () => {
    const html = renderToString(
      createElement(Skeleton, { height: 12, width: '50%' }),
    );
    expect(html).toContain('width:50%');
  });

  it('AC: 自訂 radius', () => {
    const html = renderToString(
      createElement(Skeleton, { height: 12, radius: 'var(--radius-full)' }),
    );
    expect(html).toContain('var(--radius-full)');
  });

  it('AC: count=3 渲染 3 條', () => {
    const html = renderToString(
      createElement(Skeleton, { height: 12, count: 3 }),
    );
    const matches = html.match(/skeleton-pulse/g);
    expect(matches?.length).toBe(3);
  });

  it('AC: aria-hidden=true（純視覺 placeholder）', () => {
    const html = renderToString(createElement(Skeleton, { height: 16 }));
    expect(html).toContain('aria-hidden="true"');
  });
});
