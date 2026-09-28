import { AlertCircle } from 'lucide-react'
import { fmtDate, fmtNumber, fmtPct, fmtValues } from '@/lib/format'
import type { SignalBundle, TechnicalSnapshot } from '@/lib/services/stock'
import { MIN_RELIABLE_SAMPLES, type BacktestResult } from '@/lib/technical/backtest'
import { CATEGORY_LABEL, STRENGTH_LABEL, type Signal } from '@/lib/technical/signals'
import { Badge } from '../ui/badge'
import { cn } from '../ui/utils'
import { ToneDot, ToneLegend } from './tone'

const valueText = fmtValues

function Backtest({ result }: { result: BacktestResult }) {
  return (
    <details className="group mt-2 rounded-md border bg-muted/30 text-xs">
      <summary className="cursor-pointer px-2.5 py-1.5 text-muted-foreground select-none hover:text-foreground">
        過去の同じ条件（全期間で {result.occurrences} 回）のその後の値動き
      </summary>
      <div className="overflow-x-auto px-2.5 pb-2.5">
        {result.lowSample && (
          <p className="mb-1.5 flex items-center gap-1 text-warn-fg">
            <AlertCircle className="size-3.5" aria-hidden />
            サンプル数が少ないため参考値です（{MIN_RELIABLE_SAMPLES}回未満）。
          </p>
        )}
        <table className="tabular w-full min-w-[420px]">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 text-left font-medium">経過</th>
              <th className="py-1 text-right font-medium">サンプル数</th>
              <th className="py-1 text-right font-medium">平均</th>
              <th className="py-1 text-right font-medium">中央値</th>
              <th className="py-1 text-right font-medium">最大</th>
              <th className="py-1 text-right font-medium">最小</th>
              <th className="py-1 text-right font-medium">上昇した割合</th>
            </tr>
          </thead>
          <tbody>
            {result.stats.map((s) => (
              <tr key={s.horizon} className="border-t">
                <td className="py-1">{s.horizon}営業日後</td>
                <td className="py-1 text-right">{s.samples}</td>
                <td className="py-1 text-right">{fmtPct(s.mean)}</td>
                <td className="py-1 text-right">{fmtPct(s.median)}</td>
                <td className="py-1 text-right">{fmtPct(s.max)}</td>
                <td className="py-1 text-right">{fmtPct(s.min)}</td>
                <td className="py-1 text-right">{fmtPct(s.upRatio, 0, false)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1.5 text-muted-foreground">
          発生日の終値から各営業日後の終値までの変化率。集計期間 {fmtDate(result.from)}〜{fmtDate(result.to)}。
          過去の結果は将来の結果を保証しません。
        </p>
      </div>
    </details>
  )
}

function SignalRow({ s, backtest }: { s: Signal; backtest?: BacktestResult }) {
  return (
    <li className={cn('py-2.5', !s.active && 'opacity-70')}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <ToneDot tone={s.tone} />
        <span className="font-medium">{s.label}</span>
        <Badge variant="outline" title={s.strengthReason}>
          条件の強さ: {STRENGTH_LABEL[s.strength]}
        </Badge>
        <Badge variant={s.active ? 'primary' : 'default'}>{s.active ? '現在も成立' : '現在は不成立'}</Badge>
        <span className="text-[11px] text-muted-foreground">
          {CATEGORY_LABEL[s.category]}・{s.kind === 'event' ? 'イベント' : '状態'}
        </span>
      </div>
      <div className="mt-1 grid gap-x-4 gap-y-0.5 pl-4.5 text-xs sm:grid-cols-[auto_1fr]">
        <span className="text-muted-foreground">{s.kind === 'event' ? '発生日' : '継続開始'}</span>
        <span className="tabular">{fmtDate(s.date)}</span>
        <span className="text-muted-foreground">根拠</span>
        <span className="tabular">{valueText(s.values)}</span>
        <span className="text-muted-foreground">条件</span>
        <span>
          {s.condition}
          <span className="text-muted-foreground">（{s.strengthReason}）</span>
        </span>
      </div>
      {backtest && <div className="pl-4.5">{<Backtest result={backtest} />}</div>}
    </li>
  )
}

function Snapshot({ t }: { t: TechnicalSnapshot }) {
  const rows: Array<[string, string]> = [
    ['RSI(14)', fmtNumber(t.rsi, 1)],
    ['MACD / シグナル', `${fmtNumber(t.macd, 2)} / ${fmtNumber(t.macdSignal, 2)}`],
    ['SMA 5 / 25', `${fmtNumber(t.sma5, 1)} / ${fmtNumber(t.sma25, 1)}`],
    ['SMA 75 / 200', `${fmtNumber(t.sma75, 1)} / ${fmtNumber(t.sma200, 1)}`],
    ['ボリンジャー σ位置', fmtNumber(t.bbZ, 2)],
    ['ADX(14)', fmtNumber(t.adx, 1)],
    ['ストキャス %K', fmtNumber(t.stochK, 1)],
    ['ATR(14)', fmtNumber(t.atr, 1)],
    ['出来高 20日平均比', t.volumeRatio !== null ? `${fmtNumber(t.volumeRatio, 2)}倍` : '—'],
  ]
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-2 border-b border-dashed py-1">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="tabular">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function SignalPanel({ bundle }: { bundle: SignalBundle }) {
  const { current, history, backtests, activeCount, snapshot } = bundle
  return (
    <div className="space-y-4">
      <div className={cn('rounded-md px-3 py-2 text-sm', activeCount >= 2 ? 'bg-primary/10' : 'bg-muted')}>
        {activeCount >= 2 ? (
          <>
            <span className="font-semibold">複数シグナル発生：</span>テクニカル条件が <span className="tabular font-bold">{activeCount}</span> 件検出されています。
          </>
        ) : (
          <>現在成立しているテクニカル条件は {activeCount} 件です。</>
        )}
        <span className="block text-xs text-muted-foreground">
          条件の数や強さは、条件がどれだけ明確に成立しているかを示すもので、売買の判断や将来の値動きを示すものではありません。
        </span>
      </div>

      <ToneLegend />

      <div>
        <h3 className="text-sm font-semibold">現在検出されているシグナル（{fmtDate(snapshot.date)} 終値時点・直近10営業日）</h3>
        {current.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">検出されている条件はありません</p>
        ) : (
          <ul className="divide-y">
            {current.map((s) => (
              <SignalRow key={s.id} s={s} backtest={s.kind === 'event' ? backtests[s.type] : undefined} />
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold">主な指標の現在値</h3>
        <Snapshot t={snapshot} />
      </div>

      <details className="rounded-md border">
        <summary className="cursor-pointer px-3 py-2 text-sm font-semibold select-none">シグナル履歴（直近 {history.length} 件）</summary>
        <ul className="max-h-96 divide-y overflow-auto px-3 pb-2 text-xs">
          {history.map((s) => (
            <li key={s.id} className="flex items-center gap-2 py-1.5">
              <span className="tabular w-20 shrink-0 text-muted-foreground">{fmtDate(s.date)}</span>
              <ToneDot tone={s.tone} className="size-2" />
              <span>{s.label}</span>
              <span className="tabular ml-auto truncate text-muted-foreground">{valueText(s.values)}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
