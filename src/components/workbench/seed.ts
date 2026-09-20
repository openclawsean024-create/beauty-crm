// Beauty CRM — workbench seed + types
// 對齊 beauty-crm-redesign.html (Sean-approved prototype)。
// 不修改 src/lib/* domain logic,只在 UI 層補上展示所需的標籤/備註。

import type { Customer, ConsentStatus } from '@/lib/customers';
import type { Treatment, TreatmentCategory } from '@/lib/treatments';

export interface DisplayTreatment extends Omit<Treatment, 'productIngredients' | 'notes'> {
  displayName: string;
  preferenceTags: string[];
  noteSummary: string;
  allergyDescription: string;
  vipReason: string;
  productIngredients: string[];
  notes?: string;
}

export interface DisplayCustomer extends Omit<Customer, 'preferences' | 'allergies' | 'tags'> {
  displayName: string;
  initials: string;
  /** 對應 Customer.allergies (從 seed treatments 推導;UI 不直接顯示這個 array) */
  allergies: string[];
  preferences: string[];
  tags: string[];
}

const ISO_NOW = '2026-09-20T00:00:00Z';
const ISO_CREATE = '2026-01-01T00:00:00Z';

const SEED_CUSTOMERS: DisplayCustomer[] = [
  {
    id: 'c1',
    name: '雅婷',
    phone: '0911111111',
    consent: 'granted' as ConsentStatus,
    allergies: ['HEMA'],
    preferences: ['裸色系偏好', '指定設計師 Amy'],
    tags: ['VIP'],
    createdAt: ISO_CREATE,
    updatedAt: ISO_NOW,
    displayName: '林雅婷',
    initials: '雅',
  },
  {
    id: 'c2',
    name: '小美',
    phone: '0922222222',
    consent: 'granted' as ConsentStatus,
    allergies: [],
    preferences: ['自然款'],
    tags: [],
    createdAt: ISO_CREATE,
    updatedAt: ISO_NOW,
    displayName: '陳小美',
    initials: '美',
  },
  {
    id: 'c3',
    name: 'Lisa',
    phone: '0933333333',
    consent: 'pending' as ConsentStatus,
    allergies: ['AHA'],
    preferences: ['敏感肌'],
    tags: [],
    createdAt: ISO_CREATE,
    updatedAt: ISO_NOW,
    displayName: 'Lisa',
    initials: 'L',
  },
  {
    id: 'c4',
    name: 'Amy',
    phone: '0944444444',
    consent: 'revoked' as ConsentStatus,
    allergies: [],
    preferences: ['短髮'],
    tags: [],
    createdAt: ISO_CREATE,
    updatedAt: ISO_NOW,
    displayName: 'Amy',
    initials: 'A',
  },
];

/**
 * 用於 UI 顯示的「上次服務」時間錨點。
 * 與 seed customer 對齊,使 listOverdue 能產出可演示的逾期/即將到期狀態。
 */
export const TODAY_FIXED: Date = new Date('2026-09-21T00:00:00Z');

const SEED_TREATMENTS: DisplayTreatment[] = [
  {
    id: 't1',
    customerId: 'c1',
    category: 'manicure',
    serviceName: '凝膠美甲',
    productIngredients: ['HEMA'],
    price: 1200,
    durationMin: 90,
    performedAt: '2026-08-18T10:00:00Z',
    displayName: '凝膠美甲 + 設計',
    preferenceTags: ['裸色系偏好', '指定設計師 Amy'],
    noteSummary: '上次想把方圓甲改短一點。喜歡低調、耐看,不要太亮的珠光。',
    allergyDescription: '對甲油膠中的 HEMA 成分敏感',
    vipReason: '累計 NT$ 24,800,距離黑卡還差 NT$ 35,200',
  },
  {
    id: 't2',
    customerId: 'c2',
    category: 'eyelash',
    serviceName: '美睫嫁接',
    productIngredients: [],
    price: 1500,
    durationMin: 60,
    performedAt: '2026-09-02T10:00:00Z',
    displayName: '美睫嫁接',
    preferenceTags: ['自然款'],
    noteSummary: '偏好自然款,右眼眼尾容易塌,操作前先確認眼周狀況。',
    allergyDescription: '目前沒有已知過敏紀錄',
    vipReason: '美睫建議週期 21 天',
  },
  {
    id: 't3',
    customerId: 'c3',
    category: 'skincare',
    serviceName: '深層護膚',
    productIngredients: ['AHA'],
    price: 2500,
    durationMin: 90,
    performedAt: '2026-09-03T10:00:00Z',
    displayName: '深層保濕',
    preferenceTags: ['敏感肌'],
    noteSummary: '上次做深層保濕,回家後沒有泛紅。下次可以詢問換季敏感狀況。',
    allergyDescription: '避開高濃度酸類',
    vipReason: '護膚建議週期 30 天',
  },
  {
    id: 't4',
    customerId: 'c4',
    category: 'hair',
    serviceName: '剪髮護理',
    productIngredients: [],
    price: 3200,
    durationMin: 180,
    performedAt: '2026-09-06T10:00:00Z',
    displayName: '剪髮 + 頭皮護理',
    preferenceTags: ['短髮'],
    noteSummary: '喜歡俐落短髮,每次可先問是否需要加做頭皮護理。',
    allergyDescription: '染髮前需再次確認成分',
    vipReason: '髮型建議週期 45 天',
  },
];

export function getSeedCustomers(): DisplayCustomer[] {
  return SEED_CUSTOMERS;
}

export function getSeedTreatments(): DisplayTreatment[] {
  return SEED_TREATMENTS;
}

/** 對應 quick-add sheet 的服務項目 (label → category)。 */
export const SERVICE_PRESETS: Array<{ label: string; category: TreatmentCategory }> = [
  { label: '凝膠美甲', category: 'manicure' },
  { label: '美睫嫁接', category: 'eyelash' },
  { label: '深層護膚', category: 'skincare' },
  { label: '剪髮護理', category: 'hair' },
];
