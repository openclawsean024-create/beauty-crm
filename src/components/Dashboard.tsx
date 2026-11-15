'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { describeDesigner, designersOfStore, findAccount, storesForAccount } from '@/lib/accounts';
import { computeCustomerLTV } from '@/lib/analytics';
import { nextAppointment } from '@/lib/appointments';
import type { ConsentStatus } from '@/lib/customers';
import {
  CrmError,
  addAppointment,
  addCustomer,
  addVisit,
  approveCustomerDraft,
  deleteCustomer,
  findAllergyConflicts,
  getDraft,
  markContacted,
  saveDraft,
  sendReminder,
  setAppointmentStatus,
  setMarketingConsent,
  setSensitiveConsent,
  updateCustomerProfile,
  updateRecallSetting,
  type CrmState,
  type CustomerPatch,
  type OpContext,
} from '@/lib/crm-store';
import { parseDateOnly, toDateOnly } from '@/lib/dates';
import { EffectError, summarizeEffects } from '@/lib/effects';
import { buildExportPayload, downloadExport } from '@/lib/export';
import { buildRecallDraftBody } from '@/lib/followups';
import { t, tf, toggleLang, type Lang, type MessageKey } from '@/lib/i18n';
import { computeKpis, normalizeCounts, weeklyRecallCounts } from '@/lib/kpi';
import { createDryRunLineAdapter, type LineReminderErrorCode } from '@/lib/line-reminder';
import { clearLocalData, getBrowserStorage } from '@/lib/local-store';
import { PackageError, summarizePackages } from '@/lib/packages';
import { PermissionError, can, storeResource, viewCustomer, type CustomerView } from '@/lib/permissions';
import {
  loadPersistedState,
  persistState,
  removeVisitsForClient,
  type PersistedState,
  type Theme,
} from '@/lib/persistence';
import { buildRecallQueue, computeFunnel } from '@/lib/recall-queue';
import { RECALL_CATEGORIES, type RecallSettings } from '@/lib/recall-settings';
import { computeReminder } from '@/lib/reminders';
import { DEFAULT_ACCOUNT_ID, DEFAULT_STORE_ID, buildEmptyDemoState, buildSeedState } from '@/lib/seed';
import { SensitiveConsentError } from '@/lib/sensitive';
import { activeServiceItems } from '@/lib/service-catalog';
import { tierForSpend } from '@/lib/tiers';
import { lastTreatment, treatmentsByCustomer } from '@/lib/treatments';

import AddTreatmentSheet, { type VisitFormValues } from './AddTreatmentSheet';
import ClientsView from './ClientsView';
import CustomerMemoryPanel from './CustomerMemoryPanel';
import CustomerSheet, { type CustomerFormValues } from './CustomerSheet';
import Funnel from './Funnel';
import InsightsView from './InsightsView';
import MobileBottomNav from './MobileBottomNav';
import NextBestActions from './NextBestActions';
import RecallQueue from './RecallQueue';
import RetentionView from './RetentionView';
import ReturnRhythmChart from './ReturnRhythmChart';
import SettingsView from './SettingsView';
import Sidebar from './Sidebar';
import StatsCards from './StatsCards';
import TopBar from './TopBar';
import { type QueueFilter, type Tab } from './dashboard-types';
import { useCrmStore } from './useCrmStore';

const REMINDER_ERROR: Record<LineReminderErrorCode, MessageKey> = {
  DRAFT_NOT_APPROVED: 'errDraftNotApproved',
  CONSENT_REQUIRED: 'errConsentRequired',
};

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 把 domain 層的錯誤轉成給使用者看的文案（不外洩內部錯誤訊息）。 */
function describeError(lang: Lang, err: unknown): string {
  if (err instanceof PermissionError) return t(lang, 'errPermission');
  if (err instanceof SensitiveConsentError) return t(lang, 'errSensitiveConsent');
  if (err instanceof EffectError && err.code === 'SENSITIVE_CONSENT_REQUIRED') return t(lang, 'errSensitiveConsent');
  if (err instanceof CrmError) {
    if (err.code === 'ALLERGY_CONFLICT_UNCONFIRMED') return t(lang, 'errAllergyConflict');
    if (err.code === 'CONSENT_REQUIRED') return t(lang, 'errConsentRequired');
    return t(lang, 'errInvalidInput');
  }
  if (err instanceof PackageError) return t(lang, 'errInvalidInput');
  if (err instanceof Error && /required|must|invalid|cannot/i.test(err.message)) return t(lang, 'errInvalidInput');
  return t(lang, 'errGeneric');
}

