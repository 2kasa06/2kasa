import { fmtDate, fmtDateTime } from '@/lib/format'
import type { SourceInfo } from '@/lib/types'
import { Badge } from './ui/badge'
import { cn } from './ui/utils'

/** データの出所と時点。すべての欄に付ける */
export function SourceNote({ source, className, label = 'データ' }: { source?: SourceInfo | null; className?: string; label?: string }) {
  if (!source) return null
  return (
    <p className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground', className)}>
      {source.isMock && <Badge variant="sample">サンプルデータ</Badge>}
      <span>
        {label}: {source.provider}
      </span>
      <span>時点 {/^\d{4}-\d{2}-\d{2}$/.test(source.asOf) ? fmtDate(source.asOf) : fmtDateTime(source.asOf)}</span>
      <span>最終更新 {fmtDateTime(source.fetchedAt)}</span>
    </p>
  )
}
