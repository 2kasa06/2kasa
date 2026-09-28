import { Change } from '../change'
import { SourceNote } from '../source-note'
import { Badge } from '../ui/badge'
import { fmtMillions, fmtNumber, fmtPct, fmtPrice } from '@/lib/format'
import type { Valuation } from '@/lib/services/stock'
import type { DataResult, Quote, SourceInfo, Stock } from '@/lib/types'

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="tabular truncate text-sm font-semibold" title={note}>
        {value}
      </dd>
    </div>
  )
}

export function StockHeader({ stock, quote, valuation, source }: { stock: Stock; quote: DataResult<Quote>; valuation: Valuation; source: SourceInfo }) {
  const digits = stock.currency === 'USD' ? 2 : 0
  return (
    <header className="rounded-lg border bg-card px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular font-semibold text-foreground">{stock.code}</span>
            <Badge variant="outline">{stock.market}</Badge>
            <span>{stock.sector}</span>
            <span>·</span>
            <span>{stock.industry}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{stock.name}</h1>
          <p className="text-xs text-muted-foreground">{stock.nameEn}</p>
        </div>
        <div className="text-right">
          {quote.status === 'ok' ? (
            <>
              <div className="tabular text-3xl font-bold">{fmtPrice(quote.data.price, stock.currency)}</div>
              <Change change={quote.data.change} pct={quote.data.changePct} digits={digits} className="text-sm" />
            </>
          ) : (
            <div className="text-sm text-down">株価: データ取得失敗</div>
          )}
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-x-4 gap-y-3 border-t pt-3 sm:grid-cols-6">
        <Metric label="時価総額" value={fmtMillions(valuation.marketCap, stock.currency)} />
        <Metric label="PER（実績・直近4四半期）" value={valuation.per !== null ? `${fmtNumber(valuation.per, 1)}倍` : '—'} note={valuation.per === null ? 'EPSが0以下または不明' : undefined} />
        <Metric label="PBR" value={valuation.pbr !== null ? `${fmtNumber(valuation.pbr, 2)}倍` : '—'} />
        <Metric label="配当利回り（直近通期）" value={fmtPct(valuation.dividendYield, 2, false)} />
        <Metric label="EPS（直近4四半期）" value={valuation.epsTtm !== null ? fmtNumber(valuation.epsTtm, 1) : '—'} />
        <Metric label="出来高" value={quote.status === 'ok' ? fmtNumber(quote.data.volume) : '—'} />
      </dl>
      <SourceNote source={quote.status === 'ok' ? quote.source : source} className="mt-3" label="株価" />
    </header>
  )
}
