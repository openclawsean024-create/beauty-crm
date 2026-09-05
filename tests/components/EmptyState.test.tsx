// 測試 EmptyState 元件

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import EmptyState from '@/components/ui/EmptyState';

describe('EmptyState', () => {
  it('AC: 顯示 title + description', () => {
    const html = renderToString(
      createElement(EmptyState, { title: '尚無客戶', description: '新增第一位客戶開始' }),
    );
    expect(html).toContain('尚無客戶');
    expect(html).toContain('新增第一位客戶開始');
  });

  it('AC: 帶 icon 時渲染', () => {
    const html = renderToString(
      createElement(
        EmptyState,
        { title: 't', icon: createElement('span', null, '🔔') },
      ),
    );
    expect(html).toContain('🔔');
  });

  it('AC: 帶 action 時渲染 CTA', () => {
    const html = renderToString(
      createElement(
        EmptyState,
        { title: 't', action: createElement('button', null, '新增客戶') },
      ),
    );
    expect(html).toContain('新增客戶');
  });

  it('AC: 用虛線邊框表示「空的」', () => {
    const html = renderToString(createElement(EmptyState, { title: 't' }));
    expect(html).toContain('dashed');
    expect(html).toContain('var(--border-light)');
  });
});
