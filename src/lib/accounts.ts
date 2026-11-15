// Beauty CRM — 工作區、店別、帳號與設計師（顧問）檔案
// workspace → store → account（FR-014）。設計師檔案併自 beauty-crm-concierge
// `data/mock.ts` 的 Consultant 模型（SPEC §10.1 #4，FR-018）：只搬職稱、年資、專長；
// 不搬真人大頭照、評分與聊天訊息。
//
// M1 沒有真實登入：帳號只是本機假帳號，用於切換身分驗證權限矩陣。

export type Role = 'owner' | 'manager' | 'designer';

export const ROLES: Role[] = ['owner', 'manager', 'designer'];

export interface Workspace {
  id: string;
  name: string;
}

export interface Store {
  id: string;
  workspaceId: string;
  name: string;
}

/** 設計師（顧問）檔案，屬於帳號。 */
export interface DesignerProfile {
  title: string; // 職稱
  yearsExp: number; // 年資
  specialties: string[]; // 專長
}

export interface Account {
  id: string;
  workspaceId: string;
  name: string;
  role: Role;
  /** 所屬店別。店主視為擁有 workspace 內所有店，可留空。 */
  storeIds: string[];
  profile?: DesignerProfile;
}

export function createStore(input: { id: string; workspaceId: string; name: string }): Store {
  if (!input.id?.trim()) throw new Error('store id required');
  if (!input.workspaceId) throw new Error('workspaceId required');
  if (!input.name?.trim()) throw new Error('store name required');
  return { id: input.id.trim(), workspaceId: input.workspaceId, name: input.name.trim() };
}

export function createDesignerProfile(input: {
  title: string;
  yearsExp: number;
  specialties?: string[];
}): DesignerProfile {
  if (!input.title?.trim()) throw new Error('profile title required');
  if (!Number.isFinite(input.yearsExp) || input.yearsExp < 0) {
    throw new Error('yearsExp cannot be negative');
  }
  const specialties = (input.specialties ?? []).map((s) => s.trim()).filter(Boolean);
  return { title: input.title.trim(), yearsExp: input.yearsExp, specialties };
}

export function createAccount(input: {
  id: string;
  workspaceId: string;
  name: string;
  role: Role;
  storeIds?: string[];
  profile?: DesignerProfile;
}): Account {
  if (!input.id?.trim()) throw new Error('account id required');
  if (!input.workspaceId) throw new Error('workspaceId required');
  if (!input.name?.trim()) throw new Error('account name required');
  if (!ROLES.includes(input.role)) throw new Error(`unknown role: ${String(input.role)}`);
  const storeIds = Array.from(new Set(input.storeIds ?? []));
  if (input.role !== 'owner' && storeIds.length === 0) {
    throw new Error('manager/designer must belong to at least one store');
  }
  return {
    id: input.id.trim(),
    workspaceId: input.workspaceId,
    name: input.name.trim(),
    role: input.role,
    storeIds,
    profile: input.profile,
  };
}

export function findAccount(accounts: Account[], id: string | undefined): Account | undefined {
  return id ? accounts.find((a) => a.id === id) : undefined;
}

/** 帳號可進入的店別：店主為 workspace 內全部，其餘為 storeIds。 */
export function storesForAccount(account: Account, stores: Store[]): Store[] {
  const inWorkspace = stores.filter((s) => s.workspaceId === account.workspaceId);
  if (account.role === 'owner') return inWorkspace;
  return inWorkspace.filter((s) => account.storeIds.includes(s.id));
}

export function belongsToStore(account: Account, store: Pick<Store, 'id' | 'workspaceId'>): boolean {
  if (account.workspaceId !== store.workspaceId) return false;
  return account.role === 'owner' || account.storeIds.includes(store.id);
}

/** 某店的設計師帳號（新增服務／預約時的指定設計師選單）。 */
export function designersOfStore(accounts: Account[], storeId: string): Account[] {
  return accounts.filter((a) => a.role === 'designer' && a.storeIds.includes(storeId));
}

/** 設計師卡片摘要：「職稱 · N 年 · 專長、專長」。沒有檔案時回傳空字串。 */
export function describeDesigner(account: Account): string {
  const profile = account.profile;
  if (!profile) return '';
  const parts = [profile.title, `${profile.yearsExp} 年資歷`];
  if (profile.specialties.length > 0) parts.push(profile.specialties.join('、'));
  return parts.join(' · ');
}

export const ROLE_LABELS: Record<Role, { zh: string; en: string }> = {
  owner: { zh: '店主', en: 'Owner' },
  manager: { zh: '店長', en: 'Manager' },
  designer: { zh: '設計師', en: 'Designer' },
};
