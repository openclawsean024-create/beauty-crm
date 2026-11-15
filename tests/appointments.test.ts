// AC-001：預約紀錄與下次預約 — 併自 concierge Appointment 模型（FR-017、FR-008）
import { describe, it, expect } from 'vitest';
import {
  appointmentsByCustomer,
  bookedCustomerIds,
  cancelAppointment,
  completeAppointment,
  createAppointment,
  hasUpcomingAppointment,
  listStaleAppointments,
  nextAppointment,
} from '@/lib/appointments';

const TODAY = '2026-11-16';

function appt(id: string, customerId: string, date: string, time = '14:00', status?: 'upcoming' | 'completed' | 'cancelled') {
  return createAppointment({
    id,
    customerId,
    storeId: 's1',
    designerId: 'acc-designer-1',
    date,
    time,
    status,
    createdAt: '2026-11-01T02:00:00.000Z',
  });
}

describe('AC-001 appointments — 預約與下次預約', () => {
  it('AC-001: 預約紀錄含日期、時間、狀態、店別、設計師', () => {
    const a = appt('a1', 'c1', '2026-11-20', '10:30');
    expect(a).toMatchObject({
      date: '2026-11-20',
      time: '10:30',
      status: 'upcoming',
      storeId: 's1',
      designerId: 'acc-designer-1',
    });
  });

  it('AC-001: 日期與時間格式驗證', () => {
    expect(() => appt('a1', 'c1', '2026-13-01')).toThrow();
    expect(() => appt('a1', 'c1', '2026-02-30')).toThrow();
    expect(() => appt('a1', 'c1', '2026-11-20', '25:00')).toThrow();
    expect(() => appt('a1', 'c1', '2026-11-20', '9:00')).toThrow();
    expect(() => appt('', 'c1', '2026-11-20')).toThrow();
    expect(() =>
      createAppointment({ id: 'a1', customerId: 'c1', storeId: '', designerId: 'd', date: '2026-11-20', time: '10:00' }),
    ).toThrow();
  });

  it('AC-001: 下次預約取最早的 upcoming，忽略已完成、已取消與過去日期', () => {
    const list = [
      appt('a1', 'c1', '2026-12-05'),
      appt('a2', 'c1', '2026-11-20', '16:00'),
      appt('a3', 'c1', '2026-11-20', '09:00'),
      appt('a4', 'c1', '2026-11-18', '10:00', 'cancelled'),
      appt('a5', 'c1', '2026-11-10', '10:00', 'completed'),
      appt('a6', 'c1', '2026-11-15', '10:00'),
      appt('a7', 'c2', '2026-11-17'),
    ];
    expect(nextAppointment(list, 'c1', TODAY)?.id).toBe('a3');
    expect(nextAppointment(list, 'c2', TODAY)?.id).toBe('a7');
    expect(nextAppointment(list, 'c3', TODAY)).toBeUndefined();
    expect(hasUpcomingAppointment(list, 'c1', TODAY)).toBe(true);
    expect(hasUpcomingAppointment(list, 'c3', TODAY)).toBe(false);
  });

  it('AC-001: 今天的預約仍算下次預約', () => {
    expect(nextAppointment([appt('a1', 'c1', TODAY, '18:00')], 'c1', TODAY)?.id).toBe('a1');
  });

  it('AC-001: 已預約客戶清單（餵給回流漏斗）', () => {
    const list = [
      appt('a1', 'c1', '2026-11-20'),
      appt('a2', 'c2', '2026-11-18', '10:00', 'cancelled'),
      appt('a3', 'c3', '2026-11-01'),
      appt('a4', 'c4', '2026-11-30'),
    ];
    expect([...bookedCustomerIds(list, TODAY)].sort()).toEqual(['c1', 'c4']);
  });

  it('AC-001: 取消與完成只能從 upcoming 轉換', () => {
    const a = appt('a1', 'c1', '2026-11-20');
    expect(cancelAppointment(a).status).toBe('cancelled');
    expect(completeAppointment(a).status).toBe('completed');
    expect(() => cancelAppointment(completeAppointment(a))).toThrow();
    expect(() => completeAppointment(cancelAppointment(a))).toThrow();
  });

  it('AC-001: 客戶預約依時間新到舊排序；過期未處理的 upcoming 會被列出', () => {
    const list = [appt('a1', 'c1', '2026-11-01'), appt('a2', 'c1', '2026-12-01'), appt('a3', 'c1', '2026-11-20')];
    expect(appointmentsByCustomer(list, 'c1').map((a) => a.id)).toEqual(['a2', 'a3', 'a1']);
    expect(listStaleAppointments(list, TODAY).map((a) => a.id)).toEqual(['a1']);
  });
});
