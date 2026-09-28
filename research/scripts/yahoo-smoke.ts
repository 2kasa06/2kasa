// Yahoo からの取得が実際に動くかを確かめる（GitHub Actions で実行。手元は外に出られないことがある）
//   npx tsx scripts/yahoo-smoke.ts
import { createYahooProviders } from '../src/lib/providers/yahoo'
import { analyzeSignals } from '../src/lib/technical/signals'

async function main() {
  const { market } = createYahooProviders()
  let failures = 0
  const check = (label: string, ok: boolean, detail: string) => {
    console.log(`${ok ? '✓' : '×'} ${label}: ${detail}`)
    if (!ok) failures++
  }

  for (const code of ['7203', '6758', 'AAPL']) {
    const s = await market.getStock(code)
    const h = await market.getHistory(code, 'max')
    const d = await market.getHistory(code, '1d')
    const q = await market.getQuote(code)
    const bars = h.status === 'ok' ? h.data : []
    const signals = bars.length > 30 ? analyzeSignals(bars).current.filter((x) => x.active).map((x) => x.label) : []
    check(
      code,
      s.status === 'ok' && bars.length > 1000 && q.status === 'ok',
      `${s.status === 'ok' ? s.data.name : s.status} / 日足${bars.length}本 ${bars[0]?.time}〜${bars.at(-1)?.time} / 日中${d.status === 'ok' ? d.data.length : d.status}本 / ` +
        `終値 ${q.status === 'ok' ? q.data.price : q.status} / シグナル ${signals.slice(0, 4).join('、')}`,
    )
  }
  for (const query of ['トヨタ', 'toyota', 'apple', 'nvda']) {
    const r = await market.searchStocks(query, 5)
    check(`検索「${query}」`, r.status === 'ok' && r.data.length > 0, r.status === 'ok' ? r.data.map((s) => `${s.code} ${s.name}`).join(' / ') : r.status)
  }
  const idx = await market.getIndices()
  check('指数', idx.status === 'ok' && idx.data.length >= 10, idx.status === 'ok' ? idx.data.map((x) => `${x.name} ${x.value.toFixed(2)}`).join(' / ') : idx.status)
  if (failures) process.exitCode = 1
}

main()
