// Beauty CRM v0.4.0 — AdminDataProvider
// 集中 admin 區的 state + 處理（含 localStorage 持久化，commit 4 加）
// 對齊 DESIGN §6（client-side persistence）
//
// 注意：v0.4.0 commit 3 只建容器（state holder + handler API），
// commit 4 會在這層加 localStorage load/save。

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

  // v0.4.0 commit 4 會在這裡加 localStorage load/save
  useEffect(() => {
    setHydrated(true);
  }, []);

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
  const reset = () => setState(SEED);

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
