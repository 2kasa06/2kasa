// 情報源から記事を集め、テーマで絞り、本文を取りに行くところまで。

import { get, mapLimit } from './http.mjs'
import { parseFeed, stripHtml } from './feed.mjs'
import { keywords, site } from '../config.mjs'

/**
 * テーマに合う記事か判定する。
 *
 * このサイトが追うのは「防衛」×「施設・建築土木」の交差点。
 * 分野固有の topic 語が1つ当たるか、defense 語と facility 語が
 * 両方当たったものだけを採る。詳しい理由は config.mjs のコメントに書いた。
 */
export function matchesTheme(text) {
  const haystack = String(text || '')
  if (keywords.exclude.some((word) => haystack.includes(word))) {
    return { matched: false, score: 0, hits: [] }
  }

  const hit = (list) => list.filter((word) => haystack.includes(word))
  const topicHits = hit(keywords.topic)
  const defenseHits = hit(keywords.defense)
  const facilityHits = hit(keywords.facility)

  const matched =
    topicHits.length >= 1 || (defenseHits.length >= 1 && facilityHits.length >= 1)

  return {
    matched,
    score: topicHits.length * 3 + defenseHits.length * 2 + facilityHits.length,
    hits: [...topicHits, ...defenseHits, ...facilityHits],
  }
}

/**
 * Google ニュースの見出しは「本文の見出し - 媒体名」の形で来る。
 * 媒体名は別枠で持っているので重複だし、末尾が媒体ごとに違うせいで
 * 同じ記事が別物として残ってしまう（実データで同じ記事が4件並んだ）。
 */
export function stripSourceSuffix(title, sourceName) {
  if (!sourceName) return title
  const suffix = ` - ${sourceName}`
  return title.endsWith(suffix) ? title.slice(0, -suffix.length).trim() : title
}

