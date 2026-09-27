import { ExternalLink } from 'lucide-react'
import { SENTIMENT_LABEL } from '@/lib/analysis/news-group'
import { fmtDateTime } from '@/lib/format'
import type { NewsGroup, Sentiment } from '@/lib/types'
import { Badge } from '../ui/badge'

const SENTIMENT_VARIANT: Record<Sentiment, 'up' | 'down' | 'default' | 'neutral'> = {
  positive: 'up',
  negative: 'down',
  neutral: 'default',
  review: 'neutral',
}

export function NewsList({ groups }: { groups: NewsGroup[] }) {
  return (
    <ul className="divide-y">
      {groups.map((g) => (
        <li key={g.key} className="py-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline">{g.category}</Badge>
            {g.sentiment && (
              <Badge variant={SENTIMENT_VARIANT[g.sentiment]} title="記事の論調を AI が分類したものです。政治・規制・災害などは「中立/要確認」としています">
                {SENTIMENT_LABEL[g.sentiment]}（AIによる分類）
              </Badge>
            )}
            <span className="tabular text-muted-foreground">{fmtDateTime(g.lead.publishedAt)}</span>
            <span className="text-muted-foreground">{g.lead.media}</span>
          </div>
          <a href={g.lead.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-start gap-1 font-medium hover:underline">
            {g.lead.title}
            <ExternalLink className="mt-1 size-3 shrink-0 text-muted-foreground" aria-hidden />
          </a>
          {g.lead.summary && <p className="mt-1 text-sm text-muted-foreground">{g.lead.summary}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {g.lead.relatedCodes.length > 0 && <span>関連銘柄: {g.lead.relatedCodes.join('・')}</span>}
          </div>
          {g.articles.length > 1 && (
            <details className="mt-1.5 text-xs">
              <summary className="cursor-pointer text-primary select-none">関連報道 {g.articles.length}件</summary>
              <ul className="mt-1 space-y-1 border-l pl-3">
                {g.articles.map((a) => (
                  <li key={a.id}>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {a.title}
                    </a>
                    <span className="ml-2 text-muted-foreground">
                      {a.media}・{fmtDateTime(a.publishedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </li>
      ))}
    </ul>
  )
}
