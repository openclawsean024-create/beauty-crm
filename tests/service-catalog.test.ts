// AC-001：服務品項目錄 — 併自 concierge Treatment 品項模型（FR-002／FR-003）
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SERVICE_CATALOG,
  TREATMENT_CATEGORIES,
  activeServiceItems,
  catalogByCategory,
  createServiceItem,
  deactivateServiceItem,
  draftFromServiceItem,
  findServiceItem,
  mapCategoryLabel,
  recallDaysForItem,
  upsertServiceItem,
} from '@/lib/service-catalog';
import { recordTreatment, suggestRecallDays } from '@/lib/treatments';

describe('AC-001 service-catalog — 服務品項目錄', () => {
  it('AC-001: 品項含名稱、分類、時長、價格', () => {
    const item = createServiceItem({ id: 'svc-x', name: ' 示範品項 ', category: 'skincare', durationMin: 75, price: 1900 });
    expect(item).toEqual({
      id: 'svc-x',
      name: '示範品項',
      category: 'skincare',
      durationMin: 75,
      price: 1900,
      ingredients: [],
      active: true,
    });
  });

  it('AC-001: 欄位驗證', () => {
    const ok = { id: 'svc-x', name: '示範品項', category: 'hair' as const, durationMin: 60, price: 1000 };
    expect(() => createServiceItem({ ...ok, name: '' })).toThrow();
    expect(() => createServiceItem({ ...ok, durationMin: 0 })).toThrow();
    expect(() => createServiceItem({ ...ok, price: -5 })).toThrow();
    expect(() => createServiceItem({ ...ok, category: 'spa' as never })).toThrow();
  });

  it('AC-001: 預設目錄涵蓋 4 類，且每類都對應既有回訪週期', () => {
    const grouped = catalogByCategory(DEFAULT_SERVICE_CATALOG);
    for (const category of TREATMENT_CATEGORIES) {
      expect(grouped[category].length).toBeGreaterThan(0);
      for (const item of grouped[category]) {
        expect(recallDaysForItem(item)).toBe(suggestRecallDays(category));
      }
    }
    expect(recallDaysForItem(grouped.manicure[0]!)).toBe(28);
    expect(recallDaysForItem(grouped.eyelash[0]!)).toBe(21);
    expect(recallDaysForItem(grouped.skincare[0]!)).toBe(30);
    expect(recallDaysForItem(grouped.hair[0]!)).toBe(45);
  });

  it('AC-001: 店家調整回訪天數後，品項回訪天數跟著改', () => {
    const lash = findServiceItem(DEFAULT_SERVICE_CATALOG, 'svc-lash')!;
    expect(recallDaysForItem(lash, { eyelash: 14 })).toBe(14);
    expect(recallDaysForItem(lash, { hair: 60 })).toBe(21);
  });

  it('AC-001: 自由文字分類對應到既有 4 類；無法判斷時不猜', () => {
    expect(mapCategoryLabel('深層保濕')).toBe('skincare');
    expect(mapCategoryLabel('敏感修護')).toBe('skincare');
    expect(mapCategoryLabel('凝膠美甲')).toBe('manicure');
    expect(mapCategoryLabel('美睫嫁接')).toBe('eyelash');
    expect(mapCategoryLabel('染髮補色')).toBe('hair');
    expect(mapCategoryLabel('Gel manicure')).toBe('manicure');
    expect(mapCategoryLabel('eyelash')).toBe('eyelash');
    expect(mapCategoryLabel('停車折抵')).toBeUndefined();
    expect(mapCategoryLabel('  ')).toBeUndefined();
  });

  it('AC-001: 由品項帶入價格、時長與成分建立療程，金額可覆寫', () => {
    const color = findServiceItem(DEFAULT_SERVICE_CATALOG, 'svc-color')!;
    const draft = draftFromServiceItem(color, {
      id: 't1',
      customerId: 'c1',
      performedAt: '2026-11-16T06:00:00.000Z',
      designerId: 'acc-designer-1',
    });
    const treatment = recordTreatment(draft);
    expect(treatment).toMatchObject({
      serviceName: '染髮補色',
      category: 'hair',
      price: 3200,
      durationMin: 120,
      productIngredients: ['PPD', '香精'],
      designerId: 'acc-designer-1',
    });
    const discounted = draftFromServiceItem(color, { id: 't2', customerId: 'c1', performedAt: '2026-11-16T06:00:00.000Z', price: 2800 });
    expect(discounted.price).toBe(2800);
  });

  it('AC-001: 新增、更新與停用品項（停用後不出現在可選清單）', () => {
    const added = upsertServiceItem(
      DEFAULT_SERVICE_CATALOG,
      createServiceItem({ id: 'svc-new', name: '示範新品項', category: 'manicure', durationMin: 45, price: 900 }),
    );
    expect(added).toHaveLength(DEFAULT_SERVICE_CATALOG.length + 1);
    const updated = upsertServiceItem(added, { ...findServiceItem(added, 'svc-new')!, price: 1000 });
    expect(updated).toHaveLength(added.length);
    expect(findServiceItem(updated, 'svc-new')?.price).toBe(1000);
    const deactivated = deactivateServiceItem(updated, 'svc-new');
    expect(findServiceItem(deactivated, 'svc-new')?.active).toBe(false);
    expect(activeServiceItems(deactivated).some((i) => i.id === 'svc-new')).toBe(false);
    expect(DEFAULT_SERVICE_CATALOG.some((i) => i.id === 'svc-new')).toBe(false);
  });
});
