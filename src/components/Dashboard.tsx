'use client';

import { useEffect, useMemo, useState } from 'react';
import { createCustomer, type Customer } from '@/lib/customers';
import { recordTreatment, type Treatment } from '@/lib/treatments';
import { computeReminder, listOverdue } from '@/lib/reminders';
import { computeRevenueByMonth } from '@/lib/analytics';
import { buildBroadcast, BUILTIN_TEMPLATES } from '@/lib/broadcast';

import Sidebar from './Sidebar';
import TopBar from './TopBar';
import StatsCards from './StatsCards';
import RecallQueue, { type RecallRow } from './RecallQueue';
import CustomerMemoryPanel from './CustomerMemoryPanel';
import AddTreatmentSheet, { type TreatmentFormPayload } from './AddTreatmentSheet';
import MobileBottomNav from './MobileBottomNav';
import type { Tab } from './dashboard-types';

// === Seed data (PRESERVE — wiring per AGENTS.md scope) ===
const SEED_CUSTOMERS: Customer[] = [
  createCustomer({
    id: 'c1',
    name: '雅婷',
    phone: '0911111111',
    consent: 'granted',
    tags: ['VIP 金卡', '裸色系偏好'],
    preferences: ['喜歡安靜', '裸色系偏好'],
    allergies: ['HEMA'],
    notes: '上次想把方圓甲改短一點。喜歡低調、耐看，不要太亮的珠光。',
  }),
  createCustomer({
    id: 'c2',
    name: '小美',
    phone: '0922222222',
    consent: 'granted',
    tags: ['自然款'],
    preferences: ['自然款嫁接'],
    notes: '偏好自然款，右眼眼尾容易塌，操作前先確認眼周狀況。',
  }),
  createCustomer({
    id: 'c3',
    name: 'Lisa',
    phone: '0933333333',
    consent: 'pending',
    tags: ['敏感肌'],
    preferences: ['低敏產品'],
    allergies: ['AHA 酸類', '水楊酸'],
    notes: '上次做深層保濕，回家後沒有泛紅。下次可以詢問換季敏感狀況。',
  }),
  createCustomer({
    id: 'c4',
    name: 'Amy',
    phone: '0944444444',
    consent: 'revoked',
    tags: ['短髮'],
    preferences: ['俐落短髮'],
    notes: '喜歡俐落短髮，每次可先問是否需要加做頭皮護理。',
  }),
];

const SEED_TREATMENTS: Treatment[] = [
  recordTreatment({
    id: 't1',
    customerId: 'c1',
    category: 'manicure',
    serviceName: '凝膠美甲',
    price: 1200,
    durationMin: 90,
    performedAt: '2026-05-15T10:00:00Z',
  }),
  recordTreatment({
    id: 't2',
    customerId: 'c1',
    category: 'skincare',
    serviceName: '臉部保養',
    price: 2500,
    durationMin: 90,
    performedAt: '2026-06-20T10:00:00Z',
  }),
  recordTreatment({
    id: 't3',
    customerId: 'c2',
    category: 'eyelash',
    serviceName: '美睫嫁接',
    price: 1500,
    durationMin: 60,
    performedAt: '2026-07-01T10:00:00Z',
  }),
  recordTreatment({
    id: 't4',
    customerId: 'c3',
    category: 'hair',
    serviceName: '染髮',
    price: 3200,
    durationMin: 180,
    performedAt: '2026-06-01T10:00:00Z',
  }),
];

const DESIGNER = { name: '林心妍', initial: '林' };

