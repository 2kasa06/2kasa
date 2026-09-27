// 収集結果から静的HTMLを組み立てる。外部のスクリプトやフォントは読まない。
//
// 画面は上から、市況ボード → 今日の要点 → ウォッチ銘柄 → ニュース一覧。
// 明暗はOSの設定に合わせて切り替わる。値の上下は色だけでなく ▲▼ と符号でも示す。

import { categories, markets, site, watchlist } from '../config.mjs'

export function escapeHtml(input) {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const dayParts = new Intl.DateTimeFormat('en-CA', { timeZone: site.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })

/** ISO文字列から日本時間の YYYY-MM-DD を作る */
export function dayKey(iso) {
  const parts = dayParts.formatToParts(new Date(iso))
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}`
}

const timeFmt = new Intl.DateTimeFormat('ja-JP', { timeZone: site.timeZone, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
const fullFmt = new Intl.DateTimeFormat('ja-JP', { timeZone: site.timeZone, year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })

const fmtTime = (iso) => timeFmt.format(new Date(iso))
const fmtFull = (iso) => fullFmt.format(new Date(iso))

export function formatNumber(value, digits = 2) {
  if (value == null || !Number.isFinite(value)) return '—'
  return value.toLocaleString('ja-JP', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** 変化率の表示。上下は ▲▼ と符号の両方で示し、色だけに頼らない。 */
function pctCell(value, { withArrow = true } = {}) {
  if (value == null || !Number.isFinite(value)) return '<span class="flat">—</span>'
  const dir = value > 0.005 ? 'up' : value < -0.005 ? 'down' : 'flat'
  const arrow = withArrow ? (dir === 'up' ? '▲' : dir === 'down' ? '▼' : '－') : ''
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±'
  return `<span class="${dir}">${arrow}${sign}${Math.abs(value).toFixed(2)}%</span>`
}

function dirOf(value) {
  if (value == null) return 'flat'
  return value > 0.005 ? 'up' : value < -0.005 ? 'down' : 'flat'
}

// --- 小さなグラフ ------------------------------------------------------

/**
 * 終値の折れ線。ホバーすると日付と値が出る（点の列は data-pts に持たせる）。
 * 線の色は期間中の上げ下げに合わせるが、意味は横の変化率の文字でも読める。
 */
function sparkline(points, { width = 180, height = 48, digits = 2, label = '' } = {}) {
  if (!points || points.length < 2) return '<div class="spark empty">データなし</div>'
  const values = points.map((p) => p.c)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pad = 3
  const x = (i) => (i / (points.length - 1)) * width
  const y = (v) => pad + (1 - (v - min) / span) * (height - pad * 2)
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.c).toFixed(1)}`).join('')
  const area = `${line}L${width},${height}L0,${height}Z`
  const dir = dirOf(((values.at(-1) - values[0]) / values[0]) * 100)
  const data = escapeHtml(JSON.stringify(points.map((p) => [p.t, p.c])))
  const first = points[0].t
  const last = points.at(-1).t

  return `<div class="spark ${dir}" data-pts="${data}" data-digits="${digits}">
  <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(`${label} ${first}〜${last}の終値の推移。最高${formatNumber(max, digits)}、最低${formatNumber(min, digits)}`)}">
    <path class="area" d="${area}"/>
    <path class="line" d="${line}" vector-effect="non-scaling-stroke"/>
    <line class="cross" x1="0" x2="0" y1="0" y2="${height}" vector-effect="non-scaling-stroke"/>
    <circle class="dot" r="3" cx="-10" cy="-10"/>
  </svg>
  <div class="tip" hidden></div>
</div>`
}

/** 52週の高値・安値のどこにいるか */
function rangeBar(quote, digits) {
  if (quote.high52 == null || quote.low52 == null || quote.high52 === quote.low52) return ''
  const pos = Math.min(100, Math.max(0, ((quote.last - quote.low52) / (quote.high52 - quote.low52)) * 100))
  return `<div class="range" title="52週レンジ内の位置 ${pos.toFixed(0)}%">
    <span class="range-lab">安 ${formatNumber(quote.low52, digits)}</span>
    <span class="range-track"><span class="range-mark" style="left:${pos.toFixed(1)}%"></span></span>
    <span class="range-lab">高 ${formatNumber(quote.high52, digits)}</span>
  </div>`
}

