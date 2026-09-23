'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Customer } from '@/lib/customers';
import { hasAllergyConflict } from '@/lib/customers';
import type { TreatmentCategory } from '@/lib/treatments';
import { suggestRecallDays } from '@/lib/treatments';

export interface TreatmentFormPayload {
  customerId: string;
  serviceName: string;
  category: TreatmentCategory;
  performedAt: string;
  recallAt: string;
  notes: string;
  ingredients: string[];
}

interface AddTreatmentSheetProps {
  open: boolean;
  customers: Customer[];
  defaultCustomerId?: string;
  onClose: () => void;
  onSave: (payload: TreatmentFormPayload) => void;
}

interface ServiceOption {
  category: TreatmentCategory;
  serviceName: string;
}

const SERVICE_OPTIONS: ServiceOption[] = [
  { category: 'manicure', serviceName: '凝膠美甲' },
  { category: 'eyelash', serviceName: '美睫嫁接' },
  { category: 'skincare', serviceName: '深層護膚' },
  { category: 'hair', serviceName: '剪髮護理' },
];

function isoDateOnly(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

export default function AddTreatmentSheet({
  open,
  customers,
  defaultCustomerId,
  onClose,
  onSave,
}: AddTreatmentSheetProps) {
  const today = useMemo(() => new Date(), []);
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? customers[0]?.id ?? '');
  const [service, setService] = useState<ServiceOption>(SERVICE_OPTIONS[0]!);
  const [performedAt, setPerformedAt] = useState(isoDateOnly(today));
  const [recallAt, setRecallAt] = useState(isoDateOnly(addDays(today, suggestRecallDays(SERVICE_OPTIONS[0]!.category))));
  const [product, setProduct] = useState('');
  const [notes, setNotes] = useState('');
  const [allergyAck, setAllergyAck] = useState(false);

  // Reset form whenever the sheet opens (UI-SPEC §4: must not lose typed data on close→reopen)
  useEffect(() => {
    if (open) {
      setCustomerId(defaultCustomerId ?? customers[0]?.id ?? '');
      const initial = SERVICE_OPTIONS[0]!;
      setService(initial);
      setPerformedAt(isoDateOnly(today));
      setRecallAt(isoDateOnly(addDays(today, suggestRecallDays(initial.category))));
      setProduct('');
      setNotes('');
      setAllergyAck(false);
    }
  }, [open, defaultCustomerId, customers, today]);

  // Auto-fill recall date from service category (UI-SPEC §4 AC)
  useEffect(() => {
    setRecallAt((current) => isoDateOnly(addDays(new Date(performedAt), suggestRecallDays(service.category))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service.category]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const ingredients = product
    .split(/[、,，;；\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const conflictList = selectedCustomer
    ? hasAllergyConflict(selectedCustomer, ingredients)
    : [];
  const hasConflict = conflictList.length > 0;
  const canSave = !!customerId && service.serviceName.trim().length > 0 && (hasConflict ? allergyAck : true);

  if (!open) return null;

  return (
    <div
      className="drawer-backdrop open"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div className="drawer-head">
          <div>
            <div className="eyebrow">QUICK CAPTURE · 30 SEC</div>
            <h2 id="drawer-title">新增服務紀錄</h2>
            <p className="panel-sub">先留下今天最重要的記憶，其他細節之後再補。</p>
          </div>
          <button type="button" className="drawer-close" aria-label="關閉" onClick={onClose}>
            ×
          </button>
        </div>

        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSave) return;
            onSave({
              customerId,
              serviceName: service.serviceName,
              category: service.category,
              performedAt,
              recallAt,
              notes,
              ingredients,
            });
          }}
        >
          <div className="field">
            <label htmlFor="customer-select">客戶</label>
            <select
              id="customer-select"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="service-select">服務項目</label>
            <select
              id="service-select"
              value={service.serviceName}
              onChange={(event) => {
                const next = SERVICE_OPTIONS.find((opt) => opt.serviceName === event.target.value) ?? SERVICE_OPTIONS[0]!;
                setService(next);
              }}
            >
              {SERVICE_OPTIONS.map((opt) => (
                <option key={opt.serviceName} value={opt.serviceName}>{opt.serviceName}</option>
              ))}
            </select>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="visit-date">服務日期</label>
              <input
                id="visit-date"
                type="date"
                value={performedAt}
                onChange={(event) => setPerformedAt(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="recall-date">
                建議回訪日 <span className="recall-hint">可覆寫</span>
              </label>
              <input
                id="recall-date"
                type="date"
                value={recallAt}
                onChange={(event) => setRecallAt(event.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="product">產品 / 成分</label>
            <input
              id="product"
              placeholder="例：HEMA-free 甲油膠、玻尿酸精華"
              value={product}
              onChange={(event) => setProduct(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="notes">設計師備註</label>
            <textarea
              id="notes"
              placeholder="記下下次服務前需要知道的事…"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          {hasConflict ? (
            <label
              className="check"
              role="alert"
              data-testid="allergy-conflict-alert"
            >
              <input
                type="checkbox"
                checked={allergyAck}
                onChange={(event) => setAllergyAck(event.target.checked)}
              />
              <span>
                <strong>過敏 / 禁忌衝突：</strong>偵測到「{conflictList.join('、')}」與客戶紀錄衝突。
                <br />
                勾選「已知風險，繼續」後才可儲存。
              </span>
            </label>
          ) : null}

          <div className="drawer-footer">
            <button type="button" className="secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="primary" disabled={!canSave}>
              儲存服務紀錄
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
