import { Activity, CalendarClock, FileText, Newspaper } from 'lucide-react'
import type { ReactNode } from 'react'
import { fmtDate } from '@/lib/format'
import type { StatusSummary as Summary, SummaryItem } from '@/lib/services/stock'
import { ToneDot } from './tone'

function Column({ icon, title, items, empty }: { icon: ReactNode; title: string; items: SummaryItem[]; empty: string }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground">
        {icon}【{title}】
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => {
            const body = (
              <>
                {item.tone && <ToneDot tone={item.tone} className="mt-1.5" />}
                <span className="min-w-0">
                  <span className="font-medium">{item.label}</span>
                  {item.detail && <span className="text-muted-foreground"> {item.detail}</span>}
                  {item.date && <span className="tabular ml-1.5 text-xs text-muted-foreground">{fmtDate(item.date)}</span>}
                </span>
              </>
            )
            return (
              <li key={i} className="text-sm leading-snug">
                {item.href ? (
                  <a href={item.href} className="flex gap-2 rounded hover:bg-muted/60">
                    {body}
                  </a>
                ) : (
                  <span className="flex gap-2">{body}</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** ページを開いてすぐ目に入る「現在この銘柄で確認されている重要事項」 */
export function StatusSummary({ summary, activeCount }: { summary: Summary; activeCount: number | null }) {
  return (
    <section aria-labelledby="status-title" className="rounded-lg border-2 border-primary/30 bg-card px-4 py-4 sm:px-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="status-title" className="text-base font-semibold">
          現在この銘柄で確認されている重要事項
        </h2>
        {activeCount !== null && (
          <p className="text-sm">
            テクニカル条件が <span className="tabular text-lg font-bold">{activeCount}</span> 件検出されています
          </p>
        )}
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Column icon={<Activity className="size-3.5" aria-hidden />} title="テクニカル" items={summary.technical} empty="データなし" />
        <Column icon={<FileText className="size-3.5" aria-hidden />} title="IR" items={summary.ir} empty="直近の重要な開示はありません" />
        <Column icon={<Newspaper className="size-3.5" aria-hidden />} title="ニュース" items={summary.news} empty="直近のニュースはありません" />
        <Column icon={<CalendarClock className="size-3.5" aria-hidden />} title="決算" items={summary.earnings} empty="予定は未定です" />
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        記載はデータから機械的に抽出した事実です。売買の判断を示すものではありません。
      </p>
    </section>
  )
}
