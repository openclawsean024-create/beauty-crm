// AC-004：LINE 回訪提醒 dry-run adapter——只產生訊息內容與收件清單，不實際發送。
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { approveCustomerDraft, getDraft, saveDraft, sendReminder, setMarketingConsent } from '@/lib/crm-store';
import {
  LINE_TEXT_MAX_LENGTH,
  buildLinePushPayload,
  buildRecipientList,
  createDryRunLineAdapter,
  resolveRecipient,
  runReminderBatch,
} from '@/lib/line-reminder';
import { loadCrmState, saveCrmState } from '@/lib/local-store';
import { buildRecallQueue, computeFunnel } from '@/lib/recall-queue';
import { FIXED_TODAY, MemoryStorage, ctxFor, seedState } from './helpers/crm-fixture';

const fixedAdapter = () =>
  createDryRunLineAdapter({ now: () => FIXED_TODAY, idFactory: () => 'line-dry-test-1' });

function approvedState() {
  let state = seedState();
  const ctx = ctxFor(state, 'acc-designer-a');
  state = saveDraft(state, 'cust-a', '示範客戶 A 您好～上次做的染髮補色差不多該回來保養囉！', ctx);
  state = approveCustomerDraft(state, 'cust-a', ctx);
  return state;
}

describe('AC-004 line-reminder — dry-run adapter', () => {
  const fetchSpy = vi.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    fetchSpy.mockReset();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('AC-004: 已核准且已同意 → 產生 LINE push payload，狀態為 dry-run（結構快照）', () => {
    const state = approvedState();
    const customer = state.customers.find((c) => c.id === 'cust-a')!;
    const result = fixedAdapter().send({ customer, draft: getDraft(state, 'cust-a') });
    expect(result).toMatchInlineSnapshot(`
      {
        "ok": true,
        "record": {
          "createdAt": "${FIXED_TODAY.toISOString()}",
          "customerId": "cust-a",
          "id": "line-dry-test-1",
          "payload": {
            "messages": [
              {
                "text": "示範客戶 A 您好～上次做的染髮補色差不多該回來保養囉！",
                "type": "text",
              },
            ],
            "to": "U00000000000000000000000000000001",
          },
          "status": "dry-run",
        },
      }
    `);
    expect(fetchSpy).toHaveBeenCalledTimes(0);
  });

  it('AC-004: 草稿未核准 → DRAFT_NOT_APPROVED，不產生 payload', () => {
    let state = seedState();
    state = saveDraft(state, 'cust-a', '示範客戶 A 您好', ctxFor(state, 'acc-designer-a'));
    const customer = state.customers.find((c) => c.id === 'cust-a')!;
    const adapter = fixedAdapter();
    expect(adapter.send({ customer, draft: getDraft(state, 'cust-a') })).toEqual({
      ok: false,
      code: 'DRAFT_NOT_APPROVED',
      customerId: 'cust-a',
    });
    // 完全沒有草稿
    expect(adapter.send({ customer, draft: undefined })).toEqual({ ok: false, code: 'DRAFT_NOT_APPROVED', customerId: 'cust-a' });
    // 已核准但內容是空白
    expect(adapter.send({ customer, draft: { customerId: 'cust-a', status: 'approved', body: '   ' } })).toMatchObject({ ok: false, code: 'DRAFT_NOT_APPROVED' });
    expect(fetchSpy).toHaveBeenCalledTimes(0);
  });

  it('AC-004: 行銷同意不是 granted → CONSENT_REQUIRED，即使草稿已核准', () => {
    const adapter = fixedAdapter();
    const approved = { customerId: 'x', status: 'approved' as const, body: '示範訊息' };
    for (const consent of ['pending', 'revoked'] as const) {
      expect(adapter.send({ customer: { id: 'x', consent }, draft: approved })).toEqual({
        ok: false,
        code: 'CONSENT_REQUIRED',
        customerId: 'x',
      });
    }
    expect(fetchSpy).toHaveBeenCalledTimes(0);
  });

  it('AC-004: 核准後撤回同意，草稿退回 draft，dry-run 也被擋下', () => {
    let state = approvedState();
    state = setMarketingConsent(state, 'cust-a', 'revoked', ctxFor(state, 'acc-designer-a'));
    expect(getDraft(state, 'cust-a')?.status).toBe('draft');
    const { state: after, result } = sendReminder(state, 'cust-a', fixedAdapter(), ctxFor(state, 'acc-designer-a'));
    expect(result).toMatchObject({ ok: false, code: 'CONSENT_REQUIRED' });
    expect(after.sendLog).toEqual([]);
  });

  it('AC-004: dry-run 成功時寫入本機發送紀錄並保存；不會被算成「已聯絡」', () => {
    const state = approvedState();
    const funnelBefore = computeFunnel(buildRecallQueue({ customers: state.customers.filter((c) => c.storeId === 'store-1'), treatments: state.treatments, appointments: state.appointments, contactLog: state.contactLog, today: FIXED_TODAY }));
    const { state: after, result } = sendReminder(state, 'cust-a', fixedAdapter(), ctxFor(state, 'acc-designer-a'));
    expect(result.ok).toBe(true);
    expect(after.sendLog).toHaveLength(1);
    expect(after.sendLog[0]).toMatchObject({ customerId: 'cust-a', status: 'dry-run' });
    expect(getDraft(after, 'cust-a')?.status).toBe('sent');
    // dry-run 沒有真的送到客戶手上 → 聯絡紀錄與漏斗不變
    expect(after.contactLog).toEqual(state.contactLog);
    const funnelAfter = computeFunnel(buildRecallQueue({ customers: after.customers.filter((c) => c.storeId === 'store-1'), treatments: after.treatments, appointments: after.appointments, contactLog: after.contactLog, today: FIXED_TODAY }));
    expect(funnelAfter).toEqual(funnelBefore);

    const storage = new MemoryStorage();
    saveCrmState(storage, after);
    expect(loadCrmState(storage)?.sendLog).toEqual(after.sendLog);
    expect(fetchSpy).toHaveBeenCalledTimes(0);
  });

  it('AC-004: 同一份草稿送過後狀態為 sent，再送一次會被擋（不重複發送）', () => {
    const state = approvedState();
    const ctx = ctxFor(state, 'acc-designer-a');
    const first = sendReminder(state, 'cust-a', fixedAdapter(), ctx);
    const second = sendReminder(first.state, 'cust-a', fixedAdapter(), ctx);
    expect(second.result).toMatchObject({ ok: false, code: 'DRAFT_NOT_APPROVED' });
    expect(second.state.sendLog).toHaveLength(1);
  });

  it('AC-004: 收件清單只列已核准且已同意的客戶，其餘附原因', () => {
    let state = approvedState();
    state = saveDraft(state, 'cust-b', '示範客戶 B 您好', ctxFor(state, 'acc-designer-b')); // 未核准
    state = saveDraft(state, 'cust-e', '示範客戶 E 您好', ctxFor(state, 'acc-designer-b')); // 已撤回同意
    const storeCustomers = state.customers.filter((c) => c.storeId === 'store-1');
    const list = buildRecipientList(storeCustomers, state.drafts);
    expect(list.ready).toEqual([
      { customerId: 'cust-a', to: 'U00000000000000000000000000000001', text: '示範客戶 A 您好～上次做的染髮補色差不多該回來保養囉！' },
    ]);
    expect(list.blocked).toEqual([
      { customerId: 'cust-b', code: 'DRAFT_NOT_APPROVED' },
      { customerId: 'cust-c', code: 'DRAFT_NOT_APPROVED' },
      { customerId: 'cust-d', code: 'CONSENT_REQUIRED' },
      { customerId: 'cust-e', code: 'CONSENT_REQUIRED' },
      { customerId: 'cust-f', code: 'DRAFT_NOT_APPROVED' },
    ]);

    const batch = runReminderBatch(createDryRunLineAdapter({ now: () => FIXED_TODAY }), storeCustomers, state.drafts);
    expect(batch.records).toHaveLength(1);
    expect(batch.records[0]?.status).toBe('dry-run');
    expect(batch.blocked).toHaveLength(5);
    expect(fetchSpy).toHaveBeenCalledTimes(0);
  });

  it('AC-004: payload 驗證——收件者與內容必填、超長截斷、沒有 lineUserId 用假代號', () => {
    expect(() => buildLinePushPayload('', '示範')).toThrow();
    expect(() => buildLinePushPayload('U1', '   ')).toThrow();
    const long = buildLinePushPayload('U1', '測'.repeat(LINE_TEXT_MAX_LENGTH + 50));
    expect(long.messages[0]?.text).toHaveLength(LINE_TEXT_MAX_LENGTH);
    expect(resolveRecipient({ id: 'cust-c' })).toBe('DRYRUN-cust-c');
    expect(createDryRunLineAdapter().mode).toBe('dry-run');
  });

  it('AC-004: src 不讀取任何 LINE 憑證環境變數、不含網路呼叫', () => {
    const srcRoot = resolve(__dirname, '..', 'src');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
      }
    };
    walk(srcRoot);
    expect(files.length).toBeGreaterThan(10);
    const tokenPattern = new RegExp(['LINE_' + 'CHANNEL', 'CHANNEL_ACCESS_' + 'TOKEN'].join('|'));
    const networkPattern = /\bfetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|api\.line\.me/;
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(tokenPattern.test(source), `${file} 不應出現 LINE 憑證名稱`).toBe(false);
      expect(networkPattern.test(source), `${file} 不應有網路呼叫`).toBe(false);
    }
    const adapterSource = readFileSync(join(srcRoot, 'lib', 'line-reminder.ts'), 'utf8');
    expect(adapterSource).not.toMatch(/process\.env/);
  });
});
