#!/usr/bin/env node
// サーバ無しで動く静的版をビルドし、リポジトリの docs/research/ に置く（GitHub Pages 用）。
//
//   npm run build:static
//
// 静的版では API（Route Handlers）が使えないので、ビルドの間だけ src/app/api を
// src/app/_api に退避する（_ で始まるフォルダはルーティングの対象外）。終わったら必ず戻す。
// チャートの指標とシグナルは、書き出した株価の JSON からブラウザで計算する。

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const API = path.join(ROOT, 'src/app/api')
const PARKED = path.join(ROOT, 'src/app/_api')
const OUT = path.join(ROOT, 'out')
const DEST = path.resolve(ROOT, process.env.STATIC_DEST ?? '../docs/research')
const BASE_PATH = process.env.STATIC_BASE_PATH ?? '/2kasa/research'

const run = (cmd, env = {}) => execSync(cmd, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } })

run('npx tsx scripts/static-data.ts')

if (fs.existsSync(PARKED)) throw new Error('src/app/_api が残っています。前回のビルドが途中で止まった可能性があるので、api に戻してください')
fs.renameSync(API, PARKED)
try {
  run('npx next build', { NEXT_PUBLIC_STATIC_EXPORT: '1', NEXT_PUBLIC_BASE_PATH: BASE_PATH })
} finally {
  fs.renameSync(PARKED, API)
  fs.rmSync(path.join(ROOT, 'public/static-data'), { recursive: true, force: true })
}

fs.rmSync(DEST, { recursive: true, force: true })
fs.cpSync(OUT, DEST, { recursive: true })
console.log(`書き出し完了: ${path.relative(path.resolve(ROOT, '..'), DEST)}/（配信パス ${BASE_PATH}/）`)
