// Beauty CRM — 客戶檔案 domain
// Tracks customers with preferences, allergies, consent.

export type ConsentStatus = 'granted' | 'pending' | 'revoked';

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