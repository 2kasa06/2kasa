import { AlertTriangle, Inbox } from 'lucide-react'
import type { DataResult } from '@/lib/types'
import type { ReactNode } from 'react'

/**
 * 取得結果に応じて中身か「データ取得失敗」「データなし」を出す。
 * 失敗を 0 や空欄のまま見せない。内部のエラー内容は表示しない。
 */
export function DataState<T>({ result, children, emptyText = 'データなし' }: { result: DataResult<T>; children: (data: T) => ReactNode; emptyText?: string }) {
  if (result.status === 'error') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-down/30 bg-down/5 px-3 py-3 text-sm text-down" role="status">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        データ取得失敗。時間をおいて再度お試しください。
      </div>
    )
  }
  if (result.status === 'empty' || (Array.isArray(result.data) && result.data.length === 0)) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground" role="status">
        <Inbox className="size-4 shrink-0" aria-hidden />
        {result.status === 'empty' && result.message ? result.message : emptyText}
      </div>
    )
  }
  return <>{children(result.data)}</>
}