// --- 各セクション ------------------------------------------------------

function marketCard(item, quote) {
  if (!quote || quote.last == null) {
    return `<article class="mcard failed">
  <header><h3>${escapeHtml(item.name)}</h3></header>
  <p class="price">—</p>
  <p class="note">取得できませんでした</p>
</article>`
  }
  const unit = item.unit ? `<span class="unit">${escapeHtml(item.unit)}</span>` : ''
  const change = quote.change == null ? '' : `${quote.change > 0 ? '+' : quote.change < 0 ? '−' : '±'}${formatNumber(Math.abs(quote.change), item.digits)}`
  return `<article class="mcard${quote.stale ? ' stale' : ''}">
  <header>
    <h3>${escapeHtml(item.name)}${item.note ? ` <small>${escapeHtml(item.note)}</small>` : ''}</h3>
    <span class="asof">${escapeHtml(quote.asOf || '')}${quote.stale ? '・前回値' : ''}</span>
  </header>
  <p class="price">${formatNumber(quote.last, item.digits)}${unit}</p>
  <p class="chg">${pctCell(quote.changePct)} <span class="abs">${escapeHtml(change)}</span></p>
  ${sparkline(quote.spark, { digits: item.digits, label: item.name })}
  <dl class="periods">
    <div><dt>1週</dt><dd>${pctCell(quote.week, { withArrow: false })}</dd></div>
    <div><dt>1ヶ月</dt><dd>${pctCell(quote.month, { withArrow: false })}</dd></div>
    <div><dt>年初来</dt><dd>${pctCell(quote.ytd, { withArrow: false })}</dd></div>
  </dl>
  ${rangeBar(quote, item.digits)}
</article>`
}

function marketBoard(quotes) {
  const groups = [...new Set(markets.map((m) => m.group))]
  return groups
    .map(
      (group) => `<div class="mgroup">
  <h3 class="glabel">${escapeHtml(group)}</h3>
  <div class="mgrid">${markets.filter((m) => m.group === group).map((m) => marketCard(m, quotes[m.id])).join('\n')}</div>
</div>`,
    )
    .join('\n')
}

function watchTable(quotes, articles) {
  if (watchlist.length === 0) return '<p class="muted">ウォッチ銘柄は未設定です。invest/config.mjs の watchlist に追加してください。</p>'
  const rows = watchlist
    .map((w) => {
      const q = quotes[w.code] || {}
      const related = articles.filter((a) => (a.tickers || []).includes(w.code))
      const latest = related[0]
      return `<tr data-code="${escapeHtml(w.code)}">
  <th scope="row"><span class="wname">${escapeHtml(w.name)}</span><span class="wcode">${escapeHtml(w.code)}</span></th>
  <td class="num">${q.last == null ? '—' : `${formatNumber(q.last, w.digits ?? 2)}<span class="unit">${escapeHtml(w.unit || '')}</span>`}${q.stale ? '<span class="stale-tag">前回値</span>' : ''}</td>
  <td class="num">${pctCell(q.changePct)}</td>
  <td class="num hide-sm">${pctCell(q.week, { withArrow: false })}</td>
  <td class="num hide-sm">${pctCell(q.month, { withArrow: false })}</td>
  <td class="spark-cell hide-sm">${q.spark ? sparkline(q.spark.slice(-42), { width: 120, height: 32, digits: w.digits ?? 2, label: w.name }) : ''}</td>
  <td class="wnews">${
    related.length > 0
      ? `<button type="button" class="linkish" data-filter-ticker="${escapeHtml(w.code)}">${related.length}件</button> <a href="${escapeHtml(latest.link)}" target="_blank" rel="noopener">${escapeHtml(latest.title)}</a>`
      : '<span class="muted">関連ニュースなし</span>'
  }</td>
</tr>`
    })
    .join('\n')
  return `<div class="table-wrap"><table class="watch">
  <thead><tr><th scope="col">銘柄</th><th scope="col" class="num">現在値</th><th scope="col" class="num">前日比</th><th scope="col" class="num hide-sm">1週</th><th scope="col" class="num hide-sm">1ヶ月</th><th scope="col" class="hide-sm">2ヶ月の推移</th><th scope="col">関連ニュース</th></tr></thead>
  <tbody>${rows}</tbody>
</table></div>`
}

