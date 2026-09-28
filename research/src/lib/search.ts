// 銘柄の検索。コード・ティッカー・名称・英語名の完全一致 → 前方一致 → 部分一致の順に並べる。
// サーバ（提供元）とブラウザ（静的版）で同じ規則を使う。

export interface Searchable {
  code: string
  ticker: string
  name: string
  nameEn: string
}

/** 表記ゆれ（全角半角・大文字小文字・空白や中点）を吸収する */
export function normalizeQuery(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/[\s・.,]/g, '')
}

export function searchStocks<T extends Searchable>(items: T[], query: string, limit = 10): T[] {
  const q = normalizeQuery(query)
  if (!q) return []
  return items
    .map((s) => {
      const fields = [s.code, s.ticker, s.name, s.nameEn].map(normalizeQuery)
      const score = fields.some((f) => f === q) ? 3 : fields.some((f) => f.startsWith(q)) ? 2 : fields.some((f) => f.includes(q)) ? 1 : 0
      return { s, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.s)
}
