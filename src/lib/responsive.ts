// Beauty CRM — RWD 斷點工具
// 給 AddTreatmentSheet / Dashboard 用；可單獨測試（純函式）。
//
// 對齊 SPEC DoD-6：Mobile 390 / tablet 768 / desktop 1440。
// 注意：純前端 in-memory demo，這個 helper 沒接觸真實瀏覽器像素，
// 設計成接受 width number 當參數；呼叫端在 component 內
// 從 window.innerWidth 拿（或用 default）。

export type LayoutMode = 'bottom-sheet' | 'centered-modal';

export interface Breakpoints {
  mobile: number; // < mobile → bottom sheet (full width)
  tablet: number; // < tablet → bottom sheet (centered narrow)
  desktop: number; // >= tablet → centered modal
}

export const DEFAULT_BREAKPOINTS: Breakpoints = {
  mobile: 480, // < 480px：手機（單手 UI，全寬底部抽屜）
  tablet: 900, // < 900px：小平板（仍底部抽屜但縮小寬度）
  desktop: 900, // >= 900px：桌機（centered modal）
};

/**
 * 依 viewport 寬度決定 layout 模式。
 * - < mobile → bottom-sheet (full width)
 * - mobile..tablet → bottom-sheet (still 抽屜風格，但比較窄)
 * - >= tablet → centered-modal
 *
 * 純函式：無副作用、無 DOM 依賴，可在 node / SSR / test 環境呼叫。
 */
export function getLayoutMode(
  width: number,
  bp: Breakpoints = DEFAULT_BREAKPOINTS,
): LayoutMode {
  if (width < bp.mobile) return 'bottom-sheet';
  if (width < bp.tablet) return 'bottom-sheet';
  return 'centered-modal';
}

/**
 * 計算 sheet 寬度上限。
 * - bottom-sheet: 100% 寬（max = viewport）
 * - centered-modal: 固定 560px（桌機好閱讀）
 */
export function getSheetMaxWidth(
  mode: LayoutMode,
  viewportWidth: number,
): number | string {
  if (mode === 'bottom-sheet') return '100%';
  return Math.min(560, viewportWidth - 32);
}

/**
 * 判斷是否為「單手 UI」：手機寬度（< 480px）需要把 CTA 放底部、放大按鈕。
 */
export function isSingleHandUi(width: number, bp: Breakpoints = DEFAULT_BREAKPOINTS): boolean {
  return width < bp.mobile;
}
