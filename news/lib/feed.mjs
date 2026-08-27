// RSS 2.0 / RSS 1.0 (RDF) / Atom を依存なしで読む。
// 完全なXMLパーサではなく、フィードに現れる形だけを相手にする割り切った実装。

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '—', ndash: '–', hellip: '…', laquo: '«', raquo: '»',
}

export function decodeEntities(input) {
  if (!input) return ''
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (match, name) => ENTITIES[name] ?? match)
}

function safeCodePoint(code) {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return ''
  try {
    return String.fromCodePoint(code)
  } catch {
    return ''
  }
}

/**
 * タグを剥がして、読める素のテキストにする。
 *
 * フィードの description は `&lt;p&gt;` のようにHTMLがエスケープされて入っている
 * ことが多い。先に実体参照を戻さないとタグとして認識できず、剥がしたつもりの
 * `<p>` が本文に残る。復号 → タグ除去 → もう一度復号、の順で処理する。
 */
export function stripHtml(input) {
  if (!input) return ''
  const decoded = decodeEntities(
    String(input).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'),
  )
  return decodeEntities(
    decoded
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t 　]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function unwrap(raw) {
  if (raw == null) return ''
  const cdata = raw.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/)
  return cdata ? cdata[1] : raw
}

/** 名前空間接頭辞を無視して最初の <tag> の中身を取り出す */
function pick(xml, ...names) {
  for (const name of names) {
    const re = new RegExp(
      `<(?:[a-zA-Z0-9._-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9._-]+:)?${name}>`,
      'i',
    )
    const match = xml.match(re)
    if (match) {
      const value = unwrap(match[1]).trim()
      if (value) return value
    }
  }
  return ''
}

/** <tag attr="..."/> のような自己完結タグから属性を取り出す */
function pickAttr(xml, tag, attr) {
  const re = new RegExp(`<(?:[a-zA-Z0-9._-]+:)?${tag}\\b([^>]*)>`, 'gi')
  let match
  while ((match = re.exec(xml))) {
    const attrs = match[1]
    const value = attrs.match(new RegExp(`\\b${attr}\\s*=\\s*["']([^"']+)["']`, 'i'))
    if (value) return decodeEntities(value[1])
  }
  return ''
}

function pickLink(entryXml) {
  // Atom: rel="alternate" を最優先。rel="self" や enclosure を掴まないように。
  const linkTags = [...entryXml.matchAll(/<(?:[a-zA-Z0-9._-]+:)?link\b([^>]*)\/?>/gi)]
  for (const [, attrs] of linkTags) {
    const rel = attrs.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1]
    const href = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1]
    if (href && (!rel || rel === 'alternate')) return decodeEntities(href)
  }
  // RSS: <link>https://…</link>
  const inline = pick(entryXml, 'link')
  if (inline && /^https?:/i.test(inline)) return decodeEntities(inline)
  // 最後の砦
  return decodeEntities(pick(entryXml, 'guid', 'id'))
}

function parseDate(value) {
  if (!value) return null
  const parsed = new Date(value.trim())
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * フィード本文をパースする。
 * @returns {{ok: boolean, items: Array, error?: string}}
 */
export function parseFeed(xml) {
  if (!xml || !/<(rss|feed|rdf:RDF)\b/i.test(xml)) {
    return { ok: false, items: [], error: 'フィードとして読めない応答' }
  }

  const blocks = [
    ...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi),
    ...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi),
  ]

  const items = []
  for (const [, block] of blocks) {
    const title = stripHtml(pick(block, 'title'))
    const link = pickLink(block)
    if (!title || !link) continue

    const rawBody =
      pick(block, 'encoded') ||
      pick(block, 'description', 'summary', 'subtitle') ||
      pick(block, 'content')

    const published =
      parseDate(pick(block, 'pubDate', 'published', 'updated', 'date')) ||
      parseDate(pickAttr(block, 'date', 'datetime'))

    items.push({
      title,
      link,
      // Google ニュースは description に記事一覧のHTMLを入れてくるので、
      // ここでは素のテキストにしておいて、使うかどうかは呼び出し側が決める。
      description: stripHtml(rawBody).slice(0, 4000),
      publishedAt: published ? published.toISOString() : null,
      // Google ニュースは <source url="…">媒体名</source> で出典を教えてくれる
      sourceName: stripHtml(pick(block, 'source')) || '',
      sourceUrl: pickAttr(block, 'source', 'url') || '',
    })
  }

  if (items.length === 0) {
    return { ok: false, items: [], error: '項目が0件' }
  }
  return { ok: true, items }
}
