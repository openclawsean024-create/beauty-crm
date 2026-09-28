'use client';

import { useEffect, useMemo, useState } from 'react';
import { createCustomer, type Customer } from '@/lib/customers';
import { recordTreatment, type Treatment } from '@/lib/treatments';
import { computeReminder } from '@/lib/reminders';
import { computeCustomerLTV } from '@/lib/analytics';
import { isLang, t, toggleLang, type Lang } from '@/lib/i18n';
import {
  loadPersistedState,
  persistState,
  appendVisit,
  mergePersistedState,
  makeVisitRecord,
  type PersistedState,
  type Theme,
  type VisitRecord,
} from '@/lib/persistence';
import { buildExportPayload, downloadExport } from '@/lib/export';
import {
  applyApprove,
  applyReset,
  applyUpdateBody,
  draftGateReason,
  initDraftFor,
  type FollowupDraft,
} from '@/lib/followups';

import Sidebar from './Sidebar';
import TopBar from './TopBar';
import StatsCards from './StatsCards';
import RecallQueue, { type RecallRow } from './RecallQueue';
import CustomerMemoryPanel from './CustomerMemoryPanel';
import AddTreatmentSheet from './AddTreatmentSheet';
import MobileBottomNav from './MobileBottomNav';
import ReturnRhythmChart from './ReturnRhythmChart';
import NextBestActions from './NextBestActions';
import {
  type QueueFilter,
  type Tab,
} from './dashboard-types';

// === Seed data (PRESERVE — wiring per AGENTS.md scope) ===
const SEED_CUSTOMERS: Customer[] = [
  createCustomer({
    id: 'c1',
    name: '陳美玲',
    phone: '0933312318',
    consent: 'granted',
    tags: ['18 visits', 'Natural brown', 'No mornings'],
    preferences: ['Natural brown', 'Fragrance-free formula'],
    allergies: ['Lavender oil'],
    notes: 'Natural brown preference; lavender oil sensitivity; fragrance-free formula used.',
  }),
  createCustomer({
    id: 'c2',
    name: '林瑜安',
    phone: '0945623702',
    consent: 'granted',
    tags: ['7 visits', 'Low irritation', 'Weekends'],
    preferences: ['Low-irritation products'],
    allergies: ['高濃度酸類'],
    notes: 'High-acid products caused irritation before; avoid proactive recommendation.',
  }),
  createCustomer({
    id: 'c3',
    name: '許雅婷',
    phone: '0958743146',
    consent: 'granted',
    tags: ['12 visits', 'Natural lash', 'Lightweight'],
    preferences: ['Natural lash, lightweight'],
    notes: 'No allergy record; preference is natural and lightweight.',
  }),
  createCustomer({
    id: 'c4',
    name: '周佳蓉',
    phone: '0912045559',
    consent: 'pending',
    tags: ['2 visits', 'Hydration', 'Evenings'],
    preferences: ['Hydration, evenings'],
    notes: 'No sensitivity record yet; ask once before the next service.',
  }),
  createCustomer({
    id: 'c5',
    name: '張婉雯',
    phone: '0952327931',
    consent: 'granted',
    tags: ['22 visits', 'Colour refresh', 'Low fragrance'],
    preferences: ['Colour refresh, low fragrance'],
    allergies: ['Strong fragrance'],
    notes: 'Sensitive to strong fragrance; keep low-fragrance products in notes.',
  }),
];

const SEED_TREATMENTS: Treatment[] = [
  recordTreatment({
    id: 't1',
    customerId: 'c1',
    category: 'hair',
    serviceName: 'Keratin care',
    price: 2800,
    durationMin: 90,
    performedAt: '2026-08-10T10:00:00Z',
    notes: 'Fragrance-free formula',
  }),
  recordTreatment({
    id: 't2',
    customerId: 'c1',
    category: 'hair',
    serviceName: 'Colour refresh',
    price: 2400,
    durationMin: 90,
    performedAt: '2026-07-02T10:00:00Z',
    notes: 'Natural brown',
  }),
  recordTreatment({
    id: 't3',
    customerId: 'c2',
    category: 'skincare',
    serviceName: 'Deep cleanse',
    price: 1600,
    durationMin: 60,
    performedAt: '2026-08-28T10:00:00Z',
    notes: 'Low-irritation products',
  }),
  recordTreatment({
    id: 't4',
    customerId: 'c3',
    category: 'eyelash',
    serviceName: 'Japanese lash refill',
    price: 2400,
    durationMin: 60,
    performedAt: '2026-08-31T10:00:00Z',
    notes: 'Natural style',
  }),
  recordTreatment({
    id: 't5',
    customerId: 'c4',
    category: 'skincare',
    serviceName: 'Hydration treatment',
    price: 1900,
    durationMin: 60,
    performedAt: '2026-09-02T10:00:00Z',
  }),
  recordTreatment({
    id: 't6',
    customerId: 'c5',
    category: 'hair',
    serviceName: 'Colour refresh',
    price: 3200,
    durationMin: 120,
    performedAt: '2026-09-05T10:00:00Z',
    notes: 'Low fragrance',
  }),
];

