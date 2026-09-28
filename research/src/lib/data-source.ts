// どのデータ提供元で動いているか。画面の「サンプルデータ」表示の出し分けにも使う。
//
// DATA_SOURCE を明示すればそれに従う。無指定なら、Vercel 上では実データ（yahoo）、
// 手元の開発では mock。静的版（GitHub Pages）は常に mock。

export type DataSourceName = 'mock' | 'yahoo'

export function dataSource(): DataSourceName {
  if (process.env.NEXT_PUBLIC_STATIC_EXPORT === '1') return 'mock'
  const explicit = process.env.DATA_SOURCE?.toLowerCase()
  if (explicit === 'mock' || explicit === 'yahoo') return explicit
  return process.env.VERCEL ? 'yahoo' : 'mock'
}
