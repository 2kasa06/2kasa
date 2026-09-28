import { ExternalLink } from 'lucide-react'
import { IMPORTANCE_LABEL } from '@/lib/analysis/ir-classify'
import { fmtDateTime } from '@/lib/format'
import type { IrDocument } from '@/lib/types'
import { Badge } from '../ui/badge'
import { cn } from '../ui/utils'

const IMPORTANCE_VARIANT = { critical: 'down', important: 'neutral', normal: 'default' } as const

export function IrList({ docs }: { docs: IrDocument[] }) {
  return (
    <ul className="divide-y">
      {docs.map((d) => (
        <li key={d.id} className={cn('py-3', d.importance === 'critical' && 'border-l-2 border-l-down pl-3')}>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant={IMPORTANCE_VARIANT[d.importance]}>{IMPORTANCE_LABEL[d.importance]}</Badge>
            <Badge variant="outline">{d.type}</Badge>
            <span className="tabular text-muted-foreground">{fmtDateTime(d.publishedAt)}</span>
            <span className="text-muted-foreground">
              分類根拠: {d.importanceReason}（{d.aiClassified ? 'AIによる分類' : 'ルールによる分類'}）
            </span>
          </div>
          <p className="mt-1 font-medium">{d.title}</p>
          {d.summary && (
            <div className="mt-2 rounded-md bg-muted/50 p-2.5 text-sm">
              <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                3行要約
                <Badge variant="sample">サンプル文</Badge>
              </div>
              <ol className="space-y-0.5">
                {['何が発表されたか', '業績への影響', '今後の注目点'].map((head, i) => (
                  <li key={head} className="grid grid-cols-[7.5rem_1fr] gap-2">
                    <span className="text-xs text-muted-foreground">{head}</span>
                    <span>{d.summary![i]}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary hover:underline">
            原文を見る（{d.sourceName}）
            <ExternalLink className="size-3" aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  )
}
