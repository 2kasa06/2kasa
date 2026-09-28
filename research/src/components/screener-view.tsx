'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { fmtNumber, fmtPct, fmtShortDate } from '@/lib/format'
import { SIGNAL_FILTERS, type ScreenerItem } from '@/lib/screener'
import { ToneDot } from './stock/tone'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { cn } from './ui/utils'

const MARKETS = ['すべて', '東証プライム', '東証スタンダード', '東証グロース', '米国'] as const
// 売買代金の下限（百万円）。薄商いの銘柄は少ない売買で条件が成り立ちやすいので、既定で外す
const TURNOVER = [
  { label: '制限なし', value: 0 },
  { label: '1億円以上', value: 100 },
  { label: '10億円以上', value: 1000 },
  { label: '50億円以上', value: 5000 },
]
const SORTS = [
  { id: 'score', label: '条件の強さ（重み付き）' },
  { id: 'up', label: '上昇方向の条件数' },
  { id: 'volume', label: '出来高（20日平均比）' },
  { id: 'change', label: '前日比' },
] as const

const PAGE = 50

function Segment<T extends string | number>({ value, options, onChange }: { value: T; options: Array<{ label: string; value: T }>; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <Button key={String(o.value)} variant="segment" size="xs" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </Button>
      ))}
    </div>
  )
}

