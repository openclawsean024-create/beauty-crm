// AC-006：敏感個資同意、遮罩，以及 localStorage 不以明文存放 S 級欄位。
import { describe, it, expect } from 'vitest';
import {
  addCustomer,
  addEffectRecord,
  setMarketingConsent,
  setSensitiveConsent,
  updateCustomerProfile,
} from '@/lib/crm-store';
import { EffectError } from '@/lib/effects';
import { EXPORT_FORMAT_VERSION, EXPORT_PERSONAL_DATA_NOTICE, buildExportPayload, serializeExport } from '@/lib/export';
import {
  CRM_DATA_KEY,
  CRM_SENSITIVE_KEY,
  decodeVault,
  encodeVault,
  loadCrmState,
  readCrmState,
  saveCrmState,
  splitSensitive,
} from '@/lib/local-store';
import {
  SENSITIVE_MASK,
  SensitiveConsentError,
  assertSensitiveAllowed,
  canStoreSensitive,
  consentHistory,
  hasSensitiveData,
  latestConsentRecord,
  maskSensitive,
  sensitiveConsentOf,
  sensitiveFieldCount,
} from '@/lib/sensitive';
import { FIXED_TODAY, MemoryStorage, ctxFor, seedState } from './helpers/crm-fixture';

const newCustomer = { id: 'cust-new', name: '示範客戶 新', phone: '0900000020', storeId: 'store-1', ownerDesignerId: 'acc-designer-a' };

