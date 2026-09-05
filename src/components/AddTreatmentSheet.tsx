// Beauty CRM — 手機單手快速新增服務 modal（FR-010 / AC-002-UI / AC-004）
//
// 設計目標：
// - mobile-first：< 480px 用 bottom sheet（單手可達）
// - tablet / desktop：centered modal
// - 4 大類別 preset 快捷鈕（美甲 / 美睫 / 護膚 / 髮型）
// - 過敏醒目確認（AC-004）：若有衝突 submit 前阻擋 + 紅色 alert + 需勾選「已知風險，繼續」
// - 鍵盤 / 螢幕閱讀器：aria-live, role, label
// - useReducer 管理 draft state，可由測試獨立驅動
// - 客戶欄位 autofocus（單手：開表單就準備輸入）

'use client';

import { useReducer, useEffect, useRef, useState } from 'react';
import { hasAllergyConflict, type Customer } from '@/lib/customers';
import { recordTreatment, type Treatment, type TreatmentCategory, type TreatmentDraft } from '@/lib/treatments';
import { getLayoutMode, isSingleHandUi, type LayoutMode } from '@/lib/responsive';

export const SERVICE_PRESETS: ReadonlyArray<{ category: TreatmentCategory; label: string; defaultName: string; defaultPrice: number; defaultDuration: number }> = [
  { category: 'manicure', label: '美甲', defaultName: '凝膠美甲', defaultPrice: 1200, defaultDuration: 90 },
  { category: 'eyelash', label: '美睫', defaultName: '美睫嫁接', defaultPrice: 1500, defaultDuration: 60 },
  { category: 'skincare', label: '皮膚管理', defaultName: '臉部保養', defaultPrice: 2500, defaultDuration: 90 },
  { category: 'hair', label: '髮型', defaultName: '剪髮', defaultPrice: 1500, defaultDuration: 60 },
];

export interface AddTreatmentDraft {
  customerId: string;
  serviceName: string;
  performedAt: string; // ISO timestamp
  productIngredients: string[];
  notes: string;
  designerId: string;
  category: TreatmentCategory;
  price: number;
  durationMin: number;
  allergyAcknowledged: boolean;
}

export type AddTreatmentAction =
  | { type: 'setCustomer'; customerId: string }
  | { type: 'setServiceName'; serviceName: string }
  | { type: 'setCategory'; category: TreatmentCategory; defaultName: string; defaultPrice: number; defaultDuration: number }
  | { type: 'setPerformedAt'; performedAt: string }
  | { type: 'setProductIngredients'; productIngredients: string[] }
  | { type: 'addIngredient'; ingredient: string }
  | { type: 'removeIngredient'; ingredient: string }
  | { type: 'setNotes'; notes: string }
  | { type: 'setDesignerId'; designerId: string }
  | { type: 'setAllergyAcknowledged'; acknowledged: boolean }
  | { type: 'reset'; next: AddTreatmentDraft };

export const EMPTY_DRAFT: AddTreatmentDraft = {
  customerId: '',
  serviceName: '',
  performedAt: new Date().toISOString().slice(0, 16), // datetime-local 格式
  productIngredients: [],
  notes: '',
  designerId: 'designer-local',
  category: 'manicure',
  price: 0,
  durationMin: 60,
  allergyAcknowledged: false,
};

export function addTreatmentReducer(
  state: AddTreatmentDraft,
  action: AddTreatmentAction,
): AddTreatmentDraft {
  switch (action.type) {
    case 'setCustomer':
      return { ...state, customerId: action.customerId, allergyAcknowledged: false };
    case 'setServiceName':
      return { ...state, serviceName: action.serviceName };
    case 'setCategory':
      return {
        ...state,
        category: action.category,
        serviceName: action.defaultName,
        price: action.defaultPrice,
        durationMin: action.defaultDuration,
      };
    case 'setPerformedAt':
      return { ...state, performedAt: action.performedAt };
    case 'setProductIngredients':
      return { ...state, productIngredients: action.productIngredients, allergyAcknowledged: false };
    case 'addIngredient':
      if (state.productIngredients.includes(action.ingredient)) return state;
      return { ...state, productIngredients: [...state.productIngredients, action.ingredient], allergyAcknowledged: false };
    case 'removeIngredient':
      return {
        ...state,
        productIngredients: state.productIngredients.filter((i) => i !== action.ingredient),
        allergyAcknowledged: false,
      };
    case 'setNotes':
      return { ...state, notes: action.notes };
    case 'setDesignerId':
      return { ...state, designerId: action.designerId };
    case 'setAllergyAcknowledged':
      return { ...state, allergyAcknowledged: action.acknowledged };
    case 'reset':
      return action.next;
    default:
      return state;
  }
}

