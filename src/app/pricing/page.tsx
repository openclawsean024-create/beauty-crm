// v0.4.0 /pricing = 公開定價頁
// 對齊 DESIGN §7.2

import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface Tier {
  name: string;
  price: string;
  unit: string;
  features: string[];
  cta: string;
  popular?: boolean;
  ctaVariant: 'primary' | 'secondary';
}

const TIERS: Tier[] = [
  {
    name: '免費',
    price: 'NT$ 0',
    unit: '/ 月',
    features: ['50 位客戶', '30 次服務', '回訪清單', '加密匯出'],
    cta: '免費開始',
    ctaVariant: 'secondary',
  },
  {
    name: '設計師',
    price: 'NT$ 299',
    unit: '/ 月',
    features: [
      '300 位客戶',
      '草稿與報表',
      'VIP 分級',
      '多裝置同步（測試版）',
    ],
    cta: '開始 14 天試用',
    ctaVariant: 'primary',
    popular: true,
  },
  {
    name: '工作室',
    price: 'NT$ 799',
    unit: '/ 月',
    features: [
      '5 位成員',
      '5,000 位客戶',
      'LINE adapter beta',
      'Cohort 報表',
    ],
    cta: '聯絡銷售',
    ctaVariant: 'secondary',
  },
  {
    name: '品牌',
    price: 'NT$ 2,499',
    unit: '/ 月',
    features: ['訪談後開放', '多店', 'API', 'SSO', '專屬顧問'],
    cta: '預約 demo',
    ctaVariant: 'secondary',
  },
];

const FAQ = [
  {
    q: '免費版可以一直用嗎？',
    a: '可以，50 位客戶 / 30 次服務內永久免費。升級不強迫，隨時降級。',
  },
  {
    q: '隨時可以升級嗎？',
    a: '可以，月繳，隨時降級。升級時多出的金額按比例退還。',
  },
  {
    q: '資料安全嗎？',
    a: 'v1 資料只存在你的裝置（AES-256 加密匯出）；v2 才有雲端同步。詳細看 Privacy 頁。',
  },
  {
    q: '可以匯出我的資料嗎？',
    a: '任何方案都可以隨時匯出 JSON 備份（加密 / 解密都在你的瀏覽器）。',
  },
  {
    q: '設計師 / 工作室差別？',
    a: '工作室有多人 workspace（5 位成員）+ LINE adapter beta，設計師是單機完整功能。',
  },
];

export default function PricingPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Top nav */}
      <header
        style={{
          padding: 'var(--space-4) var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'var(--text-primary)' }}>
          <div
            aria-hidden="true"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--accent-primary)',
              color: 'var(--text-inverse)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            B
          </div>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Beauty CRM</span>
        </Link>
        <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/dashboard" style={{ color: 'var(--text-secondary)', fontSize: 14, textDecoration: 'none' }}>
            進入後台
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section
        style={{
          padding: 'var(--space-7) var(--space-6) var(--space-5)',
          maxWidth: 960,
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: 'var(--text-display)',
            lineHeight: 'var(--text-display-line)',
            fontWeight: 'var(--text-display-weight)',
            margin: 0,
          }}
        >
          簡單定價，按你的規模選
        </h1>
        <p
          style={{
            fontSize: 'var(--text-body-lg)',
            color: 'var(--text-secondary)',
            marginTop: 'var(--space-3)',
          }}
        >
          免費試用，隨時可匯出備份
        </p>
      </section>

      {/* Pricing cards */}
      <section
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: 'var(--space-5) var(--space-6)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--space-3)',
          }}
        >
          {TIERS.map((t) => (
            <Card
              key={t.name}
              testId={`pricing-${t.name}`}
              style={{
                borderColor: t.popular ? 'var(--accent-primary)' : undefined,
                borderWidth: t.popular ? 2 : 1,
                borderStyle: 'solid',
                transition: 'transform var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <h3 style={{ fontSize: 'var(--text-h4)', fontWeight: 600, margin: 0 }}>{t.name}</h3>
                {t.popular && <Badge variant="accent" size="sm">熱門 ⭐</Badge>}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 16 }}>
                <span
                  style={{
                    fontSize: 'var(--text-h2)',
                    fontWeight: 700,
                    color: 'var(--accent-primary)',
                  }}
                >
                  {t.price}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-caption)' }}>{t.unit}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: 16 }}>
                {t.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      padding: '4px 0',
                      fontSize: 'var(--text-body)',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span style={{ color: 'var(--success)' }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/dashboard" style={{ display: 'block' }}>
                <Button variant={t.ctaVariant} fullWidth>
                  {t.cta}
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section
        style={{
          maxWidth: 800,
          margin: '0 auto',
          padding: 'var(--space-7) var(--space-6)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--text-h2)',
            fontWeight: 600,
            color: 'var(--text-primary)',
            textAlign: 'center',
            margin: 0,
            marginBottom: 'var(--space-5)',
          }}
        >
          常見問題
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FAQ.map((item, i) => (
            <Card key={i} testId={`faq-${i}`}>
              <h3
                style={{
                  fontSize: 'var(--text-h4)',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0,
                  marginBottom: 8,
                }}
              >
                {item.q}
              </h3>
              <p
                style={{
                  fontSize: 'var(--text-body)',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {item.a}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-light)',
          padding: 'var(--space-5) var(--space-6)',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 'var(--text-caption)',
        }}
      >
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          <Link href="/privacy" style={{ color: 'var(--text-link)' }}>隱私</Link>
          <Link href="/terms" style={{ color: 'var(--text-link)' }}>條款</Link>
          <Link href="/contact" style={{ color: 'var(--text-link)' }}>聯絡</Link>
          <Link href="/" style={{ color: 'var(--text-link)' }}>首頁</Link>
        </div>
        <div>© 2026 Beauty CRM · v0.4.0</div>
      </footer>
    </main>
  );
}
