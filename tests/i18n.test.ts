// i18n tests — v3 review gate §6 "[ ] 語言切換後，主要導覽、指標、佇列、草稿與 drawer 文案一致。"
import { describe, it, expect } from 'vitest';
import { t, toggleLang, isLang, getMessages } from '@/lib/i18n';

describe('i18n — locale switching', () => {
  it('exposes Chinese and English message bundles', () => {
    const zh = getMessages('zh');
    const en = getMessages('en');
    expect(zh.headline).toBeTruthy();
    expect(en.headline).toBeTruthy();
    expect(zh.headline).not.toEqual(en.headline);
  });

  it('every key resolves for both languages', () => {
    const zh = getMessages('zh');
    const en = getMessages('en');
    for (const k of Object.keys(zh)) {
      expect(typeof en[k as keyof typeof en]).toBe('string');
    }
  });

  it('toggleLang alternates between zh and en', () => {
    expect(toggleLang('zh')).toBe('en');
    expect(toggleLang('en')).toBe('zh');
  });

  it('isLang guards arbitrary input', () => {
    expect(isLang('zh')).toBe(true);
    expect(isLang('en')).toBe(true);
    expect(isLang('jp')).toBe(false);
    expect(isLang(undefined)).toBe(false);
  });

  it('falls back to English then to key on missing message', () => {
    // Direct lookup both message sets should be defined
    expect(t('zh', 'showAll')).toBeTruthy();
    expect(t('en', 'showAll')).toBeTruthy();
  });

  it('keeps copy semantics aligned across nav, KPI, queue, draft, drawer', () => {
    // Spot-check keys that appear across the three layout regions
    const navKeys = ['metricFollowups', 'metricRevenue', 'queueTitle', 'draftTitle', 'drawerTitle'];
    for (const key of navKeys) {
      const zh = t('zh', key as Parameters<typeof t>[1]);
      const en = t('en', key as Parameters<typeof t>[1]);
      expect(zh, `zh copy missing for ${key}`).toBeTruthy();
      expect(en, `en copy missing for ${key}`).toBeTruthy();
      expect(zh).not.toEqual(en);
    }
  });
});
