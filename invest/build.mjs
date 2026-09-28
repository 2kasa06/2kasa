#!/usr/bin/env node
// 市況の取得 → ニュース収集 → 要約 → サイト生成をひと続きで走らせる入口。
//
//   node invest/build.mjs            通常実行
//   node invest/build.mjs --dry-run  取得と要約だけ試して、ファイルは書かない
//   node invest/build.mjs --no-llm   Claude を使わず抽出型要約で組む
//
// 出力は docs/invest/。防衛施設ウォッチ（docs/ 直下）とは別の場所に書く。

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { allSources, markets, site, watchlist } from './config.mjs'
import { fetchQuotes } from './lib/market.mjs'
import { collectArticles } from './lib/collect.mjs'
import { enrichArticles } from '../news/lib/collect.mjs'
import { createResolver } from '../news/lib/resolve.mjs'
import { summarizeArticles, buildDigest, claudeAvailable, describeMove } from './lib/summarize.mjs'
import { readArchive, readMarket, mergeArchive, selectResummaryTargets, writeArchive, writeMarket } from './lib/store.mjs'
import { renderIndex, renderDay, renderArchiveIndex, dayKey } from './lib/render.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'docs', 'invest')

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
if (args.has('--no-llm')) {
  delete process.env.ANTHROPIC_API_KEY
  delete process.env.ANTHROPIC_AUTH_TOKEN
}

const log = (...parts) => console.log(...parts)

async function main() {
  const now = new Date()
  log(`■ ${site.title} — ${now.toISOString()}`)
  log(`  Claude の要約: ${claudeAvailable() ? '利用可（APIキーあり）' : '利用不可（APIキーが渡っていません）'}`)

  // 1. 値動き。指標とウォッチ銘柄をまとめて取る。
  const previousQuotes = await readMarket(ROOT)
  const quotes = await fetchQuotes([...markets, ...watchlist], { now, previous: previousQuotes })
  const quoteList = Object.entries(quotes)
  const quoteOk = quoteList.filter(([, q]) => q.ok).length
  log(`  値動き: ${quoteOk}/${quoteList.length} 件取得`)
  for (const [key, q] of quoteList) {
    if (!q.ok) log(`    × ${key}: ${q.error}${q.stale ? '（前回値で表示）' : ''}`)
  }

  // 2. ニュース
  const sources = allSources()
  log(`  ${sources.length}件の情報源を確認中…`)
  const existing = await readArchive(ROOT)
  const { articles: incoming, status } = await collectArticles(sources, { now })
  const okCount = status.filter((s) => s.ok).length
  log(`  取得成功 ${okCount}/${status.length} 情報源、記事 ${incoming.length}件（重複除去後）`)
  for (const s of status) log(s.ok ? `    ✓ ${s.name}: ${s.picked}件` : `    × ${s.name}: ${s.note}`)

  const { merged, fresh } = mergeArchive(existing, incoming, { now })
  log(`  新着: ${fresh.length}件（蓄積 ${existing.length}件）`)

  // 3. 新着の上位だけ本文を取りに行く（実行時間と費用の歯止め）
  const ranked = [...fresh].sort((a, b) => b.relevance - a.relevance || new Date(b.publishedAt) - new Date(a.publishedAt))
  const primary = ranked.slice(0, site.maxArticlesPerRun)
  const overflow = ranked.slice(site.maxArticlesPerRun)

  if (primary.length > 0) {
    const resolver = await createResolver()
    log(`  ${primary.length}件の本文を取得中…（Google ニュースの元URL解決: ${resolver.available ? '有効' : '無効'}）`)
    try {
      await enrichArticles(primary, { resolver })
    } finally {
      await resolver.close()
    }
    log(`    本文が取れた記事: ${primary.filter((a) => a.hasBody).length}/${primary.length}`)
  }

  // 4. 要約。鍵を後から入れたときは、抽出型で作った要約も書き直す。
  const stale = claudeAvailable()
    ? selectResummaryTargets(merged, {
        skipKeys: new Set(fresh.map((a) => a.key)),
        limit: site.maxArticlesPerRun - primary.length,
        now,
      })
    : []
  const toSummarize = [...primary, ...overflow, ...stale]
  let engine = 'none'
  if (toSummarize.length > 0) {
    log(`  ${toSummarize.length}件を要約中…${stale.length > 0 ? `（うち書き直し ${stale.length}件）` : ''}`)
    const result = await summarizeArticles(toSummarize)
    engine = result.engine
    for (const error of result.errors) log(`    ! ${error}`)
    log(`    要約エンジン: ${engine}`)
  }

  // 5. 表示対象と今日の要点
  const cutoff = now.getTime() - site.windowDays * 24 * 60 * 60 * 1000
  const recent = merged.filter((a) => new Date(a.publishedAt).getTime() >= cutoff)

  // 大きく動いた順に並べて、要点の材料にする
  const movers = [...markets, ...watchlist]
    .map((item) => ({ item, q: quotes[item.id || item.code] }))
    .filter(({ q }) => q?.changePct != null && !q.stale)
    .sort((a, b) => Math.abs(b.q.changePct) - Math.abs(a.q.changePct))
    .map(({ item, q }) => describeMove(item.name, q, item.digits ?? 2))
    .filter(Boolean)
  const digest = recent.length > 0 || movers.length > 0 ? await buildDigest(recent, movers) : []
  if (digest.length > 0) log(`  今日の要点: ${digest.length}点`)

  const meta = {
    updatedAt: now.toISOString(),
    engine,
    sourcesOk: okCount,
    sourcesTotal: status.length,
    quotesOk: quoteOk,
    quotesTotal: quoteList.length,
    totalArticles: merged.length,
    recentArticles: recent.length,
    freshArticles: fresh.length,
    status,
  }

  if (dryRun) {
    log('  --dry-run のためファイルは書きません')
    for (const a of recent.slice(0, 5)) log(`\n  [${a.category}/${a.sentiment}] ${a.title}\n    ${(a.summary || []).join(' / ')}`)
    return okCount === 0 && quoteOk === 0 ? 1 : 0
  }

  // 6. 書き出し
  await writeArchive(ROOT, merged, meta)
  await writeMarket(ROOT, quotes, meta.updatedAt)
  await writeSite({ recent, merged, quotes, digest, status, meta })
  log(`  書き出し完了: docs/invest/index.html（ニュース ${recent.length}件）`)
  await writeStepSummary(meta, digest)

  // 値動きもニュースも1件も取れないのは設定か回線の異常。CI を赤くして気づけるようにする。
  return okCount === 0 && quoteOk === 0 ? 1 : 0
}

