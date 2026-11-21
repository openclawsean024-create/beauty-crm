'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CrmState } from '@/lib/crm-store';
import { getBrowserStorage, readCrmState, saveCrmState } from '@/lib/local-store';
import { toDateOnly } from '@/lib/dates';
import { buildSeedState } from '@/lib/seed';

/** 以當地日期的中午作為「今天」，避免回訪天數在清晨或深夜因四捨五入差一天。 */
export function localNoon(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
}

/**
 * 'ok'：正常讀寫。
 * 'corrupt'：裝置上有資料但讀不出來；畫面暫用示範資料，且不寫回，避免覆寫原本的資料。
 */
export type StorageStatus = 'ok' | 'corrupt';

/** saved：已寫入；failed：寫入失敗（例如空間已滿）；skipped：資料損毀模式下不寫入。 */
export type CommitResult = 'saved' | 'failed' | 'skipped';

const TODAY_CHECK_MS = 60_000;

/**
 * CRM 資料的單一來源：啟動時從 localStorage 載入（沒有資料才載入示範資料），
 * 之後每次 commit 都同步寫回 localStorage，重新整理後保留。
 */
export function useCrmStore() {
  const [crm, setCrm] = useState<CrmState | null>(null);
  const [today, setToday] = useState<Date>(() => localNoon());
  const [storageStatus, setStorageStatus] = useState<StorageStatus>('ok');
  const statusRef = useRef<StorageStatus>('ok');

  useEffect(() => {
    const storage = getBrowserStorage();
    const result = readCrmState(storage);
    if (result.status === 'ok') {
      setCrm(result.state);
      return;
    }
    const seed = buildSeedState(localNoon());
    if (result.status === 'corrupt') {
      statusRef.current = 'corrupt';
      setStorageStatus('corrupt');
    } else {
      saveCrmState(storage, seed);
    }
    setCrm(seed);
  }, []);

  // 頁面跨過午夜仍開著時，更新「今天」（逾期天數、本月 KPI、套票到期都依此計算）
  useEffect(() => {
    const refresh = () => {
      const next = localNoon();
      setToday((prev) => (toDateOnly(prev) === toDateOnly(next) ? prev : next));
    };
    const timer = setInterval(refresh, TODAY_CHECK_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  /**
   * 更新 state 並寫回 localStorage。
   * replaceCorrupt：使用者明確要求重新開始（清除本機資料、重新載入示範資料）時才可覆寫損毀的資料。
   */
  const commit = useCallback((next: CrmState, options: { replaceCorrupt?: boolean } = {}): CommitResult => {
    setCrm(next);
    if (statusRef.current === 'corrupt' && !options.replaceCorrupt) return 'skipped';
    const saved = saveCrmState(getBrowserStorage(), next);
    if (saved && statusRef.current === 'corrupt') {
      statusRef.current = 'ok';
      setStorageStatus('ok');
    }
    return saved ? 'saved' : 'failed';
  }, []);

  return { crm, today, commit, storageStatus };
}
