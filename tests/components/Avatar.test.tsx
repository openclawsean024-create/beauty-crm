// 測試 Avatar 元件

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import Avatar from '@/components/ui/Avatar';

describe('Avatar', () => {
  it('AC: 給 name 時 fallback 顯示首字 + 圓形', () => {
    const html = renderToString(createElement(Avatar, { name: '雅婷' }));
    expect(html).toContain('雅');
    expect(html).toContain('var(--radius-full)');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="雅婷"');
  });

  it('AC: 給 src 時改為 img 標籤', () => {
    const html = renderToString(
      createElement(Avatar, { name: '雅婷', src: '/photo.jpg', alt: '雅婷照片' }),
    );
    expect(html).toContain('<img');
    expect(html).toContain('src="/photo.jpg"');
    expect(html).toContain('alt="雅婷照片"');
  });

  it('AC: size=sm 24px / md 32px / lg 48px / xl 80px', () => {
    const sizes = [
      ['sm', '24px'],
      ['md', '32px'],
      ['lg', '48px'],
      ['xl', '80px'],
    ] as const;
    for (const [s, px] of sizes) {
      const html = renderToString(createElement(Avatar, { name: 'x', size: s }));
      expect(html).toContain(`width:${px}`);
      expect(html).toContain(`height:${px}`);
    }
  });

  it('AC: fallback 5 色輪 — 同 name 給同色', () => {
    const a = renderToString(createElement(Avatar, { name: '雅婷' }));
    const b = renderToString(createElement(Avatar, { name: '雅婷' }));
    // 抽 background color 比對
    const aBg = a.match(/background:([^;"]+)/)?.[1];
    const bBg = b.match(/background:([^;"]+)/)?.[1];
    expect(aBg).toBe(bBg);
  });

  it('AC: 空 name 顯示 ? fallback', () => {
    const html = renderToString(createElement(Avatar, { name: '' }));
    expect(html).toContain('?');
  });
});
