// モックの IR・ニュース・財務・決算・イベント。
// 見出しも数値も開発用の作り物。リンク先は example.com で、実在の記事や開示ではない。

import { classifyIr } from '@/lib/analysis/ir-classify'
import type {
  EarningsReport,
  FinancialStatement,
  FiscalPeriod,
  IrDocument,
  IrType,
  MarketEvent,
  NewsArticle,
  NewsCategory,
  Sentiment,
} from '@/lib/types'
import { addDays, createRandom, hashString, isWeekday, latestSessionDate, toDateKey } from './random'
import type { MockStockSpec } from './stocks'

const SAMPLE_MEDIA = ['サンプル経済新聞', 'モック通信', 'デモ・マーケット', 'テスト日報', 'Sample Business']

/** 日付と日本時間の時刻から ISO 文字列を作る */
function at(d: Date, hourJst: number, minute = 0): string {
  const utc = new Date(d.getTime() + (hourJst - 9) * 3600_000 + minute * 60_000)
  return utc.toISOString()
}

function prevWeekday(d: Date): Date {
  let x = d
  while (!isWeekday(x)) x = addDays(x, -1)
  return x
}

function nextWeekday(d: Date): Date {
  let x = d
  while (!isWeekday(x)) x = addDays(x, 1)
  return x
}

// --- 財務 -------------------------------------------------------------

interface QuarterSlot {
  fiscalYear: number
  period: Exclude<FiscalPeriod, 'FY'>
  end: Date
}

function lastDayOfMonth(year: number, month1: number): Date {
  return new Date(Date.UTC(year, month1, 0))
}

/** 決算発表の目安（期末から40日後の平日。通期は45日後） */
function announceDate(q: QuarterSlot): Date {
  return nextWeekday(addDays(q.end, q.period === 'Q4' ? 45 : 40))
}

/** 期末月から数えた月末日（delta は月数） */
function monthEnd(year: number, month1: number, delta: number): Date {
  return lastDayOfMonth(year, month1 + delta)
}

/** 四半期末日から、会計年度（期末の年）と Q1〜Q4 を求める */
function quarterOf(spec: MockStockSpec, end: Date): QuarterSlot {
  const monthsAfterFyEnd = (end.getUTCMonth() + 1 - spec.fiscalYearEndMonth + 12) % 12
  const period = (monthsAfterFyEnd === 0 ? 'Q4' : `Q${monthsAfterFyEnd / 3}`) as QuarterSlot['period']
  const fyEnd = monthEnd(end.getUTCFullYear(), end.getUTCMonth() + 1, (12 - monthsAfterFyEnd) % 12)
  return { fiscalYear: fyEnd.getUTCFullYear(), period, end }
}

/** asOf 時点で発表済みの四半期を、古い順に count 件 */
function announcedQuarters(spec: MockStockSpec, asOf: Date, count: number): QuarterSlot[] {
  const slots: QuarterSlot[] = []
  // 来年度の期末から3ヶ月ずつ遡る
  const startYear = asOf.getUTCFullYear() + 1
  for (let k = 0; slots.length < count; k++) {
    const q = quarterOf(spec, monthEnd(startYear, spec.fiscalYearEndMonth, -3 * k))
    if (announceDate(q).getTime() <= asOf.getTime()) slots.push(q)
  }
  return slots.reverse()
}

