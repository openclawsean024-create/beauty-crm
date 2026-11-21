'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Account } from '@/lib/accounts';
import type { Customer } from '@/lib/customers';
import { t, tf, type Lang } from '@/lib/i18n';
import type { ServicePackage } from '@/lib/packages';
import { remainingSessions } from '@/lib/packages';
import type { ServiceItem } from '@/lib/service-catalog';

export interface VisitFormValues {
  customerId: string;
  catalogItemId: string;
  date: string; // YYYY-MM-DD
  price: number;
  notes: string;
  designerId?: string;
  packageId?: string;
  acknowledgeAllergyConflict: boolean;
}

interface AddTreatmentSheetProps {
  lang: Lang;
  open: boolean;
  today: string;
  customers: Customer[];
  catalog: ServiceItem[];
  designers: Account[];
  defaultCustomerId?: string;
  defaultDesignerId?: string;
  /** 該客戶可扣堂的套票（未過期、有剩餘、涵蓋此品項） */
  /** date：服務日期（YYYY-MM-DD），依當日是否已開始、未過期篩選 */
  usablePackages: (customerId: string, catalogItemId: string, date: string) => ServicePackage[];
  /** 品項成分與客戶過敏紀錄的衝突清單（由完整資料計算，與畫面遮罩無關） */
  findConflicts: (customerId: string, catalogItemId: string) => string[];
  /** 目前帳號是否可看這位客戶的敏感資料；不可時衝突提示不列出成分 */
  canSeeSensitive: (customerId: string) => boolean;
  onClose: () => void;
  onSave: (values: VisitFormValues) => void;
}

/**
 * 新增服務紀錄（FR-002／FR-010）。
 * 由服務品項帶入金額與時長；儲存後寫入療程資料並重算回訪日。
 * 品項成分與客戶過敏紀錄衝突時，必須勾選確認才可儲存。
 */
