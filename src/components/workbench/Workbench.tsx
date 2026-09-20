// Beauty CRM — Workbench 主元件 (今日工作台 + 其他頁面 shell)
// 對應 PRD/UI-SPEC §2-§6 + Sean-approved beauty-crm-redesign.html。
// 重點:
// 1. 今日頁為主入口:stats / queue+memory / funnel+next-action。
// 2. queue 預設選第一筆;草稿在 queue 卡片內展開,符合「不切頁」精神。
// 3. 草稿只在 consent=granted 時能核准;pending/revoked 只顯示 gate reason。
// 4. 服務類別變更自動帶入 recall 日,可手動覆寫 (對齊 SPEC §3.4 AC-002)。
// 5. 過敏衝突會阻擋儲存且不清空已輸入欄位 (對齊 UI-SPEC §4)。
// 6. 桌面 drawer / 行動 bottom sheet (≤480px)。

'use client';

import { useEffect, useMemo, useState } from 'react';

import type { Customer } from '@/lib/customers';
import type { Treatment } from '@/lib/treatments';
import { computeReminder, listOverdue, listDueSoon } from '@/lib/reminders';
import { computeCustomerLTV, computeRevenueByMonth, topSpenders } from '@/lib/analytics';
import { tierForSpend } from '@/lib/tiers';
import { buildBroadcast, selectByConsent, BUILTIN_TEMPLATES } from '@/lib/broadcast';
import { renderTemplate } from '@/lib/broadcast';
import { canActOnDraft, draftGateReason, type FollowupDraft } from '@/lib/followups';

import {
  getSeedCustomers,
  getSeedTreatments,
  TODAY_FIXED,
  type DisplayCustomer,
  type DisplayTreatment,
} from './seed';
import QueueList, { type QueueItem } from './QueueList';
import MemoryPanel from './MemoryPanel';
import FollowupDraftSection from './FollowupDraft';
import Funnel from './Funnel';
import NextActions from './NextActions';
import AddTreatmentSheet, { type SubmittedTreatment } from './AddTreatmentSheet';
import MobileNav from './MobileNav';
import Toast from './Toast';
import Sidebar, { Topbar } from './Sidebar';

type View = 'today' | 'customers' | 'reminders' | 'insights' | 'settings';

const CRUMB: Record<View, string> = {
  today: '今日工作台 / 2026 年 9 月 21 日',
  customers: '客戶 / 全部',
  reminders: '回訪 / 全部',
  insights: '洞察 / 月份',
  settings: '設定與資料',
};

