// v0.4.0 / = 公開 landing
// 對齊 DESIGN §7.1

import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Icon, { type IconName } from '@/components/ui/Icon';

interface Feature {
  icon: IconName;
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {
    icon: 'BellRing',
    title: '療程回流提醒',
    body: '依類別自動計算下次回訪日，逾期自動入清單。不用記、不用查、不漏接。',
  },
  {
    icon: 'ShieldCheck',
    title: '過敏 / 偏好紀錄',
    body: 'Before/After 照片 + 過敏醒目確認。下次做療程前 5 秒看完所有備註。',
  },
  {
    icon: 'MessageSquare',
    title: '草稿 → 人工核准',
    body: 'LINE 草稿不直接發送，設計師保留語氣、節奏、個別差異。',
  },
];

const TIERS = [
  { name: '免費', price: 'NT$ 0', tag: '50 位客戶' },
  { name: '設計師', price: 'NT$ 299', tag: '300 位客戶 · 草稿與報表', popular: true },
  { name: '工作室', price: 'NT$ 799', tag: '5 位成員 · LINE adapter' },
  { name: '品牌', price: 'NT$ 2,499', tag: '多店 · 訪談後開放' },
];

export default function HomePage() {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
        </div>
        <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link
            href="/pricing"
            style={{ color: 'var(--text-secondary)', fontSize: 14, textDecoration: 'none' }}
          >
            方案
          </Link>
          <Link
            href="/dashboard"
            style={{ color: 'var(--text-secondary)', fontSize: 14, textDecoration: 'none' }}
          >
            進入後台
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section
        style={{
          padding: 'var(--space-8) var(--space-6)',
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
            color: 'var(--text-primary)',
          }}
        >
          Beauty CRM
        </h1>
        <p
          style={{
            fontSize: 'var(--text-body-lg)',
            color: 'var(--text-secondary)',
            marginTop: 'var(--space-4)',
            maxWidth: 720,
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.6,
          }}
        >
          記得客戶做過什麼、
          <br />
          多久該回來、
          <br />
          如何在不打擾下追蹤。
        </p>
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-3)',
            justifyContent: 'center',
            marginTop: 'var(--space-5)',
            flexWrap: 'wrap',
          }}
        >
          <Link href="/dashboard">
            <Button variant="primary" size="lg">
              免費試用 50 位客戶
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="secondary" size="lg">
              查看方案 →
            </Button>
          </Link>
        </div>
        <p
          style={{
            marginTop: 'var(--space-5)',
            color: 'var(--text-muted)',
            fontSize: 'var(--text-caption)',
          }}
        >
          —— 不和預約 / POS 競爭，專注療程後 30-90 天記憶 ——
        </p>
      </section>

      {/* 3 feature cards */}
      <section
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: 'var(--space-7) var(--space-6)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {FEATURES.map((f) => (
            <Card key={f.title} variant="default" testId={`feature-${f.icon}`}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-bg)',
                  color: 'var(--accent-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 'var(--space-3)',
                }}
              >
                <Icon name={f.icon} size={24} strokeWidth={1.75} />
              </div>
              <h3
                style={{
                  fontSize: 'var(--text-h4)',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0,
                  marginBottom: 8,
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--text-body)',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {f.body}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Tier 簡介 */}
      <section
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: 'var(--space-6) var(--space-6) var(--space-7)',
        }}
      >
        <header style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
          <h2
            style={{
              fontSize: 'var(--text-h2)',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            4 個方案，按規模選
          </h2>
        </header>
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
              variant="default"
              testId={`tier-${t.name}`}
              style={
                t.popular
                  ? { borderColor: 'var(--accent-primary)', borderWidth: 2 }
                  : undefined
              }
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <h3 style={{ fontSize: 'var(--text-h4)', margin: 0 }}>{t.name}</h3>
                {t.popular && <Badge variant="accent" size="sm">熱門</Badge>}
              </div>
              <div
                style={{
                  fontSize: 'var(--text-h2)',
                  fontWeight: 700,
                  color: 'var(--accent-primary)',
                  marginBottom: 4,
                }}
              >
                {t.price}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-caption)' }}>{t.tag}</p>
            </Card>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 'var(--space-5)' }}>
          <Link href="/pricing">
            <Button variant="secondary" size="md">
              查看完整方案 →
            </Button>
          </Link>
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
          <Link href="/pricing" style={{ color: 'var(--text-link)' }}>方案</Link>
        </div>
        <div>© 2026 Beauty CRM · v0.4.0</div>
        <div style={{ marginTop: 4 }}>
          <Icon name="ShieldCheck" size={12} /> v1 單店單裝置，資料只留在你的裝置
        </div>
      </footer>
    </main>
  );
}
