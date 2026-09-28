// データ提供元の切り替え口。UI とサービス層は getProviders() だけを使う。
//
// DATA_SOURCE=mock  … モックデータ（手元での開発の既定）
// DATA_SOURCE=yahoo … 株価・指数は Yahoo Finance、その他は「未接続」（Vercel 上の既定）
// 実データの提供元を足すときは、ここに分岐を追加し、providers/<名前>/ に実装を置く。
// 各提供元の利用規約・再配布条件を確認してから組み込むこと。

import 'server-only'
import { logger } from '@/lib/logger'
import { dataSource } from '@/lib/data-source'
import { createMockProviders } from './mock'
import { createYahooProviders } from './yahoo'
import type { Providers } from './types'

let cached: Providers | null = null

export function getProviders(): Providers {
  if (cached) return cached
  const source = dataSource()
  switch (source) {
    case 'mock':
      cached = createMockProviders()
      break
    case 'yahoo':
      cached = createYahooProviders()
      break
    default:
      // 未対応の提供元が指定されたら、開発者が気づけるようにログを残してモックで動かす。
      // 画面上はモックの印（サンプルデータ）が出るので、実データと取り違えることはない。
      logger.error('provider.unknown', { source, hint: 'DATA_SOURCE は mock か yahoo を指定してください' })
      cached = createMockProviders()
  }
  return cached
}

export type { Providers } from './types'