const DESIGNER = { name: '林心妍', initial: '林' };

// Per-client draft body + tier + care note (v3 prototype data, kept as seed
// so the UI has context without running off the domain libs).
const SEED_DRAFT_BODIES: Record<string, string> = {
  c1: '美玲午安！想起你上次做的自然棕護髮，這週剛好進入適合整理的時間了。最近頭髮狀況還好嗎？如果你想回來，我可以幫你留 10 月平日下午的時段。',
  c2: '瑜安午安！最近換季肌膚還適應嗎？上次深層清潔後差不多進入保養週期，如果你想安排，我可以先幫你看看這週末的時段。',
  c3: '雅婷午安！你上次的自然款差不多快到回補時間了，最近如果想維持輕盈的效果，我可以幫你留幾個方便的時段。',
  c4: '佳蓉午安！想問問你上次保濕導入後的肌膚感受如何？再幾天會進入適合做第二次保養的時間，如果覺得效果不錯，我可以幫你留晚上時段。',
  c5: '婉雯午安！最近髮色維持得還好嗎？我整理了幾個低調色的參考，等你差不多想補色時再一起看看，不急著現在決定。',
};

const SEED_TIER_LABEL: Record<string, string> = {
  c1: 'GOLD VIP',
  c2: 'SILVER',
  c3: 'GOLD VIP',
  c4: 'STANDARD',
  c5: 'GOLD VIP',
};

function buildDraftFor(customer: Customer | null, treatments: Treatment[]): string {
  if (!customer) return '';
  const custom = SEED_DRAFT_BODIES[customer.id];
  if (custom) return custom;
  const last = treatments.find((t) => t.customerId === customer.id);
  return `嗨，${customer.name}！上次${last?.serviceName ?? '的療程'}差不多到該整理的時間了，最近狀況還好嗎？`;
}