export function generateFinancials(spec: MockStockSpec, asOf: Date = latestSessionDate()): FinancialStatement[] {
  const rand = createRandom(hashString(`fin:${spec.code}`))
  const quarters = announcedQuarters(spec, asOf, 24)
  const growth = rand.range(0.02, 0.12)
  const payout = rand.range(0.25, 0.4)

  const out: FinancialStatement[] = []
  let equity = spec.revenueBase * rand.range(0.5, 0.9)
  const q0 = quarters.length
  quarters.forEach((q, i) => {
    const yearsFromNow = (i - q0 + 1) / 4
    const revenue = (spec.revenueBase / 4) * Math.pow(1 + growth, yearsFromNow) * (1 + 0.04 * rand.normal())
    const margin = Math.max(0.005, spec.opMargin * (1 + 0.12 * rand.normal()))
    const operatingIncome = revenue * margin
    const ordinaryIncome = operatingIncome * rand.range(1.02, 1.15)
    const netIncome = ordinaryIncome * rand.range(0.65, 0.75)
    const eps = (netIncome * 1e6) / spec.sharesOutstanding
    const dividendPerShare = q.period === 'Q2' || q.period === 'Q4' ? (eps * 4 * payout) / 2 : 0
    const buyback = rand.next() < 0.3 ? netIncome * rand.range(0.2, 0.6) : 0
    equity += netIncome - (dividendPerShare * spec.sharesOutstanding) / 1e6 - buyback
    out.push({
      fiscalYear: q.fiscalYear,
      period: q.period,
      periodEnd: toDateKey(q.end),
      revenue,
      operatingIncome,
      ordinaryIncome,
      netIncome,
      eps,
      bps: (equity * 1e6) / spec.sharesOutstanding,
      totalAssets: equity * rand.range(2.2, 2.6),
      equity,
      interestBearingDebt: equity * rand.range(0.5, 0.8),
      cash: equity * rand.range(0.25, 0.35),
      operatingCashFlow: netIncome * rand.range(1.1, 1.6),
      investingCashFlow: -netIncome * rand.range(0.5, 0.9),
      dividendPerShare,
      buyback,
    })
  })

  // 通期（FY）は4四半期がそろった年度だけ作る
  const years = [...new Set(out.map((s) => s.fiscalYear))]
  const annual: FinancialStatement[] = []
  for (const fy of years) {
    const qs = out.filter((s) => s.fiscalYear === fy)
    if (qs.length !== 4) continue
    const sum = (k: keyof FinancialStatement) => qs.reduce((acc, s) => acc + (s[k] as number), 0)
    const q4 = qs.find((s) => s.period === 'Q4')!
    annual.push({
      ...q4,
      period: 'FY',
      revenue: sum('revenue'),
      operatingIncome: sum('operatingIncome'),
      ordinaryIncome: sum('ordinaryIncome'),
      netIncome: sum('netIncome'),
      eps: sum('eps'),
      operatingCashFlow: sum('operatingCashFlow'),
      investingCashFlow: sum('investingCashFlow'),
      dividendPerShare: sum('dividendPerShare'),
      buyback: sum('buyback'),
    })
  }
  return [...annual, ...out].sort((a, b) => a.periodEnd.localeCompare(b.periodEnd) || (a.period === 'FY' ? 1 : -1))
}

