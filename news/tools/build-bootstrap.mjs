// 中身がまだ無いときに見せる画面を作る。
//
// site/ が空だと、更新ボタンごと存在しない画面になってしまう。
// それでは最初の一回を始められないので、記事0件の画面を先に焼いておき、
// gate.php がそれを返す。焼き方は本番と同じ描画器なので、
// 見た目もローディング画面も更新ボタンも本番とそろう。

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderIndex } from '../lib/render.mjs'
import { buildStats } from '../lib/stats.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(HERE, '../../server/public/bootstrap.html')

const status = []
const meta = {
  updatedAt: new Date(0).toISOString(),
  engine: 'まだ収集していません',
  sourcesOk: 0,
  sourcesTotal: 0,
  totalArticles: 0,
  recentArticles: 0,
  freshArticles: 0,
  status,
}
const stats = buildStats({ recent: [], archived: [], status, freshCount: 0 })

const html = renderIndex({ articles: [], digest: [], status, meta, stats })

await fs.mkdir(path.dirname(OUT), { recursive: true })
await fs.writeFile(OUT, html, 'utf8')
console.log(`書き出しました: ${path.relative(process.cwd(), OUT)} (${html.length} 文字)`)
