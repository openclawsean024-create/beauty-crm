// Beauty CRM — dashboard wiring of the followups state machine
//
// Validates that the wiring helpers used by `src/components/Dashboard.tsx`
// follow the same contract enforced by `tests/followups.test.ts` at the
// pure-function level: every transition goes through the state machine,
// consent gating is enforced (defense-in-depth), and a customer switch
// always resets the draft.
//
// All assertions are pure-function composition; no DOM, no React render.

import { describe, it, expect } from 'vitest';
import {
  applyApprove,
  applyReset,
  applyUpdateBody,
  initDraftFor,
  type FollowupDraft,
} from '@/lib/followups';
import { createCustomer } from '@/lib/customers';

const grantedCustomer = createCustomer({
  id: 'c-granted',
  name: '雅婷',
  phone: '0911111111',
  consent: 'granted',
});
const pendingCustomer = createCustomer({
  id: 'c-pending',
  name: 'Lisa',
  phone: '0933333333',
  consent: 'pending',
});
const revokedCustomer = createCustomer({
  id: 'c-revoked',
  name: 'Amy',
  phone: '0944444444',
  consent: 'revoked',
});

const freshDraft = (overrides: Partial<FollowupDraft> = {}): FollowupDraft => ({
  customerId: 'c-granted',
  status: 'draft',
  body: '',
  updatedAt: '2026-09-27T00:00:00.000Z',
  ...overrides,
});

describe('dashboard wiring — applyApprove', () => {
  it('routes granted consent through the state machine', () => {
    const draft = freshDraft();
    const result = applyApprove(draft, 'granted');
    expect(result.kind).toBe('approved');
    if (result.kind === 'approved') {
      expect(result.draft.status).toBe('approved');
      expect(result.draft.customerId).toBe('c-granted');
      // updatedAt is reassigned by the state machine.
      expect(result.draft.updatedAt).not.toBe(draft.updatedAt);
    }
  });

  it('is a no-op when consent is pending (defense-in-depth)', () => {
    const draft = freshDraft({ customerId: pendingCustomer.id });
    const result = applyApprove(draft, 'pending');
    expect(result.kind).toBe('noop');
  });

  it('is a no-op when consent is revoked', () => {
    const draft = freshDraft({ customerId: revokedCustomer.id });
    const result = applyApprove(draft, 'revoked');
    expect(result.kind).toBe('noop');
  });

  it('is a no-op when there is no draft yet', () => {
    const result = applyApprove(null, 'granted');
    expect(result.kind).toBe('noop');
  });

  it('is a no-op when the draft is already approved (idempotent)', () => {
    const draft = freshDraft({ status: 'approved' });
    const result = applyApprove(draft, 'granted');
    expect(result.kind).toBe('noop');
  });
});

describe('dashboard wiring — applyReset', () => {
  it('returns an approved draft back to draft status', () => {
    const approved = freshDraft({ status: 'approved' });
    const result = applyReset(approved);
    expect(result.kind).toBe('reset');
    if (result.kind === 'reset') {
      expect(result.draft.status).toBe('draft');
      expect(result.draft.customerId).toBe('c-granted');
    }
  });

  it('is a no-op when there is no draft', () => {
    expect(applyReset(null).kind).toBe('noop');
  });

  it('is a no-op when the draft is already in draft status (avoid churn)', () => {
    const result = applyReset(freshDraft({ status: 'draft' }));
    expect(result.kind).toBe('noop');
  });
});

describe('dashboard wiring — initDraftFor (lazy seed)', () => {
  it('produces a draft scoped to the customer id', () => {
    const draft = initDraftFor('c-new');
    expect(draft).not.toBeNull();
    expect(draft?.customerId).toBe('c-new');
    expect(draft?.status).toBe('draft');
  });

  it('returns null when no customer is selected', () => {
    expect(initDraftFor(undefined)).toBeNull();
    expect(initDraftFor(null)).toBeNull();
    expect(initDraftFor('')).toBeNull();
  });

  it('seeds a different draft per customer switch (no cross-contamination)', () => {
    const a = initDraftFor('c-a');
    const b = initDraftFor('c-b');
    expect(a?.customerId).toBe('c-a');
    expect(b?.customerId).toBe('c-b');
    // Object identity: each seeded draft is a fresh, independently-mutable
    // instance, so a customer switch in the UI can never accidentally
    // mutate the previous customer's draft state.
    expect(a).not.toBe(b);
  });
});