describe('AC-006 sensitive-consent — 敏感個資同意', () => {
  it('AC-006: sensitiveDataConsent 與行銷同意分開，未設定視為 pending', () => {
    const state = seedState();
    const next = addCustomer(state, { ...newCustomer, consent: 'granted' }, ctxFor(state, 'acc-owner'));
    const created = next.customers.find((c) => c.id === 'cust-new')!;
    expect(created.consent).toBe('granted');
    expect(created.sensitiveDataConsent).toBe('pending');
    expect(sensitiveConsentOf({})).toBe('pending');
    expect(canStoreSensitive(created)).toBe(false);

    // 改行銷同意不影響敏感個資同意，反之亦然
    const marketingRevoked = setMarketingConsent(next, 'cust-new', 'revoked', ctxFor(state, 'acc-owner'));
    expect(marketingRevoked.customers.find((c) => c.id === 'cust-new')).toMatchObject({ consent: 'revoked', sensitiveDataConsent: 'pending' });
    const sensitiveGranted = setSensitiveConsent(next, 'cust-new', 'granted', ctxFor(state, 'acc-owner'));
    expect(sensitiveGranted.customers.find((c) => c.id === 'cust-new')).toMatchObject({ consent: 'granted', sensitiveDataConsent: 'granted' });
  });

  it('AC-006: 未取得敏感個資同意時，不可儲存過敏、皮膚狀況、健康備註', () => {
    const state = seedState();
    const ctx = ctxFor(state, 'acc-owner');
    for (const fields of [{ allergies: ['示範成分'] }, { skinCondition: '示範狀況' }, { healthNotes: '示範備註' }]) {
      for (const consent of ['pending', 'revoked', undefined] as const) {
        try {
          addCustomer(state, { ...newCustomer, sensitiveDataConsent: consent, ...fields }, ctx);
          throw new Error('should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(SensitiveConsentError);
          expect((err as SensitiveConsentError).code).toBe('SENSITIVE_CONSENT_REQUIRED');
        }
      }
    }
    // 既有客戶（同意為 pending）也不可補寫
    expect(() => updateCustomerProfile(state, 'cust-c', { allergies: ['示範成分'] }, ctx)).toThrow(SensitiveConsentError);
    expect(() => updateCustomerProfile(state, 'cust-c', { skinCondition: '示範狀況' }, ctx)).toThrow(SensitiveConsentError);
    // 取得同意後才可以
    const granted = setSensitiveConsent(state, 'cust-c', 'granted', ctx);
    const saved = updateCustomerProfile(granted, 'cust-c', { allergies: [' 示範成分 ', ''], skinCondition: '示範狀況' }, ctx);
    expect(saved.customers.find((c) => c.id === 'cust-c')).toMatchObject({ allergies: ['示範成分'], skinCondition: '示範狀況' });
  });

  it('AC-006: 未取得同意時不可新增效果紀錄（Before/After）', () => {
    const state = seedState();
    const record = { id: 'e-new', customerId: 'cust-c', date: '2026-11-16', type: 'before' as const, sessionLabel: '服務前' };
    try {
      addEffectRecord(state, record, ctxFor(state, 'acc-owner'));
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(EffectError);
      expect((err as EffectError).code).toBe('SENSITIVE_CONSENT_REQUIRED');
    }
    const granted = setSensitiveConsent(state, 'cust-c', 'granted', ctxFor(state, 'acc-owner'));
    expect(addEffectRecord(granted, record, ctxFor(state, 'acc-owner')).effects.some((e) => e.id === 'e-new')).toBe(true);
  });

  it('AC-006: 撤回敏感個資同意時，立即清除既有 S 級資料與效果紀錄', () => {
    const state = seedState();
    const before = state.customers.find((c) => c.id === 'cust-a')!;
    expect(hasSensitiveData(before)).toBe(true);
    expect(state.effects.filter((e) => e.customerId === 'cust-a')).toHaveLength(3);

    const revoked = setSensitiveConsent(state, 'cust-a', 'revoked', ctxFor(state, 'acc-owner'));
    const after = revoked.customers.find((c) => c.id === 'cust-a')!;
    expect(after.sensitiveDataConsent).toBe('revoked');
    expect(after.allergies).toEqual([]);
    expect(after.skinCondition).toBeUndefined();
    expect(after.healthNotes).toBeUndefined();
    expect(hasSensitiveData(after)).toBe(false);
    expect(revoked.effects.filter((e) => e.customerId === 'cust-a')).toEqual([]);
    // 一般資料與療程保留
    expect(after.name).toBe('示範客戶 A');
    expect(revoked.treatments.filter((t) => t.customerId === 'cust-a')).toHaveLength(9);
    // 其他客戶不受影響
    expect(revoked.customers.find((c) => c.id === 'cust-b')?.allergies).toEqual(['高濃度酸類']);

    // 存檔後 localStorage 內也找不到
    const storage = new MemoryStorage();
    saveCrmState(storage, revoked);
    const vault = decodeVault(storage.getItem(CRM_SENSITIVE_KEY));
    expect(vault.customers['cust-a']).toEqual({ allergies: [] });
    expect(vault.effects.some((e) => e.customerId === 'cust-a')).toBe(false);
  });

  it('AC-006: 同意紀錄——每次變更記錄時間與操作者', () => {
    let state = seedState();
    const t1 = new Date(2026, 10, 17, 9, 0, 0);
    const t2 = new Date(2026, 10, 18, 9, 0, 0);
    state = setSensitiveConsent(state, 'cust-c', 'granted', ctxFor(state, 'acc-designer-b', t1));
    state = setSensitiveConsent(state, 'cust-c', 'revoked', ctxFor(state, 'acc-owner', t2));
    const history = consentHistory(state.consentLog, 'cust-c', 'sensitive');
    expect(history.map((r) => [r.status, r.recordedBy, r.recordedAt])).toEqual([
      ['pending', 'acc-owner', history[0]!.recordedAt],
      ['granted', 'acc-designer-b', t1.toISOString()],
      ['revoked', 'acc-owner', t2.toISOString()],
    ]);
    expect(latestConsentRecord(state.consentLog, 'cust-c', 'sensitive')?.status).toBe('revoked');
    expect(new Set(state.consentLog.map((r) => r.id)).size).toBe(state.consentLog.length);

    // 狀態沒變時不重複寫紀錄
    const same = setSensitiveConsent(state, 'cust-c', 'revoked', ctxFor(state, 'acc-owner', t2));
    expect(same).toBe(state);

    // 新增客戶時兩種同意各記一筆
    const added = addCustomer(state, { ...newCustomer, consent: 'granted', sensitiveDataConsent: 'granted', allergies: ['示範成分'] }, ctxFor(state, 'acc-designer-a'));
    expect(consentHistory(added.consentLog, 'cust-new').map((r) => [r.kind, r.status, r.recordedBy])).toEqual([
      ['marketing', 'granted', 'acc-designer-a'],
      ['sensitive', 'granted', 'acc-designer-a'],
    ]);
  });

  it('AC-006: 遮罩——S 級欄位預設以固定遮罩顯示，不洩漏內容與長度', () => {
    expect(maskSensitive('香精')).toBe(SENSITIVE_MASK);
    expect(maskSensitive('一段很長的健康相關備註內容')).toBe(SENSITIVE_MASK);
    expect(maskSensitive('')).toBe('');
    expect(maskSensitive(undefined)).toBe('');
    expect(SENSITIVE_MASK).not.toMatch(/[A-Za-z0-9一-鿿]/);
    expect(sensitiveFieldCount({ allergies: ['a', 'b'], skinCondition: 'x' })).toBe(3);
    expect(sensitiveFieldCount({ allergies: [] })).toBe(0);
    expect(() => assertSensitiveAllowed('pending', { allergies: [] })).not.toThrow();
    expect(() => assertSensitiveAllowed('granted', { allergies: ['a'] })).not.toThrow();
  });
});

describe('AC-006 localStorage 不以明文存放 S 級欄位', () => {
  it('AC-006: 一般資料 key 內完全沒有 S 級欄位內容與效果紀錄', () => {
    const storage = new MemoryStorage();
    const state = seedState();
    saveCrmState(storage, state);
    const main = JSON.parse(storage.getItem(CRM_DATA_KEY)!) as { customers: Array<Record<string, unknown>>; effects: unknown[] };
    expect(main.effects).toEqual([]);
    for (const customer of main.customers) {
      expect(customer.allergies).toEqual([]);
      expect(customer.skinCondition).toBeUndefined();
      expect(customer.healthNotes).toBeUndefined();
    }
    expect(JSON.stringify(main.customers)).not.toContain('香精');
    expect(JSON.stringify(main.customers)).not.toContain('高濃度酸類');
  });

  it('AC-006: 整個 localStorage 以原始字串搜尋，找不到任何客戶的 S 級明文', () => {
    // 用不會和「產品成分」撞字的獨特字串，確保搜尋到的一定是客戶的 S 級欄位。
    // （療程紀錄裡的 productIngredients 是產品資訊，不是客戶的過敏紀錄。）
    let state = seedState();
    const ctx = ctxFor(state, 'acc-owner');
    state = updateCustomerProfile(
      state,
      'cust-a',
      { allergies: ['示範過敏原甲', '示範過敏原乙'], skinCondition: '示範膚況描述丙', healthNotes: '示範健康備註丁' },
      ctx,
    );
    state = addEffectRecord(
      state,
      { id: 'e-raw', customerId: 'cust-a', date: '2026-11-16', type: 'after', sessionLabel: '示範效果標籤戊', notes: '示範效果備註己' },
      ctx,
    );
    const storage = new MemoryStorage();
    saveCrmState(storage, state);
    const raw = storage.dump();
    for (const text of [
      '示範過敏原甲',
      '示範過敏原乙',
      '示範膚況描述丙',
      '示範健康備註丁',
      '示範效果標籤戊',
      '示範效果備註己',
      '換季時頭皮容易乾燥',
      '曾對酸類產品泛紅',
    ]) {
      expect(raw.includes(text), `localStorage 不應出現明文：${text}`).toBe(false);
    }
    // 膚況指標與欄位名稱也不以明文 JSON 出現
    for (const key of ['"hydration"', '"skinCondition"', '"healthNotes"', '"sessionLabel"']) {
      expect(raw.includes(key), `localStorage 不應出現明文欄位：${key}`).toBe(false);
    }
    expect(storage.getItem(CRM_SENSITIVE_KEY)?.startsWith('b64:')).toBe(true);
    // 但資料確實有存進去（讀回後完整）
    expect(loadCrmState(storage)?.customers.find((c) => c.id === 'cust-a')?.allergies).toEqual(['示範過敏原甲', '示範過敏原乙']);
  });

  it('AC-006: S 級保管箱可完整還原（含中文），載入後 state 與存檔前一致', () => {
    const storage = new MemoryStorage();
    const state = seedState();
    saveCrmState(storage, state);
    const loaded = loadCrmState(storage)!;
    expect(loaded.customers.find((c) => c.id === 'cust-a')).toMatchObject({ allergies: ['香精'], skinCondition: '換季時頭皮容易乾燥' });
    expect(loaded.customers.find((c) => c.id === 'cust-b')?.healthNotes).toBe('曾對酸類產品泛紅，避免主動推薦。');
    expect(loaded.effects).toEqual(state.effects);

    const { vault } = splitSensitive(state);
    expect(decodeVault(encodeVault(vault))).toEqual(JSON.parse(JSON.stringify(vault)));
  });

  it('AC-006: 保管箱損毀時視為讀不出來（不可當成沒有 S 級資料而在下次儲存時清掉）；遺失時一般資料仍可載入', () => {
    const storage = new MemoryStorage();
    saveCrmState(storage, seedState());
    storage.setItem(CRM_SENSITIVE_KEY, 'b64:not-valid-base64!!');
    expect(readCrmState(storage)).toEqual({ status: 'corrupt' });
    expect(loadCrmState(storage)).toBeUndefined();
    storage.removeItem(CRM_SENSITIVE_KEY);
    const loaded = loadCrmState(storage)!;
    expect(loaded.customers).toHaveLength(8);
    expect(loaded.customers.every((c) => c.allergies.length === 0)).toBe(true);
    expect(loaded.effects).toEqual([]);
    expect(decodeVault('plain text')).toEqual({ customers: {}, effects: [] });
  });
});

describe('AC-006 匯出檔標註「含個資」警告與版本', () => {
  it('AC-006: payload 帶有警告、版本與 M1 新增資料', () => {
    const state = seedState();
    const storeCustomers = state.customers.filter((c) => c.storeId === 'store-1');
    const payload = buildExportPayload(storeCustomers, state.treatments, {}, state.workspace.name, {
      packages: state.packages,
      appointments: state.appointments,
      effects: state.effects,
      contactLog: state.contactLog,
      sendLog: state.sendLog,
      consentLog: state.consentLog,
      exportedBy: 'acc-owner',
    });
    expect(payload.formatVersion).toBe(EXPORT_FORMAT_VERSION);
    expect(payload.formatVersion).toBe(2);
    expect(payload.containsPersonalData).toBe(true);
    expect(payload.notice).toBe(EXPORT_PERSONAL_DATA_NOTICE);
    expect(payload.notice).toContain('含個資');
    expect(payload.notice).toContain('未加密');
    const parsed = JSON.parse(serializeExport(payload)) as Record<string, unknown>;
    expect(Object.keys(parsed).slice(0, 3)).toEqual(['formatVersion', 'containsPersonalData', 'notice']);
    expect(parsed.packages).toHaveLength(2);
    expect(parsed.effects).toHaveLength(3);
    expect(parsed.exportedBy).toBe('acc-owner');
    expect(Number.isNaN(Date.parse(String(parsed.exportedAt)))).toBe(false);
    expect(FIXED_TODAY).toBeInstanceOf(Date);
  });
});
