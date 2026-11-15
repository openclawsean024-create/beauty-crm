'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CrmState } from '@/lib/crm-store';
import { getBrowserStorage, loadCrmState, saveCrmState } from '@/lib/local-store';
import { buildSeedState } from '@/lib/seed';

/** 以當地日期的中午作為「今天」，避免回訪天數在清晨或深夜因四捨五入差一天。 */
export function localNoon(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
}

/**
 * CRM 資料的單一來源：啟動時從 localStorage 載入（沒有就載入示範資料），
 * 之後每次 commit 都同步寫回 localStorage，重新整理後保留。
 */
export function useCrmStore() {
  const [crm, setCrm] = useState<CrmState | null>(null);
  const [today] = useState<Date>(() => localNoon());

  useEffect(() => {
    const storage = getBrowserStorage();
    const loaded = loadCrmState(storage);
    const initial = loaded ?? buildSeedState(today);
    if (!loaded) saveCrmState(storage, initial);
    setCrm(initial);
  }, [today]);

  const commit = useCallback((next: CrmState) => {
    setCrm(next);
    saveCrmState(getBrowserStorage(), next);
  }, []);

  return { crm, today, commit };
}
