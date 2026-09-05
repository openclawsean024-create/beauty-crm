import type { Metadata } from 'next';
import { Noto_Sans_TC } from 'next/font/google';

// v0.4.0：Noto Sans TC 從 Google Fonts CDN（next/font 自動 self-host，
// 達到 spec「從 Google Fonts CDN」意圖但避免 runtime FOUT，無新 dep）
const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sans-tc',
});

export const metadata: Metadata = {
  title: 'Beauty CRM — 美業客戶長期管理',
  description: '記得客戶做過什麼、多久該回來、如何在不打擾下追蹤',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" className={notoSansTC.variable}>
      <body>{children}</body>
    </html>
  );
}