export default function AddTreatmentSheet({
  lang,
  open,
  today,
  customers,
  catalog,
  designers,
  defaultCustomerId,
  defaultDesignerId,
  usablePackages,
  findConflicts,
  canSeeSensitive,
  onClose,
  onSave,
}: AddTreatmentSheetProps) {
  const firstItem = catalog[0];
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? customers[0]?.id ?? '');
  const [catalogItemId, setCatalogItemId] = useState(firstItem?.id ?? '');
  const [date, setDate] = useState(today);
  const [price, setPrice] = useState(firstItem?.price ?? 0);
  const [notes, setNotes] = useState('');
  const [designerId, setDesignerId] = useState(defaultDesignerId ?? '');
  const [usePackage, setUsePackage] = useState(false);
  const [consent, setConsent] = useState(true);
  const [ack, setAck] = useState(false);

  // 每次開啟時重設表單
  useEffect(() => {
    if (!open) return;
    const initialCustomer =
      defaultCustomerId && customers.some((c) => c.id === defaultCustomerId) ? defaultCustomerId : customers[0]?.id ?? '';
    setCustomerId(initialCustomer);
    setCatalogItemId(catalog[0]?.id ?? '');
    setDate(today);
    setPrice(catalog[0]?.price ?? 0);
    setNotes('');
    setDesignerId(defaultDesignerId ?? '');
    setUsePackage(false);
    setConsent(true);
    setAck(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const conflicts = useMemo(
    () => (customerId && catalogItemId ? findConflicts(customerId, catalogItemId) : []),
    [customerId, catalogItemId, findConflicts],
  );
  const packages = useMemo(
    () => (customerId && catalogItemId && date ? usablePackages(customerId, catalogItemId, date) : []),
    [customerId, catalogItemId, date, usablePackages],
  );
  const pkg = packages[0];

  if (!open) return null;

  const hasConflict = conflicts.length > 0;
  const priceValid = Number.isFinite(price) && price >= 0;
  const canSave =
    Boolean(customerId) && Boolean(catalogItemId) && Boolean(date) && priceValid && consent && (!hasConflict || ack);

  const selectItem = (id: string) => {
    setCatalogItemId(id);
    const item = catalog.find((i) => i.id === id);
    if (item) setPrice(item.price);
    setUsePackage(false);
    setAck(false);
  };

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
            <h2 id="drawer-title">{t(lang, 'drawerTitle')}</h2>
            <p>{t(lang, 'drawerSubtitle')}</p>
          </div>
          <button type="button" className="close" aria-label={t(lang, 'closeAction')} onClick={onClose}>
            ×
          </button>
        </div>

        {customers.length === 0 ? (
          <p className="memory-empty" style={{ marginTop: 20 }}>{t(lang, 'visitNoCustomers')}</p>
        ) : (
          <form
            className="form"
            id="visit-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSave) return;
              onSave({
                customerId,
                catalogItemId,
                date,
                price: Math.round(usePackage && pkg ? 0 : price),
                notes: notes.trim(),
                designerId: designerId || undefined,
                packageId: usePackage && pkg ? pkg.id : undefined,
                acknowledgeAllergyConflict: ack,
              });
            }}
          >
            <div className="field">
              <label htmlFor="visit-customer">{t(lang, 'visitCustomer')}</label>
              <select
                id="visit-customer"
                value={customerId}
                onChange={(event) => {
                  setCustomerId(event.target.value);
                  setUsePackage(false);
                  setAck(false);
                }}
                required
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="visit-service">{t(lang, 'visitService')}</label>
              <select id="visit-service" value={catalogItemId} onChange={(event) => selectItem(event.target.value)} required>
                {catalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}（{item.durationMin} {t(lang, 'minutesUnit')}）
                  </option>
                ))}
              </select>
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="visit-date">{t(lang, 'date')}</label>
                <input
                  id="visit-date"
                  type="date"
                  value={date}
                  max={today}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="visit-amount">{t(lang, 'amount')}</label>
                <input
                  id="visit-amount"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={100}
                  value={usePackage && pkg ? 0 : price}
                  disabled={usePackage && Boolean(pkg)}
                  onChange={(event) => setPrice(Number(event.target.value))}
                  required
                />
              </div>
            </div>

            {designers.length > 0 ? (
              <div className="field">
                <label htmlFor="visit-designer">{t(lang, 'visitDesigner')}</label>
                <select id="visit-designer" value={designerId} onChange={(event) => setDesignerId(event.target.value)}>
                  <option value="">{t(lang, 'fieldOwnerDesigner')}</option>
                  {designers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {pkg ? (
              <label className="consent" data-testid="visit-use-package-row">
                <input
                  type="checkbox"
                  data-testid="visit-use-package"
                  checked={usePackage}
                  onChange={(event) => setUsePackage(event.target.checked)}
                />
                <span>{tf(lang, 'visitUsePackage', { name: pkg.name, n: remainingSessions(pkg) })}</span>
              </label>
            ) : null}

            <div className="field">
              <label htmlFor="visit-note">{t(lang, 'note')}</label>
              <textarea
                id="visit-note"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={t(lang, 'visitNotePlaceholder')}
              />
            </div>

            {hasConflict ? (
              <div className="confirm-box" role="alert" data-testid="allergy-conflict">
                <p>
                  <strong>{t(lang, 'visitConflictTitle')}</strong>
                  <br />
                  {canSeeSensitive(customerId)
                    ? tf(lang, 'visitConflictBody', { items: conflicts.join('、') })
                    : t(lang, 'allergenConflict')}
                </p>
                <label className="consent">
                  <input
                    type="checkbox"
                    data-testid="allergy-ack"
                    checked={ack}
                    onChange={(event) => setAck(event.target.checked)}
                  />
                  <span>{t(lang, 'visitConflictAck')}</span>
                </label>
              </div>
            ) : null}

            <label className="consent">
              <input
                type="checkbox"
                id="visit-consent"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                required
              />
              <span>{t(lang, 'consent')}</span>
            </label>

            <div className="drawer-foot">
              <button type="button" className="button secondary" onClick={onClose}>
                {t(lang, 'cancel')}
              </button>
              <button type="submit" className="button primary" data-testid="save-visit" disabled={!canSave}>
                {t(lang, 'saveVisit')}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
