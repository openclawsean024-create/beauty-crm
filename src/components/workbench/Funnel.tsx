// Beauty CRM — 本月回流漏斗 (funnel)
// 對應 PRD/UI-SPEC §2 漏斗節點:應回訪 → 已聯絡 → 已預約 (手動標記)。
// v1 用 in-memory 計數 (seed 為基線),後續可接 store。

'use client';

interface FunnelStep {
  label: string;
  count: number;
  /** 0..1,代表相對於首段的進度 */
  ratio: number;
  tone: 'brand' | 'muted' | 'green';
}

interface Props {
  due: number;
  contacted: number;
  booked: number;
}

export default function Funnel({ due, contacted, booked }: Props) {
  const safeBase = Math.max(1, due);
  const steps: FunnelStep[] = [
    { label: '應回訪', count: due, ratio: 1, tone: 'brand' },
    { label: '已聯絡', count: contacted, ratio: Math.min(1, contacted / safeBase), tone: 'muted' },
    { label: '已預約', count: booked, ratio: Math.min(1, booked / safeBase), tone: 'green' },
  ];

  const contactToBook = contacted === 0 ? 0 : Math.round((booked / contacted) * 100);
  const totalConvert = due === 0 ? 0 : Math.round((booked / due) * 100);

  return (
    <section className="panel funnel" aria-labelledby="funnel-title">
      <div className="funnel-head">
        <div>
          <h2 id="funnel-title">本月回流漏斗</h2>
          <p className="panel-sub">手動標記每一步,知道時間花在哪裡</p>
        </div>
        <span className="funnel-month">2026 / 09</span>
      </div>
      {steps.map((step) => (
        <div key={step.label} className="funnel-row">
          <span className="funnel-label">{step.label}</span>
          <div className="track" aria-hidden="true">
            <div className={`fill ${step.tone === 'brand' ? '' : step.tone}`} style={{ width: `${Math.round(step.ratio * 100)}%` }} />
          </div>
          <span className="funnel-number">{step.count}</span>
        </div>
      ))}
      <div className="funnel-foot">
        <span>
          聯絡 → 預約轉換率
          <br />
          <strong>{contactToBook}%</strong>
        </span>
        <span style={{ textAlign: 'right' }}>
          整體回流
          <br />
          <strong>{totalConvert}%</strong>
        </span>
      </div>
    </section>
  );
}
