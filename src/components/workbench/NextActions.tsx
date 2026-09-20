// Beauty CRM — 今日 2 個可完成的下一步
// 對應 PRD/UI-SPEC §3.1 「把今天的工作縮成兩個可完成的下一步」。

'use client';

interface Action {
  title: string;
  sub: string;
  tone: 'brand' | 'success';
}

interface Props {
  actions: Action[];
}

export default function NextActions({ actions }: Props) {
  return (
    <section className="panel next-action" aria-labelledby="next-action-title">
      <h2 id="next-action-title">接下來的 2 個動作</h2>
      <p>把今天的工作縮成兩個可完成的下一步。</p>
      {actions.map((a, i) => (
        <div key={i} className="action-item">
          <span
            className="action-marker"
            style={
              a.tone === 'success'
                ? { background: 'var(--success)', boxShadow: '0 0 0 5px var(--success-soft)' }
                : undefined
            }
            aria-hidden="true"
          />
          <div>
            <strong>{a.title}</strong>
            <span>{a.sub}</span>
          </div>
        </div>
      ))}
      {actions.length === 0 && (
        <p className="panel-sub" style={{ marginTop: 12 }}>
          目前沒有需要立刻處理的動作 🎉
        </p>
      )}
    </section>
  );
}