export interface AddTreatmentSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (treatment: Treatment) => void;
  customers: Customer[];
  /** 用於 SSR / 測試：給定 viewport 寬度（沒給 → 預設 mobile 390） */
  viewportWidth?: number;
}

export default function AddTreatmentSheet({
  open,
  onClose,
  onSubmit,
  customers,
  viewportWidth,
}: AddTreatmentSheetProps) {
  const [state, dispatch] = useReducer(addTreatmentReducer, EMPTY_DRAFT);
  const [ingredientDraft, setIngredientDraft] = useState('');
  const [viewport, setViewport] = useState<number>(viewportWidth ?? 390);
  const customerInputRef = useRef<HTMLInputElement | null>(null);

  // 監聽 viewport（瀏覽器環境；SSR / 測試時用 prop 注入）
  useEffect(() => {
    if (viewportWidth !== undefined) return;
    if (typeof window === 'undefined') return;
    const update = () => setViewport(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [viewportWidth]);

  // 開啟時 focus 客戶欄位（單手：馬上可打字）
  useEffect(() => {
    if (open && customerInputRef.current) {
      customerInputRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  const mode: LayoutMode = getLayoutMode(viewport);
  const singleHand = isSingleHandUi(viewport);
  const selectedCustomer = customers.find((c) => c.id === state.customerId);
  const conflicts = selectedCustomer
    ? hasAllergyConflict(selectedCustomer, state.productIngredients)
    : [];
  const hasAllergy = conflicts.length > 0;
  const canSubmit =
    state.customerId.trim().length > 0 &&
    state.serviceName.trim().length > 0 &&
    state.price > 0 &&
    state.durationMin > 0 &&
    (!hasAllergy || state.allergyAcknowledged);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const draft: TreatmentDraft = {
      id: `t-${Date.now()}`,
      customerId: state.customerId,
      category: state.category,
      serviceName: state.serviceName,
      productIngredients: state.productIngredients,
      price: state.price,
      durationMin: state.durationMin,
      performedAt: new Date(state.performedAt).toISOString(),
      designerId: state.designerId,
      notes: state.notes,
    };
    const treatment = recordTreatment(draft);
    onSubmit(treatment);
    dispatch({ type: 'reset', next: EMPTY_DRAFT });
  };

  const isSheet = mode === 'bottom-sheet';
  const containerStyle: React.CSSProperties = isSheet
    ? {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        background: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 16,
        paddingBottom: singleHand ? 24 : 16,
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
        zIndex: 1000,
      }
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#fff',
        borderRadius: 12,
        padding: 24,
        width: 'min(560px, calc(100vw - 32px))',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        zIndex: 1000,
      };
  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 999,
  };
  const ctaStyle: React.CSSProperties = singleHand
    ? {
        width: '100%',
        minHeight: 52,
        fontSize: 18,
        fontWeight: 600,
        background: '#a04030',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        marginTop: 12,
      }
    : {
        minHeight: 40,
        fontSize: 14,
        background: '#a04030',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        padding: '8px 16px',
        marginTop: 12,
      };

  return (
    <>
      <div aria-hidden="true" style={backdropStyle} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-treatment-title"
        data-viewport-mode={mode}
        data-single-hand={singleHand ? 'true' : 'false'}
        style={containerStyle}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 id="add-treatment-title" style={{ fontSize: 18, color: '#a04030', margin: 0 }}>
            新增服務
          </h2>
          <button
            type="button"
            aria-label="關閉"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* 客戶欄位 — autofocus */}
          <label htmlFor="ats-customer" style={{ display: 'block', fontSize: 13, color: '#6b4a45', marginTop: 8 }}>
            客戶 *
          </label>
          <input
            id="ats-customer"
            ref={customerInputRef}
            list="ats-customer-list"
            type="text"
            value={selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.phone})` : ''}
            onChange={(e) => {
              const match = customers.find(
                (c) => `${c.name} (${c.phone})` === e.target.value || c.id === e.target.value,
              );
              dispatch({ type: 'setCustomer', customerId: match ? match.id : e.target.value });
            }}
            autoComplete="off"
            required
            style={fieldStyle}
            aria-required="true"
          />
          <datalist id="ats-customer-list">
            {customers.map((c) => (
              <option key={c.id} value={`${c.name} (${c.phone})`}>
                {c.id}
              </option>
            ))}
          </datalist>

          {/* 服務類別 preset 快捷鈕 */}
          <fieldset style={{ border: 'none', padding: 0, marginTop: 12 }}>
            <legend style={{ fontSize: 13, color: '#6b4a45' }}>服務類別 *</legend>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SERVICE_PRESETS.map((p) => (
                <button
                  key={p.category}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: 'setCategory',
                      category: p.category,
                      defaultName: p.defaultName,
                      defaultPrice: p.defaultPrice,
                      defaultDuration: p.defaultDuration,
                    })
                  }
                  aria-pressed={state.category === p.category}
                  style={{
                    padding: '6px 10px',
                    border: '1px solid #d6c5c1',
                    borderRadius: 16,
                    background: state.category === p.category ? '#a04030' : '#fff',
                    color: state.category === p.category ? '#fff' : '#6b4a45',
                    fontSize: 13,
                    minHeight: 36,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* 服務名稱 */}
          <label htmlFor="ats-svc" style={{ display: 'block', fontSize: 13, color: '#6b4a45', marginTop: 8 }}>
            服務名稱 *
          </label>
          <input
            id="ats-svc"
            type="text"
            value={state.serviceName}
            onChange={(e) => dispatch({ type: 'setServiceName', serviceName: e.target.value })}
            required
            style={fieldStyle}
            aria-required="true"
          />

          {/* 日期 */}
          <label htmlFor="ats-date" style={{ display: 'block', fontSize: 13, color: '#6b4a45', marginTop: 8 }}>
            服務日期 *
          </label>
          <input
            id="ats-date"
            type="datetime-local"
            value={state.performedAt}
            onChange={(e) => dispatch({ type: 'setPerformedAt', performedAt: e.target.value })}
            required
            style={fieldStyle}
            aria-required="true"
          />

          {/* 產品成分（chip 風格） */}
          <label htmlFor="ats-ing" style={{ display: 'block', fontSize: 13, color: '#6b4a45', marginTop: 8 }}>
            產品成分（過敏判斷用）
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              id="ats-ing"
              type="text"
              value={ingredientDraft}
              onChange={(e) => setIngredientDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && ingredientDraft.trim()) {
                  e.preventDefault();
                  dispatch({ type: 'addIngredient', ingredient: ingredientDraft.trim() });
                  setIngredientDraft('');
                }
              }}
              style={{ ...fieldStyle, flex: 1 }}
              placeholder="輸入成分後按 Enter"
            />
            <button
              type="button"
              onClick={() => {
                if (ingredientDraft.trim()) {
                  dispatch({ type: 'addIngredient', ingredient: ingredientDraft.trim() });
                  setIngredientDraft('');
                }
              }}
              style={{ minHeight: 40, padding: '0 12px' }}
            >
              + 加入
            </button>
          </div>
          {state.productIngredients.length > 0 && (
            <ul aria-label="已加入成分" style={{ listStyle: 'none', padding: 0, margin: '8px 0', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {state.productIngredients.map((i) => (
                <li
                  key={i}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: '#f0d8d2',
                    color: '#6b4a45',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                >
                  {i}
                  <button
                    type="button"
                    aria-label={`移除 ${i}`}
                    onClick={() => dispatch({ type: 'removeIngredient', ingredient: i })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* 過敏醒目確認（AC-004） */}
          {hasAllergy && (
            <div
              role="alert"
              aria-live="assertive"
              data-testid="allergy-alert"
              style={{
                background: '#ffe0e0',
                border: '2px solid #c04030',
                borderRadius: 8,
                padding: 12,
                marginTop: 12,
                color: '#7a1a1a',
              }}
            >
              <b>⚠ 過敏衝突</b>
              <p style={{ margin: '4px 0', fontSize: 13 }}>
                客戶 <b>{selectedCustomer?.name}</b> 對以下成分敏感：
              </p>
              <ul style={{ margin: '4px 0 8px 16px', fontSize: 13 }}>
                {conflicts.map((c) => (
                  <li key={c}>
                    <code>{c}</code>
                  </li>
                ))}
              </ul>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={state.allergyAcknowledged}
                  onChange={(e) => dispatch({ type: 'setAllergyAcknowledged', acknowledged: e.target.checked })}
                />
                已知風險，繼續
              </label>
            </div>
          )}

          {/* 備註 */}
          <label htmlFor="ats-notes" style={{ display: 'block', fontSize: 13, color: '#6b4a45', marginTop: 8 }}>
            備註
          </label>
          <textarea
            id="ats-notes"
            value={state.notes}
            onChange={(e) => dispatch({ type: 'setNotes', notes: e.target.value })}
            style={{ ...fieldStyle, minHeight: 60 }}
            rows={2}
          />

          {/* Submit CTA — 單手 UI 時放大、置底 */}
          <button type="submit" disabled={!canSubmit} style={ctaStyle} data-testid="submit-treatment">
            {canSubmit ? '✓ 儲存' : hasAllergy ? '請勾選已知風險' : '請填寫必填欄位'}
          </button>
          {selectedCustomer && (
            <p style={{ fontSize: 12, color: '#6b4a45', marginTop: 8 }}>
              設計師備註：{state.designerId}
            </p>
          )}
        </form>
      </div>
    </>
  );
}

const fieldStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  minHeight: 40,
  padding: '8px 10px',
  border: '1px solid #d6c5c1',
  borderRadius: 6,
  fontSize: 14,
  boxSizing: 'border-box',
};
