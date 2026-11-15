'use client';

import { useEffect, useState } from 'react';
import type { Account } from '@/lib/accounts';
import { ROLE_LABELS, describeDesigner } from '@/lib/accounts';
import { t, type Lang, type MessageKey } from '@/lib/i18n';
import {
  MAX_RECALL_DAYS,
  MIN_RECALL_DAYS,
  RECALL_CATEGORIES,
  isValidRecallDays,
  type RecallSettings,
} from '@/lib/recall-settings';
import type { ServiceItem } from '@/lib/service-catalog';
import type { TreatmentCategory } from '@/lib/treatments';

interface SettingsViewProps {
  lang: Lang;
  recallSettings: RecallSettings;
  canEditSettings: boolean;
  onSaveRecall: (next: RecallSettings) => void;
  team: Account[];
  catalog: ServiceItem[];
  /** 匯出、清除本機資料：只有店主 */
  canManageData: boolean;
  onExport: () => void;
  onClearAll: () => void;
  onReloadDemo: () => void;
}

export const CATEGORY_LABEL: Record<TreatmentCategory, MessageKey> = {
  manicure: 'catManicure',
  eyelash: 'catEyelash',
  skincare: 'catSkincare',
  hair: 'catHair',
};

/** 設定分頁：回訪天數（FR-003）、團隊與設計師檔案（FR-018）、服務品項、資料匯出與清除（FR-009）。 */
export default function SettingsView({
  lang,
  recallSettings,
  canEditSettings,
  onSaveRecall,
  team,
  catalog,
  canManageData,
  onExport,
  onClearAll,
  onReloadDemo,
}: SettingsViewProps) {
  const [draft, setDraft] = useState<RecallSettings>(recallSettings);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => setDraft(recallSettings), [recallSettings]);

  const valid = RECALL_CATEGORIES.every((category) => isValidRecallDays(draft[category]));
  const dirty = RECALL_CATEGORIES.some((category) => draft[category] !== recallSettings[category]);

  return (
    <div className="stack" data-testid="settings-view">
      <div className="bottom-grid" style={{ marginTop: 0 }}>
        <article className="card insight" aria-labelledby="recall-title">
          <div className="insight-head">
            <div>
              <h2 id="recall-title">{t(lang, 'recallTitle')}</h2>
              <p className="insight-note">{t(lang, 'recallSubtitle')}</p>
            </div>
          </div>
          <form
            className="form"
            onSubmit={(event) => {
              event.preventDefault();
              if (canEditSettings && valid && dirty) onSaveRecall(draft);
            }}
          >
            <div className="form-grid">
              {RECALL_CATEGORIES.map((category) => (
                <div className="field" key={category}>
                  <label htmlFor={`recall-${category}`}>
                    {t(lang, CATEGORY_LABEL[category])}（{t(lang, 'daysUnit')}）
                  </label>
                  <input
                    id={`recall-${category}`}
                    data-testid={`recall-days-${category}`}
                    type="number"
                    inputMode="numeric"
                    min={MIN_RECALL_DAYS}
                    max={MAX_RECALL_DAYS}
                    step={1}
                    value={Number.isFinite(draft[category]) ? draft[category] : ''}
                    disabled={!canEditSettings}
                    onChange={(event) => setDraft((prev) => ({ ...prev, [category]: Number(event.target.value) }))}
                  />
                </div>
              ))}
            </div>
            {canEditSettings ? (
              <div className="drawer-foot">
                <button type="submit" className="button primary" data-testid="save-recall-days" disabled={!valid || !dirty}>
                  {t(lang, 'recallSave')}
                </button>
              </div>
            ) : (
              <p className="memory-empty" data-testid="recall-no-permission">{t(lang, 'recallNoPermission')}</p>
            )}
          </form>
        </article>

        <article className="card insight" aria-labelledby="data-title">
          <div className="insight-head">
            <div>
              <h2 id="data-title">{t(lang, 'dataTitle')}</h2>
              <p className="insight-note">{t(lang, 'dataSubtitle')}</p>
            </div>
          </div>
          {canManageData ? (
            <div className="stack-sm">
              <p className="memory-hint">{t(lang, 'exportWarning')}</p>
              <div className="confirm-actions">
                <button type="button" className="button secondary" data-testid="settings-export" onClick={onExport}>
                  {t(lang, 'export')}
                </button>
                <button type="button" className="button secondary" data-testid="reload-demo" onClick={onReloadDemo}>
                  {t(lang, 'reloadDemo')}
                </button>
              </div>
              {confirmClear ? (
                <div className="confirm-box" role="alert">
                  <p>{t(lang, 'clearAllWarning')}</p>
                  <div className="confirm-actions">
                    <button type="button" className="button secondary" onClick={() => setConfirmClear(false)}>
                      {t(lang, 'cancelAction')}
                    </button>
                    <button
                      type="button"
                      className="button danger"
                      data-testid="clear-all-confirm"
                      onClick={() => {
                        setConfirmClear(false);
                        onClearAll();
                      }}
                    >
                      {t(lang, 'clearAllConfirm')}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="quiet danger-text" data-testid="clear-all" onClick={() => setConfirmClear(true)}>
                  {t(lang, 'clearAll')}
                </button>
              )}
            </div>
          ) : (
            <p className="memory-empty" data-testid="data-no-permission">{t(lang, 'dataNoPermission')}</p>
          )}
        </article>
      </div>

      <div className="bottom-grid">
        <article className="card insight" aria-labelledby="catalog-title">
          <div className="insight-head">
            <h2 id="catalog-title">{t(lang, 'catalogTitle')}</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t(lang, 'colItem')}</th>
                <th scope="col">{t(lang, 'colCategory')}</th>
                <th scope="col" className="num">{t(lang, 'colDuration')}</th>
                <th scope="col" className="num">{t(lang, 'colPrice')}</th>
                <th scope="col" className="num">{t(lang, 'recallTitle')}</th>
              </tr>
            </thead>
            <tbody>
              {catalog.map((item) => (
                <tr key={item.id}>
                  <th scope="row">{item.name}</th>
                  <td>{t(lang, CATEGORY_LABEL[item.category])}</td>
                  <td className="num mono">{item.durationMin} {t(lang, 'minutesUnit')}</td>
                  <td className="num mono">NT$ {item.price.toLocaleString('en-US')}</td>
                  <td className="num mono">{recallSettings[item.category]} {t(lang, 'daysUnit')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="card insight" aria-labelledby="team-title">
          <div className="insight-head">
            <h2 id="team-title">{t(lang, 'teamTitle')}</h2>
          </div>
          <ul className="log-list" data-testid="team-list">
            {team.map((member) => (
              <li key={member.id}>
                <div className="log-head">
                  <strong>{member.name}</strong>
                  <span className="status ok">{ROLE_LABELS[member.role][lang]}</span>
                </div>
                {describeDesigner(member) ? <p className="log-meta">{describeDesigner(member)}</p> : null}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  );
}