export function ScreenerView({ items }: { items: ScreenerItem[] }) {
  const [market, setMarket] = useState<(typeof MARKETS)[number]>('すべて')
  const [minTurnover, setMinTurnover] = useState(100)
  const [minUp, setMinUp] = useState(2)
  const [maxDown, setMaxDown] = useState(0)
  const [required, setRequired] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<(typeof SORTS)[number]['id']>('score')
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(PAGE)

  const filtered = useMemo(() => {
    const need = SIGNAL_FILTERS.filter((f) => required.has(f.id))
    const query = q.trim().normalize('NFKC').toLowerCase()
    const out = items.filter((it) => {
      if (market !== 'すべて' && it.market !== market) return false
      // 米国株は金額の単位が違い、どれも大型なので売買代金の条件は日本株だけに掛ける
      if (it.market !== '米国' && minTurnover > 0 && (it.turnover ?? 0) < minTurnover) return false
      if (it.up < minUp) return false
      if (maxDown >= 0 && it.down > maxDown) return false
      if (need.some((f) => !it.signals.some((s) => f.types.includes(s.type)))) return false
      if (query && !`${it.code} ${it.name}`.normalize('NFKC').toLowerCase().includes(query)) return false
      return true
    })
    const key: Record<typeof sort, (x: ScreenerItem) => number> = {
      score: (x) => x.score,
      up: (x) => x.up,
      volume: (x) => x.volumeRatio ?? 0,
      change: (x) => x.changePct ?? -Infinity,
    }
    return out.sort((a, b) => key[sort](b) - key[sort](a) || b.score - a.score)
  }, [items, market, minTurnover, minUp, maxDown, required, sort, q])

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        まだ集計結果がありません。平日の東証の取引終了後に自動で集計されます。
      </p>
    )
  }

  const toggle = (id: string) => {
    const next = new Set(required)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setRequired(next)
    setShown(PAGE)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border bg-card p-4 text-sm">
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <div className="mb-1 text-xs text-muted-foreground">市場</div>
            <Segment value={market} options={MARKETS.map((m) => ({ label: m, value: m }))} onChange={(v) => (setMarket(v), setShown(PAGE))} />
          </div>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">売買代金（20日平均）</div>
            <Segment value={minTurnover} options={TURNOVER} onChange={(v) => (setMinTurnover(v), setShown(PAGE))} />
          </div>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">上昇方向の条件</div>
            <Segment value={minUp} options={[1, 2, 3, 4].map((n) => ({ label: `${n}件以上`, value: n }))} onChange={(v) => (setMinUp(v), setShown(PAGE))} />
          </div>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">下落方向の条件</div>
            <Segment
              value={maxDown}
              options={[
                { label: '0件', value: 0 },
                { label: '1件まで', value: 1 },
                { label: '2件まで', value: 2 },
                { label: '制限なし', value: -1 },
              ]}
              onChange={(v) => (setMaxDown(v), setShown(PAGE))}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs text-muted-foreground">必ず含む条件（すべて満たす銘柄だけ）</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs">
            {SIGNAL_FILTERS.map((f) => (
              <label key={f.id} className="inline-flex cursor-pointer items-center gap-1">
                <input type="checkbox" checked={required.has(f.id)} onChange={() => toggle(f.id)} className="accent-primary" />
                {f.label}
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            並び順
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-8 rounded-md border bg-card px-2 text-sm text-foreground">
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="コード・銘柄名で絞り込み" className="h-8 max-w-xs" aria-label="コード・銘柄名で絞り込み" />
          <span className="ml-auto text-sm">
            <span className="tabular font-bold">{filtered.length.toLocaleString()}</span> 銘柄
          </span>
        </div>
      </div>

      <ol className="space-y-2">
        {filtered.slice(0, shown).map((it, i) => (
          <li key={it.code} className="rounded-lg border bg-card px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="tabular w-8 text-xs text-muted-foreground">{i + 1}</span>
              <Link href={`/stocks/${encodeURIComponent(it.code)}`} className="font-semibold hover:underline">
                <span className="tabular mr-2">{it.code}</span>
                {it.name}
              </Link>
              <span className="text-xs text-muted-foreground">
                {it.market}
                {it.sector && `・${it.sector}`}
              </span>
              <span className="tabular ml-auto text-sm">
                {fmtNumber(it.close, it.close < 1000 ? 1 : 0)}
                <span className={cn('ml-2 text-xs', (it.changePct ?? 0) > 0 ? 'text-up' : (it.changePct ?? 0) < 0 ? 'text-down' : 'text-muted-foreground')}>
                  {fmtPct(it.changePct)}
                </span>
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-11 text-xs">
              <span className="inline-flex items-center gap-1">
                <ToneDot tone="up" className="size-2" />
                {it.up}
              </span>
              <span className="inline-flex items-center gap-1">
                <ToneDot tone="down" className="size-2" />
                {it.down}
              </span>
              <span className="inline-flex items-center gap-1">
                <ToneDot tone="neutral" className="size-2" />
                {it.neutral}
              </span>
              <span className="text-muted-foreground">RSI {fmtNumber(it.rsi, 1)}</span>
              <span className="text-muted-foreground">出来高 {it.volumeRatio !== null ? `${fmtNumber(it.volumeRatio, 1)}倍` : '—'}</span>
              <span className="text-muted-foreground">{fmtShortDate(it.asOf)} 終値</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1 pl-11">
              {[...it.signals]
                .sort((a, b) => (a.tone === 'up' ? -1 : 1) - (b.tone === 'up' ? -1 : 1))
                .map((s) => (
                  <span key={s.type + s.date} className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px]">
                    <ToneDot tone={s.tone} className="size-2" />
                    {s.label}
                  </span>
                ))}
            </div>
          </li>
        ))}
      </ol>
      {filtered.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">条件に合う銘柄はありません。条件をゆるめてみてください。</p>}
      {filtered.length > shown && (
        <div className="text-center">
          <Button variant="outline" onClick={() => setShown((n) => n + PAGE)}>
            さらに表示（残り {(filtered.length - shown).toLocaleString()} 銘柄）
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        緑＝上昇方向の条件、赤＝下落方向の条件、黄＝中立・注意。条件の強さ（高3・中2・低1）で重み付けした差で並べています。
        テクニカル条件は過去の値動きから機械的に判定した事実で、将来の値動きを保証するものではありません。
      </p>
    </div>
  )
}
