import { describe, it, expect } from 'vitest';
import {
  renderTemplate,
  selectByConsent,
  selectOverdue,
  selectHighSpenders,
  selectByTier,
  buildBroadcast,
  recheckConsentBeforeSend,
  approve,
  markSent,
  BUILTIN_TEMPLATES,
} from '@/lib/broadcast';
import { createCustomer } from '@/lib/customers';
import { recordTreatment } from '@/lib/treatments';
import { listOverdue } from '@/lib/reminders';

const today = new Date('2026-07-19T00:00:00Z');

function mkC(id: string, opts: Partial<Parameters<typeof createCustomer>[0]> = {}) {
  return createCustomer({ id, name: `客戶${id}`, phone: '0912345678', ...opts });
}

describe('broadcast — 行銷推播', () => {
  it('AC: renderTemplate 替換 {{name}} {{firstName}} {{lastService}} {{lastVisit}}', () => {
    const c = mkC('c1');
    const t = recordTreatment({
      id: 't1', customerId: 'c1', category: 'manicure', serviceName: '凝膠美甲',
      price: 1200, durationMin: 60, performedAt: '2026-06-20T10:00:00Z',
    });
    const out = renderTemplate('{{name}} 你好，上次做 {{lastService}} {{lastVisit}}', c, [t]);
    expect(out).toBe('客戶c1 你好，上次做 凝膠美甲 2026-06-20');
  });

  it('AC: selectByConsent 只留 granted', () => {
    const list = [
      mkC('1', { consent: 'granted' }),
      mkC('2', { consent: 'pending' }),
      mkC('3', { consent: 'revoked' }),
    ];
    const reach = selectByConsent(list);
    expect(reach).toHaveLength(1);
    expect(reach[0]!.id).toBe('1');
  });

  it('AC: selectOverdue 找過期回訪客戶', () => {
    const c1 = mkC('1');
    const c2 = mkC('2');
    const treatments = [
      recordTreatment({ id: 'a', customerId: '1', category: 'manicure', serviceName: 'A', price: 1, durationMin: 60, performedAt: '2026-05-20T10:00:00Z' }),
      recordTreatment({ id: 'b', customerId: '2', category: 'hair', serviceName: 'B', price: 1, durationMin: 60, performedAt: '2026-07-15T10:00:00Z' }),
    ];
    const overdue = selectOverdue([c1, c2], treatments, today);
    expect(overdue).toHaveLength(1);
    expect(overdue[0]!.id).toBe('1');
  });

  it('AC: selectHighSpenders 累計消費 ≥ 門檻', () => {
    const c1 = mkC('1');
    const c2 = mkC('2');
    const c3 = mkC('3');
    const treatments = [
      recordTreatment({ id: 'a', customerId: '1', category: 'manicure', serviceName: 'A', price: 5000, durationMin: 60, performedAt: '2026-01-01T10:00:00Z' }),
      recordTreatment({ id: 'b', customerId: '1', category: 'manicure', serviceName: 'B', price: 5000, durationMin: 60, performedAt: '2026-02-01T10:00:00Z' }),
      recordTreatment({ id: 'c', customerId: '1', category: 'manicure', serviceName: 'C', price: 10000, durationMin: 60, performedAt: '2026-03-01T10:00:00Z' }),
      recordTreatment({ id: 'd', customerId: '2', category: 'manicure', serviceName: 'D', price: 500, durationMin: 60, performedAt: '2026-03-01T10:00:00Z' }),
      recordTreatment({ id: 'e', customerId: '3', category: 'manicure', serviceName: 'E', price: 25000, durationMin: 60, performedAt: '2026-04-01T10:00:00Z' }),
    ];
    const vips = selectHighSpenders([c1, c2, c3], treatments, 10000);
    expect(vips.map((c) => c.id).sort()).toEqual(['1', '3']);
  });

  it('AC: selectByTier 篩選特定 tier', () => {
    const c1 = mkC('1'); // 1000 → standard
    const c2 = mkC('2'); // 25000 → gold
    const c3 = mkC('3'); // 70000 → black
    const treatments = [
      recordTreatment({ id: 'a', customerId: '1', category: 'manicure', serviceName: 'A', price: 1000, durationMin: 60, performedAt: '2026-01-01T10:00:00Z' }),
      recordTreatment({ id: 'b', customerId: '2', category: 'manicure', serviceName: 'B', price: 25000, durationMin: 60, performedAt: '2026-01-01T10:00:00Z' }),
      recordTreatment({ id: 'c', customerId: '3', category: 'manicure', serviceName: 'C', price: 70000, durationMin: 60, performedAt: '2026-01-01T10:00:00Z' }),
    ];
    expect(selectByTier([c1, c2, c3], treatments, 'gold')).toHaveLength(1);
    expect(selectByTier([c1, c2, c3], treatments, 'black')).toHaveLength(1);
  });

  it('AC: buildBroadcast 排除未同意客戶 + 套用模板', () => {
    const c1 = mkC('1', { consent: 'granted' });
    const c2 = mkC('2', { consent: 'revoked' });
    const treatments = [
      recordTreatment({ id: 'a', customerId: '1', category: 'manicure', serviceName: '凝膠', price: 1200, durationMin: 60, performedAt: '2026-06-20T10:00:00Z' }),
    ];
    const targets = buildBroadcast('recall_due', [c1, c2], treatments);
    expect(targets).toHaveLength(1);
    expect(targets[0]!.customer.id).toBe('1');
    expect(targets[0]!.preview).toContain('客戶1');
    expect(targets[0]!.preview).toContain('凝膠');
  });

  it('AC-008: recheckConsentBeforeSend 客戶撤回同意 → throw 阻擋', () => {
    const c1 = mkC('1', { consent: 'granted' });
    const targets = buildBroadcast('recall_due', [c1], []);
    expect(targets).toHaveLength(1);
    const after = { ...c1, consent: 'revoked' as const };
    // 行為改為 throw（見 broadcast.ts recheckConsentBeforeSend 註解）
    expect(() => recheckConsentBeforeSend(targets[0]!, [after])).toThrow(/consent/);
    // granted → 不 throw
    expect(() => recheckConsentBeforeSend(targets[0]!, [c1])).not.toThrow();
  });

  it('AC: BUILTIN_TEMPLATES 至少 4 種（recall/birthday/vip/inactive）', () => {
    expect(Object.keys(BUILTIN_TEMPLATES).sort()).toEqual([
      'birthday', 'inactive_90d', 'recall_due', 'vip_upgrade',
    ]);
  });

  it('AC: selectOverdue 與 listOverdue 對同一組資料回傳相同客戶集合 (DRY 重構後)', () => {
    // 這個測試守護 M1 重構：selectOverdue 不再硬編碼 recall days，
    // 必須跟 reminders.listOverdue (用 suggestRecallDays) 一致
    const c1 = mkC('1'); // manicure 5/20 + 28 = 6/17 → 過期 -32 days
    const c2 = mkC('2'); // eyelash 5/30 + 21 = 6/20 → 過期 -29 days
    const c3 = mkC('3'); // hair 7/15 + 45 = 8/29 → upcoming +41 days
    const treatments = [
      recordTreatment({ id: 'a', customerId: '1', category: 'manicure', serviceName: 'A', price: 1, durationMin: 60, performedAt: '2026-05-20T10:00:00Z' }),
      recordTreatment({ id: 'b', customerId: '2', category: 'eyelash', serviceName: 'B', price: 1, durationMin: 60, performedAt: '2026-05-30T10:00:00Z' }),
      recordTreatment({ id: 'c', customerId: '3', category: 'hair', serviceName: 'C', price: 1, durationMin: 60, performedAt: '2026-07-15T10:00:00Z' }),
    ];
    const fromBroadcast = selectOverdue([c1, c2, c3], treatments, today).map((c) => c.id).sort();
    const fromReminders = listOverdue([c1, c2, c3], treatments, today).map((r) => r.customerId).sort();
    expect(fromBroadcast).toEqual(fromReminders);
    expect(fromBroadcast).toEqual(['1', '2']);
  });
});

