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

export async function writeArchive(root, articles, meta) {
  const target = path.join(root, ARCHIVE_PATH)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(
    target,
    `${JSON.stringify({ updatedAt: meta.updatedAt, meta, articles }, null, 2)}\n`,
    'utf8',
  )
}
