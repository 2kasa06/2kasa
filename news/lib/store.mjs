// 収集結果をリポジトリ内に貯める。実行のたびに積み上がって記事庫になる。

import fs from 'node:fs/promises'
import path from 'node:path'
import { site } from '../config.mjs'

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
