# Beauty CRM v0.4.0 — Design System 與 Component Spec

> 對齊 `PRD/SPEC.md` v3.0 §3.1（FR-001~FR-010）、§9.1（變現 4 tier）、§4.3（資料模型）。
> 對齊 `docs/AUDIT_v1.md`（既有 6 tab admin 行為）。
> 對齊 `docs/RUNBOOK.md`（加密匯出 / 刪除錯誤碼）。
> 風格基準：兩張 reference 圖（desktop + mobile member-app，米白 + 暖米 + 粉橘 accent + 深色 sidebar + 黑色 icon）。
> 本檔為 coder 可直接實作規格；所有 hex / px / ms 皆明確。

---

## 1. Design Tokens

### 1.1 Color Palette

從 reference 圖取樣（米白 / 暖米 / 粉橘 accent / 深色 sidebar / 黑色 icon），並保留 v0.3.0 既有 `#a04030` / `#fff7f5` 相容性。

#### Background（背景層級）
| Token | Hex | 用途 |
|---|---|---|
| `--bg-primary` | `#FDF5F0` | app 整體底（取代 v0.3.0 `#fff7f5`；更暖一階） |
| `--bg-secondary` | `#F5E8E0` | sidebar active item、selected row 底色 |
| `--bg-card` | `#FFFFFF` | 卡片、modal、sheet 內容底 |
| `--bg-elevated` | `#FFFFFF` | popover / dropdown |
| `--bg-overlay` | `rgba(45, 25, 22, 0.45)` | modal / sheet backdrop |

#### Text（文字層級）
| Token | Hex | 用途 |
|---|---|---|
| `--text-primary` | `#2A1A1A` | h1 / 標題 / 數字 |
| `--text-secondary` | `#6B4A45` | 副標 / body / label |
| `--text-muted` | `#A89A96` | hint / 輔助說明 / placeholder |
| `--text-inverse` | `#FFFFFF` | 放在 accent bg 上的文字 |
| `--text-link` | `#B85A45` | 連結（「查看全部」、「方案詳情」） |

#### Accent（粉橘 / terracotta 強調色）
| Token | Hex | 用途 |
|---|---|---|
| `--accent-primary` | `#B85A45` | 主要按鈕 / active nav icon / 進度條 / 連結 |
| `--accent-hover` | `#A04A37` | hover / focus-visible 邊框 |
| `--accent-active` | `#8A3A2A` | active 狀態 |
| `--accent-bg` | `#F5E1D8` | tag / pill 底色、soft highlight |
| `--accent-bg-hover` | `#EFD2C5` | tag hover |

#### Border（邊框）
| Token | Hex | 用途 |
|---|---|---|
| `--border-light` | `#F0E0D8` | card 邊、subtle separator |
| `--border-medium` | `#D6C5C1` | input、divider |
| `--border-strong` | `#A89A96` | hover 強調 |

#### Status（狀態色 — 4 種，不可只用顏色傳達意義）
| Token | Hex | 用途 |
|---|---|---|
| `--success` | `#4A8A4A` | ✓ 標記、saved、booked |
| `--success-bg` | `#E8F1E5` | success pill 底 |
| `--warning` | `#C18A2A` | ⚠ due-soon、override 提示 |
| `--warning-bg` | `#FBF1DC` | warning pill 底 |
| `--danger` | `#B33A2A` | ✗ 過期、刪除、過敏衝突 |
| `--danger-bg` | `#F8DDD8` | danger pill 底、allergy alert 底 |
| `--info` | `#5A7A8A` | i 提示、neutral 狀態 |
| `--info-bg` | `#E5EBF0` | info pill 底 |

#### Sidebar（sidebar 專用 token，desktop 才用）
| Token | Hex | 用途 |
|---|---|---|
| `--sidebar-bg` | `#FFFFFF` | sidebar 底 |
| `--sidebar-text` | `#2A1A1A` | nav item 文字 |
| `--sidebar-text-muted` | `#6B4A45` | 副標 |
| `--sidebar-active-bg` | `#F5E1D8` | active item 底 |
| `--sidebar-active-text` | `#B85A45` | active item 文字 |
| `--sidebar-border` | `#F0E0D8` | sidebar 右側 1px divider |
| `--sidebar-hover-bg` | `#FAEFEA` | hover |

#### Gradient（圖片 overlay 漸層）
| Token | Value | 用途 |
|---|---|---|
| `--overlay-image-bottom` | `linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)` | image card 底部文字白底 |
| `--overlay-image-top` | `linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 50%)` | image card 頂部（如「最新」badge） |

### 1.2 Typography

#### Font stack
```
--font-sans: "Noto Sans TC", -apple-system, BlinkMacSystemFont,
             "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif;
--font-mono: "JetBrains Mono", "SF Mono", Menlo, monospace;
```

