// AC-007：seed、測試、fixture、原型只能使用明顯假資料。
// 遇到不在假號碼範圍的 09 開頭手機號、非 example.com 的 Email、
// 或沒有「示範／測試」前綴的客戶姓名即失敗。
import { describe, it, expect } from 'vitest';
import {
  findUnsafeEmails,
  findUnsafeNames,
  findUnsafePhones,
  listScanTargets,
  readTarget,
} from './helpers/fixture-scan';

// 用字串拼接組出「壞例子」，避免本檔自己被掃描器判定為違規。
const BAD_PHONE = ['09', '12', '345', '678'].join('');
const BAD_EMAIL = ['someone', 'gmail.com'].join('@');

describe('AC-007 假資料掃描器本身', () => {
  it('AC-007: 假號碼範圍 09000000xx 通過，其他 09 開頭手機號被抓出', () => {
    expect(findUnsafePhones('phone: 0900000001, 0900-000-099, 0900 000 012')).toEqual([]);
    expect(findUnsafePhones(`phone: ${BAD_PHONE}`)).toEqual([BAD_PHONE]);
    expect(findUnsafePhones(`tel ${BAD_PHONE.slice(0, 4)}-${BAD_PHONE.slice(4, 7)}-${BAD_PHONE.slice(7)}`)).toHaveLength(1);
    expect(findUnsafePhones(['0900', '000', '100'].join(''))).toHaveLength(1);
  });

  it('AC-007: 只有 @example.com 的 Email 通過', () => {
    expect(findUnsafeEmails('demo-a@example.com')).toEqual([]);
    expect(findUnsafeEmails(`mail: ${BAD_EMAIL}`)).toEqual([BAD_EMAIL]);
    // 套件版本、路徑別名不是 Email
    expect(findUnsafeEmails("import x from '@/lib/customers'; next@16.2.10 actions/checkout@v4")).toEqual([]);
  });

  it('AC-007: 客戶姓名必須有「示範／測試」前綴', () => {
    expect(findUnsafeNames("createCustomer({ id: 'c1', name: '測試客戶 A', phone: '0900000001' })")).toEqual([]);
    expect(findUnsafeNames("createCustomer({\n  id: 'c1',\n  name: '王大明',\n})")).toEqual(['王大明']);
    expect(findUnsafeNames("makeVisitRecord({ clientName: '示範客戶 B' })")).toEqual([]);
    expect(findUnsafeNames("{ clientName: 'Real Person' }")).toEqual(['Real Person']);
    // 必填驗證用的空字串不算
    expect(findUnsafeNames("createCustomer({ id: 'c1', name: '', phone: '0900000001' })")).toEqual([]);
  });
});

describe('AC-007 repo 內 seed／測試／fixture／原型掃描', () => {
  const targets = listScanTargets();

  it('AC-007: 掃描清單涵蓋 src、tests、原型 HTML 與文件', () => {
    expect(targets.some((f) => f.startsWith('src/'))).toBe(true);
    expect(targets.some((f) => f.startsWith('tests/'))).toBe(true);
    expect(targets.some((f) => f.endsWith('.html'))).toBe(true);
    expect(targets).toContain('README.md');
  });

  it('AC-007: 沒有假號碼範圍以外的手機號', () => {
    const violations = targets.flatMap((file) =>
      findUnsafePhones(readTarget(file)).map((hit) => `${file}: ${hit}`),
    );
    expect(violations).toEqual([]);
  });

  it('AC-007: 沒有 example.com 以外的 Email', () => {
    const violations = targets.flatMap((file) =>
      findUnsafeEmails(readTarget(file)).map((hit) => `${file}: ${hit}`),
    );
    expect(violations).toEqual([]);
  });

  it('AC-007: 程式與測試中的客戶姓名都有假資料前綴', () => {
    const violations = targets
      .filter((file) => /\.(ts|tsx)$/.test(file) && file !== 'tests/fixtures-safety.test.ts' && file !== 'tests/helpers/fixture-scan.ts')
      .flatMap((file) => findUnsafeNames(readTarget(file)).map((hit) => `${file}: ${hit}`));
    expect(violations).toEqual([]);
  });

  it('AC-007: src 不引用遠端圖片網域（Before/After 只用本機示意圖）', () => {
    const violations = targets
      .filter((file) => file.startsWith('src/'))
      .filter((file) => /unsplash|https?:\/\/[^\s'"`)]+\.(?:jpe?g|png|webp|gif)/i.test(readTarget(file)));
    expect(violations).toEqual([]);
  });
});
