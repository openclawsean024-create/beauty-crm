// 測試 FR-008 回流漏斗：markContacted / markBooked / getFunnelStage
// 純函數測試，不依賴 React / happy-dom。

import { describe, it, expect } from 'vitest';
import {
  markContacted,
  markBooked,
  getFunnelStage,
  contactLogsFor,
  apptLogsFor,
  type ContactLog,
  type AppointmentLog,
} from '@/lib/funnel';
import type { Reminder } from '@/lib/reminders';

const baseReminder: Reminder = {
  customerId: 'c1',
  lastTreatmentId: 't1',
  lastCategory: 'manicure',
  lastPerformedAt: '2026-07-01T10:00:00Z',
  suggestedRecallAt: '2026-07-29',
  daysUntilRecall: -3,
  status: 'overdue',
};

const baseContactEntry = {
  customerId: 'c1',
  contactedAt: '2026-08-01T10:00:00Z',
  channel: 'phone' as const,
  outcome: 'connected' as const,
  designerId: 'designer-amy',
};

// markBooked 需要 scheduledFor > now；用「未來一年」確保測試穩定
const futureIso = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
})();

describe('funnel — markContacted（FR-008）', () => {
  it('AC: append 新聯絡紀錄到空 logs，回傳新陣列', () => {
    const next = markContacted([], baseContactEntry);
    expect(next).toHaveLength(1);
    expect(next[0]!.customerId).toBe('c1');
    expect(next[0]!.channel).toBe('phone');
    expect(next[0]!.outcome).toBe('connected');
  });

  it('AC: 不可變 — 輸入 logs 陣列不被 mutate', () => {
    const logs: ContactLog[] = [];
    const next = markContacted(logs, baseContactEntry);
    expect(logs).toHaveLength(0); // 原陣列仍空
    expect(next).not.toBe(logs); // 新陣列
  });

  it('AC: 必填欄位缺失 throw', () => {
    expect(() => markContacted([], { ...baseContactEntry, customerId: '' })).toThrow(/customerId/);
    expect(() => markContacted([], { ...baseContactEntry, designerId: '' })).toThrow(/designerId/);
    expect(() => markContacted([], { ...baseContactEntry, channel: undefined as unknown as 'phone' })).toThrow(/channel/);
    expect(() => markContacted([], { ...baseContactEntry, outcome: undefined as unknown as 'connected' })).toThrow(/outcome/);
  });

  it('AC: 同 customerId + 同 ISO 秒級 timestamp → 去重 no-op', () => {
    const first = markContacted([], baseContactEntry);
    const second = markContacted(first, baseContactEntry);
    expect(second).toHaveLength(1);
  });

  it('AC: 同 customerId + 不同 timestamp → 累積 append', () => {
    const first = markContacted([], baseContactEntry);
    const second = markContacted(first, {
      ...baseContactEntry,
      contactedAt: '2026-08-05T14:30:00Z',
    });
    expect(second).toHaveLength(2);
  });
});

describe('funnel — markBooked（FR-008）', () => {
  const baseApptEntry = {
    customerId: 'c1',
    bookedAt: '2026-08-01T10:00:00Z',
    scheduledFor: futureIso,
    designerId: 'designer-amy',
  };

  it('AC: append 新預約到空 logs', () => {
    const next = markBooked([], baseApptEntry);
    expect(next).toHaveLength(1);
    expect(next[0]!.customerId).toBe('c1');
  });

  it('AC: 不可變 — 輸入 logs 陣列不被 mutate', () => {
    const logs: AppointmentLog[] = [];
    const next = markBooked(logs, baseApptEntry);
    expect(logs).toHaveLength(0);
    expect(next).not.toBe(logs);
  });

  it('AC: 必填欄位缺失 throw', () => {
    expect(() => markBooked([], { ...baseApptEntry, customerId: '' })).toThrow(/customerId/);
    expect(() => markBooked([], { ...baseApptEntry, designerId: '' })).toThrow(/designerId/);
    expect(() => markBooked([], { ...baseApptEntry, scheduledFor: '' })).toThrow(/scheduledFor/);
  });

  it('AC: scheduledFor 無效日期 throw', () => {
    expect(() =>
      markBooked([], { ...baseApptEntry, scheduledFor: 'not-a-date' }),
    ).toThrow(/not a valid date/);
  });

  it('AC: scheduledFor 是過去時間 throw（避免被誤登記為未來預約）', () => {
    expect(() =>
      markBooked([], { ...baseApptEntry, scheduledFor: '2020-01-01T10:00:00Z' }),
    ).toThrow(/must be in the future/);
  });

  it('AC: 同 customerId + 同 scheduledFor → 去重 no-op', () => {
    const first = markBooked([], baseApptEntry);
    const second = markBooked(first, baseApptEntry);
    expect(second).toHaveLength(1);
  });
});