describe('dashboard wiring — end-to-end via applyApprove + applyReset', () => {
  it('full lifecycle: seed → approve → reset → re-approve', () => {
    const seeded = initDraftFor(grantedCustomer.id);
    expect(seeded?.status).toBe('draft');

    const approved = applyApprove(seeded, grantedCustomer.consent);
    expect(approved.kind).toBe('approved');

    const reset = applyReset(approved.kind === 'approved' ? approved.draft : null);
    expect(reset.kind).toBe('reset');

    const reApproved = applyApprove(reset.kind === 'reset' ? reset.draft : null, grantedCustomer.consent);
    expect(reApproved.kind).toBe('approved');
  });
});

describe('dashboard wiring — applyUpdateBody (textarea editor)', () => {
  it('updates body and reassigns updatedAt', async () => {
    const draft = freshDraft({ body: 'original' });
    await new Promise((r) => setTimeout(r, 2));
    const result = applyUpdateBody(draft, 'edited');
    expect(result.kind).toBe('updated');
    if (result.kind === 'updated') {
      expect(result.draft.body).toBe('edited');
      expect(result.draft.status).toBe('draft');
      expect(result.draft.updatedAt).not.toBe(draft.updatedAt);
    }
  });

  it('preserves status across body edits (status transitions never happen via body edits)', () => {
    const approved = freshDraft({ status: 'approved', body: 'old' });
    const result = applyUpdateBody(approved, 'new');
    expect(result.kind).toBe('updated');
    if (result.kind === 'updated') {
      expect(result.draft.status).toBe('approved');
      expect(result.draft.body).toBe('new');
    }
  });

  it('is a no-op when the new body equals the existing body (no updatedAt churn)', () => {
    const draft = freshDraft({ body: 'same' });
    const result = applyUpdateBody(draft, 'same');
    expect(result.kind).toBe('noop');
  });

  it('allows empty body (designer may clear the textarea)', () => {
    const draft = freshDraft({ body: 'something' });
    const result = applyUpdateBody(draft, '');
    expect(result.kind).toBe('updated');
    if (result.kind === 'updated') {
      expect(result.draft.body).toBe('');
    }
  });

  it('is a no-op when there is no draft (matches applyApprove/applyReset contract)', () => {
    expect(applyUpdateBody(null, 'anything').kind).toBe('noop');
  });

  it('keeps customerId intact across body edits (per-customer scoping)', () => {
    const draft = freshDraft({ customerId: 'c-77', body: 'a' });
    const result = applyUpdateBody(draft, 'b');
    if (result.kind === 'updated') {
      expect(result.draft.customerId).toBe('c-77');
    }
  });
});

describe('dashboard wiring — initDraftFor body parameter', () => {
  it('seeds with the supplied body so the textarea is pre-filled', () => {
    const draft = initDraftFor('c-x', 'hi 雅婷，下次回訪 28 天後');
    expect(draft?.body).toBe('hi 雅婷，下次回訪 28 天後');
    expect(draft?.status).toBe('draft');
  });

  it('defaults to empty body when no seed body supplied', () => {
    expect(initDraftFor('c-x')?.body).toBe('');
    expect(initDraftFor('c-x', undefined)?.body).toBe('');
  });
});

describe('dashboard wiring — edit then approve preserves body', () => {
  it('designer-edited body survives approve transition', () => {
    const seeded = initDraftFor(grantedCustomer.id, 'seed body');
    const edited = applyUpdateBody(seeded, 'designer refinement');
    if (edited.kind !== 'updated') throw new Error('expected update');
    const approved = applyApprove(edited.draft, grantedCustomer.consent);
    expect(approved.kind).toBe('approved');
    if (approved.kind === 'approved') {
      expect(approved.draft.body).toBe('designer refinement');
      expect(approved.draft.status).toBe('approved');
    }
  });

  it('designer-edited body survives reset → re-approve', () => {
    const seeded = initDraftFor(grantedCustomer.id, 'seed');
    const edited = applyUpdateBody(seeded, 'refined');
    if (edited.kind !== 'updated') throw new Error('expected update');
    const approved = applyApprove(edited.draft, grantedCustomer.consent);
    if (approved.kind !== 'approved') throw new Error('expected approved');
    const reset = applyReset(approved.draft);
    if (reset.kind !== 'reset') throw new Error('expected reset');
    expect(reset.draft.body).toBe('refined');
    expect(reset.draft.status).toBe('draft');
  });
});