export default function Dashboard() {
  const { crm, today, commit } = useCrmStore();
  const todayIso = useMemo(() => toDateOnly(today), [today]);

  // 偏好設定（語言、主題）
  const [lang, setLang] = useState<Lang>('zh');
  const [theme, setTheme] = useState<Theme>('light');
  const [persisted, setPersisted] = useState<PersistedState>({});
  const [prefsReady, setPrefsReady] = useState(false);

  // 身分與店別（M1 為本機示範帳號，沒有真實登入）
  const [accountId, setAccountId] = useState(DEFAULT_ACCOUNT_ID);
  const [storeId, setStoreId] = useState(DEFAULT_STORE_ID);

  // 畫面狀態
  const [tab, setTab] = useState<Tab>('today');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [globalQuery, setGlobalQuery] = useState('');
  const [queueQuery, setQueueQuery] = useState('');
  const [filter, setFilter] = useState<QueueFilter>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [customerSheet, setCustomerSheet] = useState<'closed' | 'new' | 'edit'>('closed');
  const [draftOpen, setDraftOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: '', show: false });

  const lineAdapter = useMemo(() => createDryRunLineAdapter(), []);
  const notify = useCallback((msg: string) => setToast({ msg, show: true }), []);

  useEffect(() => {
    const state = loadPersistedState();
    setPersisted(state);
    setLang(state.lang ?? 'zh');
    setTheme(state.theme ?? 'light');
    setPrefsReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant-TW' : 'en';
  }, [lang]);

  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 2600);
    return () => clearTimeout(timer);
  }, [toast.show, toast.msg]);

  // 鍵盤快捷鍵：/ 搜尋、N 新增服務、Esc 關閉
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
        if (event.key === 'Escape') target?.blur();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === '/') {
        event.preventDefault();
        document.getElementById('global-search')?.focus();
      } else if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setAddOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ---------- 由資料與權限推導出畫面內容 ----------

  const actor = useMemo(
    () => (crm ? findAccount(crm.accounts, accountId) ?? crm.accounts[0] : undefined),
    [crm, accountId],
  );
  const myStores = useMemo(() => (crm && actor ? storesForAccount(actor, crm.stores) : []), [crm, actor]);
  const activeStore = myStores.find((s) => s.id === storeId) ?? myStores[0];
  const activeStoreId = activeStore?.id ?? '';

  /** 目前帳號在這家店看得到的客戶；無權看 S 級欄位者已被清空 */
  const views = useMemo<CustomerView[]>(() => {
    if (!crm || !actor) return [];
    return crm.customers
      .filter((c) => c.storeId === activeStoreId)
      .map((c) => viewCustomer(actor, c, crm.stores))
      .filter((v): v is CustomerView => v !== undefined);
  }, [crm, actor, activeStoreId]);
  const customers = useMemo(() => views.map((v) => v.customer), [views]);
  const customerIds = useMemo(() => new Set(customers.map((c) => c.id)), [customers]);
  const treatments = useMemo(
    () => (crm ? crm.treatments.filter((tx) => customerIds.has(tx.customerId)) : []),
    [crm, customerIds],
  );
  const appointments = useMemo(
    () => (crm ? crm.appointments.filter((a) => customerIds.has(a.customerId)) : []),
    [crm, customerIds],
  );

  const rows = useMemo(
    () =>
      crm
        ? buildRecallQueue({
            customers,
            treatments,
            appointments,
            contactLog: crm.contactLog,
            recallSettings: crm.recallSettings,
            today,
          })
        : [],
    [crm, customers, treatments, appointments, today],
  );
  const funnel = useMemo(() => computeFunnel(rows), [rows]);
  const kpis = useMemo(() => computeKpis(treatments, today), [treatments, today]);
  const rhythmCounts = useMemo(
    () => weeklyRecallCounts(treatments, today, crm?.recallSettings),
    [treatments, today, crm?.recallSettings],
  );
  const rhythm = useMemo(() => normalizeCounts(rhythmCounts), [rhythmCounts]);

  const overdueCount = rows.filter((r) => r.daysUntilRecall < 0).length;
  const upcomingCount = rows.length - overdueCount;

  const selectedView = useMemo(() => {
    const explicit = views.find((v) => v.customer.id === selectedId);
    if (explicit) return explicit;
    const fallbackId = rows[0]?.customer.id ?? customers[0]?.id;
    return views.find((v) => v.customer.id === fallbackId) ?? null;
  }, [views, selectedId, rows, customers]);
  const selected = selectedView?.customer ?? null;
  const selectedRow = rows.find((r) => r.customer.id === selected?.id);

  const panelData = useMemo(() => {
    if (!crm || !selected) return null;
    const mine = treatmentsByCustomer(treatments, selected.id);
    const last = lastTreatment(treatments, selected.id);
    const draft = getDraft(crm, selected.id);
    const designer = findAccount(crm.accounts, selected.ownerDesignerId);
    const tier = tierForSpend(computeCustomerLTV(treatments, selected.id).totalSpent);
    return {
      recent: mine.slice(0, 3),
      last,
      daysUntilRecall: last
        ? computeReminder(selected, treatments, today, 7, crm.recallSettings).daysUntilRecall
        : undefined,
      packageSummary: summarizePackages(crm.packages, selected.id, todayIso),
      nextAppointment: nextAppointment(crm.appointments, selected.id, todayIso),
      effectSummary: selectedView?.sensitiveHidden ? undefined : summarizeEffects(crm.effects, selected.id),
      designerName: designer?.name,
      designerDescription: designer ? describeDesigner(designer) : '',
      tierLabel: lang === 'zh' ? tier.label : tier.tier.toUpperCase(),
      draftBody: draft?.body ?? buildRecallDraftBody(selected.name, last?.serviceName),
      draftStatus: draft?.status ?? ('draft' as const),
      hasDraft: draft !== undefined,
    };
  }, [crm, selected, selectedView, treatments, today, todayIso, lang]);

  const workspaceResource = useMemo(() => ({ workspaceId: crm?.workspace.id ?? '' }), [crm?.workspace.id]);
  const canManageData = can(actor, 'data:export', workspaceResource);
  const canEditSettings = Boolean(activeStore) && can(actor, 'settings:update', storeResource(activeStore!));
  const canDeleteSelected =
    Boolean(selected) && Boolean(activeStore) && can(actor, 'customer:delete', storeResource(activeStore!));
  const storeDesigners = useMemo(
    () => (crm ? designersOfStore(crm.accounts, activeStoreId) : []),
    [crm, activeStoreId],
  );
  const team = useMemo(
    () => (crm ? crm.accounts.filter((a) => a.role === 'owner' || a.storeIds.includes(activeStoreId)) : []),
    [crm, activeStoreId],
  );
  const catalog = useMemo(() => (crm ? activeServiceItems(crm.catalog) : []), [crm]);

  const nextBestActions = useMemo(() => {
    const items: Array<{ title: string; meta: string }> = [];
    const overdue = rows.filter((r) => r.daysUntilRecall < 0 && !r.booked);
    const approvable = overdue.find((r) => r.customer.consent === 'granted' && !r.contacted);
    if (approvable) {
      items.push({ title: tf(lang, 'nextApprove', { name: approvable.customer.name }), meta: t(lang, 'nextApproveMeta') });
    } else if (overdue[0]) {
      items.push({
        title: tf(lang, 'nextReach', { name: overdue[0].customer.name }),
        meta: tf(lang, 'daysOverdue', { n: Math.abs(overdue[0].daysUntilRecall) }),
      });
    }
    const pending = rows.find((r) => r.customer.consent === 'pending');
    if (pending) {
      items.push({ title: tf(lang, 'nextConsent', { name: pending.customer.name }), meta: t(lang, 'nextConsentMeta') });
    }
    if (upcomingCount > 0) {
      items.push({ title: tf(lang, 'nextReview', { n: upcomingCount }), meta: t(lang, 'nextReviewMeta') });
    }
    if (items.length === 0) items.push({ title: t(lang, 'nextAllClear'), meta: t(lang, 'nextAllClearMeta') });
    return items.slice(0, 3);
  }, [rows, upcomingCount, lang]);

  // ---------- 寫入動作 ----------

  /** 執行一個 store 動作：成功就 commit（寫回 localStorage），失敗顯示錯誤文案。 */
  const run = (op: (state: CrmState, ctx: OpContext) => CrmState, okMessage?: string): boolean => {
    if (!crm || !actor) return false;
    try {
      const next = op(crm, { actor, now: new Date() });
      if (next !== crm) commit(next);
      if (okMessage) notify(okMessage);
      return true;
    } catch (err) {
      notify(describeError(lang, err));
      return false;
    }
  };

  const savePrefs = (patch: PersistedState) => {
    setPersisted((prev) => {
      const merged = { ...prev, ...patch };
      persistState(merged);
      return merged;
    });
  };

  const handleToggleLang = () => {
    const next = toggleLang(lang);
    setLang(next);
    savePrefs({ lang: next });
  };

  const handleToggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    savePrefs({ theme: next });
  };

  const handleAccountChange = (nextId: string) => {
    if (!crm) return;
    const next = findAccount(crm.accounts, nextId);
    if (!next) return;
    setAccountId(next.id);
    const allowed = storesForAccount(next, crm.stores);
    if (!allowed.some((s) => s.id === storeId)) setStoreId(allowed[0]?.id ?? '');
    setSelectedId(null);
    setDraftOpen(false);
    setAddOpen(false);
    setCustomerSheet('closed');
    notify(tf(lang, 'sessionSwitched', { name: next.name }));
  };

  const handleStoreChange = (nextStoreId: string) => {
    setStoreId(nextStoreId);
    setSelectedId(null);
    setDraftOpen(false);
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setDraftOpen(false);
  };

  const handleSearchChange = (value: string) => {
    setGlobalQuery(value);
    if (value.trim() && tab !== 'clients') setTab('clients');
  };

  const handleExport = () => {
    if (!crm || !actor || !canManageData) {
      notify(t(lang, 'errPermission'));
      return;
    }
    const ids = customerIds;
    const payload = buildExportPayload(customers, treatments, persisted, `${crm.workspace.name}／${activeStore?.name ?? ''}`, {
      packages: crm.packages.filter((p) => ids.has(p.customerId)),
      appointments,
      effects: crm.effects.filter((e) => ids.has(e.customerId)),
      contactLog: crm.contactLog.filter((k) => ids.has(k.customerId)),
      sendLog: crm.sendLog.filter((r) => ids.has(r.customerId)),
      consentLog: crm.consentLog.filter((r) => ids.has(r.customerId)),
      exportedBy: actor.id,
    });
    downloadExport(payload);
    notify(`${t(lang, 'exportedToast')} · ${t(lang, 'exportWarning')}`);
  };

  const handleDraftChange = (value: string) => {
    if (!selected) return;
    run((state, ctx) => saveDraft(state, selected.id, value, ctx));
  };

  const handleApproveDraft = () => {
    if (!selected || !panelData) return;
    run((state, ctx) => {
      const withDraft = getDraft(state, selected.id) ? state : saveDraft(state, selected.id, panelData.draftBody, ctx);
      return approveCustomerDraft(withDraft, selected.id, ctx);
    }, t(lang, 'approvedToast'));
  };

  const handleCopyDraft = async () => {
    const manual = lang === 'zh' ? '請手動複製草稿' : 'Select and copy the draft manually';
    try {
      if (panelData && navigator.clipboard) {
        await navigator.clipboard.writeText(panelData.draftBody);
        notify(t(lang, 'copiedToast'));
      } else {
        notify(manual);
      }
    } catch {
      notify(manual);
    }
  };

  const handleDryRun = () => {
    if (!crm || !actor || !selected) return;
    try {
      const { state, result } = sendReminder(crm, selected.id, lineAdapter, { actor, now: new Date() });
      if (result.ok) {
        commit(state);
        notify(t(lang, 'lineDryRunDone'));
      } else {
        notify(t(lang, REMINDER_ERROR[result.code]));
      }
    } catch (err) {
      notify(describeError(lang, err));
    }
  };

  const handleMarkContacted = () => {
    if (!selected) return;
    run(
      (state, ctx) => markContacted(state, { id: newId('contact'), customerId: selected.id, channel: 'other' }, ctx),
      t(lang, 'contactedToast'),
    );
  };

  const handleSetMarketingConsent = (status: ConsentStatus) => {
    if (!selected) return;
    run((state, ctx) => setMarketingConsent(state, selected.id, status, ctx), t(lang, 'marketingUpdatedToast'));
  };

  const handleGrantSensitive = () => {
    if (!selected) return;
    run((state, ctx) => setSensitiveConsent(state, selected.id, 'granted', ctx), t(lang, 'sensitiveGrantedToast'));
  };

  const handleRevokeSensitive = () => {
    if (!selected) return;
    run((state, ctx) => setSensitiveConsent(state, selected.id, 'revoked', ctx), t(lang, 'sensitiveRevoked'));
  };

  const handleAddAppointment = (date: string, time: string) => {
    if (!selected || !actor) return;
    const designerId =
      selected.ownerDesignerId ?? (actor.role === 'designer' ? actor.id : storeDesigners[0]?.id);
    if (!designerId) {
      notify(t(lang, 'errInvalidInput'));
      return;
    }
    run(
      (state, ctx) => addAppointment(state, { id: newId('appt'), customerId: selected.id, designerId, date, time }, ctx),
      t(lang, 'appointmentSaved'),
    );
  };

  const handleCancelAppointment = (appointmentId: string) => {
    run((state, ctx) => setAppointmentStatus(state, appointmentId, 'cancelled', ctx), t(lang, 'appointmentCancelled'));
  };

  const handleSaveVisit = (values: VisitFormValues) => {
    // 今天的服務用現在時間；補登過去日期用當天中午（當地時間）
    const performedAt =
      values.date === todayIso
        ? new Date()
        : (() => {
            const d = parseDateOnly(values.date);
            d.setHours(12, 0, 0, 0);
            return d;
          })();
    const ok = run(
      (state, ctx) =>
        addVisit(
          state,
          {
            id: newId('visit'),
            customerId: values.customerId,
            catalogItemId: values.catalogItemId,
            performedAt: performedAt.toISOString(),
            price: values.price,
            notes: values.notes,
            designerId: values.designerId,
            packageId: values.packageId,
            acknowledgeAllergyConflict: values.acknowledgeAllergyConflict,
          },
          ctx,
        ),
      t(lang, 'visitSavedToast'),
    );
    if (ok) {
      setAddOpen(false);
      setSelectedId(values.customerId);
    }
  };

  const handleSaveCustomer = (values: CustomerFormValues) => {
    if (customerSheet === 'new') {
      const id = newId('cust');
      const ok = run(
        (state, ctx) =>
          addCustomer(
            state,
            {
              id,
              storeId: activeStoreId,
              name: values.name,
              phone: values.phone,
              email: values.email,
              preferences: values.preferences,
              tags: values.tags,
              notes: values.notes,
              ownerDesignerId: values.ownerDesignerId,
              consent: values.consent,
              sensitiveDataConsent: values.sensitiveDataConsent,
              allergies: values.allergies,
              skinCondition: values.skinCondition,
              healthNotes: values.healthNotes,
            },
            ctx,
          ),
        t(lang, 'customerSaved'),
      );
      if (ok) {
        setCustomerSheet('closed');
        setSelectedId(id);
      }
      return;
    }
    if (!selected || !selectedView) return;
    const sensitiveEditable = !selectedView.sensitiveHidden && values.sensitiveDataConsent === 'granted';
    const patch: CustomerPatch = {
      name: values.name,
      phone: values.phone,
      email: values.email || undefined,
      preferences: values.preferences,
      tags: values.tags,
      notes: values.notes || undefined,
      ownerDesignerId: values.ownerDesignerId,
      ...(sensitiveEditable
        ? { allergies: values.allergies, skinCondition: values.skinCondition, healthNotes: values.healthNotes }
        : {}),
    };
    const ok = run((state, ctx) => {
      const updated = updateCustomerProfile(state, selected.id, patch, ctx);
      return values.consent !== selected.consent
        ? setMarketingConsent(updated, selected.id, values.consent, ctx)
        : updated;
    }, t(lang, 'customerSaved'));
    if (ok) setCustomerSheet('closed');
  };

  const handleDeleteCustomer = () => {
    if (!selected) return;
    const name = selected.name;
    const ok = run((state, ctx) => deleteCustomer(state, selected.id, ctx), t(lang, 'customerDeleted'));
    if (ok) {
      // 舊版 visitLog 內同名紀錄一併移除
      setPersisted((prev) => {
        const cleaned = removeVisitsForClient(prev, name);
        persistState(cleaned);
        return cleaned;
      });
      setSelectedId(null);
      setDraftOpen(false);
    }
  };

  const handleSaveRecall = (next: RecallSettings) => {
    run(
      (state, ctx) =>
        RECALL_CATEGORIES.reduce(
          (acc, category) =>
            acc.recallSettings[category] === next[category]
              ? acc
              : updateRecallSetting(acc, category, next[category], ctx),
          state,
        ),
      t(lang, 'recallSaved'),
    );
  };

  const handleClearAll = () => {
    if (!canManageData) {
      notify(t(lang, 'errPermission'));
      return;
    }
    clearLocalData(getBrowserStorage());
    setPersisted({});
    commit(buildEmptyDemoState()); // 只剩店別、帳號與品項，沒有任何客戶資料
    setSelectedId(null);
    setDraftOpen(false);
    notify(t(lang, 'clearAllDone'));
  };

  const handleReloadDemo = () => {
    if (!canManageData) {
      notify(t(lang, 'errPermission'));
      return;
    }
    commit(buildSeedState(today));
    setSelectedId(null);
    notify(t(lang, 'reloadDemoDone'));
  };

  const findConflicts = useCallback(
    (customerId: string, catalogItemId: string) => (crm ? findAllergyConflicts(crm, customerId, catalogItemId) : []),
    [crm],
  );
  const usablePackages = useCallback(
    (customerId: string, catalogItemId: string) =>
      crm
        ? summarizePackages(crm.packages, customerId, todayIso).usable.filter(
            (p) => p.catalogItemIds.length === 0 || p.catalogItemIds.includes(catalogItemId),
          )
        : [],
    [crm, todayIso],
  );
  const canSeeSensitive = useCallback(
    (customerId: string) => views.find((v) => v.customer.id === customerId)?.sensitiveHidden === false,
    [views],
  );

  if (!crm || !actor || !prefsReady) {
    return (
      <span role="status" aria-live="polite" style={{ padding: 24, display: 'block' }}>
        {t(lang, 'loading')}
      </span>
    );
  }

  const userInitial = actor.name.trim().slice(-1).toUpperCase();

  const memoryPanel = (
    <CustomerMemoryPanel
      key={`${actor.id}:${selected?.id ?? 'none'}`}
      lang={lang}
      today={todayIso}
      view={selectedView}
      daysUntilRecall={panelData?.daysUntilRecall}
      contacted={selectedRow?.contacted ?? false}
      recentTreatments={panelData?.recent ?? []}
      lastTreatment={panelData?.last}
      packageSummary={
        panelData?.packageSummary ?? {
          usable: [],
          remainingSessions: 0,
          remainingValue: 0,
          nearestExpiry: undefined,
          expiringSoon: false,
        }
      }
      nextAppointment={panelData?.nextAppointment}
      effectSummary={panelData?.effectSummary}
      designerName={panelData?.designerName}
      designerDescription={panelData?.designerDescription ?? ''}
      tierLabel={panelData?.tierLabel ?? ''}
      draftBody={panelData?.draftBody ?? ''}
      draftStatus={panelData?.draftStatus ?? 'draft'}
      draftOpen={draftOpen}
      canDelete={canDeleteSelected}
      onDraftToggle={() => setDraftOpen((v) => !v)}
      onDraftChange={handleDraftChange}
      onApproveDraft={handleApproveDraft}
      onCopyDraft={() => void handleCopyDraft()}
      onDryRun={handleDryRun}
      onMarkContacted={handleMarkContacted}
      onSetMarketingConsent={handleSetMarketingConsent}
      onGrantSensitive={handleGrantSensitive}
      onRevokeSensitive={handleRevokeSensitive}
      onAddAppointment={handleAddAppointment}
      onCancelAppointment={handleCancelAppointment}
      onEdit={() => setCustomerSheet('edit')}
      onDelete={handleDeleteCustomer}
    />
  );

  return (
    <div className="app" data-account-role={actor.role} data-store-id={activeStoreId}>
      <Sidebar lang={lang} activeTab={tab} onTabChange={setTab} userInitial={userInitial} />

      <div className="shell">
        <TopBar
          lang={lang}
          theme={theme}
          searchValue={globalQuery}
          onSearchChange={handleSearchChange}
          onToggleLang={handleToggleLang}
          onToggleTheme={handleToggleTheme}
          accounts={crm.accounts}
          stores={myStores}
          accountId={actor.id}
          storeId={activeStoreId}
          onAccountChange={handleAccountChange}
          onStoreChange={handleStoreChange}
          userInitial={userInitial}
        />

        <main>
          <p className="demo-banner" role="note" data-testid="demo-banner">
            {t(lang, 'demoBanner')}
          </p>

          {tab === 'today' ? (
            <>
              <section className="hero">
                <div>
                  <div className="overline mono">{t(lang, 'overline')}</div>
                  <h1>{t(lang, 'headline')}</h1>
                  <p className="hero-copy">
                    {t(lang, 'heroLead')} <strong>{tf(lang, 'heroOverdue', { n: overdueCount })}</strong>
                    {tf(lang, 'heroUpcoming', { n: upcomingCount })}
                  </p>
                </div>
                <button type="button" className="button primary" id="open-add" onClick={() => setAddOpen(true)}>
                  {t(lang, 'newVisit')}
                </button>
              </section>

              <StatsCards
                lang={lang}
                followupsDue={rows.length}
                overdueCount={overdueCount}
                upcomingCount={upcomingCount}
                kpis={kpis}
              />

              <div className="content-grid">
                <RecallQueue
                  lang={lang}
                  rows={rows}
                  selectedCustomerId={selected?.id ?? null}
                  filter={filter}
                  query={queueQuery}
                  onFilterChange={setFilter}
                  onQueryChange={setQueueQuery}
                  onSelect={handleSelect}
                  onExport={canManageData ? handleExport : undefined}
                  onShowAll={() => {
                    setFilter('all');
                    setQueueQuery('');
                  }}
                />
                {memoryPanel}
              </div>

              <div className="bottom-grid">
                <Funnel lang={lang} counts={funnel} />
                <NextBestActions lang={lang} items={nextBestActions} />
              </div>
              <div className="stack" style={{ marginTop: 16 }}>
                <ReturnRhythmChart lang={lang} values={rhythm} counts={rhythmCounts} />
              </div>
            </>
          ) : null}

          {tab === 'clients' ? (
            <div className="content-grid">
              <ClientsView
                lang={lang}
                customers={customers}
                treatments={treatments}
                selectedCustomerId={selected?.id ?? null}
                query={globalQuery}
                onQueryChange={setGlobalQuery}
                onSelect={handleSelect}
                onAdd={() => setCustomerSheet('new')}
              />
              {memoryPanel}
            </div>
          ) : null}

          {tab === 'retention' ? (
            <RetentionView
              lang={lang}
              today={todayIso}
              funnel={funnel}
              rows={rows}
              customers={customers}
              appointments={appointments}
              drafts={crm.drafts.filter((d) => customerIds.has(d.customerId))}
              sendLog={crm.sendLog.filter((r) => customerIds.has(r.customerId))}
            />
          ) : null}

          {tab === 'insights' ? (
            <InsightsView lang={lang} customers={customers} treatments={treatments} rhythm={rhythm} />
          ) : null}

          {tab === 'settings' ? (
            <SettingsView
              lang={lang}
              recallSettings={crm.recallSettings}
              canEditSettings={canEditSettings}
              onSaveRecall={handleSaveRecall}
              team={team}
              catalog={catalog}
              canManageData={canManageData}
              onExport={handleExport}
              onClearAll={handleClearAll}
              onReloadDemo={handleReloadDemo}
            />
          ) : null}
        </main>
      </div>

      <MobileBottomNav activeTab={tab} lang={lang} onTabChange={setTab} />

      <AddTreatmentSheet
        lang={lang}
        open={addOpen}
        today={todayIso}
        customers={customers}
        catalog={catalog}
        designers={storeDesigners}
        defaultCustomerId={selected?.id}
        defaultDesignerId={actor.role === 'designer' ? actor.id : undefined}
        usablePackages={usablePackages}
        findConflicts={findConflicts}
        canSeeSensitive={canSeeSensitive}
        onClose={() => setAddOpen(false)}
        onSave={handleSaveVisit}
      />

      <CustomerSheet
        lang={lang}
        open={customerSheet !== 'closed'}
        customer={customerSheet === 'edit' ? selected : null}
        canWriteSensitive={customerSheet === 'edit' ? selectedView?.sensitiveHidden === false : true}
        designers={storeDesigners}
        defaultDesignerId={actor.role === 'designer' ? actor.id : undefined}
        onClose={() => setCustomerSheet('closed')}
        onSave={handleSaveCustomer}
      />

      <div className={`toast${toast.show ? ' show' : ''}`} role="status" aria-live="polite" id="toast">
        {toast.msg}
      </div>
    </div>
  );
}
