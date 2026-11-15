// Beauty CRM — 示範資料（全部為虛構）
// 規範：姓名加「示範」前綴、手機 09000000xx、Email @example.com（SPEC §6.4）。
// 日期以傳入的 today 為基準往回推，讓示範資料永遠同時有逾期、即將到期與已預約的客戶。
// 不含任何照片；Before/After 只用本機示意圖代號。

import { createAccount, createDesignerProfile, createStore, type Account, type Store, type Workspace } from './accounts';
import { createAppointment } from './appointments';
import { createCustomer } from './customers';
import { emptyState, type CrmState } from './crm-store';
import { addDays, parseDateOnly, toDateOnly } from './dates';
import { createEffectRecord } from './effects';
import { createPackage } from './packages';
import { DEFAULT_SERVICE_CATALOG, draftFromServiceItem, findServiceItem } from './service-catalog';
import { recordTreatment, type Treatment } from './treatments';

export const DEMO_WORKSPACE: Workspace = { id: 'ws-demo', name: '示範美業工作室' };

export const DEMO_STORES: Store[] = [
  createStore({ id: 'store-1', workspaceId: DEMO_WORKSPACE.id, name: '示範一店' }),
  createStore({ id: 'store-2', workspaceId: DEMO_WORKSPACE.id, name: '示範二店' }),
];

export const DEMO_ACCOUNTS: Account[] = [
  createAccount({ id: 'acc-owner', workspaceId: DEMO_WORKSPACE.id, name: '示範店主', role: 'owner' }),
  createAccount({ id: 'acc-manager', workspaceId: DEMO_WORKSPACE.id, name: '示範店長', role: 'manager', storeIds: ['store-1'] }),
  createAccount({
    id: 'acc-designer-a',
    workspaceId: DEMO_WORKSPACE.id,
    name: '示範設計師 A',
    role: 'designer',
    storeIds: ['store-1'],
    profile: createDesignerProfile({ title: '資深髮型設計師', yearsExp: 8, specialties: ['染髮', '剪髮'] }),
  }),
  createAccount({
    id: 'acc-designer-b',
    workspaceId: DEMO_WORKSPACE.id,
    name: '示範設計師 B',
    role: 'designer',
    storeIds: ['store-1'],
    profile: createDesignerProfile({ title: '美甲美睫師', yearsExp: 3, specialties: ['凝膠美甲', '美睫嫁接'] }),
  }),
  createAccount({
    id: 'acc-designer-c',
    workspaceId: DEMO_WORKSPACE.id,
    name: '示範設計師 C',
    role: 'designer',
    storeIds: ['store-2'],
    profile: createDesignerProfile({ title: '髮型設計師', yearsExp: 5, specialties: ['染髮'] }),
  }),
];

export const DEFAULT_ACCOUNT_ID = 'acc-owner';
export const DEFAULT_STORE_ID = 'store-1';

/** 只有工作區、店別、帳號與品項，沒有任何客戶資料（「清除本機全部資料」後的狀態）。 */
export function buildEmptyDemoState(): CrmState {
  return emptyState({ workspace: DEMO_WORKSPACE, stores: DEMO_STORES, accounts: DEMO_ACCOUNTS });
}

