// Beauty CRM — Terms / 使用條款（Gate-1：上線閘門必備頁面）
//
// 對齊 SPEC §1.5 Non-Goals：明確不做的事項。
// production 上線前需由 owner 過目 + 真實律師審閱。

export const metadata = {
  title: 'Terms — Beauty CRM',
  description: '美業客戶長期管理 — 使用條款',
};

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px', lineHeight: 1.7, color: '#3a2a28' }}>
      <h1 style={{ color: '#a04030' }}>使用條款（Terms of Use）</h1>
      <p style={{ color: '#6b4a45', fontSize: 13 }}>最後更新：2026-09-05　|　對齊 SPEC v3.0 §1.5 Non-Goals</p>

      <h2>1. 適用範圍</h2>
      <p>
        本使用條款適用於 Beauty CRM v0.3.0（純前端 in-memory 應用）。
        使用本應用即表示您同意本條款。
      </p>

      <h2>2. 明確不做（對齊 SPEC §1.5 Non-Goals）</h2>
      <p>本應用明確<strong>不</strong>提供以下功能：</p>
      <ul>
        <li>❌ 線上預約日曆與候位系統</li>
        <li>❌ POS、庫存、薪資與抽成管理</li>
        <li>❌ 自動向客戶發送未核准的行銷訊息（所有 LINE / SMS 草稿必須由設計師人工核准）</li>
        <li>❌ 醫療診斷或療程效果保證</li>
        <li>❌ 多店與複雜權限管理（v1 為單店單設計師）</li>
        <li>❌ 真實跨裝置同步（v1 純 in-memory；如需切換裝置請使用匯出 / 還原）</li>
      </ul>

      <h2>3. 責任限制</h2>
      <p>
        本應用作為「客戶記憶 + 回流提醒」工具，不替代：
      </p>
      <ul>
        <li>設計師的專業判斷（過敏 / 禁忌 / 皮膚狀況評估）</li>
        <li>真實預約系統（建議搭配 LINE 官方帳號、Google Calendar 或第三方預約工具）</li>
        <li>POS 收銀系統（金流、發票、稅務）</li>
      </ul>

      <h2>4. 資料責任</h2>
      <p>
        客戶資料由您（店主）全權保管。建議定期加密匯出備份。
        若裝置遺失、瀏覽器資料被清除、或您主動刪除所有資料，本應用無法協助復原。
      </p>

      <h2>5. 免責聲明</h2>
      <p>
        本應用按「現況」（as-is）提供，不提供任何明示或默示保證。
        使用本應用所產生之任何直接或間接損失，由使用者自行承擔。
      </p>

      <hr style={{ margin: '32px 0', borderColor: '#f0d8d2' }} />
      <p style={{ fontSize: 12, color: '#a0a0a0' }}>
        本條款為 demo / 雛形版本，production 上線前需由 owner 與真實律師審閱。
        對應上線閘門 Gate-1（PRD/SPEC.md §6.2）。
      </p>
    </main>
  );
}
