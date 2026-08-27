// 記事がどの地方の話かを決める。地図にピンを立てるのに使う。

import { regionKeywords } from '../config.mjs'

const SITE_WEIGHT = 3
const AREA_WEIGHT = 1

/** ひとつの文字列に対して、地方ごとの得点を出す */
function scoreText(text) {
  const scores = new Map()
  if (!text) return scores

  for (const [id, words] of Object.entries(regionKeywords)) {
    let score = 0
    for (const word of words.sites) if (text.includes(word)) score += SITE_WEIGHT
    for (const word of words.areas) if (text.includes(word)) score += AREA_WEIGHT
    if (score > 0) scores.set(id, score)
  }
  return scores
}

/**
 * 記事から地方を判定する。決め手が無ければ null（＝全国・地域不明）。
 *
 * 段階的に見る。見出しに地名があれば、候補はその地方だけに絞る。本文は
 * 候補が並んだときの決着にしか使わない。
 *
 * 本文を対等に数えると、無関係な地名に引きずられる。実データでは、沖縄県知事選の
 * 記事の本文に別速報の「大雨特別警報 石川県・富山県」が紛れ込んでいて、
 * 中部の地名5個が見出しの「沖縄」1個を押し切って中部と判定された。
 * 見出しを重くするだけでは同点になって決着しなかったので、段階を分けている。
 */
export function detectRegion(article) {
  const titleScores = scoreText(article.title || '')
  const summaryScores = scoreText((article.summary || []).join('\n'))
  const bodyScores = scoreText((article.body || '').slice(0, 4000))

  // 見出し → 要約 → 本文 の順に、候補が絞れた段階で確定させる
  for (const [primary, ...tiebreakers] of [
    [titleScores, summaryScores, bodyScores],
    [summaryScores, bodyScores],
    [bodyScores],
  ]) {
    if (primary.size === 0) continue

    const best = Math.max(...primary.values())
    let candidates = [...primary.entries()].filter(([, score]) => score === best).map(([id]) => id)

    for (const tiebreaker of tiebreakers) {
      if (candidates.length === 1) break
      const scored = candidates.map((id) => ({ id, score: tiebreaker.get(id) ?? 0 }))
      const top = Math.max(...scored.map((s) => s.score))
      if (top === 0) continue
      candidates = scored.filter((s) => s.score === top).map((s) => s.id)
    }

    // まだ並んでいるなら決め手なし。取り違えたピンを立てるより「全国」に置く。
    return candidates.length === 1 ? candidates[0] : null
  }

  return null
}

/** 記事の一覧に地方を付ける。既に付いているものはそのまま。 */
export function assignRegions(articles) {
  for (const article of articles) {
    if (article.region === undefined) article.region = detectRegion(article)
  }
  return articles
}
