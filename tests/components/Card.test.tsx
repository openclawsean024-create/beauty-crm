// 測試 Card 元件（v0.4.0 新 component library）
// 沿用既有 pattern：react-dom/server SSR markup 測試 + 純函式/型別測試

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import Card from '@/components/ui/Card';

describe('Card', () => {
  it('AC: 預設 variant=default 渲染標題 + 內容', () => {
    const html = renderToString(
      createElement(Card, { title: '本月重點' }, createElement('p', null, '內容')),
    );
    expect(html).toContain('本月重點');
    expect(html).toContain('內容');
    expect(html).toContain('data-variant="default"');
  });

  it('AC: variant=image 設定 padding=0、overflow=hidden', () => {
    const html = renderToString(
      createElement(Card, { variant: 'image' }, createElement('span', null, 'img')),
    );
    expect(html).toContain('data-variant="image"');
    expect(html).toContain('overflow:hidden');
  });

  it('AC: variant=stat 設定 text-align=center', () => {
    const html = renderToString(
      createElement(Card, { variant: 'stat', title: '活躍客戶' }, '42'),
    );
    expect(html).toContain('data-variant="stat"');
    expect(html).toContain('text-align:center');
  });

  it('AC: 帶 onClick 時渲染為 button role + cursor:pointer', () => {
    let clicked = 0;
    const html = renderToString(
      createElement(
        Card,
        { title: '可點擊', onClick: () => clicked++ },
        createElement('span', null, 'click me'),
      ),
    );
    expect(html).toContain('role="button"');
    expect(html).toContain('cursor:pointer');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-label="可點擊"');
  });

  it('AC: subtitle 顯示在標題下', () => {
    const html = renderToString(
      createElement(Card, { title: 't', subtitle: 'sub' }, 'x'),
    );
    expect(html).toContain('t');
    expect(html).toContain('sub');
  });
});
