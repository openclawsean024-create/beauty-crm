// Beauty CRM — 本機資料 store（純函式 reducer）
// M1 的「資料閉環」：新增客戶與服務 → 重算回訪日 → 核准草稿 → LINE dry-run →
// 標記已聯絡／已預約。所有寫入動作都是 (state, input, ctx) → 新 state，
// 並在內部做權限檢查（permissions.can）與敏感個資同意檢查（sensitive）。
// 儲存由 local-store.ts 負責；這裡不碰 localStorage。

import type { Account, Store, Workspace } from './accounts';
import { belongsToStore } from './accounts';
import type { Appointment, AppointmentStatus } from './appointments';
import { cancelAppointment, completeAppointment, createAppointment } from './appointments';
import type { ConsentStatus, Customer } from './customers';
import { createCustomer, hasAllergyConflict } from './customers';
import { toDateOnly } from './dates';
import type { EffectRecord, EffectRecordType, SkinMetrics } from './effects';
import { createEffectRecord } from './effects';
import type { FollowupDraft } from './followups';
import { approveDraft, canActOnDraft, createDraft, editDraftBody, markDraftSent, resetDraft } from './followups';
import type { LineReminderAdapter, LineSendRecord, LineSendResult } from './line-reminder';
import type { ServicePackage } from './packages';
import { createPackage, consumePackageSession } from './packages';
import { assertCan, can, customerResource, storeResource } from './permissions';
import type { ContactRecord } from './recall-queue';
import type { RecallSettings } from './recall-settings';
import { defaultRecallSettings, setRecallDays } from './recall-settings';
import type { ConsentKind, ConsentRecord } from './sensitive';
import { assertSensitiveAllowed, hasSensitiveData, sensitiveConsentOf, stripSensitive } from './sensitive';
import type { ServiceItem } from './service-catalog';
import { DEFAULT_SERVICE_CATALOG, draftFromServiceItem, findServiceItem } from './service-catalog';
import type { Treatment, TreatmentCategory } from './treatments';
import { recordTreatment } from './treatments';

export const CRM_SCHEMA_VERSION = 1;

export interface CrmState {
  schemaVersion: typeof CRM_SCHEMA_VERSION;
  workspace: Workspace;
  stores: Store[];
  accounts: Account[];
  customers: Customer[];
  treatments: Treatment[];
  packages: ServicePackage[];
  appointments: Appointment[];
  effects: EffectRecord[];
  catalog: ServiceItem[];
  recallSettings: RecallSettings;
  drafts: FollowupDraft[];
  contactLog: ContactRecord[];
  sendLog: LineSendRecord[];
  consentLog: ConsentRecord[];
}

/** 每個寫入動作的呼叫情境：誰、在什麼時間。 */
export interface OpContext {
  actor: Account;
  now: Date;
}

export type CrmErrorCode =
  | 'NOT_FOUND'
  | 'DUPLICATE_ID'
  | 'INVALID_INPUT'
  | 'ALLERGY_CONFLICT_UNCONFIRMED'
  | 'CONSENT_REQUIRED'
  | 'SERVICE_ITEM_UNAVAILABLE';

export class CrmError extends Error {
  constructor(
    public readonly code: CrmErrorCode,
    message?: string,
    public readonly details: string[] = [],
  ) {
    super(message ?? code);
    this.name = 'CrmError';
  }
}

export function emptyState(base: {
  workspace: Workspace;
  stores?: Store[];
  accounts?: Account[];
  catalog?: ServiceItem[];
  recallSettings?: RecallSettings;
}): CrmState {
  return {
    schemaVersion: CRM_SCHEMA_VERSION,
    workspace: base.workspace,
    stores: base.stores ?? [],
    accounts: base.accounts ?? [],
    customers: [],
    treatments: [],
    packages: [],
    appointments: [],
    effects: [],
    catalog: base.catalog ?? DEFAULT_SERVICE_CATALOG.map((item) => ({ ...item })),
    recallSettings: base.recallSettings ?? defaultRecallSettings(),
    drafts: [],
    contactLog: [],
    sendLog: [],
    consentLog: [],
  };
}

// ---------- 內部工具 ----------

