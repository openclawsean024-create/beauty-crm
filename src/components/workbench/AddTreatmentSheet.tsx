// Beauty CRM — 新增服務紀錄 drawer / bottom sheet
// 對應 PRD/UI-SPEC §4:欄位順序、recall 模板自動帶入、過敏警示、儲存後回原頁。
// 桌面: 右側 drawer;行動: bottom sheet (≤480px)。

'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import type { Customer } from '@/lib/customers';
import { hasAllergyConflict } from '@/lib/customers';
import { SERVICE_PRESETS, type DisplayCustomer, type DisplayTreatment } from './seed';
import type { TreatmentCategory } from '@/lib/treatments';
import { suggestNextRecallDate, recallDaysFor } from '@/lib/followups';

interface Props {
  open: boolean;
  customers: DisplayCustomer[];
  treatments: DisplayTreatment[];
  initialCustomerId?: string;
  onClose: () => void;
  /** 儲存成功 → 觸發父層 toast,父層保留原本狀態 */
  onSubmit: (payload: SubmittedTreatment) => void;
}

export interface SubmittedTreatment {
  id: string;
  customerId: string;
  category: TreatmentCategory;
  serviceName: string;
  price: number;
  durationMin: number;
  performedAt: string;
  recallAt: string;
  productIngredients: string[];
  notes?: string;
  allergyConflict: string[];
  allergyAck: boolean;
}

export default function AddTreatmentSheet({
  open,
  customers,
  treatments,
  initialCustomerId,
  onClose,
  onSubmit,
}: Props) {
  const todayIso = useMemo(() => toDateOnly(new Date()), []);
  const headingId = useId();

  const firstCustomerId = customers[0]?.id ?? '';
  const [customerId, setCustomerId] = useState(initialCustomerId ?? firstCustomerId);
  const [category, setCategory] = useState<TreatmentCategory>('manicure');
  const [serviceName, setServiceName] = useState<string>(SERVICE_PRESETS[0]?.label ?? '');
  const [performedAt, setPerformedAt] = useState<string>(todayIso);
  const [recallAt, setRecallAt] = useState<string>(
    suggestNextRecallDate(new Date(), recallDaysFor('manicure')),
  );
  const [productIngredients, setProductIngredients] = useState('');
  const [notes, setNotes] = useState('');
  const [allergyAck, setAllergyAck] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 開啟時重置 / 套用初始客戶
  useEffect(() => {
    if (!open) return;
    const target = initialCustomerId ?? firstCustomerId;
    setCustomerId(target);
    setCategory('manicure');
    setServiceName(SERVICE_PRESETS[0]?.label ?? '');
    setPerformedAt(todayIso);
    setRecallAt(suggestNextRecallDate(new Date(), recallDaysFor('manicure')));
    setProductIngredients('');
    setNotes('');
    setAllergyAck(false);
    setError(null);
  }, [open, initialCustomerId, firstCustomerId, todayIso]);

  // 服務類別變動 → 自動帶入週期日 (可手動覆寫,所以不鎖定欄位)
  const onCategoryChange = (next: TreatmentCategory) => {
    setCategory(next);
    const preset = SERVICE_PRESETS.find((s) => s.category === next);
    if (preset) setServiceName(preset.label);
    setRecallAt(suggestNextRecallDate(parseDate(performedAt), recallDaysFor(next)));
  };

  const customer = customers.find((c) => c.id === customerId);
  const lastTreatment = treatments.find(
    (t) => t.customerId === customerId,
  );
  const ingredientList = productIngredients
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const allergyConflicts = customer && ingredientList.length
    ? hasAllergyConflict(
        // 此處我們需要 customer.allergies,但 seed 給的是 DisplayCustomer
        { ...(customer as unknown as Customer), allergies: lastTreatment?.allergyDescription ? [lastTreatment.allergyDescription] : [] } as unknown as Customer,
        ingredientList,
      )
    : [];
  const hasConflict = allergyConflicts.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) {
      setError('請選擇客戶');
      return;
    }
    if (!serviceName.trim()) {
      setError('請填寫服務項目');
      return;
    }
    if (hasConflict && !allergyAck) {
      setError('請先勾選「已知過敏 / 禁忌」才能繼續');
      return;
    }
    onSubmit({
      id: `t-${Date.now()}`,
      customerId,
      category,
      serviceName: serviceName.trim(),
      price: 0,
      durationMin: 60,
      performedAt: parseDate(performedAt).toISOString(),
      recallAt,
      productIngredients: ingredientList,
      notes: notes.trim() || undefined,
      allergyConflict: allergyConflicts,
      allergyAck: hasConflict ? allergyAck : true,
    });
  };

  return (
    <div
      className={`drawer-backdrop${open ? ' open' : ''}`}
      aria-hidden={!open}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
      >
        <div className="drawer-head">
          <div>
            <div className="eyebrow">QUICK CAPTURE · 30 SEC</div>
            <h2 id={headingId}>新增服務紀錄</h2>
            <p className="panel-sub">先留下今天最重要的記憶,其他細節之後再補。</p>
          </div>
          <button
            type="button"
            className="drawer-close"
            onClick={onClose}
            aria-label="關閉新增服務紀錄"
          >
            ×
          </button>
        </div>
        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor={`${headingId}-customer`}>客戶</label>
            <select
              id={`${headingId}-customer`}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor={`${headingId}-service`}>服務項目</label>
            <select
              id={`${headingId}-service`}
              value={category}
              onChange={(e) => onCategoryChange(e.target.value as TreatmentCategory)}
              required
            >
              {SERVICE_PRESETS.map((s) => (
                <option key={s.category} value={s.category}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor={`${headingId}-visit`}>服務日期</label>
              <input
                id={`${headingId}-visit`}
                type="date"
                value={performedAt}
                onChange={(e) => {
                  setPerformedAt(e.target.value);
                  setRecallAt(
                    suggestNextRecallDate(parseDate(e.target.value), recallDaysFor(category)),
                  );
                }}
                required
              />
            </div>
            <div className="field">
              <label htmlFor={`${headingId}-recall`}>
                建議回訪日 <span style={{ color: 'var(--brand)' }}>可覆寫</span>
              </label>
              <input
                id={`${headingId}-recall`}
                type="date"
                value={recallAt}
                onChange={(e) => setRecallAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor={`${headingId}-product`}>產品 / 成分</label>
            <input
              id={`${headingId}-product`}
              type="text"
              value={productIngredients}
              onChange={(e) => setProductIngredients(e.target.value)}
              placeholder="例:HEMA-free 甲油膠、玻尿酸精華"
            />
          </div>

          <div className="field">
            <label htmlFor={`${headingId}-notes`}>設計師備註</label>
            <textarea
              id={`${headingId}-notes`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="記下下次服務前需要知道的事…"
            />
          </div>

          {hasConflict && (
            <label className="check" role="alert">
              <input
                type="checkbox"
                checked={allergyAck}
                onChange={(e) => setAllergyAck(e.target.checked)}
              />
              <span>
                <strong>我已確認過敏 / 禁忌狀態</strong>
                <br />
                本次成分 ({allergyConflicts.join(', ')}) 與客戶紀錄衝突,勾選後才可繼續。
              </span>
            </label>
          )}

          {error && (
            <p className="alert" role="alert">
              <strong>!</strong>
              <span>{error}</span>
            </p>
          )}

          <div className="drawer-footer">
            <button type="button" className="secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="primary">
              儲存服務紀錄
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function parseDate(iso: string): Date {
  if (!iso) return new Date();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function toDateOnly(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
