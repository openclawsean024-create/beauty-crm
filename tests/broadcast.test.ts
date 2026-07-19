import { describe, it, expect } from 'vitest';
import {
  renderTemplate,
  selectByConsent,
  selectOverdue,
  selectHighSpenders,
  selectByTier,
  buildBroadcast,
  recheckConsentBeforeSend,
  BUILTIN_TEMPLATES,
} from '@/lib/broadcast';
import { createCustomer } from '@/lib/customers';
import { recordTreatment } from '@/lib/treatments';

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

  it('AC: recheckConsentBeforeSend 客戶撤回同意 → 不送', () => {
    const c1 = mkC('1', { consent: 'granted' });
    const targets = buildBroadcast('recall_due', [c1], []);
    expect(targets).toHaveLength(1);
    const after = { ...c1, consent: 'revoked' as const };
    expect(recheckConsentBeforeSend(targets[0]!, [after])).toBe(false);
  });

  it('AC: BUILTIN_TEMPLATES 至少 4 種（recall/birthday/vip/inactive）', () => {
    expect(Object.keys(BUILTIN_TEMPLATES).sort()).toEqual([
      'birthday', 'inactive_90d', 'recall_due', 'vip_upgrade',
    ]);
  });
});