function requireCustomer(state: CrmState, customerId: string): Customer {
  const customer = state.customers.find((c) => c.id === customerId);
  if (!customer) throw new CrmError('NOT_FOUND', `customer not found: ${customerId}`);
  return customer;
}

function requireStore(state: CrmState, storeId: string | undefined): Store {
  const store = state.stores.find((s) => s.id === storeId);
  if (!store) throw new CrmError('NOT_FOUND', `store not found: ${String(storeId)}`);
  return store;
}

function replaceCustomer(state: CrmState, next: Customer): CrmState {
  return { ...state, customers: state.customers.map((c) => (c.id === next.id ? next : c)) };
}

function consentRecord(
  customerId: string,
  kind: ConsentKind,
  status: ConsentStatus,
  ctx: OpContext,
  seq: number,
): ConsentRecord {
  return {
    id: `consent-${customerId}-${kind}-${ctx.now.getTime().toString(36)}-${seq}`,
    customerId,
    kind,
    status,
    recordedAt: ctx.now.toISOString(),
    recordedBy: ctx.actor.id,
  };
}

function assertDesignerInStore(state: CrmState, designerId: string | undefined, store: Store): void {
  if (!designerId) return;
  const designer = state.accounts.find((a) => a.id === designerId);
  if (!designer || !belongsToStore(designer, store)) {
    throw new CrmError('INVALID_INPUT', `designer ${designerId} does not belong to store ${store.id}`);
  }
}

// ---------- 客戶 ----------

export interface NewCustomerInput {
  id: string;
  name: string;
  phone: string;
  storeId: string;
  email?: string;
  birthday?: string;
  preferences?: string[];
  tags?: string[];
  notes?: string;
  ownerDesignerId?: string;
  consent?: ConsentStatus;
  sensitiveDataConsent?: ConsentStatus;
  allergies?: string[];
  skinCondition?: string;
  healthNotes?: string;
  lineUserId?: string;
}

/** 新增客戶。未取得敏感個資同意時不可帶入過敏、皮膚狀況、健康備註。 */
export function addCustomer(state: CrmState, input: NewCustomerInput, ctx: OpContext): CrmState {
  const store = requireStore(state, input.storeId);
  const resource = { ...storeResource(store), ownerDesignerId: input.ownerDesignerId };
  assertCan(ctx.actor, 'customer:create', resource);
  if (state.customers.some((c) => c.id === input.id)) {
    throw new CrmError('DUPLICATE_ID', `customer id already exists: ${input.id}`);
  }
  assertDesignerInStore(state, input.ownerDesignerId, store);
  const sensitive = {
    allergies: (input.allergies ?? []).map((a) => a.trim()).filter(Boolean),
    skinCondition: input.skinCondition?.trim() || undefined,
    healthNotes: input.healthNotes?.trim() || undefined,
  };
  const sensitiveConsent = input.sensitiveDataConsent ?? 'pending';
  assertSensitiveAllowed(sensitiveConsent, sensitive);
  if (hasSensitiveData(sensitive)) assertCan(ctx.actor, 'customer:writeSensitive', resource);

  const stamp = ctx.now.toISOString();
  const customer: Customer = {
    ...createCustomer({
      id: input.id,
      name: input.name,
      phone: input.phone,
      email: input.email?.trim() || undefined,
      birthday: input.birthday || undefined,
      preferences: input.preferences,
      tags: input.tags,
      notes: input.notes?.trim() || undefined,
      consent: input.consent,
      storeId: store.id,
      ownerDesignerId: input.ownerDesignerId,
      sensitiveDataConsent: sensitiveConsent,
      lineUserId: input.lineUserId?.trim() || undefined,
      ...sensitive,
    }),
    createdAt: stamp,
    updatedAt: stamp,
  };
  return {
    ...state,
    customers: [...state.customers, customer],
    consentLog: [
      ...state.consentLog,
      consentRecord(customer.id, 'marketing', customer.consent, ctx, 1),
      consentRecord(customer.id, 'sensitive', sensitiveConsent, ctx, 2),
    ],
  };
}

