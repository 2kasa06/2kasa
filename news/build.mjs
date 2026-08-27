#!/usr/bin/env node
// 収集 → 要約 → サイト生成をひと続きで走らせる入口。
//
//   node news/build.mjs            通常実行
//   node news/build.mjs --dry-run  収集と要約だけ試して、ファイルは書かない
//   node news/build.mjs --no-llm   Claude を使わず抽出型要約で組む

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { site, sources } from './config.mjs'
import { collectArticles, enrichArticles } from './lib/collect.mjs'
import { summarizeArticles, buildDigest } from './lib/summarize.mjs'
import { readArchive, mergeArchive, writeArchive } from './lib/store.mjs'
import { buildStats } from './lib/stats.mjs'
import { renderIndex, renderDay, renderArchiveIndex, dayKey } from './lib/render.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOCS = path.join(ROOT, 'docs')

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

  // 1. 既存の記事庫を読む
  const existing = await readArchive(ROOT)
  log(`  既存アーカイブ: ${existing.length}件`)

  // 2. 情報源を回る
  log(`  ${sources.length}件の情報源を確認中…`)
  const { articles: incoming, status } = await collectArticles(sources, { now })
  const okCount = status.filter((s) => s.ok).length
  log(`  取得成功 ${okCount}/${status.length} 情報源、記事 ${incoming.length}件（重複除去後）`)
  for (const s of status.filter((s) => !s.ok)) {
    log(`    × ${s.name}: ${s.note}`)
  }

  // 3. 新着だけを取り出す。要約済みの記事は作り直さない。
  const { merged, fresh } = mergeArchive(existing, incoming, { now })
  log(`  新着: ${fresh.length}件`)

  // 4. 新着のうち上位だけ本文取得と要約に回す（実行時間とAPI費用の歯止め）
  const ranked = [...fresh].sort((a, b) => {
    if (b.relevance !== a.relevance) return b.relevance - a.relevance
    return new Date(b.publishedAt) - new Date(a.publishedAt)
  })
  const primary = ranked.slice(0, site.maxArticlesPerRun)
  const overflow = ranked.slice(site.maxArticlesPerRun)
  if (overflow.length > 0) {
    log(`  ${overflow.length}件は上限超過のため本文取得を省略し、簡易要約で登録します`)
  }

  if (primary.length > 0) {
    log(`  ${primary.length}件の本文を取得中…`)
    await enrichArticles(primary)
    const withBody = primary.filter((a) => a.hasBody).length
    log(`    本文が取れた記事: ${withBody}/${primary.length}`)
  }

  // 5. 要約
  const toSummarize = [...primary, ...overflow]
  let engine = 'none'
  if (toSummarize.length > 0) {
    log(`  ${toSummarize.length}件を要約中…`)
    const result = await summarizeArticles(toSummarize)
    engine = result.engine
    for (const error of result.errors) log(`    ! ${error}`)
    log(`    要約エンジン: ${engine}`)
  }

  // 6. 表示対象を切り出す
  const windowCutoff = now.getTime() - site.windowDays * 24 * 60 * 60 * 1000
  const recent = merged.filter((a) => new Date(a.publishedAt).getTime() >= windowCutoff)

  const digest = recent.length > 0 ? await buildDigest(recent) : []
  if (digest.length > 0) log(`  本日の要点: ${digest.length}点`)

  const stats = buildStats({
    recent,
    archived: merged,
    status,
    freshCount: fresh.length,
    now,
  })

  const meta = {
    updatedAt: now.toISOString(),
    engine,
    sourcesOk: okCount,
    sourcesTotal: status.length,
    totalArticles: merged.length,
    recentArticles: recent.length,
    freshArticles: fresh.length,
    status,
  }

  if (dryRun) {
    log('  --dry-run のためファイルは書きません')
    printSample(recent)
    return okCount === 0 ? 1 : 0
  }

  // 7. 書き出し
  await writeArchive(ROOT, merged, meta)

  await fs.mkdir(path.join(DOCS, 'archive'), { recursive: true })
  await fs.writeFile(
    path.join(DOCS, 'index.html'),
    renderIndex({ articles: recent, digest, status, meta, stats }),
    'utf8',
  )

  const byDay = new Map()
  for (const article of merged) {
    const day = dayKey(article.publishedAt)
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day).push(article)
  }
  const days = [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  for (const [day, items] of days) {
    await fs.writeFile(
      path.join(DOCS, 'archive', `${day}.html`),
      renderDay({ day, articles: items, meta, stats }),
      'utf8',
    )
  }
  await fs.writeFile(
    path.join(DOCS, 'archive.html'),
    renderArchiveIndex({
      days: days.map(([day, items]) => ({ day, count: items.length })),
      meta,
      stats,
    }),
    'utf8',
  )
  // Pages が _ 始まりのパスを Jekyll 扱いしないようにする
  await fs.writeFile(path.join(DOCS, '.nojekyll'), '', 'utf8')

  log(`  書き出し完了: docs/index.html（${recent.length}件）、日別 ${days.length}ページ`)
  await writeStepSummary(meta, digest)

  // 1件も取得できないのは設定か回線の異常。CI を赤くして気づけるようにする。
  return okCount === 0 ? 1 : 0
}

function printSample(articles) {
  for (const article of articles.slice(0, 5)) {
    log(`\n  [${article.category}] ${article.title}`)
    log(`    ${article.publisher} / ${article.publishedAt}`)
    for (const line of article.summary || []) log(`    - ${line}`)
  }
}

/** GitHub Actions の実行結果画面に取得状況を出す */
async function writeStepSummary(meta, digest) {
  const target = process.env.GITHUB_STEP_SUMMARY
  if (!target) return
  const lines = [
    `## ${site.title}`,
    '',
    `- 情報源: ${meta.sourcesOk} / ${meta.sourcesTotal} 件から取得`,
    `- 新着: ${meta.freshArticles}件 / 表示中: ${meta.recentArticles}件 / 蓄積: ${meta.totalArticles}件`,
    `- 要約エンジン: ${meta.engine}`,
    '',
  ]
  if (digest.length > 0) {
    lines.push('### 本日の要点', '', ...digest.map((p) => `- ${p}`), '')
  }
  const failed = meta.status.filter((s) => !s.ok)
  if (failed.length > 0) {
    lines.push('### 取得できなかった情報源', '')
    for (const s of failed) lines.push(`- **${s.name}** — ${s.note}`)
  }
  await fs.appendFile(target, `${lines.join('\n')}\n`, 'utf8')
}

main()
  .then((code) => {
    process.exitCode = code
  })
  .catch((err) => {
    console.error('生成に失敗しました:', err)
    process.exitCode = 1
  })