describe('funnel — getFunnelStage（FR-008 優先序）', () => {
  it('AC: 無 contact + 無 appt → due', () => {
    const stage = getFunnelStage(baseReminder, [], []);
    expect(stage).toBe('due');
  });

  it('AC: 有 contact 但無 appt → contacted', () => {
    const contactLogs = markContacted([], baseContactEntry);
    const stage = getFunnelStage(baseReminder, contactLogs, []);
    expect(stage).toBe('contacted');
  });

  it('AC: 有 appt（未來 scheduledFor）→ booked（優先序最高）', () => {
    const apptLogs = markBooked([], {
      customerId: 'c1',
      scheduledFor: futureIso,
      designerId: 'designer-amy',
    });
    const stage = getFunnelStage(baseReminder, [], apptLogs);
    expect(stage).toBe('booked');
  });

  it('AC: 同時有 contact + appt → booked（apptLogs 優先序高於 contactLogs）', () => {
    const contactLogs = markContacted([], baseContactEntry);
    const apptLogs = markBooked([], {
      customerId: 'c1',
      scheduledFor: futureIso,
      designerId: 'designer-amy',
    });
    const stage = getFunnelStage(baseReminder, contactLogs, apptLogs);
    expect(stage).toBe('booked');
  });

  it('AC: apptLogs 含已過 scheduledFor → 不算 booked', () => {
    // 過去時間的 appt log：直接構造（不透過 markBooked 因其會 throw）
    const pastAppt: AppointmentLog = {
      customerId: 'c1',
      bookedAt: '2025-01-01T10:00:00Z',
      scheduledFor: '2025-02-01T10:00:00Z', // 過去
      designerId: 'designer-amy',
    };
    const contactLogs = markContacted([], baseContactEntry);
    const stage = getFunnelStage(baseReminder, contactLogs, [pastAppt]);
    // 過去 appt 已被客戶拜訪完，剩下 contact 紀錄 → contacted
    expect(stage).toBe('contacted');
  });
});

describe('funnel — E2E 流程：due → contacted → booked（FR-008 完整鏈）', () => {
  it('AC: 同一客戶從 due 進到 contacted 再進到 booked', () => {
    // 初始：無接觸
    let contactLogs: ContactLog[] = [];
    let apptLogs: AppointmentLog[] = [];
    expect(getFunnelStage(baseReminder, contactLogs, apptLogs)).toBe('due');

    // 設計師打電話標記已聯絡
    contactLogs = markContacted(contactLogs, {
      ...baseContactEntry,
      outcome: 'no-answer',
    });
    expect(getFunnelStage(baseReminder, contactLogs, apptLogs)).toBe('contacted');

    // 客戶回電，設計師登記預約
    apptLogs = markBooked(apptLogs, {
      customerId: 'c1',
      scheduledFor: futureIso,
      designerId: 'designer-amy',
    });
    expect(getFunnelStage(baseReminder, contactLogs, apptLogs)).toBe('booked');
  });
});

describe('funnel — helper 函數', () => {
  it('AC: contactLogsFor 篩出指定客戶的聯絡紀錄', () => {
    const logs: ContactLog[] = [
      { ...baseContactEntry, customerId: 'c1' },
      { ...baseContactEntry, customerId: 'c2', contactedAt: '2026-08-02T10:00:00Z' },
      { ...baseContactEntry, customerId: 'c1', contactedAt: '2026-08-03T10:00:00Z' },
    ];
    expect(contactLogsFor(logs, 'c1')).toHaveLength(2);
    expect(contactLogsFor(logs, 'c2')).toHaveLength(1);
    expect(contactLogsFor(logs, 'unknown')).toHaveLength(0);
  });

  it('AC: apptLogsFor 篩出指定客戶的預約紀錄', () => {
    const logs: AppointmentLog[] = [
      { customerId: 'c1', bookedAt: '2026-08-01', scheduledFor: futureIso, designerId: 'd' },
      { customerId: 'c2', bookedAt: '2026-08-01', scheduledFor: futureIso, designerId: 'd' },
    ];
    expect(apptLogsFor(logs, 'c1')).toHaveLength(1);
    expect(apptLogsFor(logs, 'c2')).toHaveLength(1);
  });
});