export type CustomerPatch = Partial<
  Pick<
    Customer,
    | 'name'
    | 'phone'
    | 'email'
    | 'birthday'
    | 'preferences'
    | 'tags'
    | 'notes'
    | 'ownerDesignerId'
    | 'allergies'
    | 'skinCondition'
    | 'healthNotes'
    | 'lineUserId'
  >
>;

/** 編輯客戶。同意狀態請用 setMarketingConsent／setSensitiveConsent。 */
export function updateCustomerProfile(
  state: CrmState,
  customerId: string,
  patch: CustomerPatch,
  ctx: OpContext,
): CrmState {
  const customer = requireCustomer(state, customerId);
  const resource = customerResource(customer, state.stores);
  assertCan(ctx.actor, 'customer:update', resource);

  if (patch.name !== undefined && !patch.name.trim()) throw new CrmError('INVALID_INPUT', 'customer name required');
  if (patch.phone !== undefined && !/^09\d{8}$/.test(patch.phone)) {
    throw new CrmError('INVALID_INPUT', 'phone must be Taiwan mobile format 09xxxxxxxx');
  }
  if (patch.ownerDesignerId !== undefined && patch.ownerDesignerId !== customer.ownerDesignerId) {
    // 負責設計師決定誰能看 S 級欄位，改負責人需要 S 級寫入權限（店主、店長、目前的負責設計師）
    assertCan(ctx.actor, 'customer:writeSensitive', resource);
    assertDesignerInStore(state, patch.ownerDesignerId, requireStore(state, customer.storeId));
  }

  const touchesSensitive =
    patch.allergies !== undefined || patch.skinCondition !== undefined || patch.healthNotes !== undefined;
  if (touchesSensitive) {
    assertCan(ctx.actor, 'customer:writeSensitive', resource);
    assertSensitiveAllowed(sensitiveConsentOf(customer), patch);
  }

  const next: Customer = {
    ...customer,
    ...patch,
    name: patch.name !== undefined ? patch.name.trim() : customer.name,
    allergies:
      patch.allergies !== undefined ? patch.allergies.map((a) => a.trim()).filter(Boolean) : customer.allergies,
    skinCondition: patch.skinCondition !== undefined ? patch.skinCondition.trim() || undefined : customer.skinCondition,
    healthNotes: patch.healthNotes !== undefined ? patch.healthNotes.trim() || undefined : customer.healthNotes,
    updatedAt: ctx.now.toISOString(),
  };
  return replaceCustomer(state, next);
}

/** 行銷同意。不再是 granted 時，已核准的草稿退回 draft。 */
export function setMarketingConsent(
  state: CrmState,
  customerId: string,
  status: ConsentStatus,
  ctx: OpContext,
): CrmState {
  const customer = requireCustomer(state, customerId);
  assertCan(ctx.actor, 'customer:update', customerResource(customer, state.stores));
  if (customer.consent === status) return state;
  const next = replaceCustomer(state, { ...customer, consent: status, updatedAt: ctx.now.toISOString() });
  return {
    ...next,
    drafts:
      status === 'granted'
        ? next.drafts
        : next.drafts.map((d) => (d.customerId === customerId && d.status === 'approved' ? resetDraft(d) : d)),
    consentLog: [...next.consentLog, consentRecord(customerId, 'marketing', status, ctx, next.consentLog.length + 1)],
  };
}

/**
 * 敏感個資同意。撤回（或改回 pending）時，立即清除該客戶既有的 S 級資料：
 * 過敏、皮膚狀況、健康備註與全部效果紀錄。
 */
export function setSensitiveConsent(
  state: CrmState,
  customerId: string,
  status: ConsentStatus,
  ctx: OpContext,
): CrmState {
  const customer = requireCustomer(state, customerId);
  // 同意變更會清除或開放 S 級資料，只限有 S 級寫入權限者
  assertCan(ctx.actor, 'customer:writeSensitive', customerResource(customer, state.stores));
  if (sensitiveConsentOf(customer) === status) return state;
  const base: Customer = { ...customer, sensitiveDataConsent: status, updatedAt: ctx.now.toISOString() };
  const nextCustomer = status === 'granted' ? base : stripSensitive(base);
  const next = replaceCustomer(state, nextCustomer);
  return {
    ...next,
    effects: status === 'granted' ? next.effects : next.effects.filter((e) => e.customerId !== customerId),
    consentLog: [...next.consentLog, consentRecord(customerId, 'sensitive', status, ctx, next.consentLog.length + 1)],
  };
}

