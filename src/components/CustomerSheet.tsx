'use client';

import { useEffect, useState } from 'react';
import type { Account } from '@/lib/accounts';
import type { ConsentStatus, Customer } from '@/lib/customers';
import { t, type Lang } from '@/lib/i18n';
import { sensitiveConsentOf } from '@/lib/sensitive';

export interface CustomerFormValues {
  name: string;
  phone: string;
  email: string;
  preferences: string[];
  tags: string[];
  notes: string;
  ownerDesignerId?: string;
  consent: ConsentStatus;
  /** 只有新增時可在表單內勾選；既有客戶在記憶面板管理 */
  sensitiveDataConsent: ConsentStatus;
  allergies: string[];
  skinCondition: string;
  healthNotes: string;
}

interface CustomerSheetProps {
  lang: Lang;
  open: boolean;
  /** 編輯時傳入（已依權限處理過的客戶）；新增時為 null */
  customer: Customer | null;
  /** 目前帳號可否讀寫這位客戶的 S 級欄位（新增時代表可否在此店寫入 S 級） */
  canWriteSensitive: boolean;
  designers: Account[];
  defaultDesignerId?: string;
  onClose: () => void;
  onSave: (values: CustomerFormValues) => void;
}

const splitList = (value: string): string[] =>
  value
    .split(/[,，、]/)
    .map((v) => v.trim())
    .filter(Boolean);

/**
 * 新增／編輯客戶（FR-001）。
 * S 級欄位（過敏、皮膚狀況、健康備註）只有在「敏感個資同意」為已同意、
 * 且帳號有權限時才可填寫；否則欄位停用。
 */