export function generateEarnings(spec: MockStockSpec, asOf: Date = latestSessionDate()): EarningsReport[] {
  const rand = createRandom(hashString(`earn:${spec.code}`))
  const fin = generateFinancials(spec, asOf)
  const quarters = fin.filter((f) => f.period !== 'FY').slice(-8)
  const pick = (s: FinancialStatement) => ({
    revenue: s.revenue,
    operatingIncome: s.operatingIncome,
    netIncome: s.netIncome,
    eps: s.eps,
  })
  const reports: EarningsReport[] = quarters.map((q) => {
    const slot = quarterOf(spec, new Date(`${q.periodEnd}T00:00:00Z`))
    const fyActual = fin.filter((f) => f.fiscalYear === q.fiscalYear && f.period !== 'FY')
    const scale = 4 / Math.max(1, fyActual.length)
    const noise = () => 1 + 0.05 * rand.normal()
    const forecastBase = {
      revenue: fyActual.reduce((a, s) => a + s.revenue, 0) * scale,
      operatingIncome: fyActual.reduce((a, s) => a + s.operatingIncome, 0) * scale,
      netIncome: fyActual.reduce((a, s) => a + s.netIncome, 0) * scale,
      eps: fyActual.reduce((a, s) => a + s.eps, 0) * scale,
    }
    return {
      fiscalYear: q.fiscalYear,
      period: q.period,
      announcedAt: at(announceDate(slot), 15, 0),
      actual: pick(q),
      companyForecast: {
        revenue: forecastBase.revenue * noise(),
        operatingIncome: forecastBase.operatingIncome * noise(),
        netIncome: forecastBase.netIncome * noise(),
        eps: forecastBase.eps * noise(),
      },
      consensus: {
        revenue: q.revenue * noise(),
        operatingIncome: q.operatingIncome * (1 + 0.08 * rand.normal()),
        netIncome: q.netIncome * (1 + 0.08 * rand.normal()),
        eps: q.eps * (1 + 0.08 * rand.normal()),
      },
    } satisfies EarningsReport
  })
  // 次回の発表予定
  const last = quarters[quarters.length - 1]
  if (last) {
    const lastEnd = new Date(`${last.periodEnd}T00:00:00Z`)
    const next = quarterOf(spec, monthEnd(lastEnd.getUTCFullYear(), lastEnd.getUTCMonth() + 1, 3))
    reports[reports.length - 1].nextAnnouncement = toDateKey(announceDate(next))
  }
  return reports
}

// --- IR ---------------------------------------------------------------

interface IrSeed {
  daysAgo: number
  type: IrType
  title: string
  summary?: [string, string, string]
}

function fyLabel(spec: MockStockSpec, fiscalYear: number): string {
  return `${fiscalYear}年${spec.fiscalYearEndMonth}月期`
}

function irSeeds(spec: MockStockSpec, asOf: Date): IrSeed[] {
  const earnings = generateEarnings(spec, asOf)
  const latest = earnings[earnings.length - 1]
  const latestDaysAgo = latest ? Math.round((asOf.getTime() - new Date(latest.announcedAt).getTime()) / 86_400_000) : 50
  const fy = latest ? fyLabel(spec, latest.fiscalYear) : ''
  const q = latest?.period === 'Q4' ? '通期' : `第${latest?.period.slice(1)}四半期`

  const common: IrSeed[] = [
    {
      daysAgo: latestDaysAgo,
      type: '決算短信',
      title: `${fy} ${q}決算短信（連結）`,
      summary: [
        `${q}の連結業績を発表（サンプル）。`,
        '売上高・営業利益の実績は「決算」欄の数値を参照。',
        '次回発表と通期見通しの進捗率に注目。',
      ],
    },
    { daysAgo: latestDaysAgo, type: '決算説明資料', title: `${fy} ${q} 決算説明資料` },
    { daysAgo: latestDaysAgo + 50, type: '有価証券報告書', title: '有価証券報告書（サンプル）' },
  ]

  if (spec.code !== '7203') {
    return [
      ...common,
      { daysAgo: 12, type: '新商品', title: `${spec.name}、新サービスの提供開始について（サンプル）` },
      { daysAgo: latestDaysAgo + 3, type: '配当', title: '剰余金の配当に関するお知らせ（サンプル）' },
    ]
  }

  return [
    {
      daysAgo: 3,
      type: '業績予想修正',
      title: `${fy}通期業績予想の修正（上方修正）に関するお知らせ`,
      summary: [
        '通期の営業利益予想を従来から約8%引き上げた（サンプル）。',
        '為替の前提見直しと北米での販売台数増が主因と説明。',
        '原材料価格と関税の動向が下期の変動要因として挙げられている。',
      ],
    },
    {
      daysAgo: 3,
      type: '自社株買い',
      title: '自己株式取得に係る事項の決定に関するお知らせ',
      summary: [
        '発行済株式の約1.5%、上限3,000億円の自己株式取得を決議（サンプル）。',
        '取得期間は約6ヶ月。1株当たり利益の押し上げ要因となる。',
        '取得の進捗は月次の開示で確認できる。',
      ],
    },
    ...common,
    { daysAgo: 9, type: '新商品', title: '新型電気自動車（BEV）の国内発売について（サンプル）' },
    { daysAgo: 21, type: '人事', title: '執行役員の異動に関するお知らせ（サンプル）' },
    { daysAgo: latestDaysAgo + 1, type: '配当', title: '剰余金の配当（中間配当予想）に関するお知らせ' },
  ]
}