const SENTIMENT_LABEL = { positive: '追い風', negative: '向かい風', neutral: '中立' }
const SENTIMENT_ICON = { positive: '▲', negative: '▼', neutral: '－' }

function articleCard(article) {
  const cat = categories.find((c) => c.id === article.category)
  const sentiment = article.sentiment || 'neutral'
  const tickers = article.tickers || []
  const watchNames = tickers.map((code) => watchlist.find((w) => w.code === code)?.name).filter(Boolean)
  const tickerTags = watchNames.map((name) => `<span class="tag watch">${escapeHtml(name)}</span>`)
  // モデルが挙げた資産名のうち、ウォッチ銘柄と重なるものは二重に出さない
  const assetTags = (article.assets || [])
    .filter((name) => !watchNames.includes(name))
    .map((name) => `<span class="tag">${escapeHtml(name)}</span>`)
  const searchText = [article.title, ...(article.summary || []), article.impact, ...(article.assets || []), article.publisher].join(' ')

  return `<article class="news${article.importance === 'high' ? ' key' : ''}" data-cat="${escapeHtml(article.category || '')}" data-sent="${sentiment}" data-tickers="${escapeHtml(tickers.join(' '))}" data-text="${escapeHtml(searchText.toLowerCase())}">
  <div class="nmeta">
    <span class="cat">${escapeHtml(cat?.label || 'その他')}</span>
    <span class="sent sent-${sentiment}">${SENTIMENT_ICON[sentiment]} ${SENTIMENT_LABEL[sentiment]}</span>
    ${article.importance === 'high' ? '<span class="imp">★ 注目</span>' : ''}
    <time datetime="${escapeHtml(article.publishedAt)}">${escapeHtml(fmtTime(article.publishedAt))}</time>
  </div>
  <h3><a href="${escapeHtml(article.link)}" target="_blank" rel="noopener">${escapeHtml(article.title)}</a></h3>
  <ul class="summary">${(article.summary || []).map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
  ${article.impact ? `<p class="impact"><b>影響</b>${escapeHtml(article.impact)}</p>` : ''}
  <footer>
    <span class="pub">${escapeHtml(article.publisher)}${(article.via || []).length > 1 ? `<span class="muted">・${article.via.length}経路</span>` : ''}</span>
    ${tickerTags.join('')}${assetTags.join('')}
    ${article.generatedBy === 'extractive' ? '<span class="tag auto" title="Claude を使わず本文から機械的に抜き出した要約">自動抽出</span>' : ''}
  </footer>
</article>`
}

function newsFilters(articles) {
  const counts = new Map(categories.map((c) => [c.id, 0]))
  for (const a of articles) counts.set(a.category, (counts.get(a.category) || 0) + 1)
  const tickers = watchlist.filter((w) => articles.some((a) => (a.tickers || []).includes(w.code)))
  return `<div class="filters" role="group" aria-label="ニュースの絞り込み">
  <div class="chips" data-group="cat">
    <button type="button" class="chip on" data-value="">すべて <span class="n">${articles.length}</span></button>
    ${categories.map((c) => `<button type="button" class="chip" data-value="${c.id}" title="${escapeHtml(c.blurb)}">${escapeHtml(c.label)} <span class="n">${counts.get(c.id) || 0}</span></button>`).join('')}
  </div>
  <div class="row2">
    <label>向き <select data-group="sent">
      <option value="">すべて</option><option value="positive">▲ 追い風</option><option value="negative">▼ 向かい風</option><option value="neutral">－ 中立</option>
    </select></label>
    <label>銘柄 <select data-group="ticker">
      <option value="">すべて</option>${tickers.map((w) => `<option value="${escapeHtml(w.code)}">${escapeHtml(w.name)}</option>`).join('')}
    </select></label>
    <label class="only-key"><input type="checkbox" data-group="key"> 注目のみ</label>
    <input type="search" data-group="q" placeholder="キーワードで検索" aria-label="キーワードで検索">
  </div>
  <p class="count" aria-live="polite"></p>
</div>`
}