/**
 * 刪除單一客戶，連同療程、預約、套票、效果、草稿、聯絡紀錄、發送紀錄與同意紀錄。
 * 只有店主可執行。
 */
export function deleteCustomer(state: CrmState, customerId: string, ctx: OpContext): CrmState {
  const customer = requireCustomer(state, customerId);
  assertCan(ctx.actor, 'customer:delete', customerResource(customer, state.stores));
  const keep = <T extends { customerId: string }>(rows: T[]) => rows.filter((r) => r.customerId !== customerId);
  return {
    ...state,
    customers: state.customers.filter((c) => c.id !== customerId),
    treatments: keep(state.treatments),
    packages: keep(state.packages),
    appointments: keep(state.appointments),
    effects: keep(state.effects),
    drafts: keep(state.drafts),
    contactLog: keep(state.contactLog),
    sendLog: keep(state.sendLog),
    consentLog: keep(state.consentLog),
  };
}

// ---------- 服務（療程） ----------

/** 該品項的成分與客戶過敏紀錄的衝突清單（空陣列 = 無衝突）。 */
export function findAllergyConflicts(state: CrmState, customerId: string, catalogItemId: string): string[] {
  const customer = state.customers.find((c) => c.id === customerId);
  const item = findServiceItem(state.catalog, catalogItemId);
  if (!customer || !item) return [];
  return hasAllergyConflict(customer, item.ingredients);
}

export interface NewVisitInput {
  id: string;
  customerId: string;
  catalogItemId: string;
  performedAt: string; // ISO timestamp
  price?: number; // 未填用品項定價
  notes?: string;
  designerId?: string;
  packageId?: string; // 扣套票堂數
  /** 與過敏紀錄衝突時，必須由操作者明確確認後才可儲存 */
  acknowledgeAllergyConflict?: boolean;
}

/**
 * 新增服務：寫入療程資料（回訪日與待聯絡清單由此重算），
 * 可同時扣套票堂數，並把當日（含）以前尚未處理的預約標為已完成。
 */
export function addVisit(state: CrmState, input: NewVisitInput, ctx: OpContext): CrmState {
  const customer = requireCustomer(state, input.customerId);
  assertCan(ctx.actor, 'visit:create', customerResource(customer, state.stores));
  if (state.treatments.some((t) => t.id === input.id)) {
    throw new CrmError('DUPLICATE_ID', `treatment id already exists: ${input.id}`);
  }
  const item = findServiceItem(state.catalog, input.catalogItemId);
  if (!item || !item.active) {
    throw new CrmError('SERVICE_ITEM_UNAVAILABLE', `service item unavailable: ${input.catalogItemId}`);
  }
  const conflicts = hasAllergyConflict(customer, item.ingredients);
  if (conflicts.length > 0 && !input.acknowledgeAllergyConflict) {
    throw new CrmError('ALLERGY_CONFLICT_UNCONFIRMED', 'allergy conflict must be acknowledged', conflicts);
  }
  const store = requireStore(state, customer.storeId);
  const designerId = input.designerId ?? (ctx.actor.role === 'designer' ? ctx.actor.id : customer.ownerDesignerId);
  assertDesignerInStore(state, designerId, store);

  const treatment = recordTreatment({
    ...draftFromServiceItem(item, {
      id: input.id,
      customerId: customer.id,
      performedAt: input.performedAt,
      designerId,
      price: input.price,
      notes: input.notes?.trim() || undefined,
    }),
    storeId: store.id,
  });

  const visitDate = toDateOnly(new Date(treatment.performedAt));
  const previousLatest = state.treatments
    .filter((t) => t.customerId === customer.id)
    .reduce<string | undefined>((latest, t) => {
      const d = toDateOnly(new Date(t.performedAt));
      return latest === undefined || d > latest ? d : latest;
    }, undefined);
  // 只有這筆是最新的服務才開始新的回訪週期；補登過去日期不影響本輪草稿
  const startsNewCycle = previousLatest === undefined || visitDate >= previousLatest;
  let packages = state.packages;
  if (input.packageId) {
    const pkg = state.packages.find((p) => p.id === input.packageId && p.customerId === customer.id);
    if (!pkg) throw new CrmError('NOT_FOUND', `package not found: ${input.packageId}`);
    const used = consumePackageSession(pkg, visitDate);
    packages = state.packages.map((p) => (p.id === used.id ? used : p));
  }

  return {
    ...state,
    treatments: [...state.treatments, treatment],
    packages,
    appointments: state.appointments.map((a) =>
      a.customerId === customer.id && a.status === 'upcoming' && a.date <= visitDate ? completeAppointment(a) : a,
    ),
    // 新服務開始新的回訪週期：上一輪的草稿（含已送出）作廢，下一輪重新起草
    drafts: startsNewCycle ? state.drafts.filter((d) => d.customerId !== customer.id) : state.drafts,
  };
}

