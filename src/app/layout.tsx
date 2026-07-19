export const metadata = {
  title: 'Beauty CRM — 美業客戶長期管理',
  description: '記得客戶做過什麼、多久該回來、如何在不打擾下追蹤',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}