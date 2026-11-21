// AC-003：新增客戶與服務真正寫入、即時更新回訪清單；KPI 由資料計算；重新整理後保留。
import { describe, it, expect } from 'vitest';
import {
  CrmError,
  addAppointment,
  addCustomer,
  addVisit,
  approveCustomerDraft,
  findAllergyConflicts,
  getDraft,
  markContacted,
  saveDraft,
  sendReminder,
  updateCustomerProfile,
} from '@/lib/crm-store';
import { createDryRunLineAdapter } from '@/lib/line-reminder';
import { computeKpis, normalizeCounts, weeklyRecallCounts } from '@/lib/kpi';
import { CRM_SENSITIVE_KEY, loadCrmState, readCrmState, saveCrmState } from '@/lib/local-store';
import { buildRecallQueue, computeFunnel } from '@/lib/recall-queue';
import { buildRecallDraftBody } from '@/lib/followups';
import { FIXED_TODAY, MemoryStorage, ctxFor, seedState } from './helpers/crm-fixture';

function queueFor(state: ReturnType<typeof seedState>, storeId = 'store-1') {
  return buildRecallQueue({
    customers: state.customers.filter((c) => c.storeId === storeId),
    treatments: state.treatments,
    appointments: state.appointments,
    contactLog: state.contactLog,
    recallSettings: state.recallSettings,
    today: FIXED_TODAY,
  });
}

