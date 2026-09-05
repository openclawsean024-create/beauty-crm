// Beauty CRM — Contact / 聯絡我們（Gate-1：上線閘門必備頁面）
//
// production 上線前需由 owner 換成真實聯絡資訊（負責人 email / 電話 / 公司地址）。

export const metadata = {
  title: 'Contact — Beauty CRM',
  description: '美業客戶長期管理 — 聯絡我們',
};

export default function ContactPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px', lineHeight: 1.7, color: '#3a2a28' }}>
      <h1 style={{ color: '#a04030' }}>聯絡我們（Contact）</h1>
      <p style={{ color: '#6b4a45', fontSize: 13 }}>對齊上線閘門 Gate-1（PRD/SPEC.md §6.2）</p>

      <h2>聯絡資訊</h2>
      <p>
        <strong>負責人：</strong>Sean Li（食刻設計 / Savor Studio）<br />
        <strong>Email：</strong><code>[ production 上線前由 owner 替換為真實 DPO email ]</code><br />
        <strong>電話：</strong><code>[ production 上線前由 owner 替換為真實電話 ]</code><br />
        <strong>地址：</strong><code>[ production 上線前由 owner 替換為真實公司地址 ]</code>
      </p>

      <h2>問題類型</h2>
      <ul>
        <li><strong>隱私 / 資料刪除請求</strong>：請 email 並提供客戶 ID（c1 / c2 …）或姓名 + 電話供核對。</li>
        <li><strong>技術問題 / bug 回報</strong>：請附上操作步驟、瀏覽器版本、預期與實際行為。</li>
        <li><strong>功能建議 / 回饋</strong>：歡迎！我們在 pilot 階段特別重視使用者意見。</li>
      </ul>

      <h2>回覆時間</h2>
      <p>一人工作室，工作日 24 小時內回覆；非工作日 72 小時內回覆。</p>

      <hr style={{ margin: '32px 0', borderColor: '#f0d8d2' }} />
      <p style={{ fontSize: 12, color: '#a0a0a0' }}>
        本頁為 demo / 雛形版本。production 上線前需由 owner 替換為真實聯絡資訊。
      </p>
    </main>
  );
}