export default function Workbench() {
  const [customers, setCustomers] = useState<DisplayCustomer[]>(() => getSeedCustomers());
  const [treatments, setTreatments] = useState<DisplayTreatment[]>(() => getSeedTreatments());
  const [view, setView] = useState<View>('today');
  const [selectedId, setSelectedId] = useState<string | undefined>(() => getSeedCustomers()[0]?.id);
  const [draft, setDraft] = useState<FollowupDraft | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // 防止 SSR/CSR mismatch (seed 含固定日期)
  useEffect(() => setHydrated(true), []);

  // Toast 自動消失
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // 客戶的 consent 改變時,若草稿屬於該客戶且 consent 已 revoked → 清掉草稿
  useEffect(() => {
    if (!draft) return;
    const owner = customers.find((c) => c.id === draft.customerId);
    if (owner && owner.consent !== 'granted') {
      setDraft(null);
    }
  }, [customers, draft]);

  // Esc 關閉 drawer
  useEffect(() => {
    if (!sheetOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sheetOpen]);

  // === derived ===
  const today = TODAY_FIXED;

  const queueItems: QueueItem[] = useMemo(() => {
    const all = listDueSoon(
      customers as unknown as Customer[],
      treatments as unknown as Treatment[],
      today,
    );
    return all.map((r) => {
      const customer = customers.find((c) => c.id === r.customerId)!;
      const lastTreatment = treatments
        .filter((t) => t.customerId === r.customerId)
        .sort((a, b) => b.performedAt.localeCompare(a.performedAt))[0];
      return { customer, reminder: r, lastTreatment };
    });
  }, [customers, treatments, today]);

  const selectedItem = useMemo(
    () => queueItems.find((q) => q.customer.id === selectedId) ?? queueItems[0],
    [queueItems, selectedId],
  );

  const stats = useMemo(() => {
    const overdue = listOverdue(
      customers as unknown as Customer[],
      treatments as unknown as Treatment[],
      today,
    );
    const reachable = selectByConsent(customers as unknown as Customer[]);
    const broadcastTargets = buildBroadcast(
      'recall_due',
      customers.filter((c) => overdue.some((o) => o.customerId === c.id)) as unknown as Customer[],
      treatments as unknown as Treatment[],
    );
    const totalCustomers = customers.length;
    return {
      due: overdue.length,
      reachable: reachable.length,
      broadcast: broadcastTargets.length,
      total: totalCustomers,
    };
  }, [customers, treatments, today]);

  const funnel = useMemo(() => {
    const due = listOverdue(
      customers as unknown as Customer[],
      treatments as unknown as Treatment[],
      today,
    ).length;
    // v1 用 seed 標記:雅婷已聯絡,小美已預約
    const contacted = queueItems.filter((q) => q.customer.consent === 'granted').length;
    const booked = queueItems.filter((q) => q.customer.id === 'c2').length;
    return { due: Math.max(due, queueItems.length), contacted, booked };
  }, [customers, treatments, today, queueItems]);

  const nextActions = useMemo(() => {
    const out: { title: string; sub: string; tone: 'brand' | 'success' }[] = [];
    if (selectedItem?.customer.consent === 'granted' && draft) {
      out.push({
        title: `核准 ${selectedItem.customer.displayName} 的回訪草稿`,
        sub: '她已同意接收聯絡 · 建議今天完成',
        tone: 'brand',
      });
    } else if (selectedItem) {
      out.push({
        title: `補上 ${selectedItem.customer.displayName} 的同意狀態`,
        sub:
          selectedItem.customer.consent === 'pending'
            ? '目前待確認,不會出現送出動作'
            : '已撤回,只能手動服務記錄',
        tone: 'success',
      });
    }
    const pendingCustomer = customers.find((c) => c.consent === 'pending');
    if (pendingCustomer) {
      out.push({
        title: `補上 ${pendingCustomer.displayName} 的同意狀態`,
        sub: '目前待確認,不會出現送出動作',
        tone: 'success',
      });
    }
    return out.slice(0, 2);
  }, [customers, selectedItem, draft]);

  const handleSelect = (item: QueueItem) => {
    setSelectedId(item.customer.id);
    setDraft(null);
  };

  const handleCreateDraft = () => {
    if (!selectedItem) return;
    if (selectedItem.customer.consent !== 'granted') return;
    const body = renderTemplate(
      BUILTIN_TEMPLATES.recall_due.body,
      selectedItem.customer as unknown as Customer,
      treatments as unknown as Treatment[],
    );
    setDraft({
      customerId: selectedItem.customer.id,
      status: 'draft',
      body,
      updatedAt: new Date().toISOString(),
    });
    setToast('已產生回訪草稿 · 待核准');
  };

  const handleSubmitTreatment = (payload: SubmittedTreatment) => {
    setTreatments((prev) => [
      {
        id: payload.id,
        customerId: payload.customerId,
        category: payload.category,
        serviceName: payload.serviceName,
        productIngredients: payload.productIngredients,
        price: payload.price,
        durationMin: payload.durationMin,
        performedAt: payload.performedAt,
        displayName: payload.serviceName,
        preferenceTags: prev.find((t) => t.id === payload.id)?.preferenceTags ?? [],
        noteSummary: payload.notes ?? prev.find((t) => t.id === payload.id)?.noteSummary ?? '',
        allergyDescription:
          prev.find((t) => t.id === payload.id)?.allergyDescription ?? '',
        vipReason: prev.find((t) => t.id === payload.id)?.vipReason ?? '',
      },
      ...prev,
    ]);
    setSheetOpen(false);
    setToast('已儲存,回訪日期已更新');
  };

  const handleMobileMenu = () => {
    // 在 < 820px 時 sidebar 隱藏;這裡切換到 today view 作為 fallback。
    setView('today');
  };

  if (!hydrated) {
    return (
      <div className="app">
        <span className="status pending" role="status" aria-live="polite" style={{ padding: 24, display: 'block' }}>
          載入中…
        </span>
      </div>
    );
  }

  const renderToday = () => {
    if (!selectedItem) {
      return (
        <section style={{ padding: 24 }}>
          <p>目前沒有任何客戶資料。請從「客戶」分頁新增。</p>
        </section>
      );
    }
    const consent = selectedItem.customer.consent;
    const canDraft = canActOnDraft(consent);
    return (
      <>
        <section className="page-head">
          <div>
            <div className="eyebrow">MONDAY · 21 SEP 2026</div>
            <h1>早安,林心妍</h1>
            <p className="page-sub">
              今天有{' '}
              <strong style={{ color: 'var(--brand)' }}>{stats.due} 位客戶</strong>{' '}
              超過建議回訪日,先把最需要你的人往前推一步。
            </p>
          </div>
          <button
            type="button"
            className="primary"
            onClick={() => setSheetOpen(true)}
            aria-label="開啟新增服務紀錄"
          >
            ＋ 新增服務紀錄
          </button>
        </section>

        <section className="stats" aria-label="今日摘要">
          <article className="stat">
            <div className="stat-top">
              <span>待回訪</span>
              <span className="stat-icon" aria-hidden="true">◷</span>
            </div>
            <div className="stat-value">{stats.due}</div>
            <div className="stat-note">
              <b>{stats.broadcast} 位已同意</b> · 可立即聯絡
            </div>
          </article>
          <article className="stat">
            <div className="stat-top">
              <span>已聯絡</span>
              <span className="stat-icon" aria-hidden="true">✓</span>
            </div>
            <div className="stat-value">{funnel.contacted}</div>
            <div className="stat-note">
              本月回流 <b>{funnel.due === 0 ? 0 : Math.round((funnel.booked / funnel.due) * 100)}%</b>
            </div>
          </article>
          <article className="stat">
            <div className="stat-top">
              <span>已預約</span>
              <span className="stat-icon" aria-hidden="true">▣</span>
            </div>
            <div className="stat-value">{funnel.booked}</div>
            <div className="stat-note">
              較上月 <b>+{funnel.booked}</b>
            </div>
          </article>
          <article className="stat">
            <div className="stat-top">
              <span>活躍客戶</span>
              <span className="stat-icon" aria-hidden="true">♙</span>
            </div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-note">
              可聯絡 <b>{stats.reachable} 位</b>
            </div>
          </article>
        </section>

        <div className="workspace">
          <section className="panel" aria-labelledby="queue-title">
            <div className="panel-head">
              <div>
                <h2 className="panel-title" id="queue-title">今天先聯絡誰?</h2>
                <p className="panel-sub">依逾期天數排序 · 點選客戶查看完整記憶</p>
              </div>
              <button type="button" className="filter">全部狀態　⌄</button>
            </div>
            <QueueList
              items={queueItems}
              selectedId={selectedItem.customer.id}
              onSelect={handleSelect}
            />
            <FollowupDraftSection
              draft={draft}
              consent={consent}
              displayName={selectedItem.customer.displayName}
              lastServiceName={selectedItem.lastTreatment?.displayName}
              onNotify={(msg) => setToast(msg)}
            />
            <div className="panel-foot">
              <button type="button" className="ghost">查看全部 {queueItems.length} 位待回訪客戶　→</button>
            </div>
          </section>

          <MemoryPanel
            item={selectedItem}
            draft={draft}
            canDraft={canDraft}
            consent={consent}
            onCreateDraft={handleCreateDraft}
            onOpenAdd={() => setSheetOpen(true)}
          />
        </div>

        <div className="lower">
          <Funnel
            due={funnel.due}
            contacted={funnel.contacted}
            booked={funnel.booked}
          />
          <NextActions actions={nextActions} />
        </div>
      </>
    );
  };

  const renderCustomers = () => (
    <section style={{ padding: 0 }} aria-labelledby="customers-title">
      <div className="page-head">
        <div>
          <div className="eyebrow">CLIENTS</div>
          <h1 id="customers-title">客戶記憶</h1>
          <p className="page-sub">偏好、過敏、同意狀態 — 跨設計師交接不流失。</p>
        </div>
        <button type="button" className="primary" onClick={() => setSheetOpen(true)}>
          ＋ 新增客戶 / 服務
        </button>
      </div>
      <div className="workspace">
        <section className="panel" aria-label="客戶列表">
          <div className="queue">
            {customers.map((c) => {
              const myTxs = treatments.filter((t) => t.customerId === c.id);
              const last = myTxs[0];
              const tier = tierForSpend(
                computeCustomerLTV(treatments as unknown as Treatment[], c.id).totalSpent,
              );
              return (
                <button
                  type="button"
                  key={c.id}
                  className={`queue-row${selectedId === c.id ? ' selected' : ''}`}
                  onClick={() => {
                    setSelectedId(c.id);
                    setView('today');
                  }}
                >
                  <span className="customer">
                    <span className="mini-avatar">{c.initials}</span>
                    <span>
                      <span className="customer-name">{c.displayName}</span>
                      <span className="customer-meta">
                        {c.phone} · {tier.label}
                      </span>
                    </span>
                  </span>
                  <span>
                    <span className="cell-label">最後服務</span>
                    <br />
                    <span className="cell-value">{last?.displayName ?? '—'}</span>
                  </span>
                  <span>
                    <span className="cell-label">同意</span>
                    <br />
                    <span className={`status ${c.consent}`}>{c.consent}</span>
                  </span>
                  <span aria-hidden="true">›</span>
                </button>
              );
            })}
          </div>
        </section>
        <MemoryPanel
          item={selectedItem}
          draft={draft}
          canDraft={canActOnDraft(selectedItem?.customer.consent ?? 'pending')}
          consent={selectedItem?.customer.consent ?? 'pending'}
          onCreateDraft={handleCreateDraft}
          onOpenAdd={() => setSheetOpen(true)}
        />
      </div>
    </section>
  );

  const renderReminders = () => {
    const rows = customers
      .map((c) => {
        const r = computeReminder(
          c as unknown as Customer,
          treatments as unknown as Treatment[],
          today,
        );
        const last = treatments.find((t) => t.id === r.lastTreatmentId);
        return { c, r, last };
      })
      .sort((a, b) => a.r.daysUntilRecall - b.r.daysUntilRecall);
    return (
      <section aria-labelledby="reminders-title">
        <div className="page-head">
          <div>
            <div className="eyebrow">REMINDERS</div>
            <h1 id="reminders-title">回訪清單</h1>
            <p className="page-sub">依到期順序排列,點選客戶可進入今日工作台查看記憶。</p>
          </div>
        </div>
        <section className="panel">
          <div className="queue">
            {rows.map(({ c, r, last }) => {
              const status = r.daysUntilRecall < 0 ? 'overdue' : r.daysUntilRecall <= 7 ? 'soon' : 'ok';
              const label = r.daysUntilRecall < 0 ? `逾期 ${-r.daysUntilRecall} 天` : `${r.daysUntilRecall} 天後`;
              return (
                <button
                  type="button"
                  key={c.id}
                  className="queue-row"
                  onClick={() => {
                    setSelectedId(c.id);
                    setView('today');
                  }}
                >
                  <span className="customer">
                    <span className="mini-avatar">{c.initials}</span>
                    <span>
                      <span className="customer-name">{c.displayName}</span>
                      <span className="customer-meta">
                        {last?.displayName ?? '無紀錄'} · 同意 {c.consent}
                      </span>
                    </span>
                  </span>
                  <span>
                    <span className="cell-label">建議回訪</span>
                    <br />
                    <span className="cell-value">{r.suggestedRecallAt}</span>
                  </span>
                  <span>
                    <span className="cell-label">狀態</span>
                    <br />
                    <span className={`status ${status}`}>{label}</span>
                  </span>
                  <span aria-hidden="true">›</span>
                </button>
              );
            })}
          </div>
        </section>
      </section>
    );
  };

  const renderInsights = () => {
    const rev = computeRevenueByMonth(treatments as unknown as Treatment[]);
    const spenders = topSpenders(treatments as unknown as Treatment[], 4);
    return (
      <section aria-labelledby="insights-title">
        <div className="page-head">
          <div>
            <div className="eyebrow">INSIGHTS</div>
            <h1 id="insights-title">洞察</h1>
            <p className="page-sub">月營收、LTV、Top spenders。</p>
          </div>
        </div>
        <div className="lower">
          <section className="panel funnel" aria-label="月營收">
            <div className="funnel-head">
              <div>
                <h2>月營收</h2>
                <p className="panel-sub">依療程 performedAt 分組</p>
              </div>
              <span className="funnel-month">2026 / 09</span>
            </div>
            {rev.length === 0 ? (
              <p className="panel-sub">目前沒有資料</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th align="left">月份</th>
                    <th align="right">筆數</th>
                    <th align="right">營收</th>
                  </tr>
                </thead>
                <tbody>
                  {rev.map((r) => (
                    <tr key={r.month}>
                      <td>{r.month}</td>
                      <td align="right">{r.count}</td>
                      <td align="right">NT$ {r.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          <section className="panel next-action" aria-label="Top spenders">
            <h2>Top spenders</h2>
            <p>可解釋,不是黑箱分數。</p>
            {spenders.map((s) => {
              const c = customers.find((x) => x.id === s.customerId);
              const tier = tierForSpend(s.totalSpent);
              return (
                <div key={s.customerId} className="action-item">
                  <span className="action-marker" aria-hidden="true" />
                  <div>
                    <strong>{c?.displayName ?? s.customerId}</strong>
                    <span>
                      NT$ {s.totalSpent.toLocaleString()} · {tier.label} · 共 {s.visitCount} 次
                    </span>
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      </section>
    );
  };

  const renderSettings = () => (
    <section aria-labelledby="settings-title">
      <div className="page-head">
        <div>
          <div className="eyebrow">SETTINGS</div>
          <h1 id="settings-title">設定與資料</h1>
          <p className="page-sub">v1 雛形:模板、加密匯出、資料刪除皆尚未串接 (見 SPEC §3.2 P1)。</p>
        </div>
      </div>
      <div className="lower">
        <section className="panel funnel" aria-label="預載訊息模板">
          <div className="funnel-head">
            <div>
              <h2>預載訊息模板</h2>
              <p className="panel-sub">v1 預載 {Object.keys(BUILTIN_TEMPLATES).length} 種</p>
            </div>
          </div>
          {Object.entries(BUILTIN_TEMPLATES).map(([k, m]) => (
            <div key={k} style={{ borderTop: '1px dashed var(--line)', padding: '10px 0' }}>
              <strong>{k}</strong> · <span className="tag neutral">{m.channel}</span>
              <p className="panel-sub" style={{ marginTop: 4 }}>{m.body}</p>
            </div>
          ))}
        </section>
        <section className="panel next-action" aria-label="資料主權">
          <h2>資料主權</h2>
          <p>所有資料皆儲存於本機,v2 才會評估雲端同步 (見 SPEC §3.2 P1-05)。</p>
          <div className="action-item">
            <span className="action-marker" style={{ background: 'var(--warning)', boxShadow: '0 0 0 5px var(--warning-soft)' }} aria-hidden="true" />
            <div>
              <strong>加密匯出 / 刪除</strong>
              <span>尚未實作 · 屬 P1 milestone</span>
            </div>
          </div>
        </section>
      </div>
    </section>
  );

  return (
    <div className="app">
      <Sidebar view={view} onChange={(v) => setView(v as View)} onMobileMenu={handleMobileMenu} />
      <div className="content">
        <Topbar crumb={CRUMB[view]} onMobileMenu={handleMobileMenu} />
        <main>
          {view === 'today' && renderToday()}
          {view === 'customers' && renderCustomers()}
          {view === 'reminders' && renderReminders()}
          {view === 'insights' && renderInsights()}
          {view === 'settings' && renderSettings()}
        </main>
      </div>

      <MobileNav view={view} onChange={(v) => setView(v as View)} />

      <AddTreatmentSheet
        open={sheetOpen}
        customers={customers}
        treatments={treatments}
        initialCustomerId={selectedId ?? customers[0]?.id}
        onClose={() => setSheetOpen(false)}
        onSubmit={handleSubmitTreatment}
      />

      <Toast message={toast} />

      {/* Gate reason 給 assistive tech (pending/revoked) */}
      <span className="sr-only" role="status" style={{ position: 'absolute', left: -9999 }}>
        {selectedItem ? draftGateReason(selectedItem.customer.consent) ?? '' : ''}
      </span>
    </div>
  );
}