> 既有 v0.3.0 用 `-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei"`；v0.4.0 把 Noto Sans TC 拉到 stack 第一位，匹配 reference 圖的人本 sans 視覺。`<html>` 加 `<link rel="preconnect" href="https://fonts.googleapis.com">` + `<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700&display=swap" rel="stylesheet">`（v0.4.0 才加，不算新 dep — 從 Google Fonts CDN）。

#### Scale
| Token | Size | Line-height | Weight | 用途 |
|---|---|---|---|---|
| `--text-display` | 32px | 1.25 | 700 | landing hero h1 |
| `--text-h1` | 28px | 1.3 | 700 | admin page title |
| `--text-h2` | 22px | 1.35 | 600 | card section title |
| `--text-h3` | 18px | 1.4 | 600 | card title、modal title |
| `--text-h4` | 16px | 1.45 | 600 | sub-section、stat label |
| `--text-body` | 14px | 1.6 | 400 | body / paragraph |
| `--text-body-lg` | 16px | 1.6 | 400 | 圖片卡片 overlay 文字 |
| `--text-caption` | 12px | 1.5 | 400 | hint、time、輔助 |
| `--text-overline` | 11px | 1.4 | 600 | uppercase tag（letter-spacing: 0.08em） |

### 1.3 Spacing Scale
| Token | px | 用途 |
|---|---|---|
| `--space-1` | 4px | icon 內距、chip 內距 |
| `--space-2` | 8px | input padding-x、tag 內距 |
| `--space-3` | 12px | card padding、list item 內距 |
| `--space-4` | 16px | card padding-lg、grid gap |
| `--space-5` | 24px | section gap、modal padding |
| `--space-6` | 32px | page padding、card gap |
| `--space-7` | 48px | landing section gap |
| `--space-8` | 64px | landing hero gap |

### 1.4 Border Radius
| Token | px | 用途 |
|---|---|---|
| `--radius-sm` | 4px | checkbox、small tag |
| `--radius-md` | 8px | button、input、card、tag |
| `--radius-lg` | 12px | modal、image card |
| `--radius-xl` | 16px | bottom sheet、image card-large |
| `--radius-full` | 9999px | avatar、pill、progress |

### 1.5 Shadow
| Token | Value | 用途 |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(45, 25, 22, 0.06)` | card 靜止 |
| `--shadow-md` | `0 4px 12px rgba(45, 25, 22, 0.08)` | card hover、image card |
| `--shadow-lg` | `0 12px 32px rgba(45, 25, 22, 0.12)` | modal、dropdown |
| `--shadow-sheet` | `0 -4px 24px rgba(45, 25, 22, 0.15)` | mobile bottom sheet |

### 1.6 Z-index
| Token | Value | 用途 |
|---|---|---|
| `--z-base` | 0 | 一般內容 |
| `--z-sticky` | 100 | header、mobile top bar |
| `--z-dropdown` | 200 | select、autocomplete |
| `--z-modal-backdrop` | 999 | modal backdrop |
| `--z-modal` | 1000 | modal、bottom sheet |
| `--z-toast` | 1100 | success / error toast |
| `--z-tooltip` | 1200 | tooltip |

### 1.7 Motion
| Token | Value | 用途 |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | 一般 transition |
| `--duration-fast` | 150ms | hover、focus |
| `--duration-base` | 240ms | modal、sheet 進場 |
| `--duration-slow` | 400ms | page transition |

---

## 2. Layout 規格

### 2.1 響應式斷點

| Token | px | Layout |
|---|---|---|
| `--bp-sm` | 480px | mobile 切到 bottom sheet / bottom nav 顯示 |
| `--bp-md` | 768px | tablet，sidebar 收起為 top bar |
| `--bp-lg` | 1024px | desktop，sidebar 顯示 |
| `--bp-xl` | 1440px | wide desktop |

### 2.2 Desktop Layout（≥ 1024px）

```
┌──────────────────────────────────────────────────────────────┐
│ Sidebar 240px  │  Header 64px                                │
│   logo         ├─────────────────────────────────────────────┤
│   nav items    │                                             │
│   user info    │  Main 1200px max-width, 24px padding        │
│                │   ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│                │   │  stat   │ │  image  │ │  image  │      │
│                │   │  card   │ │  card   │ │  card   │      │
│                │   └─────────┘ └─────────┘ └─────────┘      │
│                │   ┌─────────────────────────────────────┐   │
│                │   │  list card                          │   │
│                │   └─────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