export default function Dashboard() {
  const [customers] = useState<Customer[]>(SEED_CUSTOMERS);
  const [treatments] = useState<Treatment[]>(SEED_TREATMENTS);

  // Persisted UI state
  const [lang, setLang] = useState<Lang>('zh');
  const [theme, setTheme] = useState<Theme>('light');
  const [persisted, setPersisted] = useState<PersistedState>({});

  // UI state
  const [tab, setTab] = useState<Tab>('today');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(SEED_CUSTOMERS[0]?.id ?? null);
  const [globalQuery, setGlobalQuery] = useState('');
  const [queueQuery, setQueueQuery] = useState('');
  const [filter, setFilter] = useState<QueueFilter>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  // FollowupDraft is the canonical draft state — see lib/followups.ts.
  // The boolean `draftApproved` shown to children is derived from
  // `draft?.status === 'approved'`, which preserves the public prop contract
  // for CustomerMemoryPanel / DraftComposer while routing every transition
  // through the pure-function state machine (approveDraft / resetDraft).
  const [draft, setDraft] = useState<FollowupDraft | null>(null);
  const draftApproved = draft?.status === 'approved';
  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: '', show: false });
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    const state = loadPersistedState();
    setPersisted(state);
    setLang(state.lang ?? 'zh');
    setTheme(state.theme ?? 'light');
    setHydrated(true);
  }, []);

  // Apply theme to <html>
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (theme === 'dark') {
      document.documentElement.dataset.theme = 'dark';
    } else {
      document.documentElement.dataset.theme = 'light';
    }
  }, [theme]);

  // Apply lang to <html>
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant-TW' : 'en';
  }, [lang]);

  // Auto-hide toast
  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2200);
    return () => clearTimeout(timer);
  }, [toast.show, toast.msg]);

  const today = useMemo(() => new Date(), []);

  // Compute recall rows
  const recallRows = useMemo<RecallRow[]>(() => {
    return customers
      .map((c) => {
        const reminder = computeReminder(c, treatments, today);
        const last = treatments
          .filter((tx) => tx.customerId === c.id)
          .sort((a, b) => b.performedAt.localeCompare(a.performedAt))[0];
        const ltv = computeCustomerLTV(treatments, c.id);
        const isVip = ltv.totalSpent >= 20000;
        return {
          customer: c,
          lastServiceDate: last?.performedAt,
          lastServiceName: last?.serviceName,
          amount: last?.price ?? 0,
          daysUntilRecall: reminder.daysUntilRecall,
          status: reminder.daysUntilRecall < 0 ? 'overdue' : 'soon',
          isVip,
        } satisfies RecallRow;
      })
      // Show anyone returning in the next 14 days OR overdue
      .filter((row) => row.daysUntilRecall < 0 || row.daysUntilRecall <= 14)
      .sort((a, b) => {
        // Overdue first (most overdue first), then soon
        const aOver = a.daysUntilRecall < 0;
        const bOver = b.daysUntilRecall < 0;
        if (aOver !== bOver) return aOver ? -1 : 1;
        return a.daysUntilRecall - b.daysUntilRecall;
      });
  }, [customers, treatments, today]);

  const overdueRows = useMemo(() => recallRows.filter((r) => r.daysUntilRecall < 0), [recallRows]);
  const upcomingRows = useMemo(() => recallRows.filter((r) => r.daysUntilRecall >= 0), [recallRows]);
  const overdueCount = overdueRows.length;
  const upcomingCount = upcomingRows.length;
  const followupsDue = recallRows.length;

  // Metrics (v3 prototype shapes — demo numbers; lastVisit contribution folded in via persisted.lastVisit)
  const visitsThisMonth = 48; // demo
  const visitsDeltaPct = 12;
  const serviceRevenue = 128500;
  const revenueTargetPct = 86;
  const returnRatePct = 68;
  const returnRateDeltaPct = 8;
  void persisted.lastVisit; // intentionally surfaced in Next Best Actions copy

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );
  const selectedRow = useMemo(
    () => recallRows.find((r) => r.customer.id === selectedCustomerId) ?? null,
    [recallRows, selectedCustomerId],
  );

  const tierLabel = useMemo(() => {
    if (!selectedCustomer) return 'STANDARD';
    return SEED_TIER_LABEL[selectedCustomer.id] ?? 'STANDARD';
  }, [selectedCustomer]);

  const careNote = useMemo(() => {
    if (!selectedCustomer) return '';
    const allergies = selectedCustomer.allergies;
    const notes = selectedCustomer.notes;
    if (allergies.length > 0 && notes) {
      return `${allergies.join(', ')}; ${notes}`;
    }
    return notes || allergies.join(', ');
  }, [selectedCustomer]);

  // draftBody shown to the composer: prefer the body already on the canonical
  // FollowupDraft state (so a re-open preserves user edits), falling back
  // to the computed seed body for the currently selected customer.
  const seedDraftBody = useMemo(
    () => buildDraftFor(selectedCustomer, treatments),
    [selectedCustomer, treatments],
  );
  const draftBody = draft?.body ?? seedDraftBody;

  const nextBestActions = useMemo(() => {
    const overdueVip = overdueRows.find((r) => r.customer.consent === 'granted');
    const dueSoonPending = upcomingRows.find((r) => r.customer.consent === 'pending');
    const exportItem = lang === 'zh'
      ? {
          title: '匯出本月服務紀錄',
          meta: '資料與設定 · JSON 匯出',
        }
      : {
          title: 'Export this month’s service records',
          meta: 'Data & settings · JSON export',
        };
    const items = [];
    if (overdueVip) {
      items.push({
        title: lang === 'zh'
          ? `核准 ${overdueVip.customer.name} 的回訪草稿`
          : `Approve ${overdueVip.customer.name}’s contact draft`,
        meta: lang === 'zh' ? '已同意接收聯絡 · 建議今天完成' : 'Consent granted · suggested today',
      });
    } else if (overdueRows[0]) {
      items.push({
        title: lang === 'zh'
          ? `處理 ${overdueRows[0].customer.name} 的回訪`
          : `Reach out to ${overdueRows[0].customer.name}`,
        meta: lang === 'zh' ? `${Math.abs(overdueRows[0].daysUntilRecall)} 天逾期` : `${Math.abs(overdueRows[0].daysUntilRecall)} days overdue`,
      });
    }
    if (dueSoonPending) {
      items.push({
        title: lang === 'zh'
          ? `補上 ${dueSoonPending.customer.name} 的同意狀態`
          : `Capture ${dueSoonPending.customer.name}’s consent`,
        meta: lang === 'zh' ? '目前待確認，不會出現送出動作' : 'Pending — no send CTA will appear',
      });
    } else {
      items.push({
        title: lang === 'zh'
          ? `檢視 ${upcomingRows.length || upcomingCount} 位即將到期的客戶`
          : `Review ${upcomingRows.length || upcomingCount} upcoming clients`,
        meta: lang === 'zh' ? '在窗口前 2 天主動聯絡' : 'Reach out 2 days before the window',
      });
    }
    items.push(exportItem);
    return items;
  }, [overdueRows, upcomingRows, upcomingCount, lang]);

  // === Handlers (kept stable for child memoization) ===
  const handleToggleLang = () => {
    const next = toggleLang(lang);
    setLang(next);
    setPersisted((p) => {
      const merged = { ...p, lang: next };
      persistState(merged);
      return merged;
    });
  };

  const handleToggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setPersisted((p) => {
      const merged = { ...p, theme: next };
      persistState(merged);
      return merged;
    });
  };

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    setDraftOpen(false);
    setDraft(null);
  };

  const handleShowAll = () => {
    setFilter('all');
    setQueueQuery('');
  };

  const handleExport = () => {
    const payload = buildExportPayload(customers, treatments, persisted, t(lang, 'workspaceLabel'));
    downloadExport(payload, 'ritual-client-data.json');
    setToast({ msg: t(lang, 'exportedToast'), show: true });
  };

  const handleOpenDrawer = () => setAddOpen(true);

  const handleDraftToggle = () => {
    if (!selectedCustomer) {
      setToast({ msg: t(lang, 'noClientSelected'), show: true });
      return;
    }
    // Lazy-seed the canonical draft state on first open so the state machine
    // owns every transition. Body is pre-filled with the computed seed body
    // (broadcast template + customer memory) so the designer can refine
    // rather than start blank.
    if (!draft || draft.customerId !== selectedCustomer.id) {
      const seeded = initDraftFor(selectedCustomer.id, seedDraftBody);
      if (seeded) setDraft(seeded);
    }
    setDraftOpen((v) => !v);
  };

  const handleApproveDraft = () => {
    // Defense-in-depth: BroadcastGuard already hides the toggle button when
    // consent is not granted, but the pure-function state machine should
    // still gate the transition so any future entry path stays correct.
    const customer = selectedCustomer;
    if (!customer) return;
    const result = applyApprove(draft, customer.consent);
    if (result.kind === 'noop') {
      setToast({ msg: draftGateReason(customer.consent) ?? t(lang, 'consentRequiredHint'), show: true });
      return;
    }
    setDraft(result.draft);
    setToast({ msg: t(lang, 'approvedToast'), show: true });
  };

