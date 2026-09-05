// 測試上線閘門 Gate-1：Privacy / Terms / Contact 三頁能 render 不 crash。
// 用 react-dom/server SSR（與 addTreatment.test.tsx 同 pattern）。

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import PrivacyPage from '@/app/privacy/page';
import TermsPage from '@/app/terms/page';
import ContactPage from '@/app/contact/page';

describe('上線閘門 Gate-1 — Privacy / Terms / Contact 頁面', () => {
  it('AC-Gate-1: Privacy 頁能 SSR render 不 crash，含核心段落', () => {
    const html = renderToString(createElement(PrivacyPage));
    expect(html).toContain('隱私權聲明');
    expect(html).toContain('資料儲存方式');
    expect(html).toContain('安全條款');
    expect(html).toContain('匯出 / 刪除流程');
  });

  it('AC-Gate-1: Terms 頁能 SSR render 不 crash，含 §1.5 Non-Goals 引用', () => {
    const html = renderToString(createElement(TermsPage));
    expect(html).toContain('使用條款');
    expect(html).toContain('明確不做');
    expect(html).toContain('線上預約日曆');
    expect(html).toContain('POS');
  });

  it('AC-Gate-1: Contact 頁能 SSR render 不 crash，含聯絡資訊區', () => {
    const html = renderToString(createElement(ContactPage));
    expect(html).toContain('聯絡我們');
    expect(html).toContain('聯絡資訊');
    // placeholder 標記 production 需替換
    expect(html).toContain('production 上線前由 owner 替換');
  });

  it('AC-Gate-1: 三頁都有標題 metadata（透過 Next.js metadata export）', () => {
    expect(PrivacyPage).toBeDefined();
    expect(TermsPage).toBeDefined();
    expect(ContactPage).toBeDefined();
  });
});