| 區域 | 規格 |
|---|---|
| Sidebar | `position: fixed; left: 0; top: 0; bottom: 0; width: 240px;` 底色 `--sidebar-bg`，右側 1px `--sidebar-border` |
| Header | `position: sticky; top: 0; height: 64px;` 底色 `--bg-primary`（與主背景同色，不浮起） |
| Main | `margin-left: 240px; max-width: 1200px; padding: 24px 32px;` |
| Grid | 12 col，`gap: 16px`；card 預設 span 4 / 6 / 12 |

### 2.3 Tablet Layout（768–1023px）

| 區域 | 規格 |
|---|---|
| Sidebar | 隱藏；改為 top bar 左側漢堡按鈕 + drawer |
| Header | 同 desktop，但 greeting 縮短為「早安，林」 |
| Main | `max-width: 100%; padding: 16px;` |

### 2.4 Mobile Layout（< 768px）

| 區域 | 規格 |
|---|---|
| Sidebar | 隱藏；漢堡 → drawer 從左滑入（240px 全高） |
| Header | `position: sticky; top: 0; height: 56px;` 顯示「早安，林心妍」+ 通知 icon + 頭像 |
| Bottom Nav | `position: fixed; bottom: 0; left: 0; right: 0; height: 64px;` 5 個 tab，active 用 `--sidebar-active-bg` 圓角高亮 |
| Main | `padding: 16px 16px 80px;`（保留底部 nav 空間） |
| Sheet | 新增服務 modal 用 bottom sheet |

### 2.5 Sidebar 細節

```
┌─ Sidebar 240px ──────────┐
│  [logo]  Beauty CRM      │  72px tall, padding 16px
│  ─────────────────────── │  divider
│  📅  首頁                │  nav item 48px tall
│  👥  客戶檔案            │   - icon 20px, gap 12px
│  🔔  回訪提醒            │   - font body
│  📊  消費分析            │   - hover: bg --sidebar-hover-bg
│  ✉️  行銷推播            │   - active: bg --sidebar-active-bg
│  🎯  回流漏斗            │          text --sidebar-active-text
│  ─────────────────────── │          left 3px bar --accent-primary
│  ⚙️  設定                │  (v0.4.0 新增)
│                          │
│                          │  flex spacer
│                          │
│  [avatar] 林心妍         │  user info 64px
│  設計師 · pro            │  caption text-muted
└──────────────────────────┘
```

### 2.6 Header 細節

```
┌─ Header 64px desktop / 56px mobile ─────────────────┐
│  [hamburger (mobile only)] 早安，林心妍      🔔 [avatar] │
│                              今日有 3 位待回訪客戶       │
└────────────────────────────────────────────────────────┘
```

### 2.7 Image Card 規格（reference 圖核心元件）

```
┌──────────────┐
│              │
│  [image]     │  aspect-ratio 4:3（mobile 1:1）
│              │  border-radius --radius-lg
│  ─ overlay ─ │  position: absolute bottom 0
│  標題 24/12  │  text white, weight 600
│  副標        │  text rgba(255,255,255,0.85), 12px
└──────────────┘
```

---

## 3. Component 規格

所有 component 放在 `src/components/ui/`。每個 component：
- 接受 `className?: string` 允許覆蓋
- 接受 `children: React.ReactNode`（如適用）
- 使用 CSS variable 對齊 token
- ARIA：所有 interactive 元素有 `aria-label` / `aria-pressed` / `aria-current`

### 3.1 Card
**檔案**：`src/components/ui/Card.tsx`

| Props | Type | 必填 | 說明 |
|---|---|---|---|
| `title` | `string` | 否 | 標題（h3） |
| `subtitle` | `string` | 否 | 副標（caption） |
| `variant` | `'default' \| 'image' \| 'stat'` | 否 | 預設 `default` |
| `onClick` | `() => void` | 否 | 點擊行為；提供時 cursor: pointer + hover shadow |
| `children` | `React.ReactNode` | 否 | 內容 |
| `className` | `string` | 否 | 覆寫 class |

```css
.card { background: var(--bg-card); border: 1px solid var(--border-light);
        border-radius: var(--radius-lg); padding: var(--space-4);
        box-shadow: var(--shadow-sm); }
.card-title { font-size: var(--text-h3); color: var(--text-primary); font-weight: 600; }
.card[data-variant="image"] { padding: 0; overflow: hidden; }
.card[data-variant="stat"] { padding: var(--space-5); text-align: center; }
```

### 3.2 Button
**檔案**：`src/components/ui/Button.tsx`

