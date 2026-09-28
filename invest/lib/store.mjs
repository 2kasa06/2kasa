// 記事と市況の蓄積。data/ にコミットされ、実行のたびに積み上がる。

import fs from 'node:fs/promises'
import path from 'node:path'
import { site } from '../config.mjs'

export const ARCHIVE_PATH = 'data/invest-archive.json'
export const MARKET_PATH = 'data/invest-market.json'

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn(`${file} を読めなかったので空から始めます: ${err.message}`)
    return fallback
  }
}

export async function readArchive(root) {
  const parsed = await readJson(path.join(root, ARCHIVE_PATH), {})
  return Array.isArray(parsed.articles) ? parsed.articles : []
}

export async function readMarket(root) {
  const parsed = await readJson(path.join(root, MARKET_PATH), {})
  return parsed && typeof parsed.quotes === 'object' ? parsed.quotes : {}
}

/**
 * 既存の記事に新着を足す。要約済みの記事は作り直さない（費用と揺れを避けるため）。
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
      known.via = [...new Set([...(known.via || []), ...(article.via || [])])]
      known.pickups = Math.max(known.pickups || 1, article.pickups || 1)
      known.tickers = [...new Set([...(known.tickers || []), ...(article.tickers || [])])]
      continue
    }
    byKey.set(article.key, article)
    fresh.push(article)
  }

  const merged = [...byKey.values()].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
  return { merged, fresh }
}

/** 抽出型で作った要約を、鍵が使えるようになったときに書き直す対象 */
export function selectResummaryTargets(articles, { skipKeys = new Set(), limit = 0, now = new Date() } = {}) {
  if (limit <= 0) return []
  const cutoff = now.getTime() - site.windowDays * 24 * 60 * 60 * 1000
  return articles
    .filter((a) => a.generatedBy !== 'claude' && !skipKeys.has(a.key))
    .filter((a) => new Date(a.publishedAt).getTime() >= cutoff)
    .slice(0, limit)
}

export async function writeArchive(root, articles, meta) {
  const target = path.join(root, ARCHIVE_PATH)
  await fs.mkdir(path.dirname(target), { recursive: true })
  // 本文は要約の材料で、表示には使わない。蓄積が膨らまないよう落とす。
  const slim = articles.map(({ body, ...rest }) => rest)
  await fs.writeFile(target, `${JSON.stringify({ meta, articles: slim }, null, 1)}\n`, 'utf8')
}

export async function writeMarket(root, quotes, updatedAt) {
  const target = path.join(root, MARKET_PATH)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, `${JSON.stringify({ updatedAt, quotes }, null, 1)}\n`, 'utf8')
}