describe('AC-003 customer-store — 客戶與服務寫入', () => {
  it('AC-003: 示範資料的回訪清單依逾期天數排序', () => {
    const rows = queueFor(seedState());
    expect(rows.map((r) => [r.customer.id, r.daysUntilRecall])).toEqual([
      ['cust-e', -12],
      ['cust-a', -7],
      ['cust-b', -3],
      ['cust-c', 5],
      ['cust-d', 10],
    ]);
    expect(rows.find((r) => r.customer.id === 'cust-a')?.isVip).toBe(true);
    expect(rows.find((r) => r.customer.id === 'cust-d')?.isVip).toBe(false);
  });

  it('AC-003: 新增客戶會寫入 state，欄位驗證沿用 createCustomer', () => {
    const state = seedState();
    const ctx = ctxFor(state, 'acc-designer-b');
    const next = addCustomer(
      state,
      { id: 'cust-new', name: '示範客戶 新', phone: '0900000020', storeId: 'store-1', ownerDesignerId: 'acc-designer-b', consent: 'granted' },
      ctx,
    );
    expect(next.customers).toHaveLength(state.customers.length + 1);
    const created = next.customers.find((c) => c.id === 'cust-new');
    expect(created).toMatchObject({ name: '示範客戶 新', storeId: 'store-1', consent: 'granted', sensitiveDataConsent: 'pending' });
    expect(created?.createdAt).toBe(FIXED_TODAY.toISOString());
    expect(state.customers.some((c) => c.id === 'cust-new')).toBe(false); // 原 state 不被改動

    expect(() => addCustomer(next, { id: 'cust-new', name: '示範客戶 重複', phone: '0900000021', storeId: 'store-1' }, ctx)).toThrow(CrmError);
    expect(() => addCustomer(state, { id: 'x1', name: '示範', phone: '12345', storeId: 'store-1' }, ctx)).toThrow();
    expect(() => addCustomer(state, { id: 'x2', name: '', phone: '0900000022', storeId: 'store-1' }, ctx)).toThrow();
    expect(() => addCustomer(state, { id: 'x3', name: '示範', phone: '0900000023', storeId: 'store-404' }, ctx)).toThrow(CrmError);
  });

  it('AC-003: 編輯客戶會更新資料與 updatedAt', () => {
    const state = seedState();
    const later = new Date(2026, 10, 17, 9, 0, 0);
    const next = updateCustomerProfile(state, 'cust-d', { name: '示範客戶 D2', preferences: ['早上時段'] }, ctxFor(state, 'acc-designer-b', later));
    const edited = next.customers.find((c) => c.id === 'cust-d');
    expect(edited?.name).toBe('示範客戶 D2');
    expect(edited?.preferences).toEqual(['早上時段']);
    expect(edited?.updatedAt).toBe(later.toISOString());
    expect(() => updateCustomerProfile(state, 'cust-d', { phone: '0812345678' }, ctxFor(state, 'acc-owner'))).toThrow(CrmError);
    expect(() => updateCustomerProfile(state, 'cust-404', { name: '示範' }, ctxFor(state, 'acc-owner'))).toThrow(CrmError);
  });

  it('AC-003: 新增服務寫入療程資料，並立即重算回訪日與待聯絡清單', () => {
    const state = seedState();
    expect(queueFor(state).some((r) => r.customer.id === 'cust-e')).toBe(true);

    const next = addVisit(
      state,
      { id: 't-new', customerId: 'cust-c', catalogItemId: 'svc-lash', performedAt: FIXED_TODAY.toISOString(), notes: '自然款' },
      ctxFor(state, 'acc-designer-b'),
    );
    const treatment = next.treatments.find((t) => t.id === 't-new');
    expect(treatment).toMatchObject({
      customerId: 'cust-c',
      category: 'eyelash',
      serviceName: '美睫嫁接',
      price: 1800,
      durationMin: 60,
      storeId: 'store-1',
      designerId: 'acc-designer-b',
      notes: '自然款',
    });
    // 美睫週期 21 天：剛做完 → 不在 14 天窗口內，從待聯絡清單消失
    const rows = queueFor(next);
    expect(rows.some((r) => r.customer.id === 'cust-c')).toBe(false);
    expect(rows).toHaveLength(4);
  });

  it('AC-003: 剛新增的客戶做完服務後，到期前 14 天內會出現在清單', () => {
    let state = seedState();
    const ctx = ctxFor(state, 'acc-owner');
    state = addCustomer(state, { id: 'cust-new', name: '示範客戶 新', phone: '0900000020', storeId: 'store-1' }, ctx);
    expect(queueFor(state).some((r) => r.customer.id === 'cust-new')).toBe(false); // 沒有服務紀錄

    const tenDaysAgo = new Date(2026, 10, 6, 10, 0, 0);
    state = addVisit(state, { id: 't-new', customerId: 'cust-new', catalogItemId: 'svc-lash', performedAt: tenDaysAgo.toISOString() }, ctx);
    const row = queueFor(state).find((r) => r.customer.id === 'cust-new');
    expect(row).toMatchObject({ daysUntilRecall: 11, status: 'soon', suggestedRecallAt: '2026-11-27', lastServiceName: '美睫嫁接' });
  });

  it('AC-003: 含過敏衝突的服務必須先確認才可儲存', () => {
    const state = seedState();
    const ctx = ctxFor(state, 'acc-designer-a');
    expect(findAllergyConflicts(state, 'cust-a', 'svc-color')).toEqual(['香精']);
    expect(findAllergyConflicts(state, 'cust-a', 'svc-cut')).toEqual([]);

    const input = { id: 't-conflict', customerId: 'cust-a', catalogItemId: 'svc-color', performedAt: FIXED_TODAY.toISOString() };
    try {
      addVisit(state, input, ctx);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(CrmError);
      expect((err as CrmError).code).toBe('ALLERGY_CONFLICT_UNCONFIRMED');
      expect((err as CrmError).details).toEqual(['香精']);
    }
    const confirmed = addVisit(state, { ...input, acknowledgeAllergyConflict: true }, ctx);
    expect(confirmed.treatments.some((t) => t.id === 't-conflict')).toBe(true);
  });

  it('AC-003: 新增服務可扣套票堂數，並把到期的預約標為已完成', () => {
    const state = seedState();
    const next = addVisit(
      state,
      { id: 't-pkg', customerId: 'cust-a', catalogItemId: 'svc-hydra', performedAt: FIXED_TODAY.toISOString(), packageId: 'seed-p1', price: 0 },
      ctxFor(state, 'acc-designer-a'),
    );
    expect(next.packages.find((p) => p.id === 'seed-p1')?.usedSessions).toBe(5);
    expect(next.treatments.find((t) => t.id === 't-pkg')?.price).toBe(0);

    let booked = addAppointment(state, { id: 'ap-today', customerId: 'cust-e', designerId: 'acc-designer-b', date: '2026-11-16', time: '15:00' }, ctxFor(state, 'acc-designer-b'));
    booked = addVisit(booked, { id: 't-e', customerId: 'cust-e', catalogItemId: 'svc-cut', performedAt: FIXED_TODAY.toISOString() }, ctxFor(state, 'acc-designer-b'));
    expect(booked.appointments.find((a) => a.id === 'ap-today')?.status).toBe('completed');
    // 未來的預約不受影響
    expect(booked.appointments.find((a) => a.id === 'seed-a1')?.status).toBe('upcoming');
  });

  it('AC-003: 停用或不存在的品項不可新增服務', () => {
    const state = seedState();
    const ctx = ctxFor(state, 'acc-owner');
    expect(() => addVisit(state, { id: 't1', customerId: 'cust-a', catalogItemId: 'svc-404', performedAt: FIXED_TODAY.toISOString() }, ctx)).toThrow(CrmError);
    const inactive = { ...state, catalog: state.catalog.map((i) => (i.id === 'svc-cut' ? { ...i, active: false } : i)) };
    expect(() => addVisit(inactive, { id: 't1', customerId: 'cust-f', catalogItemId: 'svc-cut', performedAt: FIXED_TODAY.toISOString() }, ctx)).toThrow(CrmError);
  });

  it('AC-003: 重新整理後保留——存入 localStorage 再讀回，state 完全相同', () => {
    const storage = new MemoryStorage();
    let state = seedState();
    const ctx = ctxFor(state, 'acc-owner');
    state = addCustomer(state, { id: 'cust-new', name: '示範客戶 新', phone: '0900000020', storeId: 'store-1' }, ctx);
    state = addVisit(state, { id: 't-new', customerId: 'cust-new', catalogItemId: 'svc-gel', performedAt: FIXED_TODAY.toISOString() }, ctx);
    expect(saveCrmState(storage, state)).toBe(true);

    const reloaded = loadCrmState(storage);
    expect(reloaded).toEqual(JSON.parse(JSON.stringify(state)));
    expect(reloaded?.treatments.some((t) => t.id === 't-new')).toBe(true);
    expect(queueFor(reloaded!).map((r) => r.customer.id)).toEqual(queueFor(state).map((r) => r.customer.id));
  });

  it('AC-003: 沒有資料、版本不符或 JSON 損毀時 loadCrmState 回傳 undefined', () => {
    const storage = new MemoryStorage();
    expect(loadCrmState(storage)).toBeUndefined();
    expect(loadCrmState(undefined)).toBeUndefined();
    storage.setItem('beauty-crm:m1:data', 'not-json{{{');
    expect(loadCrmState(storage)).toBeUndefined();
    storage.setItem('beauty-crm:m1:data', JSON.stringify({ schemaVersion: 999, workspace: { id: 'w', name: 'w' } }));
    expect(loadCrmState(storage)).toBeUndefined();
  });

  it('AC-003: readCrmState 區分「沒有資料」與「有資料但讀不出來」，保管箱損毀也算讀不出來', () => {
    const storage = new MemoryStorage();
    expect(readCrmState(storage)).toEqual({ status: 'empty' });
    expect(readCrmState(undefined)).toEqual({ status: 'empty' });

    storage.setItem('beauty-crm:m1:data', 'not-json{{{');
    expect(readCrmState(storage)).toEqual({ status: 'corrupt' });
    storage.setItem('beauty-crm:m1:data', JSON.stringify({ schemaVersion: 999, workspace: { id: 'w', name: 'w' } }));
    expect(readCrmState(storage)).toEqual({ status: 'corrupt' });

    const state = seedState();
    saveCrmState(storage, state);
    expect(readCrmState(storage).status).toBe('ok');
    // S 級保管箱無法解碼時不可當成「沒有敏感資料」，否則下一次儲存會把過敏與效果紀錄清掉
    storage.setItem(CRM_SENSITIVE_KEY, 'b64:%%%不是base64');
    expect(readCrmState(storage)).toEqual({ status: 'corrupt' });
    storage.setItem(CRM_SENSITIVE_KEY, 'plain text');
    expect(readCrmState(storage)).toEqual({ status: 'corrupt' });
    // 沒有保管箱（例如舊資料）視為沒有敏感資料，可正常讀取
    storage.removeItem(CRM_SENSITIVE_KEY);
    expect(readCrmState(storage).status).toBe('ok');
  });
});

