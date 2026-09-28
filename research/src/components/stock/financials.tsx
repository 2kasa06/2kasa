'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { fmtMillions, fmtNumber, fmtPct } from '@/lib/format'
import type { FinancialStatement } from '@/lib/types'
import { Button } from '../ui/button'

type Metric = 'revenue' | 'operatingIncome' | 'netIncome' | 'eps' | 'opMargin' | 'roe' | 'dps' | 'fcf'

const METRICS: Array<{ id: Metric; label: string; kind: 'amount' | 'ratio' | 'perShare' }> = [
  { id: 'revenue', label: '売上高', kind: 'amount' },
  { id: 'operatingIncome', label: '営業利益', kind: 'amount' },
  { id: 'netIncome', label: '純利益', kind: 'amount' },
  { id: 'eps', label: 'EPS', kind: 'perShare' },
  { id: 'opMargin', label: '営業利益率', kind: 'ratio' },
  { id: 'roe', label: 'ROE', kind: 'ratio' },
  { id: 'dps', label: '1株配当', kind: 'perShare' },
  { id: 'fcf', label: 'フリーCF', kind: 'amount' },
]

function metricValue(f: FinancialStatement, m: Metric): number {
  const annualize = f.period === 'FY' ? 1 : 4
  switch (m) {
    case 'opMargin':
      return (f.operatingIncome / f.revenue) * 100
    case 'roe':
      return ((f.netIncome * annualize) / f.equity) * 100
    case 'dps':
      return f.dividendPerShare
    case 'fcf':
      return f.operatingCashFlow + f.investingCashFlow
    default:
      return f[m]
  }
}

const label = (f: FinancialStatement) => (f.period === 'FY' ? `${f.fiscalYear}年度` : `${String(f.fiscalYear).slice(2)}/${f.period}`)

/** 1系列の棒（比率は折れ線）。色は1色、値はホバーと表で読む */
function MetricChart({ rows, metric, currency }: { rows: FinancialStatement[]; metric: (typeof METRICS)[number]; currency: 'JPY' | 'USD' }) {
  const [hover, setHover] = useState<number | null>(null)
  // 実際の幅で描く。viewBox を伸縮させると、幅の広い画面で文字と棒が巨大になるため
  const wrap = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(640)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const values = rows.map((r) => metricValue(r, metric.id))
  const max = Math.max(0, ...values)
  const min = Math.min(0, ...values)
  const H = 220
  const padL = 8
  const padB = 24
  const padT = 20
  const span = max - min || 1
  const y = (v: number) => padT + ((max - v) / span) * (H - padT - padB)
  const band = (W - padL * 2) / rows.length
  const barW = Math.min(44, band * 0.6)
  const fmt = (v: number) => (metric.kind === 'amount' ? fmtMillions(v, currency) : metric.kind === 'ratio' ? `${fmtNumber(v, 1)}%` : fmtNumber(v, 1))

  return (
    <div ref={wrap} className="relative">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="img" aria-label={`${metric.label}の推移`}>
        <line x1={padL} x2={W - padL} y1={y(0)} y2={y(0)} stroke="var(--border)" />
        {metric.kind === 'ratio' && (
          <polyline
            fill="none"
            stroke="var(--primary)"
            strokeWidth={2}
            points={values.map((v, i) => `${padL + band * i + band / 2},${y(v)}`).join(' ')}
          />
        )}
        {values.map((v, i) => {
          const cx = padL + band * i + band / 2
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {/* 当たり判定は棒より広く取る */}
              <rect x={cx - band / 2} y={0} width={band} height={H} fill="transparent" />
              {metric.kind === 'ratio' ? (
                <circle cx={cx} cy={y(v)} r={hover === i ? 5 : 4} fill="var(--primary)" stroke="var(--card)" strokeWidth={2} />
              ) : (
                <rect
                  x={cx - barW / 2}
                  y={Math.min(y(v), y(0))}
                  width={barW}
                  height={Math.max(1, Math.abs(y(v) - y(0)))}
                  rx={4}
                  fill={v < 0 ? 'var(--down)' : 'var(--primary)'}
                  opacity={hover === null || hover === i ? 1 : 0.55}
                />
              )}
              <text x={cx} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
                {label(rows[i])}
              </text>
            </g>
          )
        })}
        {/* 最新値だけ直接ラベルを付ける */}
        {values.length > 0 && hover === null && (
          <text x={padL + band * (values.length - 0.5)} y={Math.min(y(values.at(-1)!), y(0)) - 6} textAnchor="middle" fontSize={11} fill="var(--foreground)">
            {fmt(values.at(-1)!)}
          </text>
        )}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border bg-card px-2 py-1 text-xs shadow-md"
          style={{ left: `${((padL + band * hover + band / 2) / W) * 100}%` }}
        >
          <div className="text-muted-foreground">{label(rows[hover])}</div>
          <div className="tabular font-semibold">
            {metric.label} {fmt(values[hover])}
          </div>
        </div>
      )}
    </div>
  )
}

function growth(cur?: number, prev?: number) {
  if (cur === undefined || prev === undefined || prev === 0) return null
  return ((cur - prev) / Math.abs(prev)) * 100
}