/** カテゴリ別の件数。1系列なので色は1つ、値は棒の横に文字で出す。 */
function categoryBars(articles) {
  const rows = categories.map((c) => ({ label: c.label, n: articles.filter((a) => a.category === c.id).length }))
  const max = Math.max(1, ...rows.map((r) => r.n))
  return `<div class="bars" role="table" aria-label="カテゴリ別の記事数">
  ${rows
    .map(
      (r) => `<div class="bar-row" role="row"><span class="bar-lab" role="rowheader">${escapeHtml(r.label)}</span><span class="bar-track" role="cell"><span class="bar-fill" style="width:${((r.n / max) * 100).toFixed(1)}%"></span></span><span class="bar-n" role="cell">${r.n}</span></div>`,
    )
    .join('')}
</div>`
}

function statusList(status) {
  const ok = status.filter((s) => s.ok).length
  return `<details class="status">
  <summary>情報源の取得状況（${ok} / ${status.length} 件成功）</summary>
  <ul>${status
    .map((s) => `<li class="${s.ok ? 'ok' : 'ng'}"><span>${s.ok ? '✓' : '×'}</span> ${escapeHtml(s.name)} <span class="muted">${s.ok ? `${s.picked}件` : escapeHtml(s.note).slice(0, 160)}</span></li>`)
    .join('')}</ul>
</details>`
}

// --- ページの枠 --------------------------------------------------------

const UP = site.upDownStyle === 'global' ? ['#1a8a4a', '#3fbf74'] : ['#d23a2e', '#ff6b5e']
const DOWN = site.upDownStyle === 'global' ? ['#d23a2e', '#ff6b5e'] : ['#1f63c7', '#6aa4ff']

