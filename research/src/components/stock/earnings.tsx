import { fmtDate, fmtMillions, fmtNumber, fmtPct, toneOf } from '@/lib/format'
import type { EarningsReport, FinancialStatement } from '@/lib/types'
import { Badge } from '../ui/badge'
import { cn } from '../ui/utils'

type Key = 'revenue' | 'operatingIncome' | 'netIncome' | 'eps'
const ROWS: Array<{ key: Key; label: string }> = [
  { key: 'revenue', label: '売上高' },
  { key: 'operatingIncome', label: '営業利益' },
  { key: 'netIncome', label: '純利益' },
  { key: 'eps', label: 'EPS' },
]

const pct = (a: number | undefined, b: number | undefined) => (a === undefined || b === undefined || b === 0 ? null : ((a - b) / Math.abs(b)) * 100)

function Delta({ value }: { value: number | null }) {
  const t = toneOf(value)
  return <span className={cn('tabular', t === 'up' ? 'text-up' : t === 'down' ? 'text-down' : 'text-muted-foreground')}>{fmtPct(value, 1)}</span>
}

export function Earnings({ reports, financials, currency }: { reports: EarningsReport[]; financials: FinancialStatement[]; currency: 'JPY' | 'USD' }) {
  const latest = reports.at(-1)
  if (!latest) return null
  const quarters = financials.filter((f) => f.period !== 'FY')
  const idx = quarters.findIndex((q) => q.fiscalYear === latest.fiscalYear && q.period === latest.period)
  const cur = quarters[idx]
  const prevQ = quarters[idx - 1]
  const yoy = quarters[idx - 4]
  const val = (k: Key, v: number | undefined) => (v === undefined ? '—' : k === 'eps' ? fmtNumber(v, 1) : fmtMillions(v, currency))
  const margin = (f?: FinancialStatement) => (f ? (f.operatingIncome / f.revenue) * 100 : null)
  // 四半期累計に対する通期会社予想の進捗率
  const ytd = quarters.filter((q) => q.fiscalYear === latest.fiscalYear && q.periodEnd <= (cur?.periodEnd ?? ''))
  const progress = (k: Key) => {
    const fc = latest.companyForecast?.[k]
    if (!fc) return null
    return (ytd.reduce((a, q) => a + q[k], 0) / fc) * 100
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">
          {latest.fiscalYear}年{latest.period === 'FY' ? ' 通期' : ` ${latest.period}（3ヶ月）`}
        </span>
        <span className="text-xs text-muted-foreground">発表 {fmtDate(latest.announcedAt)}</span>
        {latest.nextAnnouncement && <Badge variant="primary">次回決算 {fmtDate(latest.nextAnnouncement)} 予定</Badge>}
      </div>
      <div className="overflow-x-auto">
        <table className="tabular w-full min-w-[640px] text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-1.5 text-left font-medium">項目</th>
              <th className="py-1.5 text-right font-medium">実績</th>
              <th className="py-1.5 text-right font-medium">前年同期比</th>
              <th className="py-1.5 text-right font-medium">前四半期比</th>
              <th className="py-1.5 text-right font-medium">市場予想</th>
              <th className="py-1.5 text-right font-medium">市場予想との差</th>
              <th className="py-1.5 text-right font-medium">通期会社予想</th>
              <th className="py-1.5 text-right font-medium">進捗率</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(({ key, label }) => (
              <tr key={key} className="border-b last:border-0">
                <td className="py-1.5">{label}</td>
                <td className="py-1.5 text-right font-medium">{val(key, latest.actual[key])}</td>
                <td className="py-1.5 text-right">
                  <Delta value={pct(cur?.[key], yoy?.[key])} />
                </td>
                <td className="py-1.5 text-right">
                  <Delta value={pct(cur?.[key], prevQ?.[key])} />
                </td>
                <td className="py-1.5 text-right text-muted-foreground">{latest.consensus ? val(key, latest.consensus[key]) : '取得不可'}</td>
                <td className="py-1.5 text-right">{latest.consensus ? <Delta value={pct(latest.actual[key], latest.consensus[key])} /> : '—'}</td>
                <td className="py-1.5 text-right text-muted-foreground">{latest.companyForecast ? val(key, latest.companyForecast[key]) : '—'}</td>
                <td className="py-1.5 text-right">{fmtPct(progress(key), 1, false)}</td>
              </tr>
            ))}
            <tr>
              <td className="py-1.5">営業利益率</td>
              <td className="py-1.5 text-right font-medium" colSpan={3}>
                {fmtPct(margin(yoy), 1, false)} <span className="text-muted-foreground">（前年同期）</span> → {fmtPct(margin(cur), 1, false)}
              </td>
              <td colSpan={4} />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">
        市場予想（コンセンサス）はデータ提供元から取得できる場合のみ表示します。進捗率は四半期累計 ÷ 通期会社予想。
      </p>
    </div>
  )
}
