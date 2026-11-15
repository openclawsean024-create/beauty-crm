'use client';

import { useMemo } from 'react';
import { computeCustomerLTV } from '@/lib/analytics';
import type { ConsentStatus, Customer } from '@/lib/customers';
import { searchCustomers } from '@/lib/customers';
import { t, type Lang, type MessageKey } from '@/lib/i18n';
import { sensitiveConsentOf } from '@/lib/sensitive';
import type { Treatment } from '@/lib/treatments';

interface ClientsViewProps {
  lang: Lang;
  customers: Customer[];
  treatments: Treatment[];
  selectedCustomerId: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (customerId: string) => void;
  onAdd: () => void;
}

const CONSENT_LABEL: Record<ConsentStatus, MessageKey> = {
  granted: 'consentGranted',
  pending: 'consentPending',
  revoked: 'consentRevoked',
};

function maskPhone(phone: string): string {
  return phone.length < 4 ? phone : `09•• ••• ${phone.slice(-3)}`;
}

/** 客戶清單（FR-001）：搜尋、選取、進入新增。只列出目前帳號在這家店看得到的客戶。 */
export default function ClientsView({
  lang,
  customers,
  treatments,
  selectedCustomerId,
  query,
  onQueryChange,
  onSelect,
  onAdd,
}: ClientsViewProps) {
  const rows = useMemo(
    () =>
      searchCustomers(customers, query).map((customer) => ({
        customer,
        ltv: computeCustomerLTV(treatments, customer.id),
      })),
    [customers, treatments, query],
  );

  return (
    <article className="card" data-testid="clients-view">
      <div className="card-header">
        <div>
          <h2 className="card-title">{t(lang, 'clientsTitle')}</h2>
          <p className="card-subtitle">{t(lang, 'clientsSubtitle')}</p>
        </div>
        <button type="button" className="button primary" data-testid="add-customer" onClick={onAdd}>
          {t(lang, 'addCustomer')}
        </button>
      </div>
      <div className="queue-tools">
        <label className="queue-search" aria-label={t(lang, 'clientsSearch')}>
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            data-testid="clients-search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t(lang, 'clientsSearch')}
          />
        </label>
      </div>
      {rows.length === 0 ? (
        <p className="empty-note" data-testid="clients-empty">{t(lang, 'clientsEmpty')}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t(lang, 'colClient')}</th>
                <th scope="col">{t(lang, 'colPhone')}</th>
                <th scope="col">{t(lang, 'colConsent')}</th>
                <th scope="col" className="num">{t(lang, 'colVisits')}</th>
                <th scope="col" className="num">{t(lang, 'colSpent')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ customer, ltv }) => (
                <tr
                  key={customer.id}
                  data-testid="customer-row"
                  data-customer-id={customer.id}
                  className={customer.id === selectedCustomerId ? 'selected' : ''}
                >
                  <th scope="row">
                    <button type="button" className="row-button" onClick={() => onSelect(customer.id)}>
                      {customer.name}
                    </button>
                  </th>
                  <td className="mono">{maskPhone(customer.phone)}</td>
                  <td>
                    <span className={`status ${customer.consent === 'granted' ? 'ok' : 'soon'}`} title={t(lang, 'consentMarketing')}>
                      {t(lang, CONSENT_LABEL[customer.consent])}
                    </span>{' '}
                    <span
                      className={`status ${sensitiveConsentOf(customer) === 'granted' ? 'ok' : 'soon'}`}
                      title={t(lang, 'consentSensitive')}
                    >
                      S · {t(lang, CONSENT_LABEL[sensitiveConsentOf(customer)])}
                    </span>
                  </td>
                  <td className="num mono">{ltv.visitCount}</td>
                  <td className="num mono">NT$ {ltv.totalSpent.toLocaleString('en-US')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
