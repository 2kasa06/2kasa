import { fmtPct, fmtSigned, toneOf } from '@/lib/format'
import { cn } from './ui/utils'

/** 前日比。上下は色に加えて ▲▼ と符号で示す */
export function Change({ change, pct, digits = 0, className }: { change?: number | null; pct: number | null | undefined; digits?: number; className?: string }) {
  const tone = toneOf(pct)
  const arrow = tone === 'up' ? '▲' : tone === 'down' ? '▼' : '－'
  return (
    <span className={cn('tabular inline-flex items-baseline gap-1.5 font-medium', tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-muted-foreground', className)}>
      <span aria-hidden>{arrow}</span>
      {change !== undefined && <span>{fmtSigned(change, digits)}</span>}
      <span>({fmtPct(pct)})</span>
    </span>
  )
}
