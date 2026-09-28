// スクリーナーの集計。東証の国内株式全銘柄と米国の主要銘柄について、日足からシグナルを判定し
// src/data/screener.json に書き出す。GitHub Actions（research-screener.yml）が平日の引け後に実行する。
//   npx tsx --tsconfig tsconfig.json scripts/screener.ts [--limit 50]
import fs from 'node:fs/promises'
import path from 'node:path'
import jpStocks from '../src/data/jp-stocks.json'
import { fetchChart } from '../src/lib/providers/yahoo/client'
import { encodeScreener, screenStock, sortScreener, type ScreenerData, type ScreenerItem } from '../src/lib/screener'

const OUT = path.resolve(import.meta.dirname, '../src/data/screener.json')

// 米国の主要銘柄（時価総額の大きいもの）。増やすときはここに足す
const US: Array<[string, string]> = [
  ['AAPL', 'アップル'], ['MSFT', 'マイクロソフト'], ['NVDA', 'エヌビディア'], ['AMZN', 'アマゾン・ドット・コム'], ['GOOGL', 'アルファベット'],
  ['META', 'メタ・プラットフォームズ'], ['TSLA', 'テスラ'], ['AVGO', 'ブロードコム'], ['BRK-B', 'バークシャー・ハサウェイ'], ['JPM', 'JPモルガン・チェース'],
  ['V', 'ビザ'], ['MA', 'マスターカード'], ['LLY', 'イーライリリー'], ['UNH', 'ユナイテッドヘルス'], ['XOM', 'エクソンモービル'],
  ['WMT', 'ウォルマート'], ['COST', 'コストコ'], ['PG', 'P&G'], ['JNJ', 'ジョンソン・エンド・ジョンソン'], ['HD', 'ホーム・デポ'],
  ['ORCL', 'オラクル'], ['NFLX', 'ネットフリックス'], ['AMD', 'AMD'], ['CRM', 'セールスフォース'], ['ADBE', 'アドビ'],
  ['KO', 'コカ・コーラ'], ['PEP', 'ペプシコ'], ['DIS', 'ウォルト・ディズニー'], ['INTC', 'インテル'], ['QCOM', 'クアルコム'],
  ['TSM', 'TSMC（ADR）'], ['ASML', 'ASML'], ['PLTR', 'パランティア'], ['MU', 'マイクロン'], ['BA', 'ボーイング'],
]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const limitArg = process.argv.indexOf('--limit')
  const limit = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity

  const universe = [
    ...(jpStocks.rows as string[][])
      // 国内株式だけ（ETF・REIT・外国株は外す）
      .filter(([, , market]) => market === 'プライム' || market === 'スタンダード' || market === 'グロース')
      .map(([code, name, market, sector]) => ({ code, symbol: `${code}.T`, name, market: `東証${market}`, sector })),
    ...US.map(([code, name]) => ({ code, symbol: code, name, market: '米国', sector: '' })),
  ].slice(0, limit)

  console.log(`${universe.length}銘柄を集計します`)
  const items: ScreenerItem[] = []
  let failed = 0
  let cursor = 0
  // Yahoo を叩きすぎないよう、同時4本・少し間を空けて回す
  const worker = async () => {
    while (cursor < universe.length) {
      const s = universe[cursor++]
      const chart = await fetchChart(s.symbol, 'daily-2y')
      const item = chart ? screenStock({ code: s.code, name: s.name, market: s.market, sector: s.sector }, chart.bars) : null
      if (item) items.push(item)
      else failed++
      await sleep(120)
      if ((items.length + failed) % 250 === 0) console.log(`  ${items.length + failed}/${universe.length}（失敗 ${failed}）`)
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))

  // 大半が取れなかったときは書き換えない（前回の結果を残す）
  if (items.length < universe.length * 0.5) {
    console.error(`取得できた銘柄が少なすぎます（${items.length}/${universe.length}）。結果は保存しません`)
    process.exitCode = 1
    return
  }

  const data: ScreenerData = {
    generatedAt: new Date().toISOString(),
    source: 'Yahoo Finance の日足から集計（遅延あり）',
    scanned: universe.length,
    failed,
    items: sortScreener(items),
  }
  const body = JSON.stringify(encodeScreener(data))
  await fs.writeFile(OUT, body)
  console.log(`書き出し完了: ${items.length}銘柄（失敗 ${failed}）${(body.length / 1024 / 1024).toFixed(2)}MB`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