describe('AC-003 KPI 由資料計算', () => {
  it('AC-003: 本月服務次數與服務額來自療程資料，新增服務後即時變動', () => {
    const state = seedState();
    const storeTreatments = (s: typeof state) => s.treatments.filter((t) => t.storeId === 'store-1');
    const before = computeKpis(storeTreatments(state), FIXED_TODAY);
    // 2026-11 的一店療程：cust-f 的剪髮（11/11）
    expect(before.visitsThisMonth).toBe(1);
    expect(before.revenueThisMonth).toBe(1200);
    // 2026-10 的一店療程：cust-b 清潔（10/14）、cust-c 美睫 ×2（10/10、10/31）、cust-d 保濕（10/27）、cust-e 美甲（10/07）
    expect(before.visitsDeltaPct).toBe(Math.round(((1 - 5) / 5) * 100));

    const next = addVisit(state, { id: 't-new', customerId: 'cust-d', catalogItemId: 'svc-hydra', performedAt: FIXED_TODAY.toISOString() }, ctxFor(state, 'acc-owner'));
    const after = computeKpis(storeTreatments(next), FIXED_TODAY);
    expect(after.visitsThisMonth).toBe(2);
    expect(after.revenueThisMonth).toBe(1200 + 1900);
  });

  it('AC-003: 近 30 日回訪率 = 該區間服務中屬於回訪者的比例；無資料時為 null', () => {
    const state = seedState();
    const kpis = computeKpis(state.treatments.filter((t) => t.storeId === 'store-1'), FIXED_TODAY);
    // 近 30 天（10/17–11/16）一店服務：cust-c 10/31（回訪）、cust-d 10/27（首次）、cust-f 11/11（首次）
    expect(kpis.returnRatePct).toBe(33);
    expect(kpis.returnRateDeltaPts).not.toBeNull();

    const empty = computeKpis([], FIXED_TODAY);
    expect(empty).toEqual({
      visitsThisMonth: 0,
      visitsDeltaPct: null,
      revenueThisMonth: 0,
      revenueDeltaPct: null,
      returnRatePct: null,
      returnRateDeltaPts: null,
    });
  });

  it('AC-003: 回流節奏由回訪日計算，調整回訪天數後分佈改變', () => {
    const state = seedState();
    const storeTreatments = state.treatments.filter((t) => t.storeId === 'store-1');
    const counts = weeklyRecallCounts(storeTreatments, FIXED_TODAY, state.recallSettings);
    // 以 today = 11/16 為基準，各筆服務的建議回訪日距今天數 → 所屬週（index 7 = 最近 7 天）：
    //   cust-b 清潔 -33+30 = 3 天前 → [7]
    //   cust-a 染髮 -52+45 = 7 天前、cust-e 美甲 -40+28 = 12 天前 → [6]
    //   cust-c 美睫 -37+21 = 16 天前 → [5]
    //   cust-a 保濕 -60+30 = 30 天前、cust-b 清潔 -63+30 = 33 天前 → [3]
    //   cust-a 染髮 -97+45 = 52 天前 → [0]
    //   其餘不是超過 8 週，就是回訪日還沒到
    expect(counts).toEqual([1, 0, 0, 2, 0, 1, 2, 1]);
    // 髮型改為 60 天：cust-a 最近一次染髮的回訪日變成未來，-97 那次移到 37 天前 → [2]
    const adjusted = weeklyRecallCounts(storeTreatments, FIXED_TODAY, { ...state.recallSettings, hair: 60 });
    expect(adjusted).toEqual([0, 0, 1, 2, 0, 1, 1, 1]);
    const normalized = normalizeCounts(counts);
    expect(Math.max(...normalized)).toBe(1);
    expect(normalizeCounts([0, 0])).toEqual([0, 0]);
  });
});

