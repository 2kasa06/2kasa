// 記事がどの地方の話かを決める。地図にピンを立てるのに使う。

import { regionKeywords } from '../config.mjs'

const SITE_WEIGHT = 3
const AREA_WEIGHT = 1

/** 記事から地方を判定する。決め手が無ければ null（＝全国・地域不明）。 */
export function detectRegion(article) {
  const haystack = [article.title, ...(article.summary || []), article.body || '']
    .join('\n')
    .slice(0, 4000)

  const scores = []
  for (const [id, words] of Object.entries(regionKeywords)) {
    const hits = []
    let score = 0
    for (const word of words.sites) {
      if (haystack.includes(word)) {
        score += SITE_WEIGHT
        hits.push(word)
      }
    }
    for (const word of words.areas) {
      if (haystack.includes(word)) {
        score += AREA_WEIGHT
        hits.push(word)
      }
    }
    if (score > 0) scores.push({ id, score, hits })
  }

  if (scores.length === 0) return null
  scores.sort((a, b) => b.score - a.score)

  // 同点は決め手なしとして扱う。取り違えたピンを立てるより、
  // 「全国」に置いて記事一覧から辿ってもらう方がいい。
  if (scores.length > 1 && scores[0].score === scores[1].score) return null

  return scores[0].id
}

/** 記事の一覧に地方を付ける。既に付いているものはそのまま。 */
export function assignRegions(articles) {
  for (const article of articles) {
    if (article.region === undefined) article.region = detectRegion(article)
  }
  return articles
}