const handleResetDraft = () => {
    const result = applyReset(draft);
    if (result.kind === 'noop') return;
    setDraft(result.draft);
  };

  const handleCopyDraft = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(draftBody);
        setToast({ msg: t(lang, 'copiedToast'), show: true });
      } else {
        setToast({ msg: lang === 'zh' ? '請手動複製草稿' : 'Select and copy the draft manually', show: true });
      }
    } catch {
      setToast({ msg: lang === 'zh' ? '請手動複製草稿' : 'Select and copy the draft manually', show: true });
    }
  };

  const handleMarkContacted = () => {
    setToast({ msg: t(lang, 'draftApprovedToast'), show: true });
  };

  const handleSaveVisit = (record: VisitRecord) => {
    const nextState = appendVisit(mergePersistedState(persisted, { lang, theme }), record);
    setPersisted(nextState);
    persistState(nextState);
    setAddOpen(false);
    setToast({ msg: t(lang, 'visitSavedToast'), show: true });
  };

  const handleDraftChange = (value: string) => {
    // Designer edits flow through applyUpdateBody so the canonical
    // FollowupDraft owns every field. Status transitions still flow through
    // approveDraft / resetDraft; body edits never transition the state
    // machine on their own.
    const result = applyUpdateBody(draft, value);
    if (result.kind === 'noop') return;
    setDraft(result.draft);
  };

  // === Keyboard shortcuts: / focus search, N open drawer, Esc close drawer ===
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handler = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (event.target as HTMLElement | null)?.isContentEditable) {
        if (event.key === 'Escape') {
          (event.target as HTMLElement).blur();
        }
        return;
      }
      if (event.key === '/') {
        event.preventDefault();
        document.getElementById('global-search')?.focus();
        return;
      }
      if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setAddOpen(true);
        return;
      }
      if (event.key === 'Escape') {
        setAddOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  if (!hydrated) {
    return (
      <span role="status" aria-live="polite" style={{ padding: 24, display: 'block' }}>
        載入中…
      </span>
    );
  }

  // Today's hero copy (use component to read on click etc.)
  const heroCopyZh = `好的客戶關係發生在兩次服務之間。今天有 <strong>${overdueCount} 位客戶逾期</strong>，另有 ${upcomingRows.length} 位進入回訪窗口。`;
  const heroCopyEn = `Good client relationships are built between visits. Today you have <strong>${overdueCount} overdue follow-ups</strong> and ${upcomingRows.length} clients entering their return window.`;
  const heroCopy = lang === 'zh' ? heroCopyZh : heroCopyEn;

  return (
    <div className="app">
      <Sidebar
        activeTab={tab}
        onTabChange={(next) => {
          setTab(next);
          if (next !== 'today') {
            const label =
              next === 'clients'
                ? lang === 'zh' ? '客戶' : 'Clients'
                : next === 'retention'
                  ? lang === 'zh' ? '回訪' : 'Retention'
                  : next === 'insights'
                    ? lang === 'zh' ? '洞察' : 'Insights'
                    : lang === 'zh' ? '設定' : 'Settings';
            setToast({ msg: `${label} ${lang === 'zh' ? '頁面預覽中' : 'prototype'}`, show: true });
          }
        }}
        designerInitial={DESIGNER.initial}
      />

      <div className="shell">
        <TopBar
          activeTab={tab}
          lang={lang}
          theme={theme}
          searchValue={globalQuery}
          onSearchChange={setGlobalQuery}
          onToggleLang={handleToggleLang}
          onToggleTheme={handleToggleTheme}
          designerInitial={DESIGNER.initial}
        />

        <main>
          <section className="hero">
            <div>
              <div className="overline mono" data-i18n="overline">{t(lang, 'overline')}</div>
              <h1 data-i18n="headline">{t(lang, 'headline')}</h1>
              <p className="hero-copy" data-i18n="heroCopy">{heroCopy}</p>
            </div>
            <button
              type="button"
              className="button primary"
              id="open-add"
              data-i18n="newVisit"
              onClick={handleOpenDrawer}
            >
              {t(lang, 'newVisit')}
            </button>
          </section>

          <StatsCards
            lang={lang}
            followupsDue={followupsDue}
            overdueCount={overdueCount}
            upcomingCount={upcomingCount}
            returnRatePct={returnRatePct}
            returnRateDeltaPct={returnRateDeltaPct}
            visitsThisMonth={visitsThisMonth}
            visitsDeltaPct={visitsDeltaPct}
            serviceRevenue={serviceRevenue}
            revenueTargetPct={revenueTargetPct}
          />

          <div className="content-grid">
            <RecallQueue
              lang={lang}
              rows={recallRows}
              selectedCustomerId={selectedCustomerId}
              filter={filter}
              query={queueQuery}
              onFilterChange={setFilter}
              onQueryChange={setQueueQuery}
              onSelect={handleSelectCustomer}
              totalCount={followupsDue}
              onExport={handleExport}
              onShowAll={handleShowAll}
            />

            <CustomerMemoryPanel
              lang={lang}
              customer={selectedCustomer}
              row={selectedRow}
              treatments={treatments}
              tierLabel={tierLabel}
              careNote={careNote}
              draftBody={draftBody}
              draftApproved={draftApproved}
              draftOpen={draftOpen}
              onDraftToggle={handleDraftToggle}
              onDraftChange={handleDraftChange}
              onApproveDraft={handleApproveDraft}
              onCopyDraft={() => void handleCopyDraft()}
              onMarkContacted={handleMarkContacted}
              onResetDraft={handleResetDraft}
            />
          </div>

          <div className="bottom-grid">
            <ReturnRhythmChart
              lang={lang}
              values={[0.32, 0.45, 0.38, 0.54, 0.61, 0.70, 0.84, 1.0]}
            />
            <NextBestActions lang={lang} items={nextBestActions} />
          </div>
        </main>
      </div>

      <MobileBottomNav
        activeTab={tab}
        lang={lang}
        onTabChange={(next) => {
          setTab(next);
          if (next !== 'today') {
            setToast({ msg: `${next} ${lang === 'zh' ? '頁面預覽中' : 'prototype'}`, show: true });
          }
        }}
      />

      <AddTreatmentSheet
        lang={lang}
        open={addOpen}
        customers={customers}
        defaultCustomerName={selectedCustomer?.name}
        defaultAmount={selectedRow?.amount ?? 1500}
        treatments={treatments}
        onClose={() => setAddOpen(false)}
        onSave={handleSaveVisit}
      />

      <div
        className={`toast${toast.show ? ' show' : ''}`}
        role="status"
        aria-live="polite"
        id="toast"
      >
        {toast.msg ? toast.msg : ''}
      </div>
    </div>
  );
}

// Re-exports to keep tooling hints
export { makeVisitRecord, isLang, buildExportPayload };
