// Beauty CRM v0.4.0 — AdminDataProvider
// 集中 admin 區的 state + 處理（含 localStorage 持久化）
// 對齊 DESIGN §6（client-side persistence）
//
// v0.4.0 commit 4 加上 localStorage load/save：
// - 首次 mount：load() 從 localStorage 讀回
// - state 改變：save() 同步回 localStorage
// - purge：clearAll() 一次清掉

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { createCustomer, type Customer } from '@/lib/customers';
import { recordTreatment, type Treatment } from '@/lib/treatments';
import type { BroadcastTarget } from '@/lib/broadcast';
import type { OverrideOptions } from '@/lib/reminders';
import type { ContactLog, AppointmentLog } from '@/lib/funnel';
import { load, save, clearAll, StorageKeys } from '@/lib/storage';

const SEED_CUSTOMERS: Customer[] = [
  createCustomer({ id: 'c1', name: '雅婷', phone: '0911111111', consent: 'granted', tags: ['VIP'] }),
  createCustomer({ id: 'c2', name: '小美', phone: '0922222222', consent: 'granted' }),
  createCustomer({ id: 'c3', name: 'Lisa', phone: '0933333333', consent: 'pending' }),
  createCustomer({ id: 'c4', name: 'Amy', phone: '0944444444', consent: 'revoked' }),
];

const SEED_TREATMENTS: Treatment[] = [
  recordTreatment({ id: 't1', customerId: 'c1', category: 'manicure', serviceName: '凝膠美甲', price: 1200, durationMin: 90, performedAt: '2026-05-15T10:00:00Z' }),
  recordTreatment({ id: 't2', customerId: 'c1', category: 'skincare', serviceName: '臉部保養', price: 2500, durationMin: 90, performedAt: '2026-06-20T10:00:00Z' }),
  recordTreatment({ id: 't3', customerId: 'c2', category: 'eyelash', serviceName: '美睫嫁接', price: 1500, durationMin: 60, performedAt: '2026-07-01T10:00:00Z' }),
  recordTreatment({ id: 't4', customerId: 'c3', category: 'hair', serviceName: '染髮', price: 3200, durationMin: 180, performedAt: '2026-06-01T10:00:00Z' }),
];

export interface AdminDataState {
  customers: Customer[];
  treatments: Treatment[];
  approvedTargets: Record<string, BroadcastTarget>;
  reminderOverrides: Record<string, OverrideOptions>;
  deviceShared: boolean;
  contactLogs: ContactLog[];
  apptLogs: AppointmentLog[];
  lastPurge: { wipedAt: string; tombstoneId: string } | null;
}

export interface AdminDataApi extends AdminDataState {
  hydrated: boolean;
  setCustomers: (next: Customer[]) => void;
  setTreatments: (next: Treatment[]) => void;
  addTreatment: (t: Treatment) => void;
  setApprovedTargets: (next: Record<string, BroadcastTarget>) => void;
  setReminderOverrides: (next: Record<string, OverrideOptions>) => void;
  setDeviceShared: (next: boolean) => void;
  setContactLogs: (next: ContactLog[]) => void;
  setApptLogs: (next: AppointmentLog[]) => void;
  setLastPurge: (next: AdminDataState['lastPurge']) => void;
  reset: () => void;
}

const AdminDataContext = createContext<AdminDataApi | null>(null);

const SEED: AdminDataState = {
  customers: SEED_CUSTOMERS,
  treatments: SEED_TREATMENTS,
  approvedTargets: {},
  reminderOverrides: {},
  deviceShared: true,
  contactLogs: [],
  apptLogs: [],
  lastPurge: null,
};

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminDataState>(SEED);
  const [hydrated, setHydrated] = useState(false);

  // §6.5 載入：useEffect 內從 localStorage 讀，讀完設 hydrated=true
  useEffect(() => {
    const next: AdminDataState = {
      customers: load(StorageKeys.customers, SEED_CUSTOMERS),
      treatments: load(StorageKeys.treatments, SEED_TREATMENTS),
      approvedTargets: load(StorageKeys.approvedTargets, {}),
      reminderOverrides: load(StorageKeys.reminderOverrides, {}),
      deviceShared: load(StorageKeys.deviceShared, true),
      contactLogs: load(StorageKeys.contactLogs, []),
      apptLogs: load(StorageKeys.apptLogs, []),
      lastPurge: null,
    };
    setState(next);
    setHydrated(true);
  }, []);

  // §6.5 同步：hydrated 後每次 state 變動都 save 回 localStorage
  useEffect(() => {
    if (!hydrated) return;
    save(StorageKeys.customers, state.customers);
  }, [state.customers, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    save(StorageKeys.treatments, state.treatments);
  }, [state.treatments, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    save(StorageKeys.approvedTargets, state.approvedTargets);
  }, [state.approvedTargets, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    save(StorageKeys.reminderOverrides, state.reminderOverrides);
  }, [state.reminderOverrides, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    save(StorageKeys.deviceShared, state.deviceShared);
  }, [state.deviceShared, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    save(StorageKeys.contactLogs, state.contactLogs);
  }, [state.contactLogs, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    save(StorageKeys.apptLogs, state.apptLogs);
  }, [state.apptLogs, hydrated]);

  const setCustomers = (next: Customer[]) => setState((p) => ({ ...p, customers: next }));
  const setTreatments = (next: Treatment[]) => setState((p) => ({ ...p, treatments: next }));
  const addTreatment = (t: Treatment) => setState((p) => ({ ...p, treatments: [t, ...p.treatments] }));
  const setApprovedTargets = (next: Record<string, BroadcastTarget>) =>
    setState((p) => ({ ...p, approvedTargets: next }));
  const setReminderOverrides = (next: Record<string, OverrideOptions>) =>
    setState((p) => ({ ...p, reminderOverrides: next }));
  const setDeviceShared = (next: boolean) => setState((p) => ({ ...p, deviceShared: next }));
  const setContactLogs = (next: ContactLog[]) => setState((p) => ({ ...p, contactLogs: next }));
  const setApptLogs = (next: AppointmentLog[]) => setState((p) => ({ ...p, apptLogs: next }));
  const setLastPurge = (next: AdminDataState['lastPurge']) => setState((p) => ({ ...p, lastPurge: next }));
  const reset = () => {
    clearAll();
    setState(SEED);
  };

  const api: AdminDataApi = {
    ...state,
    hydrated,
    setCustomers,
    setTreatments,
    addTreatment,
    setApprovedTargets,
    setReminderOverrides,
    setDeviceShared,
    setContactLogs,
    setApptLogs,
    setLastPurge,
    reset,
  };

  return <AdminDataContext.Provider value={api}>{children}</AdminDataContext.Provider>;
}

export function useAdminData(): AdminDataApi {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error('useAdminData must be used within <AdminDataProvider>');
  return ctx;
}