const CSS = `
:root {
  color-scheme: light;
  --bg: #f6f6f3; --surface: #ffffff; --surface-2: #f0efea; --line: #e2e0d8;
  --ink: #16161a; --ink-2: #4d4c48; --muted: #7a7872;
  --accent: #2a78d6; --accent-soft: #e5effb;
  --up: ${UP[0]}; --down: ${DOWN[0]};
  --key: #b26b00; --key-soft: #fff4de;
  --radius: 10px;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --bg: #111113; --surface: #1a1a1d; --surface-2: #232327; --line: #2f2f34;
    --ink: #f2f2ef; --ink-2: #c3c2b7; --muted: #8d8c86;
    --accent: #5a9bea; --accent-soft: #1b2a3d;
    --up: ${UP[1]}; --down: ${DOWN[1]};
    --key: #f0b24a; --key-soft: #2e2415;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --bg: #111113; --surface: #1a1a1d; --surface-2: #232327; --line: #2f2f34;
  --ink: #f2f2ef; --ink-2: #c3c2b7; --muted: #8d8c86;
  --accent: #5a9bea; --accent-soft: #1b2a3d;
  --up: ${UP[1]}; --down: ${DOWN[1]};
  --key: #f0b24a; --key-soft: #2e2415;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0; background: var(--bg); color: var(--ink);
  font: 15px/1.7 system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", "Yu Gothic UI", Meiryo, sans-serif;
  font-feature-settings: "palt";
}
a { color: inherit; }
.wrap { max-width: 1180px; margin: 0 auto; padding: 0 16px; }
.muted { color: var(--muted); }
.up { color: var(--up); } .down { color: var(--down); } .flat { color: var(--muted); }
.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }

.top { background: var(--surface); border-bottom: 1px solid var(--line); }
.top .wrap { display: flex; flex-wrap: wrap; gap: 8px 24px; align-items: baseline; justify-content: space-between; padding-top: 18px; padding-bottom: 14px; }
.top h1 { margin: 0; font-size: 22px; letter-spacing: .02em; }
.top h1 a { text-decoration: none; }
.top .sub { margin: 2px 0 0; color: var(--ink-2); font-size: 13px; }
.top nav { display: flex; gap: 16px; font-size: 14px; }
.top nav a { color: var(--ink-2); text-decoration: none; }
.top nav a[aria-current] { color: var(--ink); font-weight: 700; }
.updated { font-size: 12px; color: var(--muted); }

section { margin: 28px 0; }
section > h2 { font-size: 17px; margin: 0 0 12px; display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; }
section > h2 > small { flex: 1 1 14em; }
section > h2 small { font-weight: 400; font-size: 12px; color: var(--muted); }

.mgroup + .mgroup { margin-top: 16px; }
.glabel { font-size: 12px; color: var(--muted); font-weight: 600; margin: 0 0 6px; letter-spacing: .08em; }
.mgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
.mcard { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 12px 14px; min-width: 0; }
.mcard header { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.mcard h3 { margin: 0; font-size: 13px; font-weight: 600; color: var(--ink-2); }
.mcard h3 small { color: var(--muted); font-weight: 400; }
.mcard .asof { font-size: 11px; color: var(--muted); white-space: nowrap; }
.mcard .price { margin: 4px 0 0; font-size: 24px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.25; }
.unit { font-size: 12px; font-weight: 400; color: var(--muted); margin-left: 3px; }
.mcard .chg { margin: 0 0 6px; font-weight: 600; font-variant-numeric: tabular-nums; }
.mcard .abs { color: var(--ink-2); font-weight: 400; font-size: 13px; margin-left: 4px; }
.mcard.stale { border-style: dashed; }
.mcard.failed .note { color: var(--muted); font-size: 13px; margin: 0; }
.periods { display: grid; grid-template-columns: repeat(3, 1fr); margin: 8px 0 0; font-size: 12px; }
.periods div { text-align: center; }
.periods dt { color: var(--muted); }
.periods dd { margin: 0; font-variant-numeric: tabular-nums; }
.range { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; }
.range-track { position: relative; flex: 1; height: 4px; border-radius: 2px; background: var(--surface-2); }
.range-mark { position: absolute; top: -3px; width: 10px; height: 10px; margin-left: -5px; border-radius: 50%; background: var(--ink); border: 2px solid var(--surface); }

.spark { position: relative; height: 48px; }
.spark-cell .spark { height: 32px; width: 120px; }
.spark svg { display: block; width: 100%; height: 100%; overflow: visible; }
.spark .line { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; stroke: var(--muted); }
.spark .area { fill: var(--muted); opacity: .08; stroke: none; }
.spark.up .line { stroke: var(--up); } .spark.up .area { fill: var(--up); }
.spark.down .line { stroke: var(--down); } .spark.down .area { fill: var(--down); }
.spark .cross { stroke: var(--ink-2); stroke-width: 1; opacity: 0; }
.spark .dot { fill: var(--ink); stroke: var(--surface); stroke-width: 2; opacity: 0; }
.spark.hover .cross, .spark.hover .dot { opacity: 1; }
.spark .tip { position: absolute; bottom: -26px; transform: translateX(-50%); background: var(--ink); color: var(--bg); font-size: 11px; padding: 2px 7px; border-radius: 6px; white-space: nowrap; pointer-events: none; z-index: 2; font-variant-numeric: tabular-nums; }
.spark.empty { font-size: 12px; color: var(--muted); display: flex; align-items: center; }

.digest { background: var(--surface); border: 1px solid var(--line); border-left: 4px solid var(--accent); border-radius: var(--radius); padding: 14px 18px; }
.digest ol { margin: 0; padding-left: 1.4em; }
.digest li + li { margin-top: 6px; }

.table-wrap { overflow-x: auto; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); }
table.watch { width: 100%; border-collapse: collapse; font-size: 14px; }
.watch th, .watch td { padding: 9px 12px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: middle; }
.watch thead th { font-size: 12px; color: var(--muted); font-weight: 600; background: var(--surface-2); }
.watch th.num, .watch td.num { text-align: right; }
.watch tbody tr:last-child > * { border-bottom: 0; }
.wname { display: block; font-weight: 600; min-width: 7.5em; }
.wcode { font-size: 12px; color: var(--muted); font-weight: 400; }
.wnews { min-width: 220px; font-size: 13px; }
.wnews a { color: var(--ink-2); }
.stale-tag { margin-left: 6px; font-size: 11px; color: var(--muted); border: 1px dashed var(--line); padding: 0 4px; border-radius: 4px; }
.linkish { font: inherit; color: var(--accent); background: none; border: 0; padding: 0; cursor: pointer; text-decoration: underline; }

.cols { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 24px; align-items: start; }
.side > * + * { margin-top: 16px; }
.panel { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px; }
.panel h3 { margin: 0 0 10px; font-size: 14px; }

.filters { position: sticky; top: 0; z-index: 3; background: var(--bg); padding: 8px 0 6px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font: inherit; font-size: 13px; border: 1px solid var(--line); background: var(--surface); color: var(--ink-2); border-radius: 999px; padding: 3px 12px; cursor: pointer; min-height: 32px; }
.chip .n { color: var(--muted); font-variant-numeric: tabular-nums; }
.chip.on { background: var(--ink); color: var(--bg); border-color: var(--ink); }
.chip.on .n { color: inherit; opacity: .7; }
.row2 { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; margin-top: 8px; font-size: 13px; color: var(--ink-2); }
.row2 select, .row2 input[type=search] { font: inherit; color: var(--ink); background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 4px 8px; min-height: 32px; }
.row2 input[type=search] { flex: 1; min-width: 160px; }
.count { margin: 6px 0 0; font-size: 12px; color: var(--muted); }

.news { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px 16px; margin-top: 10px; }
.news.key { border-left: 4px solid var(--key); }
.nmeta { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center; font-size: 12px; color: var(--muted); }
.cat { color: var(--ink-2); font-weight: 600; }
.sent { font-weight: 600; }
.sent-positive { color: var(--up); } .sent-negative { color: var(--down); } .sent-neutral { color: var(--muted); }
.imp { color: var(--key); font-weight: 700; }
.nmeta time { margin-left: auto; font-variant-numeric: tabular-nums; }
.news h3 { margin: 6px 0 6px; font-size: 16px; line-height: 1.5; }
.news h3 a { text-decoration: none; }
.news h3 a:hover { text-decoration: underline; }
.summary { margin: 0; padding-left: 1.2em; color: var(--ink-2); font-size: 14px; }
.impact { margin: 8px 0 0; font-size: 13px; background: var(--surface-2); border-radius: 6px; padding: 6px 10px; }
.impact b { font-size: 11px; color: var(--muted); margin-right: 8px; }
.news footer { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 10px; font-size: 12px; }
.pub { color: var(--ink-2); margin-right: 4px; }
.tag { border: 1px solid var(--line); border-radius: 999px; padding: 0 8px; color: var(--ink-2); }
.tag.watch { background: var(--accent-soft); border-color: transparent; color: var(--ink); }
.tag.auto { border-style: dashed; color: var(--muted); }
.empty-note { text-align: center; color: var(--muted); padding: 30px 0; }

.bars { display: grid; gap: 6px; font-size: 12px; }
.bar-row { display: grid; grid-template-columns: 7.5em 1fr 2em; gap: 8px; align-items: center; }
.bar-lab { color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar-track { height: 10px; }
.bar-fill { display: block; height: 100%; background: var(--accent); border-radius: 0 4px 4px 0; min-width: 2px; }
.bar-n { text-align: right; font-variant-numeric: tabular-nums; color: var(--ink-2); }

details.status summary { cursor: pointer; font-size: 13px; color: var(--ink-2); }
details.status ul { list-style: none; padding: 0; margin: 8px 0 0; font-size: 12px; }
details.status li { padding: 2px 0; overflow-wrap: anywhere; }
details.status li.ok span:first-child { color: var(--accent); }
details.status li.ng span:first-child { color: var(--down); }

.days { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.days a { display: flex; justify-content: space-between; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 8px 12px; text-decoration: none; font-variant-numeric: tabular-nums; }

.foot { border-top: 1px solid var(--line); margin-top: 40px; padding: 20px 0 40px; font-size: 12px; color: var(--muted); }
.foot p { margin: 4px 0; }
.disclaimer { background: var(--surface-2); border-radius: 8px; padding: 10px 12px; color: var(--ink-2); }

@media (max-width: 900px) {
  .cols { grid-template-columns: 1fr; }
  .side { order: -1; }
}
@media (max-width: 640px) {
  .hide-sm { display: none; }
  .mgrid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .mcard { padding: 10px; }
  .mcard .price { font-size: 19px; }
  .mcard header { flex-direction: column; gap: 0; }
  .range-lab { display: none; }
  .periods { font-size: 11px; gap: 2px; letter-spacing: -.02em; }
  .watch th, .watch td { padding: 8px; }
  .wnews { min-width: 180px; }
  .nmeta time { margin-left: 0; }
}
@media (prefers-reduced-motion: no-preference) {
  .news, .mcard { transition: border-color .15s; }
}
`

