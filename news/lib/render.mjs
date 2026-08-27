// 収集・要約した記事から静的HTMLを組み立てる。テンプレートエンジンは使わない。

import { categories, site } from '../config.mjs'

export function escapeHtml(input) {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const dateFormat = new Intl.DateTimeFormat('ja-JP', {
  timeZone: site.timeZone,
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const dayFormat = new Intl.DateTimeFormat('ja-JP', {
  timeZone: site.timeZone,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
})

const stampFormat = new Intl.DateTimeFormat('ja-JP', {
  timeZone: site.timeZone,
  dateStyle: 'medium',
  timeStyle: 'short',
})

/** ISO文字列から Asia/Tokyo の YYYY-MM-DD を作る */
export function dayKey(iso) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: site.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso))
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}`
}

const CSS = `
:root {
  color-scheme: light dark;
  --bg: #f6f7f9;
  --surface: #ffffff;
  --surface-2: #eef1f5;
  --text: #14171c;
  --text-dim: #5c6472;
  --line: #dfe3ea;
  --accent: #1f5f4f;
  --accent-soft: #e2efea;
  --flag: #8a3324;
  --flag-soft: #f6e5e1;
  --radius: 12px;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f1216;
    --surface: #171b21;
    --surface-2: #1e242c;
    --text: #e7eaee;
    --text-dim: #98a2b1;
    --line: #2a313a;
    --accent: #6fc3a8;
    --accent-soft: #17302a;
    --flag: #e79b8a;
    --flag-soft: #341f1b;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP",
    "Yu Gothic Medium", "Meiryo", system-ui, sans-serif;
  line-height: 1.75;
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
}
.wrap { max-width: 780px; margin: 0 auto; padding: 0 20px 80px; }
a { color: inherit; }