export async function writeSite({ recent, merged, quotes, digest, status, meta, out = OUT, banner = '' }) {
  await fs.mkdir(path.join(out, 'archive'), { recursive: true })
  await fs.writeFile(path.join(out, 'index.html'), renderIndex({ articles: recent, quotes, digest, status, meta, banner }), 'utf8')

  const byDay = new Map()
  for (const article of merged) {
    const day = dayKey(article.publishedAt)
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day).push(article)
  }
  const days = [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  for (const [day, items] of days) {
    await fs.writeFile(path.join(out, 'archive', `${day}.html`), renderDay({ day, articles: items, meta }), 'utf8')
  }
  // 保存期間を過ぎた日のページは消す。残すと一覧から辿れないページが溜まる。
  const keep = new Set(days.map(([day]) => `${day}.html`))
  for (const name of await fs.readdir(path.join(out, 'archive'))) {
    if (/^\d{4}-\d{2}-\d{2}\.html$/.test(name) && !keep.has(name)) await fs.rm(path.join(out, 'archive', name))
  }
  await fs.writeFile(
    path.join(out, 'archive.html'),
    renderArchiveIndex({ days: days.map(([day, items]) => ({ day, count: items.length })), meta }),
    'utf8',
  )
}

async function writeStepSummary(meta, digest) {
  const target = process.env.GITHUB_STEP_SUMMARY
  if (!target) return
  const lines = [
    `## ${site.title}`,
    '',
    `- 値動き: ${meta.quotesOk} / ${meta.quotesTotal} 件取得`,
    `- 情報源: ${meta.sourcesOk} / ${meta.sourcesTotal} 件から取得`,
    `- 新着: ${meta.freshArticles}件 / 表示中: ${meta.recentArticles}件 / 蓄積: ${meta.totalArticles}件`,
    `- 要約エンジン: ${meta.engine}`,
    '',
  ]
  if (digest.length > 0) lines.push('### 今日の要点', '', ...digest.map((p) => `- ${p}`), '')
  const failed = meta.status.filter((s) => !s.ok)
  if (failed.length > 0) {
    lines.push('### 取得できなかった情報源', '')
    for (const s of failed) lines.push(`- **${s.name}** — ${s.note}`)
  }
  await fs.appendFile(target, `${lines.join('\n')}\n`, 'utf8')
}

// preview.mjs から writeSite だけを使えるよう、直接実行されたときだけ動かす
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
    .then((code) => {
      process.exitCode = code
    })
    .catch((err) => {
      console.error('生成に失敗しました:', err)
      process.exitCode = 1
    })
}
