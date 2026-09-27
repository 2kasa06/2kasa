import { fmtDate } from '@/lib/format'
import type { MarketEvent } from '@/lib/types'
import { Badge } from '../ui/badge'

export function EventList({ events }: { events: MarketEvent[] }) {
  return (
    <ul className="divide-y text-sm">
      {events.map((e) => (
        <li key={e.id} className="flex items-center gap-3 py-2">
          <span className="tabular w-24 shrink-0 text-muted-foreground">{fmtDate(e.date)}</span>
          <Badge variant={e.kind === '決算' ? 'primary' : 'outline'}>{e.kind}</Badge>
          <span className={e.code ? 'font-medium' : ''}>{e.title}</span>
        </li>
      ))}
    </ul>
  )
}
