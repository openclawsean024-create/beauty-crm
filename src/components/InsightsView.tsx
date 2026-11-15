'use client';

import { useMemo } from 'react';
import { computeRevenueByMonth, topSpenders } from '@/lib/analytics';
import type { Customer } from '@/lib/customers';
import { t, type Lang } from '@/lib/i18n';
import { tierForSpend } from '@/lib/tiers';
import type { Treatment } from '@/lib/treatments';
import ReturnRhythmChart from './ReturnRhythmChart';

interface InsightsViewProps {
  lang: Lang;
  customers: Customer[];
  treatments: Treatment[];
  rhythm: number[];
}

/** 洞察分頁：月服務額、累計消費排行、回流節奏，全部由療程資料計算（FR-019 的 M1 部分）。 */
export default function InsightsView({ lang, customers, treatments, rhythm }: InsightsViewProps) {
  const months = useMemo(() => computeRevenueByMonth(treatments).slice(-6).reverse(), [treatments]);
  const top = useMemo(() => topSpenders(treatments, 5), [treatments]);
  const nameOf = (id: string) => customers.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="stack" data-testid="insights-view">
      <div className="bottom-grid" style={{ marginTop: 0 }}>
        <article className="card insight">
          <div className="insight-head">
            <h2>{t(lang, 'revenueByMonth')}</h2>
          </div>
          {months.length === 0 ? (
            <p className="empty-note">{t(lang, 'insightsEmpty')}</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">{t(lang, 'colMonth')}</th>
                  <th scope="col" className="num">{t(lang, 'colVisits')}</th>
                  <th scope="col" className="num">{t(lang, 'colRevenue')}</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.month}>
                    <th scope="row" className="mono">{m.month}</th>
                    <td className="num mono">{m.count}</td>
                    <td className="num mono">NT$ {m.total.toLocaleString('en-US')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
        <article className="card insight">
          <div className="insight-head">
            <h2>{t(lang, 'topSpenders')}</h2>
          </div>
          {top.length === 0 ? (
            <p className="empty-note">{t(lang, 'insightsEmpty')}</p>
          ) : (
            <table className="data-table">
              <tbody>
                {top.map((entry) => (
                  <tr key={entry.customerId}>
                    <th scope="row">{nameOf(entry.customerId)}</th>
                    <td>{tierForSpend(entry.totalSpent).label}</td>
                    <td className="num mono">NT$ {entry.totalSpent.toLocaleString('en-US')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      </div>
      <ReturnRhythmChart lang={lang} values={rhythm} />
    </div>
  );
}
