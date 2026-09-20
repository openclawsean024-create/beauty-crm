// Beauty CRM — entry: 把 5-tab 工作台收進 Workbench (見 PRD/UI-SPEC §2)。
// 舊版 5 個分頁的單頁 shell 已重構成 workbench,行為對齊 beauty-crm-redesign.html。

'use client';

import Workbench from './workbench/Workbench';

export default function Dashboard() {
  return <Workbench />;
}
