/** @type {import('next').NextConfig} */
// 不使用 output: 'standalone'：`npm start`（next start）與 E2E 的 webServer 都需要一般輸出。
const nextConfig = {
  turbopack: {},
};

export default nextConfig;
