// 測試 Modal 元件

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import Modal from '@/components/ui/Modal';

const noop = () => {
  // intentionally empty
};

describe('Modal', () => {
  it('AC: open=false 不渲染 DOM', () => {
    const html = renderToString(
      createElement(Modal, { open: false, onClose: noop }, 'children'),
    );
    expect(html).toBe('');
  });

  it('AC: open=true 渲染 backdrop + dialog + role=dialog + aria-modal', () => {
    const html = renderToString(
      createElement(Modal, { open: true, onClose: noop, title: '編輯' }, 'body'),
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby=');
    expect(html).toContain('編輯');
    expect(html).toContain('body');
  });

  it('AC: 含 close 按鈕 + aria-label', () => {
    const html = renderToString(
      createElement(Modal, { open: true, onClose: noop, title: 't', closeAriaLabel: '關閉對話框' }),
    );
    expect(html).toContain('aria-label="關閉對話框"');
  });

  it('AC: footer 渲染於 dialog 內', () => {
    const html = renderToString(
      createElement(
        Modal,
        { open: true, onClose: noop, footer: createElement('button', null, '確認') },
      ),
    );
    expect(html).toContain('確認');
  });

  it('AC: maxWidth 套用 panel 寬度', () => {
    const html = renderToString(
      createElement(Modal, { open: true, onClose: noop, maxWidth: 720 }),
    );
    expect(html).toContain('720px');
  });
});
