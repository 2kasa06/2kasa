import path from 'node:path'
import type { NextConfig } from 'next'

// 静的版（GitHub Pages 用）。scripts/build-static.mjs が環境変数を付けてビルドする
const isStatic = process.env.NEXT_PUBLIC_STATIC_EXPORT === '1'

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
]

const nextConfig: NextConfig = {
  // リポジトリ直下にも別アプリの package-lock.json があるので、このアプリの場所を明示する
  turbopack: { root: path.resolve(import.meta.dirname) },
  poweredByHeader: false,
  ...(isStatic
    ? {
        output: 'export',
        basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
        // GitHub Pages で /stocks/7203/ を index.html として配信させる
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        // 静的版ではヘッダーを付けられない（配信側の設定になる）
        async headers() {
          return [{ source: '/:path*', headers: securityHeaders }]
        },
      }),
}

export default nextConfig