// ホバーで値を出す処理と、ニュースの絞り込み。外部ライブラリは使わない。
const SCRIPT = `
(() => {
  const fmt = (v, d) => v.toLocaleString('ja-JP', { minimumFractionDigits: d, maximumFractionDigits: d })
  for (const el of document.querySelectorAll('.spark[data-pts]')) {
    let pts
    try { pts = JSON.parse(el.dataset.pts) } catch { continue }
    const d = Number(el.dataset.digits || 2)
    const svg = el.querySelector('svg')
    const vb = svg.viewBox.baseVal
    const vals = pts.map((p) => p[1])
    const min = Math.min(...vals), max = Math.max(...vals), span = (max - min) || 1
    const cross = el.querySelector('.cross'), dot = el.querySelector('.dot'), tip = el.querySelector('.tip')
    const move = (clientX) => {
      const r = svg.getBoundingClientRect()
      const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
      const i = Math.round(ratio * (pts.length - 1))
      const x = (i / (pts.length - 1)) * vb.width
      const y = 3 + (1 - (pts[i][1] - min) / span) * (vb.height - 6)
      cross.setAttribute('x1', x); cross.setAttribute('x2', x)
      dot.setAttribute('cx', x); dot.setAttribute('cy', y)
      tip.textContent = pts[i][0] + '  ' + fmt(pts[i][1], d)
      tip.style.left = (i / (pts.length - 1)) * 100 + '%'
      tip.hidden = false
      el.classList.add('hover')
    }
    const leave = () => { tip.hidden = true; el.classList.remove('hover') }
    el.addEventListener('pointermove', (e) => move(e.clientX))
    el.addEventListener('pointerleave', leave)
  }

  const list = document.querySelector('[data-news]')
  if (!list) return
  const items = [...list.querySelectorAll('.news')]
  const state = { cat: '', sent: '', ticker: '', key: false, q: '' }
  const countEl = document.querySelector('.filters .count')
  const empty = list.querySelector('.empty-note')
  const apply = () => {
    const q = state.q.trim().toLowerCase()
    let shown = 0
    for (const it of items) {
      const ok = (!state.cat || it.dataset.cat === state.cat)
        && (!state.sent || it.dataset.sent === state.sent)
        && (!state.ticker || it.dataset.tickers.split(' ').includes(state.ticker))
        && (!state.key || it.classList.contains('key'))
        && (!q || it.dataset.text.includes(q))
      it.hidden = !ok
      if (ok) shown++
    }
    if (countEl) countEl.textContent = shown + ' / ' + items.length + ' 件を表示'
    if (empty) empty.hidden = shown > 0
  }
  for (const chip of document.querySelectorAll('.chips[data-group=cat] .chip')) {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chips[data-group=cat] .chip').forEach((c) => c.classList.toggle('on', c === chip))
      state.cat = chip.dataset.value
      apply()
    })
  }
  const sent = document.querySelector('select[data-group=sent]')
  const ticker = document.querySelector('select[data-group=ticker]')
  const key = document.querySelector('input[data-group=key]')
  const q = document.querySelector('input[data-group=q]')
  sent && sent.addEventListener('change', () => { state.sent = sent.value; apply() })
  ticker && ticker.addEventListener('change', () => { state.ticker = ticker.value; apply() })
  key && key.addEventListener('change', () => { state.key = key.checked; apply() })
  q && q.addEventListener('input', () => { state.q = q.value; apply() })
  for (const btn of document.querySelectorAll('[data-filter-ticker]')) {
    btn.addEventListener('click', () => {
      if (ticker) ticker.value = btn.dataset.filterTicker
      state.ticker = btn.dataset.filterTicker
      apply()
      document.getElementById('news').scrollIntoView({ behavior: 'smooth' })
    })
  }
  apply()
})()
`

