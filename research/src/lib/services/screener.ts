// スクリーナーのデータを用意する。
//
// 実データ（yahoo）では、GitHub Actions が毎日集計してリポジトリに置いた JSON を読む。
// デプロイし直さなくても最新の集計が出るよう、GitHub から直接取り（30分キャッシュ）、
// 取れなければビルド時に同梱した版を使う。モックでは、その場でモック銘柄から集計する。

import 'server-only'
import bundled from '@/data/screener.json'
import { dataSource } from '@/lib/data-source'
import { logger } from '@/lib/logger'
import { generateDailyBars } from '@/lib/providers/mock/prices'
import { MOCK_STOCKS } from '@/lib/providers/mock/stocks'
import { decodeScreener, screenStock, sortScreener, type ScreenerData, type ScreenerFile } from '@/lib/screener'

const REMOTE =
  process.env.SCREENER_DATA_URL ?? 'https://raw.githubusercontent.com/2kasa06/2kasa/main/research/src/data/screener.json'

export async function getScreenerData(): Promise<ScreenerData> {
  if (dataSource() === 'mock') {
    const items = MOCK_STOCKS.map((s) => screenStock({ code: s.code, name: s.name, market: s.market, sector: s.sector }, generateDailyBars(s))).filter(
      (x) => x !== null,
    )
    return { generatedAt: new Date().toISOString(), source: 'サンプルデータ', scanned: MOCK_STOCKS.length, failed: 0, items: sortScreener(items) }
  }

  try {
    const res = await fetch(REMOTE, { next: { revalidate: 1800 } } as RequestInit)
    if (res.ok) {
      const file = (await res.json()) as ScreenerFile
      if (Array.isArray(file.rows) && (file.generatedAt ?? '') >= (bundled.generatedAt ?? '')) return decodeScreener(file)
    } else {
      logger.warn('screener.remote_failed', { status: res.status })
    }
  } catch (err) {
    logger.warn('screener.remote_failed', { err })
  }
  return decodeScreener(bundled as unknown as ScreenerFile)
}
