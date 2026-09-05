// 測試 Icon 元件（14 個 inline SVG from Lucide MIT）

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import Icon, { ICONS, type IconName } from '@/components/ui/Icon';

const ALL_ICONS: IconName[] = [
  'LayoutDashboard',
  'Users',
  'BellRing',
  'TrendingUp',
  'Send',
  'Filter',
  'Settings',
  'Home',
  'Bell',
  'ShieldCheck',
  'MessageSquare',
  'Plus',
  'Check',
  'X',
];

describe('Icon', () => {
  it('AC: 預設 size=20、strokeWidth=1.75、viewBox=24×24、stroke=currentColor、fill=none', () => {
    const html = renderToString(createElement(Icon, { name: 'Plus' }));
    expect(html).toContain('width="20"');
    expect(html).toContain('height="20"');
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toContain('stroke="currentColor"');
    expect(html).toContain('fill="none"');
    expect(html).toContain('stroke-width="1.75"');
    expect(html).toContain('stroke-linecap="round"');
    expect(html).toContain('stroke-linejoin="round"');
  });

  it('AC: 自訂 size + strokeWidth', () => {
    const html = renderToString(
      createElement(Icon, { name: 'Check', size: 32, strokeWidth: 2 }),
    );
    expect(html).toContain('width="32"');
    expect(html).toContain('height="32"');
    expect(html).toContain('stroke-width="2"');
  });

  it('AC: 14 個 icon 都存在於 ICONS map', () => {
    expect(Object.keys(ICONS)).toHaveLength(14);
    for (const name of ALL_ICONS) {
      expect(ICONS[name]).toBeTruthy();
      expect(typeof ICONS[name]).toBe('string');
    }
  });

  it('AC: 14 個 icon 都能 render 成功', () => {
    for (const name of ALL_ICONS) {
      const html = renderToString(createElement(Icon, { name }));
      expect(html).toContain(`data-icon="${name}"`);
      expect(html).toContain('<svg');
    }
  });

  it('AC: aria-hidden=true（純裝飾）', () => {
    const html = renderToString(createElement(Icon, { name: 'Users' }));
    expect(html).toContain('aria-hidden="true"');
  });
});
