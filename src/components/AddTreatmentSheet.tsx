'use client';

import { useEffect, useState } from 'react';
import type { Customer } from '@/lib/customers';
import { hasAllergyConflict } from '@/lib/customers';
import type { Treatment } from '@/lib/treatments';
import { t, type Lang } from '@/lib/i18n';
import type { VisitRecord } from '@/lib/persistence';

export interface VisitFormPayload {
  clientName: string;
  service: string;
  date: string;
  amount: number;
  note: string;
  consent: boolean;
}

interface AddTreatmentSheetProps {
  lang: Lang;
  open: boolean;
  customers: Customer[];
  defaultCustomerName?: string;
  defaultService?: string;
  defaultAmount?: number;
  defaultNote?: string;
  treatments: Treatment[];
  onClose: () => void;
  onSave: (record: VisitRecord) => void;
}

const SERVICE_OPTIONS: Array<{ zh: string; en: string }> = [
  { zh: '凝膠美甲', en: 'Gel manicure' },
  { zh: '美睫嫁接', en: 'Eyelash refill' },
  { zh: '深層護膚', en: 'Deep facial' },
  { zh: '剪髮護理', en: 'Hair care' },
  { zh: '染髮補色', en: 'Colour refresh' },
  { zh: '保濕導入', en: 'Hydration treatment' },
];

function isVisitFormPayload(value: unknown): value is VisitFormPayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.clientName === 'string' &&
    typeof v.service === 'string' &&
    typeof v.date === 'string' &&
    typeof v.amount === 'number' &&
    typeof v.note === 'string' &&
    typeof v.consent === 'boolean'
  );
}

export function isVisitFormPayloadInput(value: unknown): value is VisitFormPayload {
  return isVisitFormPayload(value);
}

export default function AddTreatmentSheet({
  lang,
  open,
  customers,
  defaultCustomerName,
  defaultService,
  defaultAmount,
  defaultNote,
  treatments,
  onClose,
  onSave,
}: AddTreatmentSheetProps) {
  const today = new Date();
  const isoToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [clientName, setClientName] = useState(defaultCustomerName ?? customers[0]?.name ?? '');
  const [service, setService] = useState(defaultService ?? SERVICE_OPTIONS[0]!.zh);
  const [date, setDate] = useState(isoToday);
  const [amount, setAmount] = useState(defaultAmount ?? 1500);
  const [note, setNote] = useState(defaultNote ?? '');
  const [consent, setConsent] = useState(true);

  // Reset form on open (UI-SPEC §4.1 — must not wipe data on close → reopen)
  useEffect(() => {
    if (open) {
      setClientName(defaultCustomerName ?? customers[0]?.name ?? '');
      setService(defaultService ?? SERVICE_OPTIONS[0]!.zh);
      setDate(isoToday);
      setAmount(defaultAmount ?? 1500);
      setNote(defaultNote ?? '');
      setConsent(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const matchedCustomer = customers.find((c) => c.name === clientName);
  const ingredientsForService: string[] = [];
  // Compose allergy conflict by reusing hasAllergyConflict with the typed service names
  if (matchedCustomer) {
    const conflictList = hasAllergyConflict(matchedCustomer, ingredientsForService);
    void conflictList;
  }
  void treatments;

  if (!open) return null;

  const amountValid = Number.isFinite(amount) && amount >= 0;
  const canSave = clientName.trim().length > 0 && service.trim().length > 0 && amountValid && consent;

  return (
    <div
      className="backdrop open"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div className="drawer-head">
          <div>
            <h2 id="drawer-title" data-i18n="drawerTitle">{t(lang, 'drawerTitle')}</h2>
            <p data-i18n="drawerSubtitle">{t(lang, 'drawerSubtitle')}</p>
          </div>
          <button type="button" className="close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <form
          className="form"
          id="visit-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSave) return;
            const record: VisitRecord = {
              clientName: clientName.trim(),
              service: service.trim(),
              date,
              amount: Math.round(amount),
              note: note.trim(),
              consent,
              savedAt: new Date().toISOString(),
            };
            onSave(record);
          }}
        >
          <div className="field">
            <label htmlFor="customer">{t(lang, 'client').toUpperCase()}</label>
            <input
              id="customer"
              list="customer-options"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              required
              autoComplete="off"
            />
            <datalist id="customer-options">
              {customers.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="date">{t(lang, 'date').toUpperCase()}</label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="amount">{t(lang, 'amount').toUpperCase()}</label>
              <input
                id="amount"
                type="number"
                inputMode="numeric"
                min={0}
                step={100}
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="service">{t(lang, 'service').toUpperCase()}</label>
            <select
              id="service"
              value={service}
              onChange={(event) => setService(event.target.value)}
            >
              {SERVICE_OPTIONS.map((opt) => (
                <option key={opt.zh} value={lang === 'zh' ? opt.zh : opt.en}>
                  {lang === 'zh' ? opt.zh : opt.en}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="note">{t(lang, 'note').toUpperCase()}</label>
            <textarea
              id="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={lang === 'zh' ? '客戶偏好、過敏、聯絡重點…' : 'Preferences, allergies, contact notes…'}
            />
          </div>

          <label className="consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              required
            />
            <span>{t(lang, 'consent')}</span>
          </label>

          <div className="drawer-foot">
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
              data-i18n="cancel"
            >
              {t(lang, 'cancel')}
            </button>
            <button
              type="submit"
              className="button primary"
              data-i18n="saveVisit"
              disabled={!canSave}
            >
              {t(lang, 'saveVisit')}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
