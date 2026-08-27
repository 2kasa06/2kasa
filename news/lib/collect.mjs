// 情報源から記事を集め、テーマで絞り、本文を取りに行くところまで。

import { get, mapLimit } from './http.mjs'
import { parseFeed, stripHtml, decodeEntities } from './feed.mjs'
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
 * Google ニュースのリンクは news.google.com のリダイレクタ。
 * 本文を取るには元記事のURLに解決する必要がある。
 *
 * expectedHost（フィードの <source url> から得た媒体のホスト）が分かっている場合、
 * それと一致する候補だけを採る。ページ内の適当な外部リンクを掴むと、
 * 別の記事の本文で要約を作ってしまい、間違いに気づけない。
 * 確信が持てなければ null を返し、見出しだけで扱う。
 */
async function resolveGoogleNewsUrl(url, expectedHost) {
  const sameSite = (candidate) => {
    if (!expectedHost) return false
    try {
      const host = new URL(candidate).hostname.replace(/^www\./, '')
      return host === expectedHost || host.endsWith(`.${expectedHost}`)
    } catch {
      return false
    }
  }

  const res = await get(url, { timeoutMs: 15000, retries: 1 })
  if (!res.ok) return null

  // リダイレクトを追い切れていれば、それが元記事
  try {
    if (new URL(res.url).hostname !== 'news.google.com') return res.url
  } catch {
    /* URL が壊れていたら下の HTML 走査に落とす */
  }

  // 追えないときは、返ってきた HTML から外部リンクを拾う
  const candidates = [...res.body.matchAll(/href\s*=\s*["'](https?:\/\/[^"']+)["']/gi)]
    .map(([, href]) => decodeEntities(href))
    .filter((href) => {
      try {
        const host = new URL(href).hostname
        return !/(^|\.)google\.com$/.test(host) && !/(^|\.)gstatic\.com$/.test(host)
      } catch {
        return false
      }
    })

  return candidates.find(sameSite) ?? null
}

/** 記事ページから本文らしいテキストを取り出す。取れなければ空文字。 */
export async function fetchArticleText(url) {
  const res = await get(url, { timeoutMs: 20000, retries: 1, accept: 'text/html,*/*' })
  if (!res.ok) return { text: '', error: res.error }

  const html = res.body
  // 記事本体を囲みがちな要素を優先して見る
  const scoped =
    html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] ||
    html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ||
    html

  // <p> を集める方が、ナビや広告のテキストを拾いにくい
  const paragraphs = [...scoped.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(([, inner]) => stripHtml(inner))
    .filter((line) => line.length >= 20)

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

      const theme = matchesTheme(`${item.title}\n${description}`)
      if (!theme.matched) continue

      const key = articleKey(item.title, item.link)
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
        title: item.title,
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

/** 新着記事について、元URLの解決と本文取得をまとめて行う */
export async function enrichArticles(articles) {
  return mapLimit(articles, 4, async (article) => {
    if (article.isGoogleLink) {
      const expectedHost = article.sourceHost || ''
      const resolved = await resolveGoogleNewsUrl(article.link, expectedHost)
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
