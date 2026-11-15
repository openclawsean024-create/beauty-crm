// Beauty CRM — LINE 回訪提醒 adapter（M1 只有 dry-run）
// FR-013／FR-005。M1 規則：
// - 只產生「訊息內容 + 收件清單」，並寫入本機發送紀錄，狀態一律為 'dry-run'。
// - 不讀取任何 LINE 憑證或環境變數，不呼叫任何網路 API（沒有 fetch）。
// - 只有草稿狀態為 approved 且行銷同意為 granted 才會產生 payload。
// payload 形狀對齊 LINE Messaging API push message 的 request body：
//   { to: string, messages: [{ type: 'text', text: string }] }
// M2 接測試頻道時，新增另一個實作同一介面的 adapter 即可。

import type { Customer } from './customers';
import type { FollowupDraft } from './followups';

export interface LineTextMessage {
  type: 'text';
  text: string;
}

export interface LinePushPayload {
  to: string;
  messages: LineTextMessage[];
}

export type LineReminderErrorCode = 'DRAFT_NOT_APPROVED' | 'CONSENT_REQUIRED';

export interface LineSendRecord {
  id: string;
  customerId: string;
  status: 'dry-run';
  payload: LinePushPayload;
  createdAt: string; // ISO timestamp
}

export type LineSendResult =
  | { ok: true; record: LineSendRecord }
  | { ok: false; code: LineReminderErrorCode; customerId: string };

export interface LineReminderRequest {
  customer: Pick<Customer, 'id' | 'consent' | 'lineUserId'>;
  draft: Pick<FollowupDraft, 'customerId' | 'status' | 'body'> | undefined;
}

export interface LineReminderAdapter {
  readonly mode: 'dry-run';
  send(request: LineReminderRequest): LineSendResult;
}

/** LINE 單則文字訊息上限（字元）。 */
export const LINE_TEXT_MAX_LENGTH = 5000;

/** dry-run 用的收件者代號：客戶沒有 lineUserId 時用明顯的假代號。 */
export function resolveRecipient(customer: Pick<Customer, 'id' | 'lineUserId'>): string {
  return customer.lineUserId?.trim() || `DRYRUN-${customer.id}`;
}

export function buildLinePushPayload(to: string, text: string): LinePushPayload {
  if (!to.trim()) throw new Error('recipient required');
  const body = text.trim();
  if (!body) throw new Error('message text required');
  return { to: to.trim(), messages: [{ type: 'text', text: body.slice(0, LINE_TEXT_MAX_LENGTH) }] };
}

/** 檢查能否送出；可以時回傳 undefined，否則回傳錯誤碼。同意閘門優先於核准狀態。 */
export function reminderBlockReason(request: LineReminderRequest): LineReminderErrorCode | undefined {
  if (request.customer.consent !== 'granted') return 'CONSENT_REQUIRED';
  if (!request.draft || request.draft.status !== 'approved' || !request.draft.body.trim()) {
    return 'DRAFT_NOT_APPROVED';
  }
  return undefined;
}

export interface DryRunAdapterOptions {
  now?: () => Date;
  idFactory?: () => string;
}

/**
 * dry-run adapter：不發送、不連網，只回傳「如果真的要送會送什麼」。
 * 呼叫端負責把成功的 record 寫入本機發送紀錄（crm-store.recordLineSend）。
 */
export function createDryRunLineAdapter(options: DryRunAdapterOptions = {}): LineReminderAdapter {
  const now = options.now ?? (() => new Date());
  let seq = 0;
  const idFactory =
    options.idFactory ??
    (() => {
      seq += 1;
      return `line-dry-${now().getTime().toString(36)}-${seq}`;
    });
  return {
    mode: 'dry-run',
    send(request: LineReminderRequest): LineSendResult {
      const blocked = reminderBlockReason(request);
      if (blocked) return { ok: false, code: blocked, customerId: request.customer.id };
      return {
        ok: true,
        record: {
          id: idFactory(),
          customerId: request.customer.id,
          status: 'dry-run',
          payload: buildLinePushPayload(resolveRecipient(request.customer), request.draft!.body),
          createdAt: now().toISOString(),
        },
      };
    },
  };
}

export interface RecipientEntry {
  customerId: string;
  to: string;
  text: string;
}

export interface RecipientList {
  /** 已核准且已同意：可產生 payload 的收件清單 */
  ready: RecipientEntry[];
  /** 被擋下的客戶與原因 */
  blocked: Array<{ customerId: string; code: LineReminderErrorCode }>;
}

/** 產生收件清單與訊息內容（不發送）。 */
export function buildRecipientList(
  customers: Array<Pick<Customer, 'id' | 'consent' | 'lineUserId'>>,
  drafts: Array<Pick<FollowupDraft, 'customerId' | 'status' | 'body'>>,
): RecipientList {
  const list: RecipientList = { ready: [], blocked: [] };
  for (const customer of customers) {
    const draft = drafts.find((d) => d.customerId === customer.id);
    const code = reminderBlockReason({ customer, draft });
    if (code) list.blocked.push({ customerId: customer.id, code });
    else list.ready.push({ customerId: customer.id, to: resolveRecipient(customer), text: draft!.body.trim() });
  }
  return list;
}

/** 批次 dry-run：對每位客戶呼叫 adapter，分開回傳成功紀錄與被擋下的原因。 */
export function runReminderBatch(
  adapter: LineReminderAdapter,
  customers: Array<Pick<Customer, 'id' | 'consent' | 'lineUserId'>>,
  drafts: Array<Pick<FollowupDraft, 'customerId' | 'status' | 'body'>>,
): { records: LineSendRecord[]; blocked: Array<{ customerId: string; code: LineReminderErrorCode }> } {
  const records: LineSendRecord[] = [];
  const blocked: Array<{ customerId: string; code: LineReminderErrorCode }> = [];
  for (const customer of customers) {
    const result = adapter.send({ customer, draft: drafts.find((d) => d.customerId === customer.id) });
    if (result.ok) records.push(result.record);
    else blocked.push({ customerId: result.customerId, code: result.code });
  }
  return { records, blocked };
}
