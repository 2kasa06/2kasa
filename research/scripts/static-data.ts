// 静的版のデータを public/static-data/ に書き出す（scripts/build-static.mjs から呼ぶ）。
//   stocks.json        検索用の銘柄一覧
//   bars/<code>.json   日足・日中足（指標とシグナルはブラウザで計算する）
import fs from 'node:fs/promises'
import path from 'node:path'
import { createMockProviders } from '../src/lib/providers/mock'
import type { StaticBarsFile } from '../src/lib/chart-client'

const OUT = path.resolve(import.meta.dirname, '../public/static-data')

async function main() {
  // 静的版はモックで作る（実データの提供元を足したら、ここを切り替える）
  const { market } = createMockProviders()
  const list = await market.listStocks()
  if (list.status !== 'ok') throw new Error('銘柄一覧を取得できませんでした')

  await fs.rm(OUT, { recursive: true, force: true })
  await fs.mkdir(path.join(OUT, 'bars'), { recursive: true })
  await fs.writeFile(
    path.join(OUT, 'stocks.json'),
    JSON.stringify(list.data.map((s) => ({ code: s.code, name: s.name, nameEn: s.nameEn, ticker: s.ticker, market: s.market }))),
  )

  let bytes = 0
  for (const stock of list.data) {
    const [daily, d1, w1] = await Promise.all([
      market.getHistory(stock.code, 'max'),
      market.getHistory(stock.code, '1d'),
      market.getHistory(stock.code, '1w'),
    ])
    if (daily.status !== 'ok' || d1.status !== 'ok' || w1.status !== 'ok') throw new Error(`${stock.code} の株価を取得できませんでした`)
    const file: StaticBarsFile = { source: daily.source, daily: daily.data, intraday: { '1d': d1.data, '1w': w1.data } }
    const body = JSON.stringify(file)
    bytes += body.length
    await fs.writeFile(path.join(OUT, 'bars', `${stock.code}.json`), body)
  }
  console.log(`静的データ: ${list.data.length}銘柄 ${(bytes / 1024 / 1024).toFixed(1)}MB`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
