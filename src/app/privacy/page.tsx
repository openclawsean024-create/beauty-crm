// Beauty CRM — Privacy / 隱私權聲明（Gate-1：上線閘門必備頁面）
//
// 對齊 SPEC：
// - §1.5 Non-Goals：純前端 in-memory，資料存於瀏覽器
// - §5.2 安全條款：本地加密、刪除、裝置警告
// - §10.4 Error Code 對應：EXPORT_FAILED / DELETE_FAILED 處置
// - FR-009：匯出 / 刪除流程可由店主獨立完成
//
// 重要：本檔是 demo / 雛形，production 上線前需由 owner 過目的真實律師審閱。
// 上線前請把 placeholder 聯絡資訊換成真實負責人 / DPO email 與電話。

import Link from 'next/link';

export const metadata = {
  title: 'Privacy — Beauty CRM',
  description: '美業客戶長期管理 — 隱私權聲明',
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px', lineHeight: 1.7, color: '#3a2a28' }}>
      <h1 style={{ color: '#a04030' }}>隱私權聲明（Privacy）</h1>
      <p style={{ color: '#6b4a45', fontSize: 13 }}>最後更新：2026-09-05　|　對齊 SPEC v3.0 §1.5 / §5.2 / §10.4</p>

      <h2>1. 資料儲存方式（SPEC §1.5 Non-Goals）</h2>
      <p>
        Beauty CRM v0.3.0 為<strong>純前端 in-memory</strong>應用，
        所有客戶資料（姓名、電話、療程紀錄、照片同意、推播紀錄、回流漏斗標記）
        <strong>僅存在於您目前使用的瀏覽器記憶體中</strong>。
      </p>
      <ul>
        <li>關閉瀏覽器分頁、清除瀏覽器資料、或卸載應用程式後，資料即從本機清除。</li>
        <li>不寫入 cookie、不寫入 IndexedDB、不上傳到任何後端伺服器。</li>
        <li>「裝置共用警告」橫幅（dashboard 開機時顯示）是一個 localStorage flag
            （key = <code>device.shared</code>），用於記住您是否已看過警告；不上傳。</li>
      </ul>

      <h2>2. 安全條款（SPEC §5.2）</h2>
      <p>本應用採取以下安全設計：</p>
      <ul>
        <li><strong>本地加密匯出</strong>：使用 PBKDF2 (SHA-256, 200,000 iterations)
            + AES-GCM 256 加密備份檔；解密需輸入您設定的密碼。
            檔案格式為 <code>.beauty-crm.json</code>，含 magic header 與 schema version。</li>
        <li><strong>匯出失敗</strong>（SPEC §10.4 Error Code：<code>EXPORT_FAILED</code>）：
            系統會保留原資料不變，UI 顯示「匯出失敗：&#123;原因&#125;」，可重試或聯絡客服。</li>
        <li><strong>刪除失敗</strong>（SPEC §10.4 Error Code：<code>DELETE_FAILED</code>）：
            若 tombstone dispatch 失敗，UI 顯示「刪除未完成」並保留原資料，
            需重新確認或聯絡客服。</li>
        <li><strong>照片同意</strong>：Before/After 照片需客戶明確同意（<code>photoConsent.grantedAt</code>），
            並可隨時撤回（<code>revokedAt</code>）；不送任何後端。</li>
        <li><strong>行銷同意</strong>：客戶可隨時撤回（<code>consent: 'revoked'</code>），
            已核准的草稿在實際發送前 recheck，撤回即 throw 阻擋。</li>
        <li><strong>設計師手動核准</strong>：LINE / SMS 推播必須先由設計師人工核准，
            狀態機 draft → approved → sent，無人工核准不發送（對齊 SPEC §1.5 Non-Goals）。</li>
      </ul>

      <h2>3. 匯出 / 刪除流程（FR-009）</h2>
      <p>店主可在 dashboard 的「📦 資料管理」卡片獨立完成：</p>
      <ul>
        <li><strong>📤 加密匯出</strong>：輸入密碼（至少 8 字元）→ 下載 <code>.beauty-crm.json</code>。
            此檔案含所有客戶 + 療程資料，已加密，請妥善保存密碼。</li>
        <li><strong>📥 還原備份</strong>：選擇先前匯出的檔案 + 輸入密碼 → 還原資料。
            還原後舊的核准紀錄 / 手動覆寫會被清空（避免版本不一致）。</li>
        <li><strong>🗑 刪除所有資料</strong>：雙重 confirm 後清空瀏覽器記憶體 + 廣播 tombstone 事件。
            此動作無法復原，請先匯出備份。</li>
      </ul>

      <h2>4. 裝置共用警告</h2>
      <p>本應用會在 dashboard 開機時顯示「⚠ 裝置共用警告」橫幅，提醒您：</p>
      <ul>
        <li>此裝置儲存了客戶個資（電話、療程、消費）。</li>
        <li>離開座位前請登出 / 上鎖，避免他人看到個資。</li>
        <li>點選「我已知悉」可隱藏此警告（記為 localStorage <code>device.shared = 'false'</code>）。</li>
      </ul>

      <h2>5. 聯絡</h2>
      <p>如對隱私權有任何疑問，請聯絡：<Link href="/contact">客服頁面</Link>。</p>

      <hr style={{ margin: '32px 0', borderColor: '#f0d8d2' }} />
      <p style={{ fontSize: 12, color: '#a0a0a0' }}>
        本聲明為 demo / 雛形版本，production 上線前需由 owner 與真實律師 / DPO 審閱。
        對應上線閘門 Gate-1（PRD/SPEC.md §6.2）。
      </p>
    </main>
  );
}