// ---------- 預約、套票、效果紀錄 ----------

export function addAppointment(
  state: CrmState,
  input: { id: string; customerId: string; designerId: string; date: string; time: string; catalogItemId?: string; note?: string },
  ctx: OpContext,
): CrmState {
  const customer = requireCustomer(state, input.customerId);
  assertCan(ctx.actor, 'appointment:write', customerResource(customer, state.stores));
  if (state.appointments.some((a) => a.id === input.id)) {
    throw new CrmError('DUPLICATE_ID', `appointment id already exists: ${input.id}`);
  }
  const store = requireStore(state, customer.storeId);
  assertDesignerInStore(state, input.designerId, store);
  const appointment = createAppointment({ ...input, storeId: store.id, createdAt: ctx.now.toISOString() });
  return { ...state, appointments: [...state.appointments, appointment] };
}

export function setAppointmentStatus(
  state: CrmState,
  appointmentId: string,
  status: Exclude<AppointmentStatus, 'upcoming'>,
  ctx: OpContext,
): CrmState {
  const appointment = state.appointments.find((a) => a.id === appointmentId);
  if (!appointment) throw new CrmError('NOT_FOUND', `appointment not found: ${appointmentId}`);
  const customer = requireCustomer(state, appointment.customerId);
  assertCan(ctx.actor, 'appointment:write', customerResource(customer, state.stores));
  const next = status === 'cancelled' ? cancelAppointment(appointment) : completeAppointment(appointment);
  return { ...state, appointments: state.appointments.map((a) => (a.id === next.id ? next : a)) };
}

export function addPackage(
  state: CrmState,
  input: {
    id: string;
    customerId: string;
    name: string;
    totalSessions: number;
    usedSessions?: number;
    startDate: string;
    endDate: string;
    price: number;
    catalogItemIds?: string[];
  },
  ctx: OpContext,
): CrmState {
  const customer = requireCustomer(state, input.customerId);
  assertCan(ctx.actor, 'package:write', customerResource(customer, state.stores));
  if (state.packages.some((p) => p.id === input.id)) {
    throw new CrmError('DUPLICATE_ID', `package id already exists: ${input.id}`);
  }
  return { ...state, packages: [...state.packages, createPackage({ ...input, storeId: customer.storeId })] };
}

/** 新增 Before/After 效果紀錄（S 級）：需敏感個資同意與 S 級寫入權限。 */
export function addEffectRecord(
  state: CrmState,
  input: {
    id: string;
    customerId: string;
    date: string;
    type: EffectRecordType;
    sessionLabel: string;
    notes?: string;
    metrics?: SkinMetrics;
    imageRef?: string;
  },
  ctx: OpContext,
): CrmState {
  const customer = requireCustomer(state, input.customerId);
  assertCan(ctx.actor, 'customer:writeSensitive', customerResource(customer, state.stores));
  if (state.effects.some((e) => e.id === input.id)) {
    throw new CrmError('DUPLICATE_ID', `effect record id already exists: ${input.id}`);
  }
  const record = createEffectRecord(input, sensitiveConsentOf(customer));
  return { ...state, effects: [...state.effects, record] };
}

// ---------- 設定 ----------

