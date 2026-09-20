// Beauty CRM — followups (草稿/核准 + recall template) 單元測試
// 對應 SPEC §3.4 AC-002 (recall 可手動覆寫) 與 PRD/UI-SPEC §3.3 (草稿未核准不出現送出)。

import { describe, it, expect } from 'vitest';
import {
  approveDraft,
  canActOnDraft,
  draftGateReason,
  recallDaysFor,
  RECALL_TEMPLATES,
  resetDraft,
  suggestNextRecallDate,
  type FollowupDraft,
} from '@/lib/followups';

const baseDraft = (overrides: Partial<FollowupDraft> = {}): FollowupDraft => ({
  customerId: 'c1',
  status: 'draft',
  body: '嗨,雅婷!...',
  updatedAt: '2026-09-21T00:00:00Z',
  ...overrides,
});

describe('followups — consent gate', () => {
  it('AC: 只有 granted 可以核准 / 送出草稿', () => {
    expect(canActOnDraft('granted')).toBe(true);
    expect(canActOnDraft('pending')).toBe(false);
    expect(canActOnDraft('revoked')).toBe(false);
  });

  it('AC: gate reason 文案對齊 UI (pending / revoked)', () => {
    expect(draftGateReason('granted')).toBeUndefined();
    expect(draftGateReason('pending')).toBe('需先取得同意');
    expect(draftGateReason('revoked')).toBe('客戶已撤回行銷同意');
  });
});

describe('followups — approve / reset', () => {
  it('AC: 草稿 → 核准,updatedAt 變更', async () => {
    const draft = baseDraft();
    const next = approveDraft(draft);
    expect(next.status).toBe('approved');
    expect(next.updatedAt).not.toBe(draft.updatedAt);
  });

  it('AC: 已核准不能再核准(冪等)', () => {
    const draft = baseDraft({ status: 'approved' });
    const next = approveDraft(draft);
    expect(next).toBe(draft);
  });

  it('AC: resetDraft 把 approved 拉回 draft', () => {
    const draft = baseDraft({ status: 'approved' });
    const next = resetDraft(draft);
    expect(next.status).toBe('draft');
  });
});

describe('followups — recall template', () => {
  it('AC: 4 種類別的預設週期日對齊 treatments.suggestRecallDays', () => {
    expect(recallDaysFor('manicure')).toBe(28);
    expect(recallDaysFor('eyelash')).toBe(21);
    expect(recallDaysFor('skincare')).toBe(30);
    expect(recallDaysFor('hair')).toBe(45);
  });

  it('AC: RECALL_TEMPLATES 包含 4 種類別 + label + defaultDays', () => {
    expect(RECALL_TEMPLATES).toHaveLength(4);
    for (const t of RECALL_TEMPLATES) {
      expect(t.label).toBeTruthy();
      expect(t.defaultDays).toBeGreaterThan(0);
    }
  });

  it('AC: suggestNextRecallDate 用 today + days 算出本地 YYYY-MM-DD', () => {
    const today = new Date(2026, 8, 21); // 2026-09-21
    expect(suggestNextRecallDate(today, 28)).toBe('2026-10-19');
    expect(suggestNextRecallDate(today, 21)).toBe('2026-10-12');
  });

  it('AC: 跨月份不會 off-by-one', () => {
    // 2026-08-31 + 30 天 = 2026-09-30,不是 10-01
    const today = new Date(2026, 7, 31);
    expect(suggestNextRecallDate(today, 30)).toBe('2026-09-30');
  });
});
