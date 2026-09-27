import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { DataState } from '@/components/data-state'
import { SourceNote } from '@/components/source-note'
import { Earnings } from '@/components/stock/earnings'
import { EventList } from '@/components/stock/event-list'
import { Financials } from '@/components/stock/financials'
import { IrList } from '@/components/stock/ir-list'
import { NewsList } from '@/components/stock/news-list'
import { PriceChart } from '@/components/stock/price-chart'
import { SignalPanel } from '@/components/stock/signal-panel'
import { StatusSummary } from '@/components/stock/status-summary'
import { StockHeader } from '@/components/stock/stock-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/components/ui/utils'
import { getProviders } from '@/lib/providers'
import { getStockPageData } from '@/lib/services/stock'
import type { SourceInfo } from '@/lib/types'

// 株価は数分、財務は四半期ごとにしか変わらない。ページは5分ごとに作り直す
export const revalidate = 300

type Props = { params: Promise<{ code: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  const stock = await getProviders().market.getStock(decodeURIComponent(code))
  if (stock.status !== 'ok') return { title: '銘柄が見つかりません' }
  const s = stock.data
  const title = `${s.name}（${s.code}）株価・決算・IR・ニュース・テクニカル分析`
  return {
    title: { absolute: `${title}｜投資リサーチ` },
    description: `${s.name}（${s.code}・${s.market}）の株価チャート、テクニカル条件、IR、最新ニュース、決算、財務を一画面で確認できます。`,
    alternates: { canonical: `/stocks/${s.code}` },
  }
}

function Section({ id, title, badge, source, className, children }: { id: string; title: string; badge?: ReactNode; source?: SourceInfo | null; className?: string; children: ReactNode }) {
  return (
    <Card id={id} className={cn("scroll-mt-20", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">{badge}</div>
      </CardHeader>
      <CardContent>
        {children}
        {source && <SourceNote source={source} className="mt-3 border-t pt-2" />}
      </CardContent>
    </Card>
  )
}

const src = (r: { status: string; source?: SourceInfo }) => (r.status === 'ok' ? (r.source ?? null) : null)

export default async function StockPage({ params }: Props) {
  const { code } = await params
  const query = decodeURIComponent(code)
  const data = await getStockPageData(query)
  if (!data) {
    // /stocks/toyota のように名称で来た場合、候補が1つに絞れればその銘柄へ
    const hits = await getProviders().market.searchStocks(query, 2)
    if (hits.status === 'ok' && hits.data.length === 1) redirect(`/stocks/${hits.data[0].code}`)
    notFound()
  }
  const { stock, quote, valuation, signals, ir, news, financials, earnings, events, summary } = data

  return (
    <div className="space-y-4">
      <StockHeader stock={stock} quote={quote} valuation={valuation} source={data.stockSource} />
      <StatusSummary summary={summary} activeCount={signals.status === 'ok' ? signals.data.activeCount : null} />

      {/* 並び順: PC は 指示書40（IR → ニュース）、スマホは 指示書45（ニュース → IR） */}
      <div className="flex flex-col gap-4">
        <section id="chart" className="order-1">
          <Card>
            <CardHeader>
              <CardTitle>株価チャート</CardTitle>
            </CardHeader>
            <CardContent>
              <PriceChart key={stock.code} code={stock.code} currency={stock.currency} />
            </CardContent>
          </Card>
        </section>

        <Section id="signals" title="テクニカルシグナル" className="order-2" source={src(signals)}>
          <DataState result={signals}>{(b) => <SignalPanel bundle={b} />}</DataState>
        </Section>

        <Section id="ir" title="IR・適時開示" className="order-4 lg:order-3" source={src(ir)} badge={<span className="text-[11px] text-muted-foreground">新しい順</span>}>
          <DataState result={ir} emptyText="開示はありません">{(docs) => <IrList docs={docs} />}</DataState>
        </Section>

        <Section id="news" title="最新ニュース" className="order-3 lg:order-4" source={src(news)} badge={<span className="text-[11px] text-muted-foreground">同じ出来事の報道はまとめて表示</span>}>
          <DataState result={news} emptyText="ニュースはありません">{(groups) => <NewsList groups={groups} />}</DataState>
        </Section>

        <Section id="earnings" title="決算" className="order-5" source={src(earnings)}>
          <DataState result={earnings}>
            {(reports) => <Earnings reports={reports} financials={financials.status === 'ok' ? financials.data : []} currency={stock.currency} />}
          </DataState>
        </Section>

        <Section id="financials" title="財務" className="order-6" source={src(financials)} badge={<span className="text-[11px] text-muted-foreground">単位: {stock.currency === 'USD' ? '百万ドル' : '百万円'}を換算表示</span>}>
          <DataState result={financials}>{(rows) => <Financials data={rows} currency={stock.currency} sharesOutstanding={stock.sharesOutstanding} />}</DataState>
        </Section>

        <Section id="events" title="今後のイベント（60日）" className="order-7" source={src(events)}>
          <DataState result={events} emptyText="予定はありません">{(list) => <EventList events={list} />}</DataState>
        </Section>

        <Section
          id="ai"
          title="AIリサーチ"
          className={cn('order-8')}
          badge={
            <Badge variant="ai">
              <Sparkles className="size-3" aria-hidden />
              AI生成
            </Badge>
          }
        >
          <p className="text-sm text-muted-foreground">
            IR・ニュース・財務・株価・テクニカル・業界・マクロを材料に「現在の状況」「確認すべきリスク」などを AI が整理する欄です（PHASE 5 で実装予定）。
            出力には材料にした情報源を必ず付け、売買の推奨はしません。
          </p>
        </Section>
      </div>
    </div>
  )
}
