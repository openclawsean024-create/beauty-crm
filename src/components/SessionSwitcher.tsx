'use client';

import type { Account, Store } from '@/lib/accounts';
import { ROLE_LABELS } from '@/lib/accounts';
import { t, type Lang } from '@/lib/i18n';

interface SessionSwitcherProps {
  lang: Lang;
  accounts: Account[];
  stores: Store[]; // 目前帳號可進入的店
  accountId: string;
  storeId: string;
  onAccountChange: (accountId: string) => void;
  onStoreChange: (storeId: string) => void;
}

/**
 * 身分與店別切換（M1 沒有真實登入，全部是本機示範帳號）。
 * 店別選單只列出目前帳號所屬的店；畫面上的資料與動作由 permissions.can() 決定。
 */
export default function SessionSwitcher({
  lang,
  accounts,
  stores,
  accountId,
  storeId,
  onAccountChange,
  onStoreChange,
}: SessionSwitcherProps) {
  return (
    <div className="session-switcher">
      <span className="workspace-dot" aria-hidden="true" />
      <label className="session-field">
        <span>{t(lang, 'sessionStore')}</span>
        <select
          data-testid="store-switcher"
          value={storeId}
          onChange={(event) => onStoreChange(event.target.value)}
        >
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
      </label>
      <label className="session-field">
        <span>{t(lang, 'sessionAccount')}</span>
        <select
          data-testid="account-switcher"
          value={accountId}
          onChange={(event) => onAccountChange(event.target.value)}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}（{ROLE_LABELS[account.role][lang]}）
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