/** 調整某類服務的回訪天數（店主、店長）。回訪日由 reminders 依新設定重算。 */
export function updateRecallSetting(
  state: CrmState,
  category: TreatmentCategory,
  days: number,
  ctx: OpContext,
): CrmState {
  const allowed = state.stores.some((store) => can(ctx.actor, 'settings:update', storeResource(store)));
  if (!allowed) assertCan(ctx.actor, 'settings:update', { workspaceId: state.workspace.id });
  return { ...state, recallSettings: setRecallDays(state.recallSettings, category, days) };
}

// ---------- 回訪草稿、聯絡、LINE dry-run ----------

export function getDraft(state: CrmState, customerId: string): FollowupDraft | undefined {
  return state.drafts.find((d) => d.customerId === customerId);
}

function upsertDraft(state: CrmState, draft: FollowupDraft): CrmState {
  const exists = state.drafts.some((d) => d.customerId === draft.customerId);
  return {
    ...state,
    drafts: exists
      ? state.drafts.map((d) => (d.customerId === draft.customerId ? draft : d))
      : [...state.drafts, draft],
  };
}

/** 保存草稿內容。已核准的草稿被改動後退回 draft。 */
export function saveDraft(state: CrmState, customerId: string, body: string, ctx: OpContext): CrmState {
  const customer = requireCustomer(state, customerId);
  assertCan(ctx.actor, 'draft:write', customerResource(customer, state.stores));
  const existing = getDraft(state, customerId);
  const next = existing ? editDraftBody(existing, body, ctx.now) : createDraft(customerId, body, ctx.now);
  return next === existing ? state : upsertDraft(state, next);
}

/** 設計師核准草稿。未取得行銷同意或草稿是空的時 throw CONSENT_REQUIRED／INVALID_INPUT。 */
export function approveCustomerDraft(state: CrmState, customerId: string, ctx: OpContext): CrmState {
  const customer = requireCustomer(state, customerId);
  assertCan(ctx.actor, 'draft:write', customerResource(customer, state.stores));
  if (!canActOnDraft(customer.consent)) throw new CrmError('CONSENT_REQUIRED', 'marketing consent required');
  const draft = getDraft(state, customerId);
  if (!draft || !draft.body.trim()) throw new CrmError('INVALID_INPUT', 'draft body required');
  return upsertDraft(state, approveDraft(draft));
}

/** 標記已聯絡：寫入聯絡紀錄，回流漏斗「已聯絡」由此推進。 */
export function markContacted(
  state: CrmState,
  input: { id: string; customerId: string; channel?: ContactRecord['channel']; note?: string },
  ctx: OpContext,
): CrmState {
  const customer = requireCustomer(state, input.customerId);
  assertCan(ctx.actor, 'customer:update', customerResource(customer, state.stores));
  if (state.contactLog.some((c) => c.id === input.id)) {
    throw new CrmError('DUPLICATE_ID', `contact record id already exists: ${input.id}`);
  }
  const record: ContactRecord = {
    id: input.id,
    customerId: customer.id,
    channel: input.channel ?? 'other',
    contactedAt: ctx.now.toISOString(),
    contactedBy: ctx.actor.id,
    note: input.note?.trim() || undefined,
  };
  return { ...state, contactLog: [...state.contactLog, record] };
}

/**
 * 以 adapter（M1 只有 dry-run）處理一位客戶的回訪提醒。
 * 成功時把 payload 寫入本機發送紀錄並把草稿標為 sent；不會寫入「已聯絡」，
 * 因為 dry-run 沒有真的把訊息送到客戶手上。
 */
export function sendReminder(
  state: CrmState,
  customerId: string,
  adapter: LineReminderAdapter,
  ctx: OpContext,
): { state: CrmState; result: LineSendResult } {
  const customer = requireCustomer(state, customerId);
  assertCan(ctx.actor, 'reminder:send', customerResource(customer, state.stores));
  const draft = getDraft(state, customerId);
  const result = adapter.send({ customer, draft });
  if (!result.ok) return { state, result };
  const withLog: CrmState = { ...state, sendLog: [...state.sendLog, result.record] };
  return { state: draft ? upsertDraft(withLog, markDraftSent(draft, ctx.now)) : withLog, result };
}