export function generateIrDocuments(spec: MockStockSpec, asOf: Date = latestSessionDate()): IrDocument[] {
  return irSeeds(spec, asOf)
    .map((seed, i) => {
      const date = prevWeekday(addDays(asOf, -seed.daysAgo))
      const { importance, reason } = classifyIr(seed)
      return {
        id: `${spec.code}-ir-${i}`,
        code: spec.code,
        type: seed.type,
        title: seed.title,
        publishedAt: at(date, 15, i % 4 * 5),
        importance,
        importanceReason: reason,
        aiClassified: false,
        summary: seed.summary,
        sourceUrl: `https://example.com/sample/ir/${spec.code}/${i}.pdf`,
        sourceName: 'サンプル（企業IR想定）',
      } satisfies IrDocument
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

// --- ニュース ---------------------------------------------------------

interface NewsSeed {
  daysAgo: number
  hour: number
  category: NewsCategory
  sentiment: Sentiment
  titles: string[]
  summary: string
}

function newsSeeds(spec: MockStockSpec): NewsSeed[] {
  const n = spec.name
  if (spec.code === '7203') {
    return [
      {
        daysAgo: 3, hour: 15, category: '決算', sentiment: 'positive',
        titles: [
          'トヨタ、通期営業益予想を上方修正　円安と北米販売が寄与',
          'トヨタ自動車が通期の営業利益予想を上方修正、北米販売と円安寄与',
          '【速報】トヨタ、通期営業利益予想を上方修正',
          'トヨタ 通期営業益予想を上方修正 北米販売好調と円安で',
          'トヨタ、営業益予想を上方修正　自社株買いも発表',
        ],
        summary: '通期の営業利益予想を引き上げた。為替前提の見直しと北米販売の増加が寄与したと説明（サンプル記事）。',
      },
      {
        daysAgo: 1, hour: 10, category: '商品', sentiment: 'neutral',
        titles: ['トヨタ、新型BEVを国内で発売　航続距離を大幅に延長', 'トヨタが新型EVを発売、航続距離を大幅延長'],
        summary: '新型の電気自動車を国内で発売した。価格帯と販売目標も公表（サンプル記事）。',
      },
      {
        daysAgo: 2, hour: 20, category: '規制', sentiment: 'review',
        titles: ['米政権、輸入車関税の見直しを検討　日本車メーカーに影響も'],
        summary: '米国で輸入車への関税見直しが議論されている。政治的な判断を含むため影響の評価は保留（サンプル記事）。',
      },
      {
        daysAgo: 5, hour: 9, category: '業界', sentiment: 'negative',
        titles: ['車載半導体の調達、一部で再びひっ迫　国内自動車各社が生産調整'],
        summary: '一部の車載半導体で調達が難しくなり、複数のメーカーが生産計画を見直している（サンプル記事）。',
      },
      {
        daysAgo: 4, hour: 15, category: '市場', sentiment: 'positive',
        titles: ['自動車株が軒並み高　円安進行で輸出採算の改善期待'],
        summary: '円安を受けて自動車株が買われた。トヨタは前日比で上昇（サンプル記事）。',
      },
      {
        daysAgo: 8, hour: 7, category: '海外', sentiment: 'positive',
        titles: ['トヨタ、北米の月間販売が前年比二桁増　ハイブリッドがけん引'],
        summary: '北米の販売台数が前年同月から二桁増えた。ハイブリッド車の比率が上昇（サンプル記事）。',
      },
    ]
  }
  return [
    {
      daysAgo: 2, hour: 15, category: '決算', sentiment: 'neutral',
      titles: [`${n}、四半期決算を発表　売上高は前年並み`, `${n}の四半期決算、売上高は前年同期並み`],
      summary: `${n}が四半期決算を発表した（サンプル記事）。`,
    },
    {
      daysAgo: 6, hour: 11, category: '業界', sentiment: 'neutral',
      titles: [`${spec.industry}業界、需要見通しに慎重論も`],
      summary: `${spec.industry}の需要見通しについて各社の見方が分かれている（サンプル記事）。`,
    },
    {
      daysAgo: 9, hour: 9, category: '経営', sentiment: 'positive',
      titles: [`${n}、中期経営計画で株主還元の強化を表明`],
      summary: '中期経営計画で総還元性向の目標を引き上げた（サンプル記事）。',
    },
  ]
}

export function generateNews(spec: MockStockSpec, asOf: Date = latestSessionDate()): NewsArticle[] {
  const out: NewsArticle[] = []
  newsSeeds(spec).forEach((seed, s) => {
    seed.titles.forEach((title, i) => {
      const date = addDays(asOf, -seed.daysAgo)
      out.push({
        id: `${spec.code}-news-${s}-${i}`,
        title,
        publishedAt: at(date, seed.hour, i * 17),
        media: SAMPLE_MEDIA[(s + i) % SAMPLE_MEDIA.length],
        url: `https://example.com/sample/news/${spec.code}/${s}-${i}`,
        summary: seed.summary,
        category: seed.category,
        relatedCodes: [spec.code, ...(seed.category === '業界' ? spec.peers.slice(0, 2) : [])],
        sentiment: seed.sentiment,
      })
    })
  })
  return out.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

// --- イベント ---------------------------------------------------------

function nthWeekdayOfMonth(year: number, month0: number, weekday: number, nth: number): Date {
  const first = new Date(Date.UTC(year, month0, 1))
  const offset = (weekday - first.getUTCDay() + 7) % 7
  return new Date(Date.UTC(year, month0, 1 + offset + (nth - 1) * 7))
}

/** 市場全体の予定（サンプル）。日付は実際の日程ではなく、よくある時期に置いた目安 */
export function generateMarketEvents(from: Date, to: Date): MarketEvent[] {
  const events: MarketEvent[] = []
  for (let m = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1)); m <= to; m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1))) {
    const y = m.getUTCFullYear()
    const mo = m.getUTCMonth()
    const ym = `${y}-${String(mo + 1).padStart(2, '0')}`
    events.push({ id: `nfp-${ym}`, date: toDateKey(nthWeekdayOfMonth(y, mo, 5, 1)), title: '米雇用統計（サンプル日程）', kind: '経済指標' })
    events.push({ id: `sq-${ym}`, date: toDateKey(nthWeekdayOfMonth(y, mo, 5, 2)), title: '日経225先物・オプションSQ（サンプル日程）', kind: 'SQ' })
    events.push({ id: `cpi-${ym}`, date: toDateKey(nextWeekday(new Date(Date.UTC(y, mo, 12)))), title: '米消費者物価指数（CPI・サンプル日程）', kind: '経済指標' })
    events.push({ id: `boj-${ym}`, date: toDateKey(nextWeekday(new Date(Date.UTC(y, mo, 29)))), title: '日銀金融政策決定会合（サンプル日程）', kind: '金融政策' })
    events.push({ id: `fomc-${ym}`, date: toDateKey(nextWeekday(new Date(Date.UTC(y, mo, 18)))), title: 'FOMC 結果発表（サンプル日程）', kind: '金融政策' })
    if (mo === 2 || mo === 8) {
      events.push({ id: `kenri-${ym}`, date: toDateKey(prevWeekday(lastDayOfMonth(y, mo + 1))), title: '3月・9月期末 配当権利確定日（サンプル）', kind: '権利確定' })
    }
  }
  return events.filter((e) => e.date >= toDateKey(from) && e.date <= toDateKey(to))
}
