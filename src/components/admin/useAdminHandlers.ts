// Beauty CRM v0.4.0 — Admin handlers（從 v0.3.0 Dashboard 移植，保留所有行為）
// 集中所有 handler，page 內呼叫

'use client';

import { useCallback } from 'react';
import { useAdminData } from './AdminDataProvider';
import {
  exportEncrypted,
  decryptEncrypted,
  EXPORT_FILE_EXTENSION,
  InvalidPassphraseError,
  type ExportPayload,
} from '@/lib/export';
import { purgeAllData } from '@/lib/delete';
import { markContacted, markBooked } from '@/lib/funnel';
import { toast } from '@/components/ui/Toast';
import { type OverrideOptions } from '@/lib/reminders';

export function useAdminHandlers() {
  const data = useAdminData();

  const handleExport = useCallback(async () => {
    try {
      if (typeof window === 'undefined') return;
      const passphrase = window.prompt('請輸入匯出密碼（將用於加密這份備份，至少 8 個字元）');
      if (!passphrase) {
        toast.info('已取消匯出');
        return;
      }
      if (passphrase.length < 8) {
        toast.error('匯出失敗：密碼至少 8 個字元');
        return;
      }
      const payload: ExportPayload = {
        customers: data.customers,
        treatments: data.treatments,
        exportedAt: new Date().toISOString(),
      };
      const blob = await exportEncrypted(payload, passphrase);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().slice(0, 10);
      a.download = `beauty-crm-${ts}${EXPORT_FILE_EXTENSION}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`已匯出 ${data.customers.length} 客戶 / ${data.treatments.length} 療程（${a.download}）`);
    } catch (err) {
      toast.error(`匯出失敗：${(err as Error).message}`);
    }
  }, [data.customers, data.treatments]);

  const handleImport = useCallback(
    async (file: File) => {
      try {
        if (typeof window === 'undefined') return;
        const passphrase = window.prompt('請輸入這份備份的密碼');
        if (!passphrase) {
          toast.info('已取消還原');
          return;
        }
        const payload = await decryptEncrypted(file, passphrase);
        data.setCustomers(payload.customers);
        data.setTreatments(payload.treatments);
        data.setApprovedTargets({});
        data.setReminderOverrides({});
        // localStorage 同步由 AdminDataProvider 的 useEffect 在 commit 4 自動處理
        toast.success(`已還原 ${payload.customers.length} 客戶 / ${payload.treatments.length} 療程`);
      } catch (err) {
        if (err instanceof InvalidPassphraseError) {
          toast.error('還原失敗：密碼錯誤或檔案已損壞');
        } else {
          toast.error(`還原失敗：${(err as Error).message}`);
        }
      }
    },
    [data],
  );

  const handlePurge = useCallback(() => {
    if (typeof window === 'undefined') return;
    const ok = window.confirm(
      '⚠ 即將刪除所有本機資料（客戶、療程、覆寫、核准紀錄）。\n此動作無法復原，請先匯出備份。\n\n確定要繼續嗎？',
    );
    if (!ok) return;
    const ok2 = window.confirm('再次確認：所有資料即將從本機清除，繼續？');
    if (!ok2) return;
    const result = purgeAllData({
      resetFn: () => {
        data.setCustomers([]);
        data.setTreatments([]);
        data.setApprovedTargets({});
        data.setReminderOverrides({});
        data.setContactLogs([]);
        data.setApptLogs([]);
      },
      scopes: ['customers', 'treatments', 'reminders', 'broadcast'],
      reason: 'designer manual confirm',
    });
    data.setLastPurge({ wipedAt: result.wipedAt, tombstoneId: result.tombstoneId });
    // localStorage clear 由 AdminDataProvider 在 commit 4 透過 storage.clearAll() 處理
    toast.success(`已刪除所有資料（tombstone: ${result.tombstoneId.slice(0, 22)}…）`);
  }, [data]);

  const handleMarkContacted = useCallback(
    (customerId: string, outcome: 'connected' | 'no-answer' | 'left-message' | 'booked' | 'declined') => {
      try {
        const next = markContacted(data.contactLogs, {
          customerId,
          channel: 'in-person',
          outcome,
          designerId: 'designer-local',
        });
        data.setContactLogs(next);
        const c = data.customers.find((x) => x.id === customerId);
        toast.success(`已標記 ${c?.name ?? customerId} 為「已聯絡」（${outcome}）`);
      } catch (err) {
        toast.error(`標記失敗：${(err as Error).message}`);
      }
    },
    [data],
  );

  const handleMarkBooked = useCallback(
    (customerId: string) => {
      try {
        const scheduledFor = new Date(Date.now() + 14 * 86_400_000).toISOString();
        const next = markBooked(data.apptLogs, {
          customerId,
          scheduledFor,
          designerId: 'designer-local',
        });
        data.setApptLogs(next);
        const c = data.customers.find((x) => x.id === customerId);
        toast.success(`已標記 ${c?.name ?? customerId} 為「已預約」（${scheduledFor.slice(0, 10)}）`);
      } catch (err) {
        toast.error(`標記失敗：${(err as Error).message}`);
      }
    },
    [data],
  );

  const handleOverrideReminder = useCallback(
    (customerId: string, opts: OverrideOptions) => {
      data.setReminderOverrides({ ...data.reminderOverrides, [customerId]: opts });
    },
    [data],
  );

  return {
    handleExport,
    handleImport,
    handlePurge,
    handleMarkContacted,
    handleMarkBooked,
    handleOverrideReminder,
  };
}