describe('AC-003 回流漏斗與草稿寫入', () => {
  it('AC-002/AC-003: 漏斗數字由資料計算（應回訪 5 → 已聯絡 2 → 已預約 1）', () => {
    const funnel = computeFunnel(queueFor(seedState()));
    expect(funnel).toEqual({ due: 5, contacted: 2, booked: 1, contactToBookPct: 50, overallPct: 20 });
    expect(computeFunnel([])).toEqual({ due: 0, contacted: 0, booked: 0, contactToBookPct: 0, overallPct: 0 });
  });

  it('AC-003: 標記已聯絡寫入紀錄並推進漏斗；新增預約推進「已預約」', () => {
    let state = seedState();
    const ctx = ctxFor(state, 'acc-designer-a');
    state = markContacted(state, { id: 'k-new', customerId: 'cust-a', channel: 'phone', note: '電話確認近況' }, ctx);
    expect(state.contactLog.find((k) => k.id === 'k-new')).toMatchObject({ customerId: 'cust-a', contactedBy: 'acc-designer-a', channel: 'phone' });
    expect(computeFunnel(queueFor(state))).toMatchObject({ due: 5, contacted: 3, booked: 1 });

    state = addAppointment(state, { id: 'ap-new', customerId: 'cust-a', designerId: 'acc-designer-a', date: '2026-11-20', time: '14:00' }, ctx);
    expect(computeFunnel(queueFor(state))).toMatchObject({ due: 5, contacted: 3, booked: 2 });
    expect(queueFor(state).find((r) => r.customer.id === 'cust-a')).toMatchObject({ contacted: true, booked: true, nextAppointmentDate: '2026-11-20' });
  });

  it('AC-003: 上一個回訪週期的聯絡紀錄不算本次已聯絡', () => {
    let state = seedState();
    state = addVisit(state, { id: 't-c2', customerId: 'cust-c', catalogItemId: 'svc-cleanse', performedAt: new Date(2026, 10, 16, 11, 0).toISOString() }, ctxFor(state, 'acc-owner'));
    // 深層清潔 30 天週期 → 不在窗口內；把窗口放大檢查 contacted 旗標
    const rows = buildRecallQueue({ customers: state.customers, treatments: state.treatments, contactLog: state.contactLog, today: FIXED_TODAY, windowDays: 60 });
    expect(rows.find((r) => r.customer.id === 'cust-c')?.contacted).toBe(false);
  });

  it('AC-004/AC-003: 草稿編輯會保存；已核准的草稿被改動後退回 draft', () => {
    let state = seedState();
    const ctx = ctxFor(state, 'acc-designer-a');
    const body = buildRecallDraftBody('示範客戶 A', '染髮補色');
    expect(body).toContain('示範客戶 A');
    expect(body).toContain('染髮補色');

    state = saveDraft(state, 'cust-a', body, ctx);
    expect(getDraft(state, 'cust-a')).toMatchObject({ status: 'draft', body });
    state = approveCustomerDraft(state, 'cust-a', ctx);
    expect(getDraft(state, 'cust-a')?.status).toBe('approved');
    state = saveDraft(state, 'cust-a', `${body}（已調整）`, ctx);
    expect(getDraft(state, 'cust-a')).toMatchObject({ status: 'draft', body: `${body}（已調整）` });

    const storage = new MemoryStorage();
    saveCrmState(storage, state);
    expect(getDraft(loadCrmState(storage)!, 'cust-a')?.body).toBe(`${body}（已調整）`);
  });

  it('AC-004/AC-003: 送出後再新增服務，上一輪草稿作廢，下一輪可重新起草、核准、送出', () => {
    let state = seedState();
    const ctx = ctxFor(state, 'acc-designer-a');
    const adapter = createDryRunLineAdapter({ now: () => FIXED_TODAY });
    state = saveDraft(state, 'cust-a', '示範客戶 A 您好（第一輪）', ctx);
    state = approveCustomerDraft(state, 'cust-a', ctx);
    state = sendReminder(state, 'cust-a', adapter, ctx).state;
    expect(getDraft(state, 'cust-a')?.status).toBe('sent');

    state = addVisit(
      state,
      { id: 't-next', customerId: 'cust-a', catalogItemId: 'svc-lash', performedAt: FIXED_TODAY.toISOString(), acknowledgeAllergyConflict: true },
      ctx,
    );
    expect(getDraft(state, 'cust-a')).toBeUndefined();

    state = saveDraft(state, 'cust-a', '示範客戶 A 您好（第二輪）', ctx);
    state = approveCustomerDraft(state, 'cust-a', ctx);
    expect(getDraft(state, 'cust-a')?.status).toBe('approved');
    const second = sendReminder(state, 'cust-a', adapter, ctx);
    expect(second.result.ok).toBe(true);
    expect(getDraft(second.state, 'cust-a')).toMatchObject({ status: 'sent', body: '示範客戶 A 您好（第二輪）' });
  });

  it('AC-003: 補登過去日期的服務不影響本輪草稿', () => {
    let state = seedState();
    const ctx = ctxFor(state, 'acc-designer-a');
    state = saveDraft(state, 'cust-a', '示範客戶 A 您好', ctx);
    state = approveCustomerDraft(state, 'cust-a', ctx);
    const backdated = new Date(2025, 0, 10, 15, 0).toISOString();
    state = addVisit(
      state,
      { id: 't-old', customerId: 'cust-a', catalogItemId: 'svc-lash', performedAt: backdated, acknowledgeAllergyConflict: true },
      ctx,
    );
    expect(getDraft(state, 'cust-a')).toMatchObject({ status: 'approved', body: '示範客戶 A 您好' });
  });

  it('AC-003: 未取得行銷同意的客戶不可核准草稿', () => {
    let state = seedState();
    const ctx = ctxFor(state, 'acc-designer-b');
    state = saveDraft(state, 'cust-d', '示範客戶 D 您好', ctx);
    try {
      approveCustomerDraft(state, 'cust-d', ctx);
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as CrmError).code).toBe('CONSENT_REQUIRED');
    }
  });
});