header.top { border-bottom: 1px solid var(--line); margin-bottom: 28px; padding: 36px 0 22px; }
.brand { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
h1 { font-size: 1.6rem; margin: 0; letter-spacing: .02em; }
.tagline { color: var(--text-dim); font-size: .9rem; margin: 8px 0 0; }
.stamp { color: var(--text-dim); font-size: .8rem; margin-top: 14px; font-variant-numeric: tabular-nums; }
.stamp a { color: var(--accent); }

.digest { background: var(--accent-soft); border-radius: var(--radius); padding: 20px 22px; margin-bottom: 30px; }
.digest h2 { font-size: .95rem; margin: 0 0 10px; letter-spacing: .08em; color: var(--accent); }
.digest ul { margin: 0; padding-left: 1.2em; }
.digest li { margin-bottom: 6px; }
.digest li:last-child { margin-bottom: 0; }

.controls { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.chip {
  border: 1px solid var(--line); background: var(--surface); color: var(--text-dim);
  border-radius: 999px; padding: 5px 13px; font-size: .82rem; cursor: pointer;
  font-family: inherit; line-height: 1.5;
}
.chip[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: var(--bg); }
.search {
  width: 100%; margin: 12px 0 26px; padding: 10px 14px; font-size: .95rem;
  font-family: inherit; border: 1px solid var(--line); border-radius: var(--radius);
  background: var(--surface); color: var(--text);
}

.cat { margin-bottom: 40px; }
.cat > h2 { font-size: 1.05rem; margin: 0 0 2px; }
.cat > p.blurb { color: var(--text-dim); font-size: .82rem; margin: 0 0 16px; }

article.card {
  background: var(--surface); border: 1px solid var(--line);
  border-radius: var(--radius); padding: 18px 20px; margin-bottom: 14px;
}
article.card.is-key { border-color: var(--accent); }
.card h3 { font-size: 1.02rem; margin: 0 0 8px; line-height: 1.55; }
.card h3 a { text-decoration: none; }
.card h3 a:hover { text-decoration: underline; }
.meta { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center;
  color: var(--text-dim); font-size: .78rem; margin-bottom: 12px; }
.meta time { font-variant-numeric: tabular-nums; }
.badge { border-radius: 4px; padding: 1px 7px; font-size: .72rem; background: var(--surface-2); }
.badge.key { background: var(--flag-soft); color: var(--flag); font-weight: 700; }
.badge.thin { border: 1px dashed var(--line); background: transparent; }
.sum { margin: 0; padding: 0; list-style: none; }
.sum li { position: relative; padding-left: 1.05em; margin-bottom: 5px; }
.sum li::before { content: "—"; position: absolute; left: 0; color: var(--accent); }
.why { color: var(--text-dim); font-size: .82rem; margin: 10px 0 0; padding-top: 10px; border-top: 1px dashed var(--line); }

.empty { background: var(--surface); border: 1px dashed var(--line); border-radius: var(--radius);
  padding: 26px; text-align: center; color: var(--text-dim); }
#noresult { display: none; }

footer.bottom { border-top: 1px solid var(--line); margin-top: 50px; padding-top: 22px;
  color: var(--text-dim); font-size: .8rem; }
footer.bottom details { margin-top: 14px; }
footer.bottom summary { cursor: pointer; }
.srcs { list-style: none; padding: 0; margin: 12px 0 0; }
.srcs li { display: flex; gap: 8px; padding: 3px 0; border-bottom: 1px solid var(--line); }
.srcs .st { flex: none; width: 1.4em; }
.srcs .nm { flex: 1; }
.srcs .no { color: var(--text-dim); font-size: .74rem; word-break: break-all; }
.ok { color: var(--accent); }
.ng { color: var(--flag); }
`

const SCRIPT = `
(function () {
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));
  var search = document.getElementById('q');
  var cards = Array.prototype.slice.call(document.querySelectorAll('article.card'));
  var groups = Array.prototype.slice.call(document.querySelectorAll('.cat'));
  var noresult = document.getElementById('noresult');
  var active = 'all';

  function apply() {
    var needle = (search && search.value || '').trim().toLowerCase();
    var shown = 0;
    cards.forEach(function (card) {
      var byCat = active === 'all' || card.dataset.cat === active;
      var byText = !needle || card.dataset.text.indexOf(needle) !== -1;
      var visible = byCat && byText;
      card.hidden = !visible;
      if (visible) shown++;
    });
    groups.forEach(function (group) {
      group.hidden = !group.querySelector('article.card:not([hidden])');
    });
    if (noresult) noresult.style.display = shown === 0 ? 'block' : 'none';
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      active = chip.dataset.cat;
      chips.forEach(function (other) {
        other.setAttribute('aria-pressed', String(other === chip));
      });
      apply();
    });
  });
  if (search) search.addEventListener('input', apply);
})();
`

function renderCard(article, categoryId) {
  const isKey = article.importance === 'high'
  const summary = (article.summary || []).filter(Boolean)
  const searchText = [article.title, article.publisher, ...summary]
    .join(' ')
    .toLowerCase()

  return `
      <article class="card${isKey ? ' is-key' : ''}" data-cat="${escapeHtml(categoryId)}" data-text="${escapeHtml(searchText)}">
        <h3><a href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.title)}</a></h3>
        <div class="meta">
          ${isKey ? '<span class="badge key">要注目</span>' : ''}
          <span class="badge">${escapeHtml(article.publisher)}</span>
          <time datetime="${escapeHtml(article.publishedAt)}">${escapeHtml(dateFormat.format(new Date(article.publishedAt)))}</time>
          ${article.pickups > 1 ? `<span class="badge">${article.pickups}媒体が報道</span>` : ''}
          ${article.hasBody ? '' : '<span class="badge thin">見出しのみ</span>'}
        </div>
        <ul class="sum">
${summary.map((line) => `          <li>${escapeHtml(line)}</li>`).join('\n')}
        </ul>
        ${article.why ? `<p class="why">${escapeHtml(article.why)}</p>` : ''}
      </article>`
}

function renderGroups(articles) {
  // カテゴリが欠けている／古い版の記事を取りこぼさないよう、最後のカテゴリに寄せる
  const known = new Set(categories.map((c) => c.id))
  const fallbackId = categories[categories.length - 1].id
  const categoryOf = (article) =>
    known.has(article.category) ? article.category : fallbackId

  const groups = categories
    .map((category) => ({
      category,
      items: articles
        .filter((article) => categoryOf(article) === category.id)
        .sort((a, b) => {
          if ((a.importance === 'high') !== (b.importance === 'high')) {
            return a.importance === 'high' ? -1 : 1
          }
          return new Date(b.publishedAt) - new Date(a.publishedAt)
        }),
    }))
    .filter((group) => group.items.length > 0)

  if (groups.length === 0) {
    return '<p class="empty">この期間に該当する記事はありませんでした。</p>'
  }

  return groups
    .map(
      ({ category, items }) => `
    <section class="cat" id="${escapeHtml(category.id)}">
      <h2>${escapeHtml(category.label)}<span style="color:var(--text-dim);font-weight:400;font-size:.85rem;"> ${items.length}件</span></h2>
      <p class="blurb">${escapeHtml(category.blurb)}</p>
