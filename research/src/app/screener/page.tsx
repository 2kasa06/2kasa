import type { Metadata } from 'next'
import { ScreenerView } from '@/components/screener-view'
import { fmtDateTime } from '@/lib/format'
import { getScreenerData } from '@/lib/services/screener'

export const revalidate = 1800

export const metadata: Metadata = {
  title: 'テクニカル・スクリーナー',
  description: '東証全銘柄と米国主要銘柄を、成立しているテクニカル条件の向きと数で並べて絞り込めます。',
}

export default async function ScreenerPage() {
  const data = await getScreenerData()
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">テクニカル・スクリーナー</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          成立中のテクニカル条件のうち「上昇方向の条件」が多い銘柄から順に並べています。
          並び順は条件の成り立ち方を数えたもので、値上がりを予想・推奨するものではありません。
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          集計: {data.generatedAt ? fmtDateTime(data.generatedAt) : 'まだ集計されていません'}・{data.source}・{data.scanned.toLocaleString()}銘柄
          {data.failed > 0 && `（取得失敗 ${data.failed.toLocaleString()}）`}
        </p>
      </div>
      <ScreenerView items={data.items} />
    </div>
  )
}
