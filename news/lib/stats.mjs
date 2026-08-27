// HUD に並べる数値を、記事の山から計算する。
// ここでは集計だけを行い、色や見た目は render.mjs が決める。

import { categories, keywords, site } from '../config.mjs'
import { dayKeyOf } from './daykey.mjs'
import { regions as mapRegions } from './japan-map.mjs'

/** 直近 days 日分の、日ごとの件数。記事が無い日も 0 として並べる。 */
function buildDaily(articles, days, now) {
  const counts = new Map()
  for (const article of articles) {
    const key = dayKeyOf(article.publishedAt)
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  const series = []
  for (let back = days - 1; back >= 0; back--) {
    const day = dayKeyOf(new Date(now.getTime() - back * 24 * 60 * 60 * 1000).toISOString())
    series.push({ day, count: counts.get(day) || 0 })
  }
  return series
}

/** 記事に頻出する語を数える。HUD の「頻出タグ」用。 */
function buildTags(articles, limit) {
  const vocabulary = [...keywords.topic, ...keywords.defense, ...keywords.facility]
  const counts = new Map()

  for (const article of articles) {
    const haystack = `${article.title} ${(article.summary || []).join(' ')}`
    // 1記事で同じ語を何度数えても意味がないので、記事あたり1回に丸める
    for (const word of new Set(vocabulary.filter((w) => haystack.includes(w)))) {
      counts.set(word, (counts.get(word) || 0) + 1)
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }))
}

/**
 * 地方ごとの件数。地図のピンはここから立てる。
 * region が null の記事は「全国・地域不明」としてまとめる。
 */
function buildRegions(articles) {
  const latestFirst = [...articles].sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
  )

  const list = mapRegions.map((region) => {
    const items = latestFirst.filter((a) => a.region === region.id)
    const key = items.filter((a) => a.importance === 'high')
    return {
      id: region.id,
      label: region.label,
      pin: region.pin,
      count: items.length,
      keyCount: key.length,
      // ピンに添える見出しは、要注目があればそれを優先する
      headline: (key[0] || items[0])?.title ?? '',
    }
  })

  const nationwide = latestFirst.filter((a) => !a.region)
  return {
    list,
    nationwide: {
      count: nationwide.length,
      keyCount: nationwide.filter((a) => a.importance === 'high').length,
      headline: nationwide[0]?.title ?? '',
    },
  }
}

/**
 * @param recent   表示対象（直近 windowDays 日）の記事
 * @param archived 蓄積されている全記事
 * @param status   情報源ごとの取得結果
 */
export function buildStats({ recent, archived, status, freshCount, now = new Date() }) {
  const byCategory = categories.map((category) => ({
    id: category.id,
    label: category.label,
    count: recent.filter((a) => a.category === category.id).length,
  }))

  const sourcesOk = status.filter((s) => s.ok).length
  const sourceRate = status.length > 0 ? sourcesOk / status.length : 0

  return {
    totals: {
      recent: recent.length,
      archived: archived.length,
      fresh: freshCount,
      key: recent.filter((a) => a.importance === 'high').length,
      withBody: recent.filter((a) => a.hasBody).length,
      publishers: new Set(recent.map((a) => a.publisher)).size,
    },
    byCategory,
    // 直近14日。表示窓(7日)より長く取って、増減の流れが見えるようにする。
    daily: buildDaily(archived, 14, now),
    tags: buildTags(recent, 12),
    regions: buildRegions(recent),
    sources: {
      ok: sourcesOk,
      total: status.length,
      rate: sourceRate,
      // アイコンと文言を必ず添える前提の状態区分。色だけで意味を持たせない。
      level: sourceRate >= 0.75 ? 'good' : sourceRate >= 0.4 ? 'warning' : 'critical',
    },
    windowDays: site.windowDays,
  }
}