| Props | Type | 必填 | 說明 |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'icon-only'` | 否 | 預設 `primary` |
| `size` | `'sm' \| 'md' \| 'lg'` | 否 | 預設 `md` |
| `disabled` | `boolean` | 否 | disabled state |
| `loading` | `boolean` | 否 | 顯示 spinner |
| `fullWidth` | `boolean` | 否 | mobile CTA 用 |
| `onClick` | `() => void` | 否 | |
| `type` | `'button' \| 'submit' \| 'reset'` | 否 | 預設 `button` |
| `ariaLabel` | `string` | 否 | icon-only 必填 |
| `children` | `React.ReactNode` | 否 | |

| Variant | bg | text | border | 用途 |
|---|---|---|---|---|
| primary | `--accent-primary` | `--text-inverse` | none | 主要 CTA（新增、儲存、核准） |
| secondary | `--bg-card` | `--text-secondary` | `--border-medium` | 次要動作 |
| ghost | transparent | `--text-secondary` | none | tertiary |
| danger | transparent | `--danger` | `--danger` | 刪除、撤回 |
| icon-only | transparent | `--text-secondary` | none | nav、close、edit |

| Size | height | padding-x | font |
|---|---|---|---|
| sm | 32px | 12px | 13px |
| md | 40px | 16px | 14px |
| lg | 52px（mobile CTA）/ 48px（desktop） | 20px | 16px / 18px |

### 3.3 Input / Textarea / Select
**檔案**：`src/components/ui/Input.tsx`、`Textarea.tsx`、`Select.tsx`

| Props | Type | 必填 | 說明 |
|---|---|---|---|
| `label` | `string` | 否 | label text（用 `<label htmlFor>` 綁定） |
| `error` | `string` | 否 | 錯誤訊息 |
| `hint` | `string` | 否 | 輔助說明 |
| `required` | `boolean` | 否 | 顯示 `*` |
| `fullWidth` | `boolean` | 否 | 預設 true |
| `value` / `onChange` | standard | — | 受控 |
| `placeholder` | `string` | 否 | |

### 3.4 Badge / Tag / Pill
**檔案**：`src/components/ui/Badge.tsx`

| Props | Type | 必填 | 說明 |
|---|---|---|---|
| `variant` | `'default' \| 'success' \| 'warning' \| 'danger' \| 'info' \| 'accent'` | 否 | 預設 `default` |
| `size` | `'sm' \| 'md'` | 否 | 預設 `md` |
| `children` | `React.ReactNode` | 是 | badge 內容 |

| Variant | bg | text |
|---|---|---|
| default | `--bg-secondary` | `--text-secondary` |
| success | `--success-bg` | `--success` |
| warning | `--warning-bg` | `--warning` |
| danger | `--danger-bg` | `--danger` |
| info | `--info-bg` | `--info` |
| accent | `--accent-bg` | `--accent-primary` |

### 3.5 Avatar
**檔案**：`src/components/ui/Avatar.tsx`

| Props | Type | 必填 | 說明 |
|---|---|---|---|
| `src` | `string` | 否 | 圖片 URL |
| `name` | `string` | 是 | fallback 顯示首字 + 底色 |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | 否 | 預設 `md`（32px） |
| `alt` | `string` | 否 | 圖片 alt |

| Size | px |
|---|---|
| sm | 24px |
| md | 32px |
| lg | 48px |
| xl | 80px |

Fallback：取 `name[0]`，底色用 hash → 從 `[#F5E1D8, #E5EBF0, #E8F1E5, #FBF1DC, #F8DDD8]` 5 色輪。

### 3.6 Modal / Sheet
**檔案**：`src/components/ui/Modal.tsx`、`Sheet.tsx`

```css
.modal-backdrop { position: fixed; inset: 0; background: var(--bg-overlay); z-index: var(--z-modal-backdrop); }
.modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
         background: var(--bg-card); border-radius: var(--radius-lg);
         padding: 24px; max-height: 90vh; overflow-y: auto;
         box-shadow: var(--shadow-lg); z-index: var(--z-modal); }
.sheet { position: fixed; left: 0; right: 0; bottom: 0;
         background: var(--bg-card); border-top-left-radius: var(--radius-xl);
         border-top-right-radius: var(--radius-xl); padding: 16px;
         max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-sheet);
         z-index: var(--z-modal); }
```

### 3.7 Toast
**檔案**：`src/components/ui/Toast.tsx` + `src/lib/toast.ts`（provider）

```ts
// src/lib/toast.ts
export const toast = {
  success: (msg: string) => void,
  error: (msg: string) => void,
  info: (msg: string) => void,
  warning: (msg: string) => void,
};
```

Provider 放在 `app/layout.tsx` 包 `<body>`。

### 3.8 ProgressBar
**檔案**：`src/components/ui/ProgressBar.tsx`

| Props | Type | 必填 | 說明 |
|---|---|---|---|
| `value` | `number` | 是 | 0–100 |
| `max` | `number` | 否 | 預設 100 |
| `variant` | `'default' \| 'success' \| 'tier'` | 否 | 預設 `default` |
| `showLabel` | `boolean` | 否 | 顯示百分比 |

視覺：高度 6px，圓角 `--radius-full`，底色 `--bg-secondary`，fill `--accent-primary`（tier variant 用漸層 `linear-gradient(90deg, #E8C5A8, #B85A45)`）。

### 3.9 EmptyState
**檔案**：`src/components/ui/EmptyState.tsx`

| Props | Type | 必填 | 說明 |
|---|---|---|---|
| `icon` | `ReactNode` | 否 | inline SVG 或 emoji |
| `title` | `string` | 是 | |
| `description` | `string` | 否 | |
| `action` | `ReactNode` | 否 | CTA button |

### 3.10 SkeletonLoader
**檔案**：`src/components/ui/Skeleton.tsx`

| Props | Type | 必填 | 說明 |
|---|---|---|---|
| `width` | `string \| number` | 否 | 預設 `100%` |
| `height` | `string \| number` | 是 | |
| `radius` | `string` | 否 | 預設 `--radius-md` |
| `count` | `number` | 否 | 預設 1 |

```css
@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.skeleton { background: var(--bg-secondary); animation: skeleton-pulse 1.5s ease-in-out infinite; }
```

### 3.11 Icon（inline SVG 規格）
**檔案**：`src/components/ui/Icon.tsx`

| Props | Type | 必填 | 說明 |
|---|---|---|---|
| `name` | `IconName`（見 §4 nav 表） | 是 | |
| `size` | `number` | 否 | 預設 20 |
| `strokeWidth` | `number` | 否 | 預設 1.75 |
| `className` | `string` | 否 | |

**規格**：
- `viewBox="0 0 24 24"`，`stroke="currentColor"`，`fill="none"`，`stroke-linecap="round"`，`stroke-linejoin="round"`
- 所有 icon 統一 24×24 網格，stroke 1.5–2
- 顏色 `currentColor`

**實作策略**：從 [Lucide](https://lucide.dev) MIT-licensed icons 直接複製 SVG path，**不裝 `lucide-react` dep**（符合「不要裝新 dep」）。建立 `IconName` union type 與 `ICONS: Record<IconName, string>` 路徑對照表。

---

## 4. Navigation 對應

### 4.1 6 tabs → 7 個 admin item

| Route | 中文 label | 英文 label | Icon (Lucide 名) | 說明 |
|---|---|---|---|---|
| `/dashboard` | 首頁 | Dashboard | `LayoutDashboard` | greeting + 今日重點 |
| `/customers` | 客戶檔案 | Customers | `Users` | 客戶列表 + 過敏 / 同意 |
| `/reminders` | 回訪提醒 | Reminders | `BellRing` | 應回訪 / due-soon / upcoming |
| `/analytics` | 消費分析 | Analytics | `TrendingUp` | 月營收、Top spenders |
| `/broadcast` | 行銷推播 | Broadcast | `Send` | 草稿 + 人工核准 |
| `/funnel` | 回流漏斗 | Funnel | `Filter` | due / contacted / booked |
| `/settings` | 設定 | Settings | `Settings` | v0.4.0 新增 |

> v0.3.0 既有 6 個 tab 保留；`總覽` 重新命名為 `首頁`；新增 `設定` 收納資料管理 + 裝置警告 + 方案升級 CTA。Admin home 從 `/` 移到 `/dashboard`。

### 4.2 Mobile Bottom Nav（5 個）

| 順序 | Route | 中文 | Icon |
|---|---|---|---|
| 1 | `/dashboard` | 首頁 | `Home` |
| 2 | `/customers` | 客戶 | `Users` |
| 3 | `/reminders` | 回訪 | `Bell` |
| 4 | `/broadcast` | 推播 | `Send` |
| 5 | `/settings` | 設定 | `Settings` |

### 4.3 路由結構

```
app/
  layout.tsx              # 根 layout
  page.tsx                # = / 公開 landing
  pricing/page.tsx        # 公開定價
  privacy/page.tsx        # 既有
  terms/page.tsx          # 既有
  contact/page.tsx        # 既有
  dashboard/page.tsx      # admin 首頁（取代 v0.3.0 / 為 Dashboard）
  customers/page.tsx
  reminders/page.tsx
  analytics/page.tsx
  broadcast/page.tsx
  funnel/page.tsx
  settings/page.tsx
```

**導覽元件**：
- `<AppShell>`：包 `<Sidebar>` + `<Header>` + `{children}`
- `<Sidebar>`：接受 `currentPath: string` 高亮 active
- `<MobileBottomNav>`：mobile only，5 tab
- `<MobileDrawer>`：漢堡點開，從左滑入

**URL 切換**：v0.3.0 用 in-component `useState<tab>`；v0.4.0 改用 Next.js App Router 內建 `usePathname()` + `useRouter().push()`。

---

## 5. 6 個 Page Layout

### 5.1 `/dashboard` 首頁（Overview）

**Hero / Greeting**：
```
早安，林心妍
今日有 3 位客戶待回訪 · 2 位本月壽星
```

**主要 cards（4 col grid，desktop 1+3+3+3 / mobile stack）**：

| Card | 內容 | 互動 |
|---|---|---|
| 「+ 新增服務」CTA | 突出 accent-primary 大按鈕 | 點擊 → 開 AddTreatmentSheet（既有） |
| Stat: 活躍客戶 | 數字 + label | 點擊 → /customers |
| Stat: 待回訪 | 數字 + label | 點擊 → /reminders |
| Stat: 本月療程 | 數字 + label | 點擊 → /analytics |

**次要 cards（2 col grid）**：
- 「下次推薦」image card
- 「會員方案」image card（含 ProgressBar）
- 「效果紀錄」image card 群
- 「下次推薦」

**空狀態**：若 `customers.length === 0` → EmptyState。

**載入狀態**：切到 localStorage hydration 時顯示 Skeleton。

### 5.2 `/customers` 客戶檔案

**Hero**：「客戶檔案」title + 「共 4 位 · 3 位已同意」subtitle + 右上「+ 新增客戶」按鈕

**主列表**（list card，1 col）：
每筆客戶 card 含 avatar / 同意狀態 / tier / 過敏 icon / 累計消費 / tierReason / 動作按鈕

**互動**：搜尋（v0.4.0 新增）、排序、過敏 badge

### 5.3 `/reminders` 回訪提醒

**Hero**：「回訪提醒」+ filter（全部 / overdue / due-soon / upcoming）

**主列表**：每筆 reminder 含狀態 badge、覆寫按鈕、標記已聯絡 / 已預約

### 5.4 `/analytics` 消費分析

**Hero**：「消費分析」+ 時間區間 filter

**主要 cards**：月營收 table、Top 3 高消費客戶、tier 分佈 progress bar、平均客單價、回購率

### 5.5 `/broadcast` 行銷推播

**Hero**：「行銷推播」+ 「已同意 3 位 · 草稿 2 份待核准」

**主要 cards**：預載訊息模板、回訪推播預覽（含 ✓ 核准按鈕）、已核准待發送

### 5.6 `/funnel` 回流漏斗

**Hero**：「回流漏斗」+ 「手動標記 — 3 階段」hint

**主內容**：3 欄 grid（`repeat(auto-fit, minmax(280px, 1fr))`）

### 5.7 `/settings` 設定（v0.4.0 新增）

**主內容（list card）**：
- 「資料管理」：加密匯出 / 還原備份 / 刪除所有資料
- 「裝置共用警告」：toggle 開 / 關（持久化 `localStorage['device.shared']`）
- 「方案」：目前方案 + 「升級方案」CTA → /pricing
- 「隱私 / 條款 / 聯絡」：3 個 link
- 「版本」：v0.4.0 + commit SHA

---

## 6. Data Layer 策略

### 6.1 現狀分析

- 現有 `Dashboard.tsx` 用 `useState<>` 持有 7 個 state
- 每次 refresh / hot reload 全部 reset 回 SEED
- 部分 flag 已用 `localStorage`（`device.shared`）但沒全面落地

### 6.2 Vercel 部署需求

- Next.js App Router，serverless function 短暫
- 沒有後端 DB（SPEC §4.1）
- ADR-003「v1 單店單裝置加密，先測輸入習慣再做雲端協作」

### 6.3 v0.4.0 方案：client-side persistence（localStorage）

**決策**：用 `localStorage` + typed wrapper，**不做密碼保護**（v2 再做）。

### 6.4 實作規格

**新檔 `src/lib/storage.ts`**：

```ts
// src/lib/storage.ts
// 對齊 SPEC ADR-003（v1 單店單裝置，v2 才上雲協作）
// v0.4.0 實作：localStorage typed wrapper，無密碼保護。

const PREFIX = 'beauty-crm:v1:';

export function isClient(): boolean {
  return typeof window !== 'undefined';
}

export function load<T>(key: string, fallback: T): T {
  if (!isClient()) return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T): void {
  if (!isClient()) return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.warn('[storage] save failed', key, err);
  }
}

export function clear(key: string): void {
  if (!isClient()) return;
  window.localStorage.removeItem(PREFIX + key);
}

export function clearAll(): void {
  if (!isClient()) return;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(PREFIX)) keys.push(k);
  }
  keys.forEach((k) => window.localStorage.removeItem(k));
}

export const StorageKeys = {
  customers: 'customers',
  treatments: 'treatments',
  contactLogs: 'contactLogs',
  apptLogs: 'apptLogs',
  approvedTargets: 'approvedTargets',
  reminderOverrides: 'reminderOverrides',
  deviceShared: 'device.shared',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
```

**使用範例**：
```ts
const [customers, setCustomers] = useState<Customer[]>(SEED_CUSTOMERS);
const [hydrated, setHydrated] = useState(false);

useEffect(() => {
  setCustomers(load(StorageKeys.customers, SEED_CUSTOMERS));
  setTreatments(load(StorageKeys.treatments, SEED_TREATMENTS));
  // ... 其他 5 個 state
  setHydrated(true);
}, []);

useEffect(() => {
  if (hydrated) save(StorageKeys.customers, customers);
}, [customers, hydrated]);
```

### 6.5 SSR 安全

- 所有 `load` / `save` / `clear` 都先檢查 `isClient()`
- component 內 `useState(fallback)` 給 SEED，避免 hydration mismatch
- 首次 render 顯示 Skeleton / 載入中
- 不用 `useSyncExternalStore`（避免 SSR 警告）

### 6.6 Schema migration 策略

`PREFIX = 'beauty-crm:v1:'` — 將來 schema breaking change 時改 `v2:`，自動清空舊資料。
單一 entry 內用 `version: 1` 欄位。

### 6.7 測試

- `tests/storage.test.ts`：mock `window.localStorage`（happy-dom 環境）
- 涵蓋：`load` 缺值 / load 損壞 JSON / save quota / SSR (`window === undefined`)

### 6.8 不實作密碼保護的理由

- 對齊 SPEC ADR-003
- 對齊 §9.1「免費層保留資料可攜」
- 對齊 §15.11：pilot 未通過前不做 v2
- v0.4.0 scope：先解決 refresh 痛點，密碼等 §11 pilot 通過再做

### 6.9 對齊既有功能

- 加密匯出（FR-009）仍用既有 `exportEncrypted` + 8+ 字元 passphrase
- 刪除（FR-009）仍用既有 `purgeAllData`，但加 `clearAll()` 一併清 localStorage
- 還原（FR-009）用既有 `decryptEncrypted` 解碼後寫回 state + localStorage

---

## 7. Landing + Pricing 頁面

### 7.1 `/` 改為公開 landing

**Hero**：
```
Beauty CRM

記得客戶做過什麼、
多久該回來、
如何在不打擾下追蹤。

[免費試用 50 位客戶] [查看方案 →]

─── 不和預約 / POS 競爭，專注療程後 30-90 天記憶 ───
```

**3 個 Feature Card**（3 col grid）：
1. **療程回流提醒**：依類別計算下次回訪日，逾期自動入清單；icon `BellRing`
2. **過敏 / 偏好紀錄**：Before/After 照片 + 過敏醒目確認；icon `ShieldCheck`
3. **草稿 → 人工核准**：LINE 草稿不直接發送，設計師保留語氣；icon `MessageSquare`

**3 Tier 簡介**（簡化版）+ 「查看完整方案」link → /pricing

**Footer**：
- Privacy / Terms / Contact
- © 2026 Beauty CRM · v0.4.0
- 「v1 單店單裝置，資料只留在你的裝置」trust 標語

### 7.2 `/pricing` 定價頁（公開）

**Hero**：「簡單定價，按你的規模選」subtitle「免費試用，隨時可匯出備份」

**4 個 Pricing Card**（4 col grid，desktop；2x2 mobile）：

| 方案 | 價格 | 包含 | CTA | 視覺強調 |
|---|---|---|---|---|
| **免費** | NT$ 0 | 50 位客戶、30 次服務、回訪清單、加密匯出 | 免費開始 | default border |
| **設計師** ⭐ | NT$ 299 / 月 | 300 位客戶、草稿與報表、VIP 分級、多裝置同步（測試版） | 開始 14 天試用 | accent border（popular） |
| **工作室** | NT$ 799 / 月 | 5 位成員、5,000 位客戶、LINE adapter beta、cohort 報表 | 聯絡銷售 | default border |
| **品牌** | NT$ 2,499 / 月 | 訪談後開放、多店、API、SSO、專屬顧問 | 預約 demo | default border |

> 對齊 SPEC §9.1 變現方案 4 tier。
> ⭐ popular 標記：設計師 tier。

**FAQ section**（5 題）：
1. 免費版可以一直用嗎？→ 可以，50 位客戶 / 30 次服務內永久免費
2. 隨時可以升級嗎？→ 可以，月繳，隨時降級
3. 資料安全嗎？→ v1 資料只存在你的裝置（AES-256 加密匯出）；v2 才有雲端同步
4. 可以匯出我的資料嗎？→ 任何方案都可以隨時匯出 JSON 備份
5. 設計師 / 工作室差別？→ 工作室有多人 workspace（5 位成員）+ LINE adapter

**Footer**：同 §7.1。

### 7.3 風格對齊 admin

- 同一 design system
- landing 額外用 `--text-display` 32px hero h1
- pricing card 用 `--shadow-md` hover lift 效果

---

## 8. Coder 實作 Checklist

### Phase 1：Design Token Foundation
- [ ] `src/app/globals.css` 加 7 個章節的 CSS variable
- [ ] 加 Google Fonts `<link>` 到 `app/layout.tsx`
- [ ] 保留 v0.3.0 既有 token，加 `--accent-primary-legacy: #a04030` 相容

### Phase 2：UI Component Library
- [ ] 建 `src/components/ui/` + 11 個元件
- [ ] 每個元件寫 `*.test.tsx`
- [ ] Icon 從 Lucide 抄 SVG path，**不裝 dep**

### Phase 3：AppShell + Routing
- [ ] `app/dashboard/layout.tsx`：包 `<AppShell>`（Sidebar + Header + BottomNav）
- [ ] `src/components/Sidebar.tsx`、`Header.tsx`、`MobileBottomNav.tsx`、`MobileDrawer.tsx`
- [ ] 把 6 個 tab 拆成 6 個 page
- [ ] `app/dashboard/page.tsx` 取代原 `app/page.tsx` 的 Dashboard

### Phase 4：Storage Layer
- [ ] `src/lib/storage.ts` + `tests/storage.test.ts`
- [ ] Dashboard 重構：7 個 state 改 `useState(SEED)` + `useEffect(load)` + `useEffect(save, [...deps, hydrated])`
- [ ] 驗證 refresh 後資料仍存在

### Phase 5：Page Layout Polish
- [ ] 6 個 admin page 套用新 design system
- [ ] 加 `/settings` 頁
- [ ] 加搜尋 / 排序 / filter 互動

### Phase 6：Landing + Pricing
- [ ] `app/page.tsx` 改為 landing
- [ ] `app/pricing/page.tsx` 4 tier card + FAQ
- [ ] 既有的 `app/privacy`、`terms`、`contact` link 串好

### Phase 7：驗證
- [ ] Mobile 390 / tablet 768 / desktop 1440 都跑過主流程
- [ ] Lighthouse accessibility ≥ 90
- [ ] 鍵盤 / 螢幕閱讀器
- [ ] localStorage 測：加客戶 → refresh → 還在
- [ ] export → import → 資料還原正確

### 不要做
- ❌ 不裝 `lucide-react`（icon 用 inline SVG）
- ❌ 不改 `lib/*` 純函式（domain 邏輯 frozen）
- ❌ 不改 `PRD/SPEC.md`
- ❌ 不動既有 162 個 test 通過路徑
- ❌ 不實作密碼保護 localStorage
- ❌ 不做多店 / 多裝置同步

---

## 9. 相容性與遷移

| 既有 v0.3.0 | v0.4.0 對應 |
|---|---|
| `app/page.tsx` → `Dashboard` | 移到 `app/dashboard/page.tsx` |
| Dashboard 6 個 `tab === 'X'` | 拆成 6 個獨立 page |
| `<button class="primary">` | `<Button variant="primary">` |
| inline `<div>` 當 Card | `<Card>` 元件 |
| `exportMsg` inline `<p>` | `toast.success()` |
| 7 個 `useState` 重置 | `useState(SEED)` + `load/save` localStorage |
| emoji icon | inline SVG Icon 元件 |
| 紅色 #a04030 | #B85A45 + legacy fallback |

---

## 10. 風險與開放問題

### 風險
1. **localStorage quota**（5–10 MB）：500 位客戶 + 5,000 筆療程可能逼近上限；方案：照片不放 localStorage（只存 metadata），或 v0.5 切 IndexedDB
2. **多 tab 不同步**：v0.4.0 不做 cross-tab sync
3. **icon 抄 Lucide 的 license**：MIT 可商用，OK；保留出處 comment
4. **既有 162 個 test**：可能因 `useState` 改 localStorage hydration 失敗 — 確認 mock 環境有 `localStorage`（happy-dom 預設有）

### 開放問題（v0.4.0 不解）
- 密碼保護 / 多裝置同步（v2）
- 客戶自助填寫表單（v3）
- 多店治理（v3）

---

**文件結束。** Coder 從 §8 Checklist 開始；有任何 §1–§7 規格模糊處，優先對齊 reference 圖視覺，次對齊 v0.3.0 既有行為，最後才自創。