/** 同じ記事を別経路で拾ったときに揃うキーを作る */
export function articleKey(title, url) {
  const normalizedTitle = String(title)
    .normalize('NFKC')
    .replace(/[\s　]/g, '')
    .replace(/[「」『』【】［］()（）"'’”、。・:：\-—–|｜]/g, '')
    .toLowerCase()
  let host = ''
  let path = ''
  try {
    const parsed = new URL(url)
    host = parsed.hostname.replace(/^www\./, '')
    path = parsed.pathname.replace(/\/+$/, '')
  } catch {
    // URL として読めないものはタイトルだけで判定する
  }
  // Google ニュース経由と直リンクで同じ記事が来るので、URL よりタイトルを主にする
  return normalizedTitle || `${host}${path}`
}

/**
 * 構造化データ（JSON-LD）から本文を取り出す。
 *
 * <p> をかき集める方式だと、記事の周りに並ぶ別記事の見出しが混ざる。実データでは
 * NHK の記事の要約に「【気象予報士解説】大雨特別警報」「ネパールで土石流」が
 * 紛れ込んだ。articleBody は記事本体そのものなので、あるならこちらが確実。
 */
function articleBodyFromJsonLd(html) {
  const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]

  for (const [, raw] of blocks) {
    let data
    try {
      data = JSON.parse(raw.trim())
    } catch {
      continue // 壊れた JSON-LD は珍しくない
    }

    // 単体・配列・@graph のいずれの入れ方もある
    const nodes = []
    const walk = (node) => {
      if (Array.isArray(node)) node.forEach(walk)
      else if (node && typeof node === 'object') {
        nodes.push(node)
        if (node['@graph']) walk(node['@graph'])
      }
    }
    walk(data)

    for (const node of nodes) {
      if (typeof node.articleBody === 'string' && node.articleBody.trim().length >= 200) {
        return stripHtml(node.articleBody)
      }
    }
  }
  return ''
}

/** 記事ページから本文らしいテキストを取り出す。取れなければ空文字。 */
export async function fetchArticleText(url) {
  const res = await get(url, { timeoutMs: 20000, retries: 1, accept: 'text/html,*/*' })
  if (!res.ok) return { text: '', error: res.error }

  const html = res.body

  const structured = articleBodyFromJsonLd(html)
  if (structured) return { text: structured.slice(0, 6000), error: null }
  // 記事本体を囲みがちな要素を優先して見る
  const scoped =
    html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] ||
    html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ||
    html

  // <p> を集める方が、ナビや広告のテキストを拾いにくい。
  // ただし記事の下には別記事の見出しが並ぶので、冒頭の段落だけを使う。
  // 実データでは、NHK の記事末尾にあった別の速報の見出しが要約に紛れ込んだ。
  const paragraphs = [...scoped.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(([, inner]) => stripHtml(inner))
    .filter((line) => line.length >= 20)
    .slice(0, 14)

  const text = paragraphs.join('\n')
  if (text.length >= 120) return { text: text.slice(0, 6000), error: null }

  // <p> が使われていないページ向けの保険
  const fallback = stripHtml(scoped)
  return fallback.length >= 200
    ? { text: fallback.slice(0, 6000), error: null }
    : { text: '', error: '本文を特定できず' }
}

/** 情報源1件を読む。候補URLを上から試し、最初に読めたものを採用する。 */
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

/**
 * 全情報源を回して記事を集める。
 * @returns {Promise<{articles: Array, status: Array}>}
 */
export async function collectArticles(sources, { now = new Date() } = {}) {
  const cutoff = now.getTime() - site.windowDays * 24 * 60 * 60 * 1000
  const status = []
  const bucket = new Map()

  const results = await mapLimit(sources, 4, async (source) => ({
    source,
    result: await readSource(source),
  }))

  for (const { source, result } of results) {
    if (!result.ok) {
      status.push({
        id: source.id,
        name: source.name,
        ok: false,
        picked: 0,
        note: result.attempts.join(' / ') || '候補URLなし',
      })
      continue
    }

    let picked = 0
    for (const item of result.items) {
      // 日付が無い記事は「今」として扱う。切り捨てるより拾って新着に置く方がいい。
      const publishedAt = item.publishedAt ?? now.toISOString()
      if (new Date(publishedAt).getTime() < cutoff) continue

      // Google ニュースの description は記事一覧なので要約の材料にならない
      const isGoogle = source.kind === 'gnews'
      const description = isGoogle ? '' : item.description

      const title = isGoogle ? stripSourceSuffix(item.title, item.sourceName) : item.title

      const theme = matchesTheme(`${title}\n${description}`)
      if (!theme.matched) continue

      const key = articleKey(title, item.link)
      const existing = bucket.get(key)
      if (existing) {
        // 同じ記事を複数の経路で拾った。出典を足して、情報が濃い方を残す。
        if (!existing.via.includes(source.name)) existing.via.push(source.name)
        if (description.length > existing.description.length) existing.description = description
        existing.relevance = Math.max(existing.relevance, theme.score)
        // 複数の情報源が同じ記事を報じている＝注目度が高い、と見なす
        existing.pickups += 1
        // Google ニュース経由よりも直リンクの方が本文を取りやすい
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
        // Google ニュースが教えてくれる媒体のホスト。元記事URLの照合に使う。
        sourceHost: item.sourceUrl
          ? (() => {
              try {
                return new URL(item.sourceUrl).hostname.replace(/^www\./, '')
              } catch {
                return ''
              }
            })()
          : '',
        relevance: theme.score,
        pickups: 1,
      })
      picked++
    }

    status.push({
      id: source.id,
      name: source.name,
      ok: true,
      picked,
      note: result.url,
    })
  }

  const articles = [...bucket.values()].sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
  )
  return { articles, status }
}

/**
 * 新着記事について、元URLの解決と本文取得をまとめて行う。
 *
 * resolver は Google ニュースのリンクを元記事URLに直すためのもの。
 * 無い場合はリダイレクタのままとなり、本文は取りに行かず見出しだけの記事になる。
 */
export async function enrichArticles(articles, { resolver } = {}) {
  return mapLimit(articles, 4, async (article) => {
    if (article.isGoogleLink && resolver?.available) {
      const resolved = await resolver.resolve(article.link)
      if (resolved) {
        article.link = resolved
        article.isGoogleLink = false
      }
    }

    // リダイレクタのままでは記事ページではないので取りに行かない
    if (!article.isGoogleLink) {
      const { text } = await fetchArticleText(article.link)
      if (text) article.body = text
    }

    if (!article.body && article.description) article.body = article.description
    article.hasBody = Boolean(article.body && article.body.length >= 120)
    return article
  })
}
