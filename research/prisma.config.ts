// Prisma 7 の設定。接続先は環境変数 DATABASE_URL から読む（.env があれば読み込む）。
import { defineConfig } from 'prisma/config'

try {
  process.loadEnvFile('.env')
} catch {
  // .env が無い環境（CI・本番）では、環境変数がそのまま使われる
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
})
