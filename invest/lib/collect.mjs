// ニュースを集めて、投資に関わる記事だけを残す。
//
// フィードの読み方・本文の取り方・重複のまとめ方は防衛施設ウォッチ（news/）と
// 同じ部品を使う。違うのは採否の判定と、ウォッチ銘柄の印付け。

import { get, mapLimit } from '../../news/lib/http.mjs'
import { parseFeed } from '../../news/lib/feed.mjs'
import { articleKey, stripSourceSuffix } from '../../news/lib/collect.mjs'
import { keywords, site, watchlist } from '../config.mjs'

// 採否を判断する文字列の長さ。見出しと説明文の頭だけを見る。
const THEME_TEXT_LIMIT = 500

/** 記事に出てくるウォッチ銘柄のコードを返す */
export function matchWatchlist(text, list = watchlist) {
  const haystack = String(text || '')
  return list
    .filter((w) => [w.name, ...(w.aliases || [])].some((word) => word && haystack.includes(word)))
    .map((w) => w.code)
}

/**
 * 投資に関わる記事か判定する。
 * market 語が1つ当たるか、ウォッチ銘柄が出てくれば採る。
 */
export function matchesMarket(text, { acceptAll = false } = {}) {
  const haystack = String(text || '')
  if (keywords.exclude.some((word) => haystack.includes(word))) {
    return { matched: false, score: 0, hits: [], tickers: [] }
  }
  const hits = keywords.market.filter((word) => haystack.includes(word))
  const strong = keywords.strong.filter((word) => haystack.includes(word))
  const tickers = matchWatchlist(haystack)
  return {
    matched: acceptAll || hits.length > 0 || tickers.length > 0,
    score: hits.length + strong.length * 3 + tickers.length * 2,
    hits: [...new Set([...strong, ...hits])],
    tickers,
  }
}

async function readSource(source) {
  const attempts = []
  for (const url of source.urls) {
    const res = await get(url, { timeoutMs: 20000, retries: 1, accept: 'application/rss+xml, application/xml, text/xml, */*' })
    if (!res.ok) {
      attempts.push(`${url} → ${res.error}`)
      continue
    }
    const parsed = parseFeed(res.body)
    if (!parsed.ok) {
      attempts.push(`${url} → ${parsed.error}`)
      continue
    }
    return { ok: true, url, items: parsed.items, attempts }
  }
  return { ok: false, url: null, items: [], attempts }
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/**
 * 全情報源を回して記事を集める。
 * @returns {Promise<{articles: Array, status: Array}>}
 */
export async function collectArticles(sources, { now = new Date(), read = readSource } = {}) {
  const cutoff = now.getTime() - site.windowDays * 24 * 60 * 60 * 1000
  const status = []
  const bucket = new Map()

  const results = await mapLimit(sources, 4, async (source) => ({ source, result: await read(source) }))

  for (const { source, result } of results) {
    if (!result.ok) {
      status.push({ id: source.id, name: source.name, ok: false, picked: 0, note: result.attempts.join(' / ') || '候補URLなし' })
      continue
    }

    let picked = 0
    for (const item of result.items) {
      const publishedAt = item.publishedAt ?? now.toISOString()
      if (new Date(publishedAt).getTime() < cutoff) continue

      // Google ニュースの description は記事一覧なので要約の材料にならない
      const isGoogle = source.kind === 'gnews'
      const description = isGoogle ? '' : item.description
      const title = isGoogle ? stripSourceSuffix(item.title, item.sourceName) : item.title

      const themeText = `${title}\n${description}`.slice(0, THEME_TEXT_LIMIT)
      const theme = matchesMarket(themeText, { acceptAll: source.acceptAll })
      if (!theme.matched) continue

      // 銘柄別の検索で拾った記事でも、見出しに銘柄名が無ければ印は付けない。
      // 「トヨタ 株」の検索には業界全体の記事も混ざるため。
      const tickers = theme.tickers

      const key = articleKey(title, item.link)
      const existing = bucket.get(key)
      if (existing) {
        if (!existing.via.includes(source.name)) existing.via.push(source.name)
        if (description.length > existing.description.length) existing.description = description
        existing.relevance = Math.max(existing.relevance, theme.score)
        existing.tickers = [...new Set([...existing.tickers, ...tickers])]
        existing.pickups += 1
        if (existing.isGoogleLink && !isGoogle) {
          existing.link = item.link
          existing.isGoogleLink = false
        }
        continue
      }

      bucket.set(key, {
        key,
        title,
        link: item.link,
        isGoogleLink: isGoogle,
        description,
        publishedAt,
        publisher: item.sourceName || source.name,
        via: [source.name],
        sourceHint: source.hint || '',
        sourceHost: item.sourceUrl ? hostOf(item.sourceUrl) : hostOf(item.link),
        relevance: theme.score,
        hits: theme.hits,
        tickers,
        pickups: 1,
      })
      picked++
    }

    status.push({ id: source.id, name: source.name, ok: true, picked, note: result.url })
  }

  const articles = [...bucket.values()].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
  return { articles, status }
}
