import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Change } from '@/components/change'
import { DataState } from '@/components/data-state'
import { SignalChip } from '@/components/stock/signal-chip'
import { SourceNote } from '@/components/source-note'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/components/ui/utils'
import { fmtDateTime, fmtNumber, fmtPrice } from '@/lib/format'
import { getMarketOverview, marketFacts } from '@/lib/services/market'
import type { IndexQuote } from '@/lib/types'

// 値は数分単位でしか変わらないので、5分ごとに作り直す
export const revalidate = 300

const GROUP_ORDER: IndexQuote['group'][] = ['日本', '米国', '為替・金利', '商品', 'ボラティリティ', '暗号資産']

function IndexCard({ q }: { q: IndexQuote }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-1 text-xs text-muted-foreground">
        <span className="truncate">{q.name}</span>
        <span className="shrink-0 text-[10px]">{q.group}</span>
      </div>
      <div className="tabular mt-0.5 text-lg font-semibold">
        {fmtNumber(q.value, q.digits)}
        {q.unit && <span className="ml-0.5 text-xs font-normal text-muted-foreground">{q.unit}</span>}
      </div>
      <Change change={q.change} pct={q.changePct} digits={q.digits} className="text-xs" />
      <div className="mt-1 text-[10px] text-muted-foreground">更新 {fmtDateTime(q.time)}</div>
    </div>
  )
}

export default async function Home() {
  const { indices, rows, rowsSource } = await getMarketOverview()

  return (
    <div className="space-y-6">
      <section aria-labelledby="summary-title">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h1 id="summary-title" className="text-xl font-bold tracking-tight">
            市場サマリー
          </h1>
          {indices.status === 'ok' && <SourceNote source={indices.source} label="指数" />}
        </div>
        <DataState result={indices}>
          {(data) => (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
              {[...data]
                .sort((x, y) => GROUP_ORDER.indexOf(x.group) - GROUP_ORDER.indexOf(y.group))
                .map((q) => (
                  <IndexCard key={q.id} q={q} />
                ))}
            </div>
          )}
        </DataState>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>今日の市場環境</CardTitle>
            <Badge variant="outline">事実：市場データから自動生成</Badge>
          </CardHeader>
          <CardContent>
            <DataState result={indices}>
              {(data) => (
                <dl className="divide-y text-sm">
                  {marketFacts(data).map((f) => (
                    <div key={f.area} className="grid grid-cols-[6.5rem_1fr] gap-2 py-2">
                      <dt className="font-medium">{f.area}</dt>
                      <dd className={cn('text-muted-foreground', f.tone === 'up' && 'text-foreground')}>{f.text}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </DataState>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI による市場の整理</CardTitle>
            <Badge variant="ai">
              <Sparkles className="size-3" aria-hidden />
              AI生成
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              市場データとニュースを材料に、AI が要約・解釈を行う欄です（PHASE 5 で実装予定）。
              AI の文章には必ず材料にした情報源を付け、事実欄と分けて表示します。
            </p>
            <p className="text-xs">現在は AI を使っていないため、表示する内容はありません。</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>銘柄一覧と検出中のテクニカル条件</CardTitle>
          <SourceNote source={rowsSource} label="株価" />
        </CardHeader>
        <CardContent className="overflow-x-auto px-0 sm:px-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="px-4 py-2 font-medium sm:px-5">銘柄</th>
                <th className="px-2 py-2 text-right font-medium">株価</th>
                <th className="px-2 py-2 text-right font-medium">前日比</th>
                <th className="px-4 py-2 font-medium sm:px-5">直近10営業日に発生し、現在も成立している条件</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ stock, quote, signals }) => (
                <tr key={stock.code} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-2 sm:px-5">
                    <Link href={`/stocks/${stock.code}`} className="flex items-baseline gap-2 hover:underline">
                      <span className="tabular w-12 shrink-0 font-semibold">{stock.code}</span>
                      <span className="truncate">{stock.name}</span>
                    </Link>
                  </td>
                  <td className="tabular px-2 py-2 text-right">{quote ? fmtPrice(quote.price, stock.currency) : 'データ取得失敗'}</td>
                  <td className="px-2 py-2 text-right">{quote ? <Change pct={quote.changePct} className="text-xs" /> : '—'}</td>
                  <td className="px-4 py-2 sm:px-5">
                    <div className="flex flex-wrap gap-1">
                      {signals.length === 0 && <span className="text-xs text-muted-foreground">なし</span>}
                      {signals.slice(0, 4).map((s) => (
                        <SignalChip key={s.id} signal={s} />
                      ))}
                      {signals.length > 4 && <span className="text-xs text-muted-foreground">ほか{signals.length - 4}件</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