export default function CustomerSheet({
  lang,
  open,
  customer,
  canWriteSensitive,
  designers,
  defaultDesignerId,
  onClose,
  onSave,
}: CustomerSheetProps) {
  const isEdit = customer !== null;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [preferences, setPreferences] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [ownerDesignerId, setOwnerDesignerId] = useState('');
  const [marketing, setMarketing] = useState<ConsentStatus>('pending');
  const [sensitiveGranted, setSensitiveGranted] = useState(false);
  const [allergies, setAllergies] = useState('');
  const [skinCondition, setSkinCondition] = useState('');
  const [healthNotes, setHealthNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(customer?.name ?? '');
    setPhone(customer?.phone ?? '');
    setEmail(customer?.email ?? '');
    setPreferences((customer?.preferences ?? []).join('、'));
    setTags((customer?.tags ?? []).join('、'));
    setNotes(customer?.notes ?? '');
    setOwnerDesignerId(customer?.ownerDesignerId ?? defaultDesignerId ?? '');
    setMarketing(customer?.consent ?? 'pending');
    setSensitiveGranted(customer ? sensitiveConsentOf(customer) === 'granted' : false);
    setAllergies((customer?.allergies ?? []).join('、'));
    setSkinCondition(customer?.skinCondition ?? '');
    setHealthNotes(customer?.healthNotes ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const phoneValid = /^09\d{8}$/.test(phone);
  const canSave = name.trim().length > 0 && phoneValid;
  const sensitiveEditable = sensitiveGranted && canWriteSensitive;

  return (
    <div
      className="backdrop open"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="drawer" role="dialog" aria-modal="true" aria-labelledby="customer-sheet-title">
        <div className="drawer-head">
          <div>
            <h2 id="customer-sheet-title">{isEdit ? t(lang, 'customerSheetEdit') : t(lang, 'customerSheetNew')}</h2>
            <p>{t(lang, 'customerSheetSubtitle')}</p>
          </div>
          <button type="button" className="close" aria-label={t(lang, 'closeAction')} onClick={onClose}>
            ×
          </button>
        </div>

        <form
          className="form"
          id="customer-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSave) return;
            onSave({
              name: name.trim(),
              phone,
              email: email.trim(),
              preferences: splitList(preferences),
              tags: splitList(tags),
              notes: notes.trim(),
              ownerDesignerId: ownerDesignerId || undefined,
              consent: marketing,
              sensitiveDataConsent: sensitiveGranted ? 'granted' : customer ? sensitiveConsentOf(customer) : 'pending',
              allergies: sensitiveEditable ? splitList(allergies) : [],
              skinCondition: sensitiveEditable ? skinCondition.trim() : '',
              healthNotes: sensitiveEditable ? healthNotes.trim() : '',
            });
          }}
        >
          <div className="field">
            <label htmlFor="customer-name">{t(lang, 'fieldName')}</label>
            <input id="customer-name" value={name} onChange={(event) => setName(event.target.value)} required autoComplete="off" />
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="customer-phone">{t(lang, 'fieldPhone')}</label>
              <input
                id="customer-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/[^\d]/g, '').slice(0, 10))}
                inputMode="numeric"
                pattern="09[0-9]{8}"
                aria-describedby="customer-phone-hint"
                required
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="customer-email">{t(lang, 'fieldEmail')}</label>
              <input id="customer-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" />
            </div>
          </div>
          <p className="memory-hint" id="customer-phone-hint">{t(lang, 'fieldPhoneHint')}</p>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="customer-designer">{t(lang, 'fieldOwnerDesigner')}</label>
              <select id="customer-designer" value={ownerDesignerId} onChange={(event) => setOwnerDesignerId(event.target.value)}>
                <option value="">{t(lang, 'fieldUnassigned')}</option>
                {designers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="customer-marketing">{t(lang, 'consentMarketing')}</label>
              <select
                id="customer-marketing"
                value={marketing}
                onChange={(event) => setMarketing(event.target.value as ConsentStatus)}
              >
                <option value="pending">{t(lang, 'consentPending')}</option>
                <option value="granted">{t(lang, 'consentGranted')}</option>
                <option value="revoked">{t(lang, 'consentRevoked')}</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="customer-preferences">{t(lang, 'fieldPreferences')}</label>
            <input id="customer-preferences" value={preferences} onChange={(event) => setPreferences(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="customer-tags">{t(lang, 'fieldTags')}</label>
            <input id="customer-tags" value={tags} onChange={(event) => setTags(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="customer-notes">{t(lang, 'fieldNotes')}</label>
            <textarea id="customer-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>

          <fieldset className="sensitive-fieldset">
            <legend>{t(lang, 'sensitiveTitle')}</legend>
            {!canWriteSensitive ? (
              <p className="memory-empty">{t(lang, 'sensitiveNoPermission')}</p>
            ) : (
              <>
                {isEdit ? (
                  !sensitiveGranted ? <p className="memory-empty">{t(lang, 'sensitiveNoConsent')}</p> : null
                ) : (
                  <label className="consent">
                    <input
                      type="checkbox"
                      id="customer-sensitive-consent"
                      checked={sensitiveGranted}
                      onChange={(event) => setSensitiveGranted(event.target.checked)}
                    />
                    <span>{t(lang, 'fieldSensitiveConsent')}</span>
                  </label>
                )}
                <div className="field">
                  <label htmlFor="customer-allergies">{t(lang, 'fieldAllergies')}</label>
                  <input
                    id="customer-allergies"
                    value={allergies}
                    onChange={(event) => setAllergies(event.target.value)}
                    disabled={!sensitiveEditable}
                  />
                </div>
                <div className="field">
                  <label htmlFor="customer-skin">{t(lang, 'labelSkin')}</label>
                  <input
                    id="customer-skin"
                    value={skinCondition}
                    onChange={(event) => setSkinCondition(event.target.value)}
                    disabled={!sensitiveEditable}
                  />
                </div>
                <div className="field">
                  <label htmlFor="customer-health">{t(lang, 'labelHealth')}</label>
                  <input
                    id="customer-health"
                    value={healthNotes}
                    onChange={(event) => setHealthNotes(event.target.value)}
                    disabled={!sensitiveEditable}
                  />
                </div>
              </>
            )}
          </fieldset>

          <div className="drawer-foot">
            <button type="button" className="button secondary" onClick={onClose}>
              {t(lang, 'cancelAction')}
            </button>
            <button type="submit" className="button primary" data-testid="save-customer" disabled={!canSave}>
              {t(lang, 'saveAction')}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
