import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // リポジトリ直下にも別アプリの package-lock.json があるので、このアプリの場所を明示する
  turbopack: { root: path.resolve(import.meta.dirname) },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ]
  },
}

export default nextConfig
