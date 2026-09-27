// 同じ出来事を報じた記事を1つの束にまとめる。
//
// 媒体ごとに見出しの言い回しが違うので、完全一致ではまとまらない。
// 見出しを正規化して文字の2-gram 集合を作り、Jaccard 係数がしきい値以上で、
// 発表時刻が近い記事を同じ束に入れる。

import type { NewsArticle, NewsGroup, Sentiment } from '@/lib/types'

const SIMILARITY_THRESHOLD = 0.42
const MAX_GAP_HOURS = 48

export function normalizeTitle(title: string): string {
  return title
    .normalize('NFKC')
    .replace(/[【\[（(][^】\]）)]*[】\]）)]/g, '') // 【速報】(写真) などの飾り
    .replace(/[\s　、。・「」『』"'“”‘’:：!！?？\-－—|｜]/g, '')
    .toLowerCase()
}

function bigrams(text: string): Set<string> {
  const out = new Set<string>()
  for (let i = 0; i < text.length - 1; i++) out.add(text.slice(i, i + 2))
  return out
}

export function titleSimilarity(a: string, b: string): number {
  const A = bigrams(normalizeTitle(a))
  const B = bigrams(normalizeTitle(b))
  if (A.size === 0 || B.size === 0) return 0
  let common = 0
  for (const g of A) if (B.has(g)) common++
  const jaccard = common / (A.size + B.size - common)
  // 短い見出しの大部分が長い見出しに含まれる場合（「〜を上方修正」と「〜を上方修正　自社株買いも」など）も
  // 同じ出来事とみなす。ただし Jaccard が低すぎる組は、共通の決まり文句だけの可能性があるので外す。
  const overlap = common / Math.min(A.size, B.size)
  return overlap >= 0.6 && jaccard >= 0.28 ? Math.max(jaccard, SIMILARITY_THRESHOLD) : jaccard
}

/** 束の中で多数を占める向き。割れていたら「中立/要確認」 */
function groupSentiment(articles: NewsArticle[]): Sentiment | undefined {
  const labels = articles.map((a) => a.sentiment).filter(Boolean) as Sentiment[]
  if (labels.length === 0) return undefined
  if (labels.includes('review')) return 'review'
  const counts = new Map<Sentiment, number>()
  for (const s of labels) counts.set(s, (counts.get(s) ?? 0) + 1)
  const sorted = [...counts.entries()].sort((x, y) => y[1] - x[1])
  if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) return 'review'
  return sorted[0][0]
}

/**
 * 関連銘柄が1つも重ならない記事は束ねない。
 * 「A社、四半期決算を発表」と「B社、四半期決算を発表」は見出しが似ていても別の出来事。
 */
function sameSubject(a: NewsArticle, b: NewsArticle): boolean {
  if (a.relatedCodes.length === 0 || b.relatedCodes.length === 0) return true
  return a.relatedCodes.some((c) => b.relatedCodes.includes(c))
}

export function groupNews(articles: NewsArticle[]): NewsGroup[] {
  const sorted = [...articles].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))
  const groups: NewsArticle[][] = []

  for (const article of sorted) {
    const t = new Date(article.publishedAt).getTime()
    const home = groups.find((g) =>
      g.some(
        (other) =>
          Math.abs(new Date(other.publishedAt).getTime() - t) <= MAX_GAP_HOURS * 3600_000 &&
          sameSubject(other, article) &&
          titleSimilarity(other.title, article.title) >= SIMILARITY_THRESHOLD,
      ),
    )
    if (home) home.push(article)
    else groups.push([article])
  }

  return groups
    .map((items) => {
      // 最初に報じた記事を代表にする（一次報道に近い）
      const lead = items[0]
      const latestAt = items[items.length - 1].publishedAt
      return {
        key: `${normalizeTitle(lead.title).slice(0, 24)}:${lead.publishedAt.slice(0, 10)}`,
        lead,
        articles: items,
        category: lead.category,
        sentiment: groupSentiment(items),
        latestAt,
      }
    })
    .sort((a, b) => b.latestAt.localeCompare(a.latestAt))
}

export const SENTIMENT_LABEL: Record<Sentiment, string> = {
  positive: 'ポジティブ',
  neutral: 'ニュートラル',
  negative: 'ネガティブ',
  review: '中立/要確認',
}
