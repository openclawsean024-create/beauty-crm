// Beauty CRM — 客戶檔案 domain
// Tracks customers with preferences, allergies, consent.

export type ConsentStatus = 'granted' | 'pending' | 'revoked';

/**
 * 照片同意紀錄（FR-007 / AC-005）。
 * - scope: 同意範圍（before-after 僅療程對比 / marketing 行銷素材 / all 全開）
 * - revokedAt: 撤回時間，未填 = 仍有效
 */
export type PhotoConsentScope = 'before-after' | 'marketing' | 'all';

export interface PhotoConsent {
  grantedAt: string;
  scope: PhotoConsentScope;
  revokedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  birthday?: string; // ISO date YYYY-MM-DD
  preferences: string[]; // e.g. ["喜歡安靜", "指定設計師 Amy"]
  allergies: string[]; // e.g. ["對甲醛敏感"]
  tags: string[]; // e.g. ["VIP", "新客"]
  consent: ConsentStatus;
  /** 照片同意（FR-007：Before/After 必須有明確同意紀錄） */
  photoConsent?: PhotoConsent;
  notes?: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export function createCustomer(input: {
  id: string;
  name: string;
  phone: string;
  email?: string;
  birthday?: string;
  preferences?: string[];
  allergies?: string[];
  tags?: string[];
  consent?: ConsentStatus;
  notes?: string;
}): Customer {
  if (!input.id || !input.id.trim()) throw new Error('customer id required');
  if (!input.name || !input.name.trim()) throw new Error('customer name required');
  if (!/^09\d{8}$/.test(input.phone)) {
    throw new Error('phone must be Taiwan mobile format 09xxxxxxxx');
  }
  const now = new Date().toISOString();
  return {
    id: input.id.trim(),
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim(),
    birthday: input.birthday,
    preferences: input.preferences ?? [],
    allergies: input.allergies ?? [],
    tags: input.tags ?? [],
    consent: input.consent ?? 'pending',
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateCustomer(
  c: Customer,
  patch: Partial<Omit<Customer, 'id' | 'createdAt'>>,
): Customer {
  return {
    ...c,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}

export function isMarketingReachable(c: Customer): boolean {
  return c.consent === 'granted';
}

export function searchCustomers(
  customers: Customer[],
  query: string,
): Customer[] {
  if (!query.trim()) return customers;
  const q = query.toLowerCase().trim();
  return customers.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q)),
  );
}

export function hasAllergyConflict(
  c: Customer,
  productIngredients: string[],
): string[] {
  const set = new Set(c.allergies.map((a) => a.trim().toLowerCase()));
  return productIngredients.filter((i) => set.has(i.trim().toLowerCase()));
}

export function toggleConsent(c: Customer): Customer {
  const next: ConsentStatus = c.consent === 'granted' ? 'revoked' : 'granted';
  return updateCustomer(c, { consent: next });
}

/**
 * 設定 / 撤回照片同意（FR-007）。
 *
 * 規則：
 * - 傳入 consent 物件 → 設為該 consent（含 grantedAt、scope；新物件會清掉 revokedAt）
 * - 傳入 null → 若現有 consent 仍有效（無 revokedAt），把 revokedAt 填上當下時間
 *                若已經撤回或從未同意 → no-op 回傳原物件
 *
 * 純函數：永遠回傳新 Customer 物件（透過 updateCustomer），不 mutate 輸入。
 */
export function setPhotoConsent(
  c: Customer,
  consent: PhotoConsent | null,
): Customer {
  if (consent === null) {
    if (c.photoConsent && !c.photoConsent.revokedAt) {
      return updateCustomer(c, {
        photoConsent: {
          ...c.photoConsent,
          revokedAt: new Date().toISOString(),
        },
      });
    }
    return c;
  }
  return updateCustomer(c, { photoConsent: consent });
}