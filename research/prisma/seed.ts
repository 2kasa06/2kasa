// モックデータを DB に入れる。実データの取り込み処理を作るまでの開発用。
//   npm run db:seed
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, type FiscalPeriod, type IrImportance, type Sentiment, type SignalStrength, type SignalTone } from '../src/generated/prisma/client'
import { generateEarnings, generateFinancials, generateIrDocuments, generateMarketEvents, generateNews } from '../src/lib/providers/mock/content'
import { generateDailyBars, generateIndices } from '../src/lib/providers/mock/prices'
import { latestSessionDate } from '../src/lib/providers/mock/random'
import { MOCK_STOCKS } from '../src/lib/providers/mock/stocks'
import { backtestAll } from '../src/lib/technical/backtest'
import { analyzeSignals } from '../src/lib/technical/signals'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL を設定してください（例: postgresql://postgres@localhost:5432/research）')

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })
const SOURCE = 'サンプルデータ'
const asDate = (key: string) => new Date(`${key.slice(0, 10)}T00:00:00Z`)

async function main() {
  const asOf = latestSessionDate()
  for (const spec of MOCK_STOCKS) {
    const stock = await db.stock.upsert({
      where: { code: spec.code },
      create: {
        code: spec.code, name: spec.name, nameEn: spec.nameEn, ticker: spec.ticker, market: spec.market, sector: spec.sector,
        industry: spec.industry, currency: spec.currency, sharesOutstanding: BigInt(spec.sharesOutstanding), peers: spec.peers, source: SOURCE,
      },
      update: { name: spec.name, peers: spec.peers, source: SOURCE },
    })

    const bars = generateDailyBars(spec, asOf)
    for (let i = 0; i < bars.length; i += 1000) {
      await db.stockPrice.createMany({
        data: bars.slice(i, i + 1000).map((b) => ({
          stockId: stock.id, interval: 'DAY' as const, time: asDate(String(b.time)),
          open: b.open, high: b.high, low: b.low, close: b.close, volume: BigInt(b.volume), source: SOURCE,
        })),
        skipDuplicates: true,
      })
    }

    const { history } = analyzeSignals(bars)
    await db.technicalSignal.createMany({
      data: history.map((s) => ({
        stockId: stock.id, type: s.type, kind: s.kind, label: s.label, date: asDate(s.date),
        tone: s.tone.toUpperCase() as SignalTone, strength: s.strength.toUpperCase() as SignalStrength,
        condition: s.condition, values: s.values, active: s.active,
      })),
      skipDuplicates: true,
    })

    const backtests = backtestAll(bars, [...history].reverse())
    for (const r of Object.values(backtests)) {
      for (const h of r.stats) {
        await db.backtestResult.upsert({
          where: { stockId_signalType_horizon: { stockId: stock.id, signalType: r.type, horizon: h.horizon } },
          create: { stockId: stock.id, signalType: r.type, horizon: h.horizon, samples: h.samples, mean: h.mean, median: h.median, max: h.max, min: h.min, upRatio: h.upRatio, periodFrom: asDate(r.from), periodTo: asDate(r.to) },
          update: { samples: h.samples, mean: h.mean, median: h.median, max: h.max, min: h.min, upRatio: h.upRatio, periodTo: asDate(r.to) },
        })
      }
    }

    await db.financial.createMany({
      data: generateFinancials(spec, asOf).map((f) => ({ ...f, stockId: stock.id, period: f.period as FiscalPeriod, periodEnd: asDate(f.periodEnd), source: SOURCE })),
      skipDuplicates: true,
    })

    await db.earning.createMany({
      data: generateEarnings(spec, asOf).map((e) => ({
        stockId: stock.id, fiscalYear: e.fiscalYear, period: e.period as FiscalPeriod, announcedAt: new Date(e.announcedAt),
        scheduledAt: e.nextAnnouncement ? asDate(e.nextAnnouncement) : null,
        actual: e.actual, companyForecast: e.companyForecast, consensus: e.consensus, consensusSource: e.consensus ? SOURCE : null, source: SOURCE,
      })),
      skipDuplicates: true,
    })

    await db.irDocument.createMany({
      data: generateIrDocuments(spec, asOf).map((d) => ({
        stockId: stock.id, type: d.type, title: d.title, publishedAt: new Date(d.publishedAt),
        importance: d.importance.toUpperCase() as IrImportance, importanceReason: d.importanceReason, aiClassified: d.aiClassified,
        summary: d.summary ?? [], sourceUrl: d.sourceUrl, sourceName: d.sourceName,
      })),
      skipDuplicates: true,
    })

    for (const n of generateNews(spec, asOf)) {
      const news = await db.news.upsert({
        where: { url: n.url },
        create: { title: n.title, url: n.url, media: n.media, publishedAt: new Date(n.publishedAt), summary: n.summary, category: n.category, sentiment: n.sentiment?.toUpperCase() as Sentiment | undefined, aiClassified: true },
        update: {},
      })
      for (const code of n.relatedCodes) {
        const related = await db.stock.findUnique({ where: { code } })
        if (related) await db.newsStockRelation.upsert({ where: { newsId_stockId: { newsId: news.id, stockId: related.id } }, create: { newsId: news.id, stockId: related.id }, update: {} })
      }
    }
    console.log(`  ${spec.code} ${spec.name}: 株価 ${bars.length}本・シグナル ${history.length}件`)
  }

  const from = new Date(asOf.getTime() - 30 * 86_400_000)
  const to = new Date(asOf.getTime() + 90 * 86_400_000)
  // 予定は一意キーが無いので、入れ直す前にサンプルの分を消す（何度流しても重複しない）
  await db.event.deleteMany({ where: { source: SOURCE } })
  await db.event.createMany({ data: generateMarketEvents(from, to).map((e) => ({ date: asDate(e.date), title: e.title, kind: e.kind, source: SOURCE })) })
  await db.marketIndex.createMany({
    data: generateIndices(asOf).map((q) => ({ indexId: q.id, name: q.name, time: new Date(q.time), value: q.value, previousClose: q.previousClose, source: SOURCE })),
    skipDuplicates: true,
  })
}

main()
  .then(() => console.log('シード完了'))
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