describe('broadcast — FR-005 / AC-007 草稿核准狀態機', () => {
  function mkDraft(consent: 'granted' | 'revoked' = 'granted') {
    const c = mkC('c1', { consent });
    return { c, targets: buildBroadcast('recall_due', [c], []) };
  }

  it('AC-007: buildBroadcast 預設 status=draft', () => {
    const { targets } = mkDraft();
    expect(targets[0]!.status).toBe('draft');
    expect(targets[0]!.approvedBy).toBeUndefined();
    expect(targets[0]!.approvedAt).toBeUndefined();
  });

  it('AC-007: approve 後 status=approved、approvedBy/At 有值', () => {
    const { targets } = mkDraft();
    const a = approve(targets[0]!, 'designer-A');
    expect(a.status).toBe('approved');
    expect(a.approvedBy).toBe('designer-A');
    expect(a.approvedAt).toBeDefined();
    expect(a.approvedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('AC-007: approve immutability — 原 target 不變', () => {
    const { targets } = mkDraft();
    const original = targets[0]!;
    const a = approve(original, 'designer-A');
    // 原物件未變
    expect(original.status).toBe('draft');
    expect(original.approvedBy).toBeUndefined();
    expect(original.approvedAt).toBeUndefined();
    // 新物件獨立
    expect(a).not.toBe(original);
    expect(a.preview).toBe(original.preview);
  });

  it('AC-007: approve non-draft → throw（不可重複核准）', () => {
    const { targets } = mkDraft();
    const a = approve(targets[0]!, 'designer-A');
    expect(() => approve(a, 'designer-B')).toThrow(/cannot approve/);
    // sent / cancelled 也不可
    const sent = markSent(a);
    expect(() => approve(sent, 'designer-B')).toThrow(/cannot approve/);
  });

  it('AC-007: approve 缺 designerId → throw', () => {
    const { targets } = mkDraft();
    expect(() => approve(targets[0]!, '')).toThrow(/designerId/);
  });

  it('AC-007: markSent requires approved — draft 直接 send → throw', () => {
    const { targets } = mkDraft();
    expect(() => markSent(targets[0]!)).toThrow(/must be in "approved"/);
  });

  it('AC-007: markSent approved → status=sent + sentAt', () => {
    const { targets } = mkDraft();
    const a = approve(targets[0]!, 'designer-A');
    const s = markSent(a, '2026-07-20T10:00:00Z');
    expect(s.status).toBe('sent');
    expect(s.sentAt).toBe('2026-07-20T10:00:00Z');
    // approved 紀錄仍保留
    expect(s.approvedBy).toBe('designer-A');
    expect(s.approvedAt).toBe(a.approvedAt);
    // 不可變
    expect(a.status).toBe('approved');
    expect(a.sentAt).toBeUndefined();
  });

  it('AC-007: approved 草稿被 revoke consent → recheckConsentBeforeSend 必須 throw', () => {
    const { c, targets } = mkDraft('granted');
    const a = approve(targets[0]!, 'designer-A');
    // 客戶撤回同意
    const revoked = { ...c, consent: 'revoked' as const };
    expect(() => recheckConsentBeforeSend(a, [revoked])).toThrow(/consent/);
    // 即使 approved，沒有當下 granted 同意就 throw
  });

  it('AC-007: approved 草稿 + consent 仍 granted → recheckConsentBeforeSend 不 throw', () => {
    const { c, targets } = mkDraft('granted');
    const a = approve(targets[0]!, 'designer-A');
    expect(() => recheckConsentBeforeSend(a, [c])).not.toThrow();
  });
});