function page({ title, body, base = '', current = 'index', meta, banner = '' }) {
  return `<!doctype html>
<html lang="${site.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(site.subtitle)}">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#2a78d6"/><path d="M6 22l6-7 5 4 9-10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>')}">
<style>${CSS}</style>
</head>
<body>
${banner}
<header class="top"><div class="wrap">
  <div>
    <h1><a href="${base}index.html">${escapeHtml(site.title)}</a></h1>
    <p class="sub">${escapeHtml(site.subtitle)}</p>
  </div>
  <div>
    <nav aria-label="ページ">
      <a href="${base}index.html"${current === 'index' ? ' aria-current="page"' : ''}>今日</a>
      <a href="${base}archive.html"${current === 'archive' ? ' aria-current="page"' : ''}>過去のニュース</a>
    </nav>
    ${meta?.updatedAt ? `<div class="updated">最終更新 ${escapeHtml(fmtFull(meta.updatedAt))}</div>` : ''}
  </div>
</div></header>
<main class="wrap">
${body}
</main>
<footer class="wrap foot">
  <p class="disclaimer">このページは公開情報を自動で集めて要約したものです。投資の勧誘や売買の推奨を目的としたものではありません。価格は遅延しており、要約には誤りが含まれることがあります。投資判断は必ず原文と一次情報を確認のうえ、ご自身の責任で行ってください。</p>
  ${meta ? `<p>要約: ${meta.engine === 'claude' ? 'Claude による要約' : meta.engine === 'extractive' ? '本文からの自動抽出（Claude 未使用）' : '今回の新着なし'} ／ 価格データ: Yahoo Finance（予備: Stooq）／ 情報源 ${meta.sourcesOk ?? '—'} / ${meta.sourcesTotal ?? '—'} 件から取得</p>` : ''}
</footer>
<script>${SCRIPT}</script>
</body>
</html>
`
}