export function Financials({ data, currency, sharesOutstanding }: { data: FinancialStatement[]; currency: 'JPY' | 'USD'; sharesOutstanding: number | null }) {
  const [mode, setMode] = useState<'FY' | 'Q'>('FY')
  const [span, setSpan] = useState<'short' | 'long'>('long')
  const [metricId, setMetricId] = useState<Metric>('revenue')
  const annual = useMemo(() => data.filter((d) => d.period === 'FY'), [data])
  const quarters = useMemo(() => data.filter((d) => d.period !== 'FY'), [data])
  const rows = mode === 'FY' ? annual.slice(span === 'long' ? -5 : -3) : quarters.slice(span === 'long' ? -12 : -8)
  const metric = METRICS.find((m) => m.id === metricId)!

  // 表は通期で出す（四半期の ROE などは季節性で読み違えやすいため）
  const table = annual.slice(-5)
  const cols = table.map((f, i) => ({ f, prev: annual[annual.length - table.length + i - 1] }))

  const tableRows: Array<{ group: string; label: string; value: (f: FinancialStatement, prev?: FinancialStatement) => string }> = [
    { group: '損益', label: '売上高', value: (f) => fmtMillions(f.revenue, currency) },
    { group: '損益', label: '営業利益', value: (f) => fmtMillions(f.operatingIncome, currency) },
    { group: '損益', label: '経常利益', value: (f) => fmtMillions(f.ordinaryIncome, currency) },
    { group: '損益', label: '純利益', value: (f) => fmtMillions(f.netIncome, currency) },
    { group: '損益', label: 'EPS', value: (f) => fmtNumber(f.eps, 1) },
    { group: '成長率', label: '売上高成長率', value: (f, p) => fmtPct(growth(f.revenue, p?.revenue), 1) },
    { group: '成長率', label: '営業利益成長率', value: (f, p) => fmtPct(growth(f.operatingIncome, p?.operatingIncome), 1) },
    { group: '成長率', label: 'EPS成長率', value: (f, p) => fmtPct(growth(f.eps, p?.eps), 1) },
    { group: '財務', label: 'ROE', value: (f) => fmtPct((f.netIncome / f.equity) * 100, 1, false) },
    { group: '財務', label: 'ROA', value: (f) => fmtPct((f.netIncome / f.totalAssets) * 100, 1, false) },
    { group: '財務', label: '自己資本比率', value: (f) => fmtPct((f.equity / f.totalAssets) * 100, 1, false) },
    { group: '財務', label: '有利子負債', value: (f) => fmtMillions(f.interestBearingDebt, currency) },
    { group: '財務', label: '現金等', value: (f) => fmtMillions(f.cash, currency) },
    { group: '財務', label: 'フリーCF', value: (f) => fmtMillions(f.operatingCashFlow + f.investingCashFlow, currency) },
    { group: '株主還元', label: '1株配当', value: (f) => fmtNumber(f.dividendPerShare, 1) },
    { group: '株主還元', label: '配当性向', value: (f) => fmtPct(f.eps > 0 ? (f.dividendPerShare / f.eps) * 100 : null, 1, false) },
    { group: '株主還元', label: '自社株買い', value: (f) => fmtMillions(f.buyback, currency) },
    {
      group: '株主還元',
      label: '総還元性向',
      value: (f) => fmtPct(f.netIncome > 0 && sharesOutstanding ? (((f.dividendPerShare * sharesOutstanding) / 1e6 + f.buyback) / f.netIncome) * 100 : null, 1, false),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md bg-muted p-0.5" role="group" aria-label="期間の単位">
          <Button variant="segment" size="xs" aria-pressed={mode === 'FY'} onClick={() => setMode('FY')}>
            通期
          </Button>
          <Button variant="segment" size="xs" aria-pressed={mode === 'Q'} onClick={() => setMode('Q')}>
            四半期
          </Button>
        </div>
        <div className="flex rounded-md bg-muted p-0.5" role="group" aria-label="表示する期間">
          <Button variant="segment" size="xs" aria-pressed={span === 'short'} onClick={() => setSpan('short')}>
            {mode === 'FY' ? '3年' : '8四半期'}
          </Button>
          <Button variant="segment" size="xs" aria-pressed={span === 'long'} onClick={() => setSpan('long')}>
            {mode === 'FY' ? '5年' : '12四半期'}
          </Button>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="指標">
          {METRICS.map((m) => (
            <Button key={m.id} variant="segment" size="xs" aria-pressed={metricId === m.id} onClick={() => setMetricId(m.id)}>
              {m.label}
            </Button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">データなし</p>
      ) : (
        <MetricChart rows={rows} metric={metric} currency={currency} />
      )}
      {mode === 'Q' && <p className="text-[11px] text-muted-foreground">四半期は3ヶ月単位の値。ROE は年率換算（×4）。</p>}

      <div className="overflow-x-auto">
        <table className="tabular w-full min-w-[560px] text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-1.5 text-left font-medium">通期</th>
              {cols.map(({ f }) => (
                <th key={f.fiscalYear} className="py-1.5 text-right font-medium">
                  {f.fiscalYear}年度
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((r, i) => (
              <tr key={r.label} className={i > 0 && tableRows[i - 1].group !== r.group ? 'border-t-2' : 'border-t'}>
                <td className="py-1.5">
                  <span className="mr-2 text-[10px] text-muted-foreground">{r.group}</span>
                  {r.label}
                </td>
                {cols.map(({ f, prev }) => (
                  <td key={f.fiscalYear} className="py-1.5 text-right">
                    {r.value(f, prev)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