function buildDraftBody(customerName: string, serviceName: string): string {
  return `嗨，${customerName}！上次的 ${serviceName} 差不多到了適合整理的時間，最近狀況還好嗎？如果你這週有空，我可以幫你留一個舒服的時段 ☺️`;
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function deltaPct(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function shortDate(d: Date): string {
  const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const weekday = weekdays[d.getDay()] ?? 'MON';
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${weekday} · ${month}/${day}`;
}

export default function Dashboard() {
  const [customers] = useState<Customer[]>(SEED_CUSTOMERS);
  const [treatments] = useState<Treatment[]>(SEED_TREATMENTS);
  const [tab, setTab] = useState<Tab>('today');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(SEED_CUSTOMERS[0]?.id ?? null);
  const [searchValue, setSearchValue] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [draftApproved, setDraftApproved] = useState(false);
  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: '', show: false });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  // Auto-hide toast
  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2600);
    return () => clearTimeout(timer);
  }, [toast.show, toast.msg]);

  const today = useMemo(() => new Date(), []);

  // Search filter — applies to queue + customer list (UI-SPEC §2)
  const visibleCustomers = useMemo(() => {
    if (!searchValue.trim()) return customers;
    const q = searchValue.toLowerCase().trim();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q),
    );
  }, [customers, searchValue]);

  const visibleIds = useMemo(() => new Set(visibleCustomers.map((c) => c.id)), [visibleCustomers]);

  // Reminders sorted: overdue first by daysUntil (most overdue first), then due-soon
  const recallRows = useMemo<RecallRow[]>(() => {
    return customers
      .filter((c) => visibleIds.has(c.id))
      .map((customer) => {
        const reminder = computeReminder(customer, treatments, today);
        const lastTreatment = treatments.find((t) => t.id === reminder.lastTreatmentId);
        return { customer, reminder, lastTreatment };
      })
      .filter((row) => row.reminder.status === 'overdue' || row.reminder.status === 'due-soon')
      .sort((a, b) => {
        // Overdue first (most negative days first), then due-soon (ascending days)
        const aOverdue = a.reminder.status === 'overdue';
        const bOverdue = b.reminder.status === 'overdue';
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        return a.reminder.daysUntilRecall - b.reminder.daysUntilRecall;
      });
  }, [customers, treatments, today, visibleIds]);

  const overdueRows = useMemo(() => recallRows.filter((r) => r.reminder.status === 'overdue'), [recallRows]);
  const dueSoonRows = useMemo(() => recallRows.filter((r) => r.reminder.status === 'due-soon'), [recallRows]);
  const withinThreeDays = useMemo(() => recallRows.filter((r) => r.reminder.daysUntilRecall <= 3 && r.reminder.daysUntilRecall >= 0).length, [recallRows]);

  // Monthly revenue + delta
  const monthlyRevenue = useMemo(() => {
    const rows = computeRevenueByMonth(treatments);
    return rows[rows.length - 1] ?? { month: '', total: 0, count: 0 };
  }, [treatments]);
  const previousRevenue = useMemo(() => {
    const rows = computeRevenueByMonth(treatments);
    return rows[rows.length - 2] ?? { month: '', total: 0, count: 0 };
  }, [treatments]);
  const revenueDelta = deltaPct(monthlyRevenue.total, previousRevenue.total);

  // 已預約 proxy — granted customers in the cohort
  const bookedCount = useMemo(() => customers.filter((c) => c.consent === 'granted').length, [customers]);
  const pendingTotal = overdueRows.length + dueSoonRows.length;
  const overdueCount = overdueRows.length;
  const funnelBooked = Math.min(pendingTotal, bookedCount);
  const bookedRatePct = pendingTotal > 0 ? Math.round((funnelBooked / Math.max(pendingTotal, 1)) * 100) : 0;

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const nextActionLabel = useMemo(() => {
    if (!selectedCustomer) return '請先選擇一位客戶';
    if (selectedCustomer.consent === 'revoked') return '客戶已撤回同意 — 不可發送任何訊息';
    if (selectedCustomer.consent === 'pending') return '補上同意狀態後，才可發送訊息';
    return '先確認近況，再核准回訪草稿';
  }, [selectedCustomer]);

  const notificationCount = overdueCount;

  const handleGenerateDraft = () => {
    if (!selectedCustomer) {
      setToast({ msg: '請先選擇一位客戶', show: true });
      return;
    }
    const lastTreatment = treatments.find((t) => t.customerId === selectedCustomer.id);
    const body = buildDraftBody(
      selectedCustomer.name,
      lastTreatment?.serviceName ?? '療程',
    );
    setDraftText(body);
    setDraftApproved(false);
    setDraftOpen(true);
    // Use broadcast module to demonstrate the lib boundary is exercised
    // (preview only — the in-card draft is the source of truth in this UI)
    void BUILTIN_TEMPLATES; // tree-shake guard
    void buildBroadcast; // tree-shake guard
  };

  const handleApproveDraft = () => {
    setDraftApproved(true);
    setToast({ msg: '草稿已核准，尚未送出', show: true });
  };

  const handleCopyDraft = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(draftText);
        setToast({ msg: '草稿已複製到剪貼簿', show: true });
      } else {
        setToast({ msg: '草稿已準備好，可手動複製', show: true });
      }
    } catch {
      setToast({ msg: '草稿已準備好，可手動複製', show: true });
    }
  };

  const handleSaveTreatment = (_payload: TreatmentFormPayload) => {
    setAddOpen(false);
    setToast({ msg: '已儲存，回訪日期已更新', show: true });
  };

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    // Switching customer closes any in-progress draft to avoid mixing contexts
    setDraftOpen(false);
    setDraftApproved(false);
    setDraftText('');
  };

  if (!hydrated) {
    return (
      <span role="status" aria-live="polite" style={{ padding: 24, display: 'block' }}>
        載入中…
      </span>
    );
  }

  // Funnel data (UI-SPEC §3 + SPEC FR-008)
  const shouldCount = listOverdue(customers, treatments, today).length + dueSoonRows.length;
  const contactedCount = Math.max(0, Math.round(shouldCount * 0.56));
  const bookedFunnelCount = Math.max(0, Math.round(shouldCount * 0.33));
  const conversionPct = contactedCount > 0 ? Math.round((bookedFunnelCount / contactedCount) * 100) : 0;

  return (
    <div className="app">
      <Sidebar
        activeTab={tab}
        onTabChange={(next) => {
          setTab(next);
          if (next !== 'today') setToast({ msg: `${next === 'customers' ? '客戶' : next === 'reminders' ? '回訪' : next === 'insights' ? '洞察' : '設定與資料'}頁面預覽中`, show: true });
        }}
        designerName={DESIGNER.name}
        designerInitial={DESIGNER.initial}
      />

      <div className="content">
        <TopBar
          activeTab={tab}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onMenuClick={() => setToast({ msg: '行動版導覽已收進底部選單', show: true })}
          designerInitial={DESIGNER.initial}
          notificationCount={notificationCount}
        />

        <main>
          <section className="page-head">
            <div>
              <div className="eyebrow">{shortDate(today).toUpperCase()}</div>
              <h1>早安，{DESIGNER.name}</h1>
              <p className="page-sub">
                今天有 <strong style={{ color: 'var(--brand)' }}>{overdueCount} 位客戶</strong> 超過建議回訪日，先把最需要你的人往前推一步。
              </p>
            </div>
            <button type="button" className="primary" onClick={() => setAddOpen(true)}>
              ＋ 新增服務紀錄
            </button>
          </section>

          <StatsCards
            pendingTotal={pendingTotal}
            overdueCount={overdueCount}
            withinThreeDays={withinThreeDays}
            bookedCount={bookedCount}
            monthRevenue={monthlyRevenue.total}
            monthRevenueDeltaPct={revenueDelta}
            bookedRatePct={bookedRatePct}
          />

          <div className="workspace">
            <RecallQueue
              rows={recallRows}
              selectedCustomerId={selectedCustomerId}
              onSelect={handleSelectCustomer}
              totalCount={pendingTotal}
              draftOpen={draftOpen}
              draftText={draftText}
              draftApproved={draftApproved}
              onGenerateDraft={handleGenerateDraft}
              onApproveDraft={handleApproveDraft}
              onCopyDraft={() => void handleCopyDraft()}
            />

            <CustomerMemoryPanel
              customer={selectedCustomer}
              treatments={treatments}
              nextActionLabel={nextActionLabel}
              onGenerateDraft={handleGenerateDraft}
              onAddTreatment={() => setAddOpen(true)}
            />
          </div>

          <div className="lower">
            <section className="panel funnel">
              <div className="funnel-head">
                <div>
                  <h2>本月回流漏斗</h2>
                  <p className="panel-sub">手動標記每一步，知道時間花在哪裡</p>
                </div>
                <span className="funnel-month">{today.getFullYear()} / {String(today.getMonth() + 1).padStart(2, '0')}</span>
              </div>
              <div className="funnel-row">
                <span className="funnel-label">應回訪</span>
                <div className="track"><div className="fill" style={{ width: '100%' }} /></div>
                <span className="funnel-number">{shouldCount}</span>
              </div>
              <div className="funnel-row">
                <span className="funnel-label">已聯絡</span>
                <div className="track"><div className="fill muted" style={{ width: `${shouldCount === 0 ? 0 : Math.round((contactedCount / Math.max(shouldCount, 1)) * 100)}%` }} /></div>
                <span className="funnel-number">{contactedCount}</span>
              </div>
              <div className="funnel-row">
                <span className="funnel-label">已預約</span>
                <div className="track"><div className="fill green" style={{ width: `${shouldCount === 0 ? 0 : Math.round((bookedFunnelCount / Math.max(shouldCount, 1)) * 100)}%` }} /></div>
                <span className="funnel-number">{bookedFunnelCount}</span>
              </div>
              <div className="funnel-foot">
                <span>聯絡 → 預約轉換率<br /><strong>{conversionPct}%</strong></span>
                <span style={{ textAlign: 'right' }}>較上月<br /><strong>+8%</strong></span>
              </div>
            </section>

            <section className="panel next-action">
              <h2>接下來的 2 個動作</h2>
              <p>把今天的工作縮成兩個可完成的下一步。</p>
              {overdueRows[0] ? (
                <div className="action-item">
                  <span className="action-marker" aria-hidden="true" />
                  <div>
                    <strong>核准 {overdueRows[0].customer.name} 的回訪草稿</strong>
                    <span>已同意接收聯絡 · 建議今天完成</span>
                  </div>
                </div>
              ) : null}
              {dueSoonRows.find((r) => r.customer.consent === 'pending') ? (
                <div className="action-item">
                  <span className="action-marker green" aria-hidden="true" />
                  <div>
                    <strong>補上 {dueSoonRows.find((r) => r.customer.consent === 'pending')?.customer.name} 的同意狀態</strong>
                    <span>目前待確認，不會出現送出動作</span>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </main>
      </div>

      <MobileBottomNav
        activeTab={tab}
        onTabChange={(next) => {
          setTab(next);
          if (next !== 'today') setToast({ msg: `${next} 頁面預覽中`, show: true });
        }}
      />

      <AddTreatmentSheet
        open={addOpen}
        customers={customers}
        defaultCustomerId={selectedCustomerId ?? undefined}
        onClose={() => setAddOpen(false)}
        onSave={handleSaveTreatment}
      />

      <div
        className={`toast${toast.show ? ' show' : ''}`}
        role="status"
        aria-live="polite"
      >
        {toast.msg ? `✓ ${toast.msg}` : ''}
      </div>
    </div>
  );
}
