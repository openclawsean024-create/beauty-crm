// 測試 Input / Textarea / Select 元件

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import Input, { Textarea, Select } from '@/components/ui/Input';

describe('Input', () => {
  it('AC: 渲染 label + input + 綁定 htmlFor/id', () => {
    const html = renderToString(
      createElement(Input, { id: 'name', label: '姓名', value: '', onChange: () => {} }),
    );
    expect(html).toContain('for="name"');
    expect(html).toContain('id="name"');
    expect(html).toContain('姓名');
  });

  it('AC: required 顯示 * + aria-required', () => {
    const html = renderToString(
      createElement(Input, { id: 'x', label: '必填', required: true, value: '', onChange: () => {} }),
    );
    expect(html).toContain('*');
    expect(html).toContain('aria-required="true"');
  });

  it('AC: error 顯示錯誤訊息 + aria-invalid=true', () => {
    const html = renderToString(
      createElement(Input, { id: 'x', error: '密碼至少 8 個字元', value: '', onChange: () => {} }),
    );
    expect(html).toContain('密碼至少 8 個字元');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('role="alert"');
  });

  it('AC: hint 顯示輔助說明', () => {
    const html = renderToString(
      createElement(Input, { id: 'x', hint: '至少 8 個字元', value: '', onChange: () => {} }),
    );
    expect(html).toContain('至少 8 個字元');
  });

  it('AC: 預設 type=text', () => {
    const html = renderToString(
      createElement(Input, { id: 'x', value: '', onChange: () => {} }),
    );
    expect(html).toContain('type="text"');
  });
});

describe('Textarea', () => {
  it('AC: 渲染 label + textarea', () => {
    const html = renderToString(
      createElement(Textarea, { id: 'notes', label: '備註', value: 'x', onChange: () => {} }),
    );
    expect(html).toContain('for="notes"');
    expect(html).toContain('id="notes"');
    expect(html).toContain('備註');
    expect(html).toContain('<textarea');
  });

  it('AC: rows 預設 3', () => {
    const html = renderToString(
      createElement(Textarea, { id: 'x', value: '', onChange: () => {} }),
    );
    expect(html).toContain('rows="3"');
  });
});

describe('Select', () => {
  const OPTIONS = [
    { value: 'a', label: 'A 方案' },
    { value: 'b', label: 'B 方案' },
  ];

  it('AC: 渲染 select + 所有 options', () => {
    const html = renderToString(
      createElement(Select, {
        id: 'plan',
        label: '方案',
        options: OPTIONS,
        value: 'a',
        onChange: () => {},
      }),
    );
    expect(html).toContain('for="plan"');
    expect(html).toContain('<option');
    expect(html).toContain('A 方案');
    expect(html).toContain('B 方案');
  });

  it('AC: placeholder 渲染為 disabled option', () => {
    const html = renderToString(
      createElement(Select, {
        id: 'plan',
        options: OPTIONS,
        value: '',
        onChange: () => {},
        placeholder: '請選擇',
      }),
    );
    expect(html).toContain('請選擇');
    expect(html).toContain('disabled');
  });

  it('AC: required 標記 + aria-required', () => {
    const html = renderToString(
      createElement(Select, {
        id: 'plan',
        options: OPTIONS,
        value: 'a',
        onChange: () => {},
        required: true,
      }),
    );
    expect(html).toContain('aria-required="true"');
  });
});
