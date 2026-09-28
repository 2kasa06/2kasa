import type { Signal } from '@/lib/technical/signals'
import { fmtShortDate } from '@/lib/format'
import { ToneDot } from './tone'

export function SignalChip({ signal }: { signal: Pick<Signal, 'label' | 'tone' | 'date'> }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border bg-card px-1.5 py-0.5 text-[11px]">
      <ToneDot tone={signal.tone} className="size-2" />
      {signal.label}
      <span className="text-muted-foreground">{fmtShortDate(signal.date)}</span>
    </span>
  )
}
