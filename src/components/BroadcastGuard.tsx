'use client';

import type { ConsentStatus } from '@/lib/customers';

interface BroadcastGuardProps {
  consent: ConsentStatus | undefined;
  /** Whether the action target is ready (e.g. a customer is selected) */
  ready: boolean;
  /** Hint shown when consent is not granted. Defaults to UI-SPEC §3.2 wording. */
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
  hint = '需先取得同意',
  children,
}: BroadcastGuardProps) {
  if (!ready) {
    return (
      <div className="broadcast-guard-hint" role="status" aria-live="polite">
        請先選擇一位客戶
      </div>
    );
  }
  if (consent !== 'granted') {
    return (
      <div className="broadcast-guard-hint" role="status" aria-live="polite" data-testid="broadcast-guard">
        {hint}
      </div>
    );
  }
  return <>{children}</>;
}
