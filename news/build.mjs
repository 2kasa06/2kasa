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
import { summarizeArticles, buildDigest, claudeAvailable } from './lib/summarize.mjs'
import {
  readArchive,
  mergeArchive,
  writeArchive,
  selectRetryTargets,
  selectResummaryTargets,
  normalizeArchive,
} from './lib/store.mjs'
import { buildStats } from './lib/stats.mjs'
import { assignRegions } from './lib/region.mjs'
import { createResolver } from './lib/resolve.mjs'
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
  // キーが届いているかは、鍵そのものを出さずにここで分かるようにする。
  // 届いていないと黙って抽出型に落ちるため、原因の切り分けに時間がかかった。
  log(
    `  Claude の要約: ${claudeAvailable() ? '利用可（APIキーあり）' : '利用不可（APIキーが渡っていません）'}` +
      (process.env.ANTHROPIC_WORKSPACE_ID ? ' / ワークスペース指定あり' : ''),
  )

  // 1. 既存の記事庫を読む
  const stored = await readArchive(ROOT)
  // 設定を直したときに過去の記事も追随させる（見出しの整形・重複・対象判定）
  const existing = normalizeArchive(stored)
  log(`  既存アーカイブ: ${existing.length}件${stored.length !== existing.length ? `（${stored.length - existing.length}件を整理）` : ''}`)

  // 2. 情報源を回る
  log(`  ${sources.length}件の情報源を確認中…`)
  const { articles: incoming, status } = await collectArticles(sources, { now })
  const okCount = status.filter((s) => s.ok).length
  log(`  取得成功 ${okCount}/${status.length} 情報源、記事 ${incoming.length}件（重複除去後）`)
  // 何がどれだけ効いているか分からないと情報源を足し引きできないので、
  // 成功したものも件数を出す。
  for (const s of status) {
    log(s.ok ? `    ✓ ${s.name}: ${s.picked}件` : `    × ${s.name}: ${s.note}`)
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

  // 前回までに本文が取れなかった記事も、回数を区切って取り直す。
  // 新着が無い回でも、見出しのみの記事を救い上げられる。
  const retry = selectRetryTargets(merged, {
    skipKeys: new Set(fresh.map((a) => a.key)),
    limit: site.maxArticlesPerRun - primary.length,
    now,
  })
  if (retry.length > 0) log(`  本文が無い蓄積記事の取り直し: ${retry.length}件`)

  const toEnrich = [...primary, ...retry]
  let rescued = []

  if (toEnrich.length > 0) {
    // Google ニュースのリンクは JavaScript でしか飛ばないので、
    // 元記事に辿るにはブラウザが要る。詳しくは news/lib/resolve.mjs のコメント。
    const resolver = await createResolver()
    log(`  ${toEnrich.length}件の本文を取得中…（元URLの解決: ${resolver.available ? '有効' : '無効'}）`)
    if (!resolver.available) log(`    ! ${resolver.reason}`)

    for (const article of toEnrich) article.enrichAttempts = (article.enrichAttempts ?? 0) + 1
    const googleLinks = toEnrich.filter((a) => a.isGoogleLink).length

    try {
      await enrichArticles(toEnrich, { resolver })
    } finally {
      await resolver.close()
    }

    if (googleLinks > 0) {
      const resolved = googleLinks - toEnrich.filter((a) => a.isGoogleLink).length
      log(`    元URLを解決: ${resolved}/${googleLinks}件`)
    }
    log(`    本文が取れた記事: ${toEnrich.filter((a) => a.hasBody).length}/${toEnrich.length}`)

    // 取り直しで本文が取れた記事は、見出しだけで作った要約を作り直す
    rescued = retry.filter((a) => a.hasBody)
    if (rescued.length > 0) log(`    取り直しで本文が取れ、要約を作り直す記事: ${rescued.length}件`)
  }

  // 5. 要約
  // APIキーを後から設定したときに、抽出型で作った要約を書き直す。
  // これが無いと、蓄積済みの記事は一生そのままになる。
  const stale = claudeAvailable()
    ? selectResummaryTargets(merged, {
        skipKeys: new Set([...primary, ...overflow, ...rescued].map((a) => a.key)),
        limit: site.maxArticlesPerRun - primary.length - overflow.length - rescued.length,
        now,
      })
    : []
  if (stale.length > 0) log(`  抽出型で作った要約を Claude で書き直す: ${stale.length}件`)

  const toSummarize = [...primary, ...overflow, ...rescued, ...stale]
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

  // 地図にピンを立てるため、記事に地方を付ける。
  // 見出しと要約から判定するので、蓄積済みの記事にも後から付けられる。
  assignRegions(merged)

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

  // さくらインターネットに配信したとき、生成物を直接読ませないための設定。
  // 中身は PHP のログイン確認を通してから返す。ここに置いておかないと
  // rsync --delete で消えてしまう。GitHub Pages はこのファイルを無視する。
  await fs.writeFile(
    path.join(DOCS, '.htaccess'),
    [
      '# 生成物。PHP のログイン確認を通してのみ配信する。',
      '<IfModule mod_authz_core.c>',
      '  Require all denied',
      '</IfModule>',
      '<IfModule !mod_authz_core.c>',
      '  Order allow,deny',
      '  Deny from all',
      '</IfModule>',
      '',
    ].join('\n'),
    'utf8',
  )

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