export function buildSeedState(today: Date): CrmState {
  const todayIso = toDateOnly(today);
  const day = (offset: number) => addDays(todayIso, offset);
  /** 當地時間上午 10 點的 ISO 時間戳 */
  const at = (offset: number) => {
    const d = parseDateOnly(day(offset));
    d.setHours(10, 0, 0, 0);
    return d.toISOString();
  };
  const created = at(-300);
  const state = buildEmptyDemoState();

  const stamp = <T extends { createdAt: string; updatedAt: string }>(c: T): T => ({ ...c, createdAt: created, updatedAt: created });

  state.customers = [
    stamp(createCustomer({
      id: 'cust-a', name: '示範客戶 A', phone: '0900000001', email: 'demo-a@example.com',
      storeId: 'store-1', ownerDesignerId: 'acc-designer-a',
      consent: 'granted', sensitiveDataConsent: 'granted',
      preferences: ['自然棕色系', '平日下午'], tags: ['老客戶'],
      allergies: ['香精'], skinCondition: '換季時頭皮容易乾燥',
      notes: '偏好安靜的服務過程。', lineUserId: 'U00000000000000000000000000000001',
    })),
    stamp(createCustomer({
      id: 'cust-b', name: '示範客戶 B', phone: '0900000002', email: 'demo-b@example.com',
      storeId: 'store-1', ownerDesignerId: 'acc-designer-b',
      consent: 'granted', sensitiveDataConsent: 'granted',
      preferences: ['低刺激產品', '週末'], tags: [],
      allergies: ['高濃度酸類'], healthNotes: '曾對酸類產品泛紅，避免主動推薦。',
      lineUserId: 'U00000000000000000000000000000002',
    })),
    stamp(createCustomer({
      id: 'cust-c', name: '示範客戶 C', phone: '0900000003',
      storeId: 'store-1', ownerDesignerId: 'acc-designer-b',
      consent: 'granted', sensitiveDataConsent: 'pending',
      preferences: ['自然款', '輕盈'], tags: [],
    })),
    stamp(createCustomer({
      id: 'cust-d', name: '示範客戶 D', phone: '0900000004',
      storeId: 'store-1', ownerDesignerId: 'acc-designer-b',
      consent: 'pending', sensitiveDataConsent: 'pending',
      preferences: ['晚上時段'], tags: ['新客'],
    })),
    stamp(createCustomer({
      id: 'cust-e', name: '示範客戶 E', phone: '0900000005',
      storeId: 'store-1', ownerDesignerId: 'acc-designer-b',
      consent: 'revoked', sensitiveDataConsent: 'granted',
      preferences: ['裸色系'], tags: [], allergies: ['HEMA'],
    })),
    stamp(createCustomer({
      id: 'cust-f', name: '示範客戶 F', phone: '0900000006',
      storeId: 'store-1', ownerDesignerId: 'acc-designer-a',
      consent: 'granted', sensitiveDataConsent: 'pending',
      preferences: ['俐落短髮'], tags: [],
    })),
    stamp(createCustomer({
      id: 'cust-g', name: '示範客戶 G', phone: '0900000007',
      storeId: 'store-2', ownerDesignerId: 'acc-designer-c',
      consent: 'granted', sensitiveDataConsent: 'granted',
      preferences: ['低調髮色'], tags: [], allergies: ['PPD'],
    })),
    stamp(createCustomer({
      id: 'cust-h', name: '示範客戶 H', phone: '0900000008',
      storeId: 'store-2', ownerDesignerId: 'acc-designer-c',
      consent: 'pending', sensitiveDataConsent: 'pending',
      preferences: [], tags: ['新客'],
    })),
  ];

  let seq = 0;
  const visit = (customerId: string, storeId: string, designerId: string, itemId: string, offset: number): Treatment => {
    seq += 1;
    const item = findServiceItem(DEFAULT_SERVICE_CATALOG, itemId);
    if (!item) throw new Error(`unknown seed service item: ${itemId}`);
    return recordTreatment({
      ...draftFromServiceItem(item, { id: `seed-t${seq}`, customerId, performedAt: at(offset), designerId }),
      storeId,
    });
  };

  state.treatments = [
    // A：髮型老客戶，上次染髮已逾期（45 天週期）
    visit('cust-a', 'store-1', 'acc-designer-a', 'svc-color', -232),
    visit('cust-a', 'store-1', 'acc-designer-a', 'svc-color', -187),
    visit('cust-a', 'store-1', 'acc-designer-a', 'svc-hydra', -150),
    visit('cust-a', 'store-1', 'acc-designer-a', 'svc-color', -142),
    visit('cust-a', 'store-1', 'acc-designer-a', 'svc-hydra', -120),
    visit('cust-a', 'store-1', 'acc-designer-a', 'svc-color', -97),
    visit('cust-a', 'store-1', 'acc-designer-a', 'svc-hydra', -90),
    visit('cust-a', 'store-1', 'acc-designer-a', 'svc-hydra', -60),
    visit('cust-a', 'store-1', 'acc-designer-a', 'svc-color', -52),
    // B：深層清潔逾期 3 天，但已有預約
    visit('cust-b', 'store-1', 'acc-designer-b', 'svc-cleanse', -63),
    visit('cust-b', 'store-1', 'acc-designer-b', 'svc-cleanse', -33),
    // C：美睫 5 天後到期，已聯絡
    visit('cust-c', 'store-1', 'acc-designer-b', 'svc-lash', -37),
    visit('cust-c', 'store-1', 'acc-designer-b', 'svc-lash', -16),
    // D：新客，保濕導入 10 天後到期，行銷同意待確認
    visit('cust-d', 'store-1', 'acc-designer-b', 'svc-hydra', -20),
    // E：凝膠美甲逾期 12 天，已撤回行銷同意
    visit('cust-e', 'store-1', 'acc-designer-b', 'svc-gel', -40),
    // F：剛剪完髮，還不在回訪窗口
    visit('cust-f', 'store-1', 'acc-designer-a', 'svc-cut', -5),
    // 二店
    visit('cust-g', 'store-2', 'acc-designer-c', 'svc-color', -50),
    visit('cust-h', 'store-2', 'acc-designer-c', 'svc-cut', -35),
  ];

  state.packages = [
    createPackage({
      id: 'seed-p1', customerId: 'cust-a', storeId: 'store-1', name: '示範保濕套票 10 堂',
      totalSessions: 10, usedSessions: 4, startDate: day(-160), endDate: day(60),
      price: 16000, catalogItemIds: ['svc-hydra'],
    }),
    createPackage({
      id: 'seed-p2', customerId: 'cust-g', storeId: 'store-2', name: '示範染護套票 5 堂',
      totalSessions: 5, usedSessions: 5, startDate: day(-200), endDate: day(100),
      price: 14000, catalogItemIds: ['svc-color'],
    }),
  ];

  state.appointments = [
    createAppointment({
      id: 'seed-a1', customerId: 'cust-b', storeId: 'store-1', designerId: 'acc-designer-b',
      date: day(3), time: '14:00', catalogItemId: 'svc-cleanse', createdAt: at(-1),
    }),
    createAppointment({
      id: 'seed-a2', customerId: 'cust-a', storeId: 'store-1', designerId: 'acc-designer-a',
      date: day(-52), time: '10:00', status: 'completed', catalogItemId: 'svc-color', createdAt: at(-60),
    }),
  ];

  state.effects = [
    createEffectRecord({
      id: 'seed-e1', customerId: 'cust-a', date: day(-150), type: 'before', sessionLabel: '服務前',
      metrics: { hydration: 42, pores: 68, evenness: 55, smoothness: 50 },
    }, 'granted'),
    createEffectRecord({
      id: 'seed-e2', customerId: 'cust-a', date: day(-120), type: 'after', sessionLabel: '第 2 次服務後',
      metrics: { hydration: 55, pores: 60, evenness: 60, smoothness: 60 },
    }, 'granted'),
    createEffectRecord({
      id: 'seed-e3', customerId: 'cust-a', date: day(-60), type: 'after', sessionLabel: '第 4 次服務後',
      metrics: { hydration: 70, pores: 48, evenness: 66, smoothness: 71 },
    }, 'granted'),
  ];

  state.contactLog = [
    {
      id: 'seed-k1', customerId: 'cust-c', channel: 'line', contactedAt: at(-1),
      contactedBy: 'acc-designer-b', note: '已手動傳訊息詢問近況',
    },
  ];

  state.consentLog = state.customers.flatMap((c, i) => [
    { id: `seed-consent-${i}-m`, customerId: c.id, kind: 'marketing' as const, status: c.consent, recordedAt: created, recordedBy: 'acc-owner' },
    { id: `seed-consent-${i}-s`, customerId: c.id, kind: 'sensitive' as const, status: c.sensitiveDataConsent ?? 'pending', recordedAt: created, recordedBy: 'acc-owner' },
  ]);

  return state;
}