// === handleResetDraft wiring contract ===
//
// The dashboard's reset button routes through `applyReset` so the state
// machine stays the single source of truth. Because vitest runs with
// `environment: 'node'` (no jsdom), we cover the wiring by composing the
// pure-function helpers in the same order the click handler does: a single
// state-machine round-trip per click, and no churn when the state is
// already where the button is asking to land it.
describe('dashboard wiring — handleResetDraft button availability', () => {
  it('applyReset on an approved draft returns { kind: "reset", draft } with body intact', () => {
    const approved = freshDraft({
      status: 'approved',
      body: 'designer-approved wording',
    });
    const result = applyReset(approved);
    expect(result.kind).toBe('reset');
    if (result.kind === 'reset') {
      expect(result.draft.status).toBe('draft');
      expect(result.draft.body).toBe('designer-approved wording');
      expect(result.draft.customerId).toBe(approved.customerId);
      // updatedAt is reassigned by the state machine so the in-card chip
      // can show "just reset" without the UI having to compute it.
      expect(result.draft.updatedAt).not.toBe(approved.updatedAt);
    }
  });

  it('applyReset is a no-op when status is already "draft" (no updatedAt churn)', () => {
    const draft = freshDraft({ status: 'draft', body: 'in-progress' });
    const result = applyReset(draft);
    expect(result.kind).toBe('noop');
    // No spurious update: the dashboard swallows 'noop' so React state
    // never churns when the user re-clicks the reset path on a fresh draft.
  });

  it('after reset, the draft can be re-approved (full lifecycle through the state machine)', () => {
    const seeded = initDraftFor(grantedCustomer.id, 'seed');
    const edited = applyUpdateBody(seeded, 'first refinement');
    if (edited.kind !== 'updated') throw new Error('expected update');
    const approved = applyApprove(edited.draft, grantedCustomer.consent);
    if (approved.kind !== 'approved') throw new Error('expected approved');
    const reset = applyReset(approved.draft);
    if (reset.kind !== 'reset') throw new Error('expected reset');
    // Designer refines again, then re-approves: the state machine must
    // accept the second approve because reset brought status back to
    // 'draft'.
    const editedAgain = applyUpdateBody(reset.draft, 'second refinement');
    if (editedAgain.kind !== 'updated') throw new Error('expected update');
    const reApproved = applyApprove(editedAgain.draft, grantedCustomer.consent);
    expect(reApproved.kind).toBe('approved');
    if (reApproved.kind === 'approved') {
      expect(reApproved.draft.status).toBe('approved');
      expect(reApproved.draft.body).toBe('second refinement');
    }
  });

  it('a second reset on an already-draft draft is a no-op (idempotent on stray clicks)', () => {
    const seeded = initDraftFor(grantedCustomer.id, 'seed');
    const approved = applyApprove(seeded, grantedCustomer.consent);
    if (approved.kind !== 'approved') throw new Error('expected approved');
    const reset = applyReset(approved.draft);
    if (reset.kind !== 'reset') throw new Error('expected reset');
    // Stray second click after status flipped back to draft: stays no-op.
    const second = applyReset(reset.draft);
    expect(second.kind).toBe('noop');
  });

  it('reset draft is wired only when approved (pure-function pre-condition for the conditional button)', () => {
    // The reset button is rendered only when `approved === true`. So the
    // state-machine pre-condition mirrors the UI: applyReset is meaningful
    // only on an approved draft; on a draft draft it is intentionally a
    // no-op. This test pins that contract so a future refactor of the
    // button visibility cannot silently change the meaning of an extra
    // click.
    const draftDraft = freshDraft({ status: 'draft' });
    expect(applyReset(draftDraft).kind).toBe('noop');
    const approved = freshDraft({ status: 'approved' });
    expect(applyReset(approved).kind).toBe('reset');
  });
});
