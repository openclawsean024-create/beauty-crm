'use client';

import type { ConsentStatus } from '@/lib/customers';
import { t, type Lang } from '@/lib/i18n';

interface BroadcastGuardProps {
  consent: ConsentStatus | undefined;
  /** Whether the action target is ready (e.g. a customer is selected) */
  ready: boolean;
  lang: Lang;
  /** Custom hint when consent is not granted. Overrides the default UI-SPEC §3.2 wording. */
  hint?: string;
  children: React.ReactNode;
}

/**
 * Hides message-sending CTAs when the customer has not granted marketing consent.
 *
 * UI-SPEC §3.2: "若 consent 不是 granted，不可顯示發送動作，只能顯示『需先取得同意』"
 * UI-SPEC §6 AC: "未取得行銷同意的客戶，不出現可送出訊息的 CTA"
 */
export default function BroadcastGuard({
  consent,
  ready,
  lang,
  hint,
  children,
}: BroadcastGuardProps) {
  if (!ready) {
    return (
      <div className="broadcast-guard-hint" role="status" aria-live="polite">
        {t(lang, 'noClientSelected')}
      </div>
    );
  }
  if (consent !== 'granted') {
    return (
      <div
        className="broadcast-guard-hint"
        role="status"
        aria-live="polite"
        data-testid="broadcast-guard"
      >
        {hint ?? t(lang, 'consentRequiredHint')}
      </div>
    );
  }
  return <>{children}</>;
}