function newsSection(articles, { heading = 'ニュース', note = '' } = {}) {
  return `<section id="news">
  <h2>${escapeHtml(heading)} <small>${escapeHtml(note)}</small></h2>
  ${newsFilters(articles)}
  <div data-news>
    ${articles.map(articleCard).join('\n')}
    <p class="empty-note"${articles.length > 0 ? ' hidden' : ''}>該当するニュースはありません</p>
  </div>
</section>`
}

/** 記事の並び。注目 → 新しい順。 */
export function sortArticles(articles) {
  return [...articles].sort((a, b) => {
    const ka = a.importance === 'high' ? 1 : 0
    const kb = b.importance === 'high' ? 1 : 0
    if (ka !== kb) return kb - ka
    return new Date(b.publishedAt) - new Date(a.publishedAt)
  })
}

export function renderIndex({ articles, quotes, digest, status, meta, banner = '' }) {
  const sorted = sortArticles(articles)
  const body = `
<section id="market">
  <h2>マーケット <small>終値ベース・グラフは直近3ヶ月。点線の枠は取得に失敗し前回値を表示中</small></h2>
  ${marketBoard(quotes)}
</section>

${digest.length > 0 ? `<section id="digest">
  <h2>今日の要点</h2>
  <div class="digest"><ol>${digest.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ol></div>
</section>` : ''}

<section id="watch">
  <h2>ウォッチ銘柄 <small>invest/config.mjs で編集</small></h2>
  ${watchTable(quotes, sorted)}
</section>

<div class="cols">
  <div>${newsSection(sorted, { heading: 'ニュース', note: `直近${site.windowDays}日・注目順` })}</div>
  <aside class="side">
    <div class="panel"><h3>カテゴリ別の件数</h3>${categoryBars(sorted)}</div>
    <div class="panel">${statusList(status)}</div>
  </aside>
</div>`
  return page({ title: site.title, body, meta, banner })
}

export function renderDay({ day, articles, meta }) {
  const body = `${newsSection(sortArticles(articles), { heading: `${day} のニュース`, note: `${articles.length}件` })}
<p><a href="../archive.html">← 日付の一覧へ</a></p>`
  return page({ title: `${day} | ${site.title}`, body, base: '../', current: 'archive', meta })
}

export function renderArchiveIndex({ days, meta }) {
  const body = `<section>
  <h2>過去のニュース <small>直近${site.archiveDays}日分</small></h2>
  ${days.length === 0 ? '<p class="muted">まだありません</p>' : `<ul class="days">${days.map((d) => `<li><a href="archive/${d.day}.html"><span>${d.day}</span><span class="muted">${d.count}件</span></a></li>`).join('')}</ul>`}
</section>`
  return page({ title: `過去のニュース | ${site.title}`, body, current: 'archive', meta })
}
