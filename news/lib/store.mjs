// 収集結果をリポジトリ内に貯める。実行のたびに積み上がって記事庫になる。

import fs from 'node:fs/promises'
import path from 'node:path'
import { site } from '../config.mjs'
import { articleKey, matchesTheme, stripSourceSuffix } from './collect.mjs'

const ARCHIVE_PATH = 'data/archive.json'

export async function readArchive(root) {
  try {
    const raw = await fs.readFile(path.join(root, ARCHIVE_PATH), 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed.articles) ? parsed.articles : []
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`既存アーカイブを読めなかったので新規作成します: ${err.message}`)
    }
    return []
  }
}

/**
 * 既存アーカイブに新着をマージする。
 * 既に要約済みの記事は作り直さない（費用と揺れを避けるため）。
 */
export function mergeArchive(existing, incoming, { now = new Date() } = {}) {
  const cutoff = now.getTime() - site.archiveDays * 24 * 60 * 60 * 1000
  const byKey = new Map()

  for (const article of existing) {
    if (new Date(article.publishedAt).getTime() < cutoff) continue
    byKey.set(article.key, article)
  }

  const fresh = []
  for (const article of incoming) {
    const known = byKey.get(article.key)
    if (known) {
      // 出典が増えていれば足す。要約はそのまま使う。
      const via = new Set([...(known.via || []), ...(article.via || [])])
      known.via = [...via]
      known.pickups = Math.max(known.pickups || 1, article.pickups || 1)
      continue
    }
    byKey.set(article.key, article)
    fresh.push(article)
  }

  const merged = [...byKey.values()].sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
  )
  return { merged, fresh }
}

/**
 * 蓄積済みの記事を、今の設定で作り直す。
 *
 * 設定を直しても過去の記事が古い判定のまま残ると、同じ記事が見出し違いで
 * 並び続けたり、対象外にしたはずの記事がいつまでも表示されたりする。
 * 判定はどれも安く、やり直しても結果は決まるので、読むたびに通す。
 *
 * - 見出しの「 - 媒体名」を落とし、キーを取り直す（古い重複がここで畳まれる）
 * - 今のキーワードで対象外になった記事は落とす
 */
export function normalizeArchive(articles) {
  const byKey = new Map()

  for (const raw of articles) {
    const title = stripSourceSuffix(raw.title, raw.publisher)
    const haystack = `${title}\n${(raw.summary || []).join('\n')}`
    if (!matchesTheme(haystack).matched) continue

    const article = { ...raw, title, key: articleKey(title, raw.link) }
    const existing = byKey.get(article.key)
    if (!existing) {
      byKey.set(article.key, article)
      continue
    }

    // 重複したら情報の濃い方を残し、出典は足し合わせる
    const keep = existing.hasBody && !article.hasBody ? existing : article
    keep.via = [...new Set([...(existing.via || []), ...(article.via || [])])]
    keep.pickups = Math.max(existing.pickups || 1, article.pickups || 1)
    byKey.set(article.key, keep)
  }

  return [...byKey.values()]
}

/**
 * 本文が取れていない蓄積済みの記事から、取り直す対象を選ぶ。
 *
 * 元URLの解決は失敗することがある（Google 側の一時的な事情、遷移の遅さなど）。
 * 新着のときに一度失敗しただけで永久に見出しのみになるのは惜しいので、
 * 表示期間内の記事は回数を区切って取り直す。
 *
 * 区切らないと、恒久的に解決できない記事を毎回叩き続けることになる。
 */
export function selectRetryTargets(articles, { skipKeys, limit, maxAttempts = 3, now = new Date() } = {}) {
  if (!limit || limit <= 0) return []
  const cutoff = now.getTime() - site.windowDays * 24 * 60 * 60 * 1000

  return articles
    .filter(
      (article) =>
        !skipKeys?.has(article.key) &&
        !article.hasBody &&
        (article.enrichAttempts ?? 0) < maxAttempts &&
        new Date(article.publishedAt).getTime() >= cutoff,
    )
    // 試行回数が少ないものから。全部が上限に達するまで均等に機会を回す。
    .sort((a, b) => (a.enrichAttempts ?? 0) - (b.enrichAttempts ?? 0))
    .slice(0, limit)
}

export async function writeArchive(root, articles, meta) {
  const target = path.join(root, ARCHIVE_PATH)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(
    target,
    `${JSON.stringify({ updatedAt: meta.updatedAt, meta, articles }, null, 2)}\n`,
    'utf8',
  )
}