${items.map((article) => renderCard(article, category.id)).join('\n')}
    </section>`,
    )
    .join('\n')
}

function renderSourceStatus(status) {
  if (!status || status.length === 0) return ''
  const ok = status.filter((s) => s.ok).length
  return `
    <details>
      <summary>情報源の取得状況（${ok} / ${status.length} 件から取得）</summary>
      <ul class="srcs">
${status
  .map(
    (s) => `        <li><span class="st ${s.ok ? 'ok' : 'ng'}">${s.ok ? '✓' : '×'}</span><span class="nm">${escapeHtml(s.name)}${s.ok ? `<span class="no"> ${s.picked}件</span>` : ''}<br><span class="no">${escapeHtml(s.note || '')}</span></span></li>`,
  )
  .join('\n')}
      </ul>
      <p>× が続く情報源は <code>news/config.mjs</code> の <code>urls</code> を書き換えるか、行ごと消してください。</p>
    </details>`
}

function layout({ title, body, description }) {
  return `<!DOCTYPE html>
<html lang="${site.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="noindex">
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
${body}
</div>
<script>${SCRIPT}</script>
</body>
</html>
`
}

/** トップページ（直近 windowDays 日分） */
export function renderIndex({ articles, digest, status, meta }) {
  const chips = [{ id: 'all', label: 'すべて' }, ...categories.map((c) => ({ id: c.id, label: c.label }))]

  const body = `
<header class="top">
  <div class="brand"><h1>${escapeHtml(site.title)}</h1></div>
  <p class="tagline">${escapeHtml(site.subtitle)}</p>
  <p class="stamp">最終更新 ${escapeHtml(stampFormat.format(new Date(meta.updatedAt)))}　/　直近${site.windowDays}日で${articles.length}件　/　<a href="./archive.html">過去の記事</a></p>
</header>

${
  digest.length > 0
    ? `<section class="digest">
  <h2>本日の要点</h2>
  <ul>
${digest.map((point) => `    <li>${escapeHtml(point)}</li>`).join('\n')}
  </ul>
</section>`
    : ''
}

<div class="controls">
${chips
  .map(
    (chip, i) =>
      `  <button class="chip" type="button" data-cat="${escapeHtml(chip.id)}" aria-pressed="${i === 0}">${escapeHtml(chip.label)}</button>`,
  )
  .join('\n')}
</div>
<input class="search" id="q" type="search" placeholder="キーワードで絞り込む（施設名・地名・企業名など）" autocomplete="off">

${renderGroups(articles)}
<p class="empty" id="noresult">条件に合う記事はありません。</p>

<footer class="bottom">
  <p>要約は${meta.engine === 'claude' ? 'Claude が自動生成しています' : '本文から機械的に抜き出しています'}。必ず原文で確認してください。</p>
  ${renderSourceStatus(status)}
</footer>`

  return layout({ title: site.title, description: site.subtitle, body })
}

/** 日別アーカイブページ */
export function renderDay({ day, articles, meta }) {
  const body = `
<header class="top">
  <div class="brand"><h1>${escapeHtml(dayFormat.format(new Date(`${day}T12:00:00+09:00`)))}</h1></div>
  <p class="tagline">${escapeHtml(site.title)} — ${articles.length}件</p>
  <p class="stamp"><a href="../index.html">最新</a>　/　<a href="../archive.html">過去の記事</a></p>
</header>

${renderGroups(articles)}
<p class="empty" id="noresult">条件に合う記事はありません。</p>

<footer class="bottom">
  <p>要約は${meta.engine === 'claude' ? 'Claude が自動生成しています' : '本文から機械的に抜き出しています'}。必ず原文で確認してください。</p>
</footer>`

  return layout({
    title: `${day} | ${site.title}`,
    description: `${day} の${site.title}`,
    body,
  })
}

/** アーカイブ一覧 */
export function renderArchiveIndex({ days }) {
  const body = `
<header class="top">
  <div class="brand"><h1>過去の記事</h1></div>
  <p class="tagline">${escapeHtml(site.title)} — ${days.length}日分</p>
  <p class="stamp"><a href="./index.html">最新に戻る</a></p>
</header>

${
  days.length === 0
    ? '<p class="empty">まだ蓄積がありません。</p>'
    : `<ul class="srcs">
${days
  .map(
    ({ day, count }) =>
      `  <li><span class="nm"><a href="./archive/${escapeHtml(day)}.html">${escapeHtml(dayFormat.format(new Date(`${day}T12:00:00+09:00`)))}</a></span><span class="no">${count}件</span></li>`,
  )
  .join('\n')}
</ul>`
}
`
  return layout({ title: `過去の記事 | ${site.title}`, description: '日別アーカイブ', body })
}
