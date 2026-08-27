// 収集・要約した記事から静的HTMLを組み立てる。テンプレートエンジンは使わない。
//
// 見た目は HUD（ヘッドアップディスプレイ）風の一枚もの。暗い面に発光する線と
// 計器を並べる意匠なので、明暗の切り替えは持たせず暗い面に決め打ちしている。
// 背景色も body に明示して置く（親の地色を透かすと意匠が崩れるため）。

import { categories, site } from '../config.mjs'
import { dayKeyOf } from './daykey.mjs'

export { dayKeyOf as dayKey } from './daykey.mjs'

export function escapeHtml(input) {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const fmt = (opts) => new Intl.DateTimeFormat('ja-JP', { timeZone: site.timeZone, ...opts })
const dateFormat = fmt({ month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
const dayFormat = fmt({ year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
const stampFormat = fmt({ dateStyle: 'medium', timeStyle: 'short' })
const shortDay = fmt({ month: 'numeric', day: 'numeric' })

/**
 * カテゴリごとの色。検証済みの並び順をそのまま使う。
 * 順番自体が色覚多様性への安全装置なので、入れ替えない。
 * 色は必ずカテゴリ名の表示と一緒に出し、色だけで意味を運ばせない。
 */
const SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300']
const seriesOf = (categoryId) => {
  const index = categories.findIndex((c) => c.id === categoryId)
  return SERIES[(index < 0 ? 0 : index) % SERIES.length]
}

const CSS = `
:root {
  color-scheme: dark;
  --bg: #060d12;
  --panel: #0b1720;
  --panel-2: #0e1f2a;
  --line: #17384a;
  --line-soft: #102734;
  --cyan: #5fe0ff;
  --cyan-dim: #3d97b5;
  --amber: #ffb347;
  --text: #d5ecf5;
  --text-dim: #8bb0c1;
  --text-faint: #5d7f8e;
  --good: #0ca30c;
  --warning: #fab219;
  --critical: #d03b3b;
  --s1: ${SERIES[0]}; --s2: ${SERIES[1]}; --s3: ${SERIES[2]};
  --s4: ${SERIES[3]}; --s5: ${SERIES[4]}; --s6: ${SERIES[5]};
  --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}
* { box-sizing: border-box; }
html { background: var(--bg); }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP",
    "Yu Gothic Medium", Meiryo, system-ui, sans-serif;
  line-height: 1.8;
  font-size: 15px;
  -webkit-text-size-adjust: 100%;
  overflow-x: hidden;
}
/* 走査線。うっすら掛けるだけで、文字の可読性は落とさない。 */
body::before {
  content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 3;
  background: repeating-linear-gradient(180deg,
    rgba(95,224,255,.028) 0 1px, transparent 1px 3px);
}
/* 方眼。奥行きを出すための下地。 */
body::after {
  content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background:
    linear-gradient(rgba(23,56,74,.30) 1px, transparent 1px) 0 0 / 100% 44px,
    linear-gradient(90deg, rgba(23,56,74,.30) 1px, transparent 1px) 0 0 / 44px 100%;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, #000 20%, transparent 75%);
}
.wrap { position: relative; z-index: 1; max-width: 1180px; margin: 0 auto; padding: 0 18px 90px; }
a { color: inherit; }
.mono { font-family: var(--mono); font-variant-numeric: tabular-nums; }

/* ---- 枠。四隅の括弧が HUD らしさの芯 ---- */
.panel {
  position: relative; background: linear-gradient(160deg, var(--panel), var(--panel-2));
  border: 1px solid var(--line); margin-bottom: 14px;
}
.panel::before, .panel::after {
  content: ""; position: absolute; width: 12px; height: 12px; pointer-events: none;
  border-color: var(--cyan); border-style: solid; border-width: 0;
}
.panel::before { top: -1px; left: -1px; border-top-width: 2px; border-left-width: 2px; }
.panel::after { bottom: -1px; right: -1px; border-bottom-width: 2px; border-right-width: 2px; }
.panel > h2, .panel > .ph {
  display: flex; align-items: center; gap: 10px; margin: 0;
  padding: 9px 14px; border-bottom: 1px solid var(--line-soft);
  font-family: var(--mono); font-size: .72rem; font-weight: 600;
  letter-spacing: .18em; text-transform: uppercase; color: var(--cyan);
  background: rgba(95,224,255,.05);
}
.panel > h2 .jp, .panel > .ph .jp {
  font-family: inherit; letter-spacing: .1em; color: var(--text-dim);
  text-transform: none; font-size: .74rem;
}
.panel > h2 .code, .panel > .ph .code { margin-left: auto; color: var(--text-faint); letter-spacing: .1em; }
.panel .body { padding: 16px 18px; }

/* ---- 見出し帯 ---- */
header.top { padding: 26px 0 14px; }
.title-row { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
h1 { margin: 0; font-size: 1.45rem; letter-spacing: .12em; color: #eaf8ff;
     text-shadow: 0 0 18px rgba(95,224,255,.5); }
h1 .lead { color: var(--cyan); }
.sub { font-family: var(--mono); font-size: .68rem; letter-spacing: .3em;
       color: var(--cyan-dim); text-transform: uppercase; }
.tagline { color: var(--text-dim); font-size: .84rem; margin: 8px 0 0; }
.readout { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 14px;
           font-family: var(--mono); font-size: .72rem; color: var(--text-faint); }
.readout b { color: var(--text-dim); font-weight: 500; }
.readout a { color: var(--cyan); text-decoration: none; border-bottom: 1px solid var(--cyan-dim); }
.pulse { display: inline-block; width: 7px; height: 7px; border-radius: 50%;
         background: var(--good); box-shadow: 0 0 8px currentColor; animation: blink 2s infinite; }
.pulse.warning { background: var(--warning); }
.pulse.critical { background: var(--critical); }

/* ---- 流れる見出し ---- */
.ticker { position: relative; overflow: hidden; border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line); background: rgba(95,224,255,.045);
          margin-bottom: 18px; }
.ticker-track { display: inline-flex; gap: 34px; padding: 7px 0; white-space: nowrap;
                animation: slide 70s linear infinite; }
.ticker:hover .ticker-track { animation-play-state: paused; }
.ticker span { font-size: .78rem; color: var(--text-dim); }
.ticker span::before { content: "◆"; color: var(--cyan); margin-right: 9px; font-size: .6rem;
                       vertical-align: middle; }

/* ---- 計器の列 ---- */
.grid { display: grid; gap: 14px; }
.tiles { grid-template-columns: repeat(auto-fit, minmax(148px, 1fr)); margin-bottom: 14px; }
.tile { padding: 13px 15px; }
.tile .k { font-family: var(--mono); font-size: .64rem; letter-spacing: .16em;
           color: var(--text-faint); text-transform: uppercase; }
.tile .k .jp { display: block; font-family: inherit; letter-spacing: .06em;
               font-size: .72rem; color: var(--text-dim); text-transform: none; margin-top: 1px; }
.tile .v { font-family: var(--mono); font-size: 2.05rem; line-height: 1.1; margin-top: 7px;
           color: var(--cyan); text-shadow: 0 0 16px rgba(95,224,255,.32); }
.tile .v small { font-size: .8rem; color: var(--text-faint); margin-left: 3px; letter-spacing: .05em; }
.tile.amber .v { color: var(--amber); text-shadow: 0 0 16px rgba(255,179,71,.3); }

.cols { grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); align-items: start; }
.cols-2 { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
@media (max-width: 860px) { .cols { grid-template-columns: 1fr; } }

/* ---- 要点 ---- */
/* .digest は ul 自身に付くクラス。子孫セレクタでは既定の左余白が消えない。 */
ul.digest { margin: 0; padding: 0; }
.digest li { position: relative; list-style: none; padding-left: 22px; margin-bottom: 9px; }
.digest li:last-child { margin-bottom: 0; }
.digest li::before { content: "▸"; position: absolute; left: 0; color: var(--cyan); }

/* ---- 円弧ゲージ ---- */
.gauge { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.gauge svg { width: 100%; max-width: 210px; height: auto; }
.gauge .num { font-family: var(--mono); font-size: 2.1rem; fill: var(--cyan); }
.gauge .unit { font-family: var(--mono); font-size: .7rem; fill: var(--text-faint); }
.gauge .state { font-family: var(--mono); font-size: .74rem; letter-spacing: .1em; }
.gauge .state.good { color: var(--good); }
.gauge .state.warning { color: var(--warning); }
.gauge .state.critical { color: var(--critical); }
.arc-val { transition: stroke-dashoffset 1.5s cubic-bezier(.2,.8,.2,1); }

/* ---- 棒グラフ ---- */
.chart svg { width: 100%; height: auto; display: block; overflow: visible; }
.chart .bar { transition: transform 1s cubic-bezier(.2,.8,.2,1); transform-origin: bottom; }
.chart .axis { stroke: var(--line); stroke-width: 1; }
.chart .tick { font-family: var(--mono); font-size: 9px; fill: var(--text-faint); }
.chart .peak { font-family: var(--mono); font-size: 10px; fill: var(--cyan); }
.chart .hit { fill: transparent; cursor: crosshair; }
/* 棒は当たり判定の矩形より後ろに描かれるので、そのままだとポインタを奪って
   吹き出しが出ない。棒とラベルは判定から外す。 */
.chart .bar, .chart .peak, .chart .tick, .chart .axis { pointer-events: none; }
.chart .hit:hover + .bar, .chart .hit:focus + .bar { filter: brightness(1.45); }

/* 横棒。カテゴリ名と件数を必ず添えるので凡例は要らない。 */
.catbars { display: flex; flex-direction: column; gap: 9px; }
.catbar { display: grid; grid-template-columns: 13em 1fr 2.4em; align-items: center; gap: 10px;
          font-size: .78rem; }
.catbar .nm { color: var(--text-dim); }
.catbar .track { height: 9px; background: var(--line-soft); position: relative; overflow: hidden; }
/* span のままだと inline 要素で height が効かず、棒が描かれない */
.catbar .fill { display: block; height: 100%; border-radius: 0 3px 3px 0;
                transition: width 1.2s cubic-bezier(.2,.8,.2,1); }
.catbar .ct { font-family: var(--mono); text-align: right; color: var(--text); }
.catbar.zero .nm, .catbar.zero .ct { color: var(--text-faint); }

/* ---- 頻出タグ ---- */
.tags { display: flex; flex-wrap: wrap; gap: 7px; }
.tag { font-family: var(--mono); font-size: .72rem; padding: 3px 9px;
       border: 1px solid var(--line); background: rgba(95,224,255,.05); color: var(--text-dim); }
.tag b { color: var(--cyan); font-weight: 600; margin-left: 6px; }

/* ---- 絞り込み ---- */
.controls { display: flex; flex-wrap: wrap; gap: 7px; margin: 22px 0 10px; }
.chip { font-family: var(--mono); font-size: .74rem; letter-spacing: .05em; cursor: pointer;
        border: 1px solid var(--line); background: var(--panel); color: var(--text-dim);
        padding: 6px 13px; line-height: 1.5; }
.chip:hover { border-color: var(--cyan-dim); color: var(--text); }
.chip[aria-pressed="true"] { background: var(--cyan); border-color: var(--cyan); color: #04222c;
                             font-weight: 700; box-shadow: 0 0 14px rgba(95,224,255,.35); }
.chip .dot { display: inline-block; width: 7px; height: 7px; margin-right: 7px;
             vertical-align: middle; }
.search { width: 100%; margin-bottom: 26px; padding: 11px 14px; font-family: var(--mono);
          font-size: .86rem; border: 1px solid var(--line); background: var(--panel);
          color: var(--text); }
.search::placeholder { color: var(--text-faint); }
.search:focus { outline: none; border-color: var(--cyan); box-shadow: 0 0 14px rgba(95,224,255,.2); }

/* ---- 記事 ---- */
/* flex-wrap が無いと、flex-basis:100% の説明文が同じ行で場所を奪い、
   カテゴリ名が不自然に折り返される */
.cat-head { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 11px; margin: 30px 0 12px; }
.cat-head .mark { width: 4px; height: 20px; flex: none; }
.cat-head h2 { margin: 0; font-size: .95rem; letter-spacing: .05em; white-space: nowrap; }
.cat-head .n { font-family: var(--mono); font-size: .72rem; color: var(--text-faint);
               white-space: nowrap; }
.cat-head .blurb { flex-basis: 100%; margin: 0; font-size: .74rem; color: var(--text-faint); }

article.card { position: relative; background: var(--panel); border: 1px solid var(--line);
               border-left-width: 3px; padding: 15px 17px; margin-bottom: 10px; }
article.card:hover { border-color: var(--cyan-dim); background: var(--panel-2); }
article.card.is-key { box-shadow: inset 0 0 0 1px rgba(255,179,71,.28); }
.card h3 { font-size: .97rem; margin: 0 0 8px; line-height: 1.6; }
.card h3 a { text-decoration: none; }
.card h3 a:hover { color: var(--cyan); }
.meta { display: flex; flex-wrap: wrap; gap: 5px 9px; align-items: center;
        font-family: var(--mono); font-size: .68rem; color: var(--text-faint); margin-bottom: 11px; }
.badge { padding: 1px 7px; border: 1px solid var(--line); background: rgba(255,255,255,.02); }
.badge.key { border-color: var(--amber); color: var(--amber); font-weight: 700; }
.badge.multi { border-color: var(--cyan-dim); color: var(--cyan); }
.sum { margin: 0; padding: 0; list-style: none; font-size: .88rem; }
.sum li { position: relative; padding-left: 15px; margin-bottom: 4px; }
.sum li::before { content: ""; position: absolute; left: 0; top: .72em; width: 7px; height: 1px;
                  background: var(--cyan-dim); }
.why { margin: 11px 0 0; padding-top: 9px; border-top: 1px dashed var(--line-soft);
       font-size: .77rem; color: var(--text-faint); }

.empty { border: 1px dashed var(--line); padding: 34px; text-align: center;
         color: var(--text-faint); font-family: var(--mono); font-size: .8rem; }
#noresult { display: none; }

/* ---- 情報源 ---- */
.srcs { list-style: none; padding: 0; margin: 0; font-size: .76rem; }
.srcs li { display: flex; gap: 9px; padding: 5px 0; border-bottom: 1px solid var(--line-soft); }
.srcs .st { flex: none; width: 1.3em; font-family: var(--mono); }
.srcs .st.ok { color: var(--good); }
.srcs .st.ng { color: var(--critical); }
.srcs .nm { flex: 1; color: var(--text-dim); }
.srcs .no { color: var(--text-faint); font-size: .68rem; word-break: break-all;
            font-family: var(--mono); }
.srcs .ct { font-family: var(--mono); color: var(--text-faint); }
details summary { cursor: pointer; font-family: var(--mono); font-size: .74rem;
                  color: var(--text-dim); }
table.data { width: 100%; border-collapse: collapse; font-family: var(--mono); font-size: .72rem;
             margin-top: 10px; }
table.data th, table.data td { border: 1px solid var(--line-soft); padding: 3px 7px;
                               text-align: right; color: var(--text-dim); }
table.data th { color: var(--text-faint); font-weight: 400; }

footer.bottom { margin-top: 34px; color: var(--text-faint); font-size: .76rem; }

.demo-band { margin: 14px 0 0; padding: 8px 14px; border: 1px solid var(--amber);
             background: rgba(255,179,71,.09); color: var(--amber);
             font-family: var(--mono); font-size: .72rem; letter-spacing: .04em; }

/* ---- 吹き出し ---- */
#tip { position: fixed; z-index: 9; pointer-events: none; opacity: 0;
       background: #04141c; border: 1px solid var(--cyan-dim); padding: 5px 10px;
       font-family: var(--mono); font-size: .72rem; color: var(--text);
       box-shadow: 0 4px 20px rgba(0,0,0,.6); transition: opacity .12s; }

/* ---- 起動時に順に立ち上がる ---- */
@keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
@keyframes slide { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes sweep { 0% { transform: translateY(-100%); opacity: 0; }
                   12% { opacity: 1; } 100% { transform: translateY(1400%); opacity: 0; } }
.rise { animation: rise .5s cubic-bezier(.2,.8,.2,1) both; animation-delay: var(--d, 0ms); }
.scan { position: fixed; left: 0; right: 0; top: 0; height: 2px; z-index: 2; pointer-events: none;
        background: linear-gradient(90deg, transparent, rgba(95,224,255,.55), transparent);
        animation: sweep 7s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .rise, .ticker-track, .pulse, .scan { animation: none !important; }
  .scan { display: none; }
  .arc-val, .chart .bar, .catbar .fill { transition: none !important; }
}
@media (max-width: 560px) {
  h1 { font-size: 1.18rem; }
  .tile .v { font-size: 1.7rem; }
  .catbar { grid-template-columns: 8.4em 1fr 2.2em; font-size: .74rem; }
}
`

const SCRIPT = `
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- 現在時刻 --- */
  var clock = document.getElementById('clock');
  function tick() {
    if (!clock) return;
    clock.textContent = new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour12: false });
  }
  tick();
  setInterval(tick, 1000);

  /* --- 数字が上がっていく --- */
  function countUp(el) {
    var target = Number(el.dataset.value || 0);
    if (reduce || target === 0) { el.textContent = String(target); return; }
    var started = null;
    function step(now) {
      if (started === null) started = now;
      var p = Math.min((now - started) / 900, 1);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-value]'), countUp);

  /* --- 棒とゲージを伸ばす --- */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      Array.prototype.forEach.call(document.querySelectorAll('.catbar .fill'), function (el) {
        el.style.width = el.dataset.w;
      });
      Array.prototype.forEach.call(document.querySelectorAll('.chart .bar'), function (el) {
        el.style.transform = 'none';
      });
      Array.prototype.forEach.call(document.querySelectorAll('.arc-val'), function (el) {
        el.style.strokeDashoffset = el.dataset.off;
      });
    });
  });

  /* --- グラフの吹き出し --- */
  var tip = document.getElementById('tip');
  function showTip(e, text) {
    if (!tip) return;
    tip.textContent = text;
    tip.style.opacity = '1';
    var pad = 14;
    var x = Math.min(e.clientX + pad, window.innerWidth - tip.offsetWidth - 6);
    tip.style.left = Math.max(6, x) + 'px';
    tip.style.top = Math.max(6, e.clientY - tip.offsetHeight - 10) + 'px';
  }
  function hideTip() { if (tip) tip.style.opacity = '0'; }
  Array.prototype.forEach.call(document.querySelectorAll('[data-tip]'), function (el) {
    el.addEventListener('mousemove', function (e) { showTip(e, el.dataset.tip); });
    el.addEventListener('mouseleave', hideTip);
    el.addEventListener('focus', function () {
      var r = el.getBoundingClientRect();
      showTip({ clientX: r.left + r.width / 2, clientY: r.top }, el.dataset.tip);
    });
    el.addEventListener('blur', hideTip);
  });

  /* --- 絞り込み --- */
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));
  var search = document.getElementById('q');
  var cards = Array.prototype.slice.call(document.querySelectorAll('article.card'));
  var groups = Array.prototype.slice.call(document.querySelectorAll('.cat-group'));
  var noresult = document.getElementById('noresult');
  var active = 'all';

  function apply() {
    var needle = ((search && search.value) || '').trim().toLowerCase();
    var shown = 0;
    cards.forEach(function (card) {
      var visible = (active === 'all' || card.dataset.cat === active) &&
                    (!needle || card.dataset.text.indexOf(needle) !== -1);
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
      chips.forEach(function (o) { o.setAttribute('aria-pressed', String(o === chip)); });
      apply();
    });
  });
  if (search) search.addEventListener('input', apply);
})();
`

// ---- 部品 ----------------------------------------------------------------

let riseIndex = 0
const rise = () => ` class="rise" style="--d:${(riseIndex++ % 22) * 45}ms"`

function panel({ code, en, jp, body, className = '' }) {
  return `<section class="panel ${className}"${rise()}>
  <div class="ph"><span>${escapeHtml(en)}</span><span class="jp">${escapeHtml(jp)}</span><span class="code">${escapeHtml(code)}</span></div>
  <div class="body">${body}</div>
</section>`
}

function tile({ en, jp, value, unit = '', amber = false }) {
  return `<div class="panel tile${amber ? ' amber' : ''}"${rise()}>
  <div class="k">${escapeHtml(en)}<span class="jp">${escapeHtml(jp)}</span></div>
  <div class="v"><span class="mono" data-value="${Number(value)}">${Number(value)}</span>${unit ? `<small>${escapeHtml(unit)}</small>` : ''}</div>
</div>`
}

/** 上端だけ丸めた棒。底辺に接地させる。 */
function barPath(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, Math.max(h, 0))
  if (h <= 0) return ''
  return `M${x},${y + h}V${y + radius}a${radius},${radius} 0 0 1 ${radius},${-radius}h${w - radius * 2}a${radius},${radius} 0 0 1 ${radius},${radius}V${y + h}Z`
}

/** 直近14日の記事量。1系列なので凡例は置かず、最大値だけ直接ラベルする。 */
function dailyChart(daily) {
  const W = 560
  const H = 128
  const padBottom = 20
  const padTop = 14
  const max = Math.max(1, ...daily.map((d) => d.count))
  const slot = W / daily.length
  const barW = Math.max(6, slot - 6) // 棒の間に地色の隙間を残す

  const bars = daily
    .map((point, i) => {
      const h = point.count === 0 ? 0 : ((H - padTop - padBottom) * point.count) / max
      const x = i * slot + (slot - barW) / 2
      const y = H - padBottom - h
      const label = `${shortDay.format(new Date(`${point.day}T12:00:00+09:00`))} ${point.count}件`
      const isPeak = point.count === max && max > 0
      return `
    <g>
      <rect class="hit" x="${i * slot}" y="0" width="${slot}" height="${H - padBottom}"
            tabindex="0" role="img" aria-label="${escapeHtml(label)}" data-tip="${escapeHtml(label)}"></rect>
      ${h > 0 ? `<path class="bar" d="${barPath(x, y, barW, h, 3)}" fill="var(--cyan)" opacity="${isPeak ? '1' : '.62'}" style="transform:scaleY(0)"></path>` : ''}
      ${isPeak ? `<text class="peak" x="${x + barW / 2}" y="${y - 5}" text-anchor="middle">${point.count}</text>` : ''}
    </g>`
    })
    .join('')

  const ticks = daily
    .map((point, i) =>
      i % 2 === 1
        ? `<text class="tick" x="${i * slot + slot / 2}" y="${H - 6}" text-anchor="middle">${escapeHtml(shortDay.format(new Date(`${point.day}T12:00:00+09:00`)))}</text>`
        : '',
    )
    .join('')

  const table = `<details><summary>数値で見る</summary>
    <table class="data"><thead><tr><th>日付</th>${daily.map((d) => `<th>${escapeHtml(shortDay.format(new Date(`${d.day}T12:00:00+09:00`)))}</th>`).join('')}</tr></thead>
    <tbody><tr><th>件数</th>${daily.map((d) => `<td>${d.count}</td>`).join('')}</tr></tbody></table></details>`

  return `<div class="chart">
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="直近14日間の記事件数">
    <line class="axis" x1="0" y1="${H - padBottom}" x2="${W}" y2="${H - padBottom}"></line>
    ${bars}${ticks}
  </svg>
</div>${table}`
}

/** カテゴリ別の件数。名前と数値を必ず添えるので凡例は不要。 */
function categoryBars(byCategory) {
  const max = Math.max(1, ...byCategory.map((c) => c.count))
  return `<div class="catbars">
${byCategory
  .map(
    (c) => `  <div class="catbar${c.count === 0 ? ' zero' : ''}">
    <span class="nm">${escapeHtml(c.label)}</span>
    <span class="track"><span class="fill" style="width:0;background:${seriesOf(c.id)}" data-w="${Math.round((c.count / max) * 100)}%"></span></span>
    <span class="ct">${c.count}</span>
  </div>`,
  )
  .join('\n')}
</div>`
}

/** 情報源の稼働率。色だけでなく記号と文言でも状態を示す。 */
function sourceGauge(sources) {
  const R = 62
  const CX = 80
  const CY = 78
  const SWEEP = 240
  const START = 150
  const toXY = (deg) => [
    CX + R * Math.cos((deg * Math.PI) / 180),
    CY + R * Math.sin((deg * Math.PI) / 180),
  ]
  const [x1, y1] = toXY(START)
  const [x2, y2] = toXY(START + SWEEP)
  const track = `M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 1 1 ${x2.toFixed(1)},${y2.toFixed(1)}`
  const length = (SWEEP / 360) * 2 * Math.PI * R
  const offset = length * (1 - sources.rate)

  const label = { good: '正常', warning: '一部欠測', critical: '重度の欠測' }[sources.level]
  const mark = { good: '●', warning: '▲', critical: '■' }[sources.level]
  const color = { good: 'var(--good)', warning: 'var(--warning)', critical: 'var(--critical)' }[sources.level]

  return `<div class="gauge">
  <svg viewBox="0 0 160 118" role="img" aria-label="情報源の稼働率 ${Math.round(sources.rate * 100)}パーセント、${label}">
    <path d="${track}" fill="none" stroke="var(--line)" stroke-width="9" stroke-linecap="round"></path>
    <path class="arc-val" d="${track}" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round"
          stroke-dasharray="${length.toFixed(1)}" stroke-dashoffset="${length.toFixed(1)}" data-off="${offset.toFixed(1)}"></path>
    <text class="num" x="${CX}" y="82" text-anchor="middle">${Math.round(sources.rate * 100)}</text>
    <text class="unit" x="${CX}" y="98" text-anchor="middle">% ONLINE</text>
  </svg>
  <div class="state ${escapeHtml(sources.level)}"><span aria-hidden="true">${mark}</span> ${escapeHtml(label)} — ${sources.ok}/${sources.total} 系統</div>
</div>`
}

function tagCloud(tags) {
  if (tags.length === 0) return '<p class="empty">まだ傾向を出せるだけの記事がありません。</p>'
  return `<div class="tags">
${tags.map((t) => `  <span class="tag">${escapeHtml(t.word)}<b>${t.count}</b></span>`).join('\n')}
</div>`
}

function sourceList(status) {
  if (!status || status.length === 0) return ''
  return `<ul class="srcs">
${status
  .map(
    (s) => `  <li><span class="st ${s.ok ? 'ok' : 'ng'}" aria-hidden="true">${s.ok ? '✓' : '✕'}</span><span class="nm">${escapeHtml(s.name)}<br><span class="no">${escapeHtml(s.ok ? s.note || '' : (s.note || '').slice(0, 160))}</span></span><span class="ct">${s.ok ? `${s.picked}件` : '欠測'}</span></li>`,
  )
  .join('\n')}
</ul>`
}

function renderCard(article, categoryId) {
  const isKey = article.importance === 'high'
  const summary = (article.summary || []).filter(Boolean)
  const searchText = [article.title, article.publisher, ...summary].join(' ').toLowerCase()

  return `
      <article class="card${isKey ? ' is-key' : ''}" data-cat="${escapeHtml(categoryId)}" data-text="${escapeHtml(searchText)}" style="border-left-color:${seriesOf(categoryId)}">
        <h3><a href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.title)}</a></h3>
        <div class="meta">
          ${isKey ? '<span class="badge key">要注目</span>' : ''}
          <span class="badge">${escapeHtml(article.publisher)}</span>
          <time datetime="${escapeHtml(article.publishedAt)}">${escapeHtml(dateFormat.format(new Date(article.publishedAt)))}</time>
          ${article.pickups > 1 ? `<span class="badge multi">${article.pickups}媒体</span>` : ''}
          ${article.hasBody ? '' : '<span class="badge">見出しのみ</span>'}
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
  const categoryOf = (article) => (known.has(article.category) ? article.category : fallbackId)

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
    <section class="cat-group" id="${escapeHtml(category.id)}">
      <div class="cat-head">
        <span class="mark" style="background:${seriesOf(category.id)}"></span>
        <h2>${escapeHtml(category.label)}</h2>
        <span class="n">${items.length} 件</span>
        <p class="blurb">${escapeHtml(category.blurb)}</p>
      </div>
${items.map((article) => renderCard(article, category.id)).join('\n')}
    </section>`,
    )
    .join('\n')
}

function layout({ title, body, description }) {
  riseIndex = 0
  return `<!DOCTYPE html>
<html lang="${site.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#060d12">
<style>${CSS}</style>
</head>
<body>
<div class="scan" aria-hidden="true"></div>
<div id="tip" role="status" aria-live="polite"></div>
<div class="wrap">
${body}
</div>
<script>${SCRIPT}</script>
</body>
</html>
`
}

function pageHeader({ meta, stats, extra = '' }) {
  const demoBanner = meta.demo
    ? `<div class="demo-band">${escapeHtml(
        meta.demoNote ||
          '表示サンプル — ここに並んでいる記事・要約・数値はすべて design 確認用のダミーです。実際のニュースではありません。',
      )}</div>`
    : ''
  return `${demoBanner}<header class="top">
  <div class="title-row">
    <h1><span class="lead">◤</span> ${escapeHtml(site.title)}</h1>
    <span class="sub">Defense Facility Watch</span>
  </div>
  <p class="tagline">${escapeHtml(site.subtitle)}</p>
  <div class="readout">
    <span><span class="pulse ${escapeHtml(stats.sources.level)}" aria-hidden="true"></span> 系統 <b>${stats.sources.ok}/${stats.sources.total}</b></span>
    <span>現在 <b id="clock" class="mono">--:--:--</b> JST</span>
    <span>最終更新 <b>${escapeHtml(stampFormat.format(new Date(meta.updatedAt)))}</b></span>
    ${extra}
  </div>
</header>`
}

/** トップページ（直近 windowDays 日分） */
export function renderIndex({ articles, digest, status, meta, stats }) {
  const headlines = articles.slice(0, 18).map((a) => `<span>${escapeHtml(a.title)}</span>`).join('')
  const chips = [{ id: 'all', label: 'すべて' }, ...categories.map((c) => ({ id: c.id, label: c.label }))]

  const body = `
${pageHeader({ meta, stats, extra: '<span><a href="./archive.html">過去の記事 ▸</a></span>' })}

${
  headlines
    ? `<div class="ticker" aria-hidden="true"><div class="ticker-track">${headlines}${headlines}</div></div>`
    : ''
}

<div class="grid tiles">
${tile({ en: 'In Window', jp: `直近${stats.windowDays}日`, value: stats.totals.recent, unit: '件' })}
${tile({ en: 'New', jp: '今回の新着', value: stats.totals.fresh, unit: '件' })}
${tile({ en: 'Priority', jp: '要注目', value: stats.totals.key, unit: '件', amber: true })}
${tile({ en: 'Outlets', jp: '報道媒体', value: stats.totals.publishers, unit: '社' })}
${tile({ en: 'Archived', jp: '蓄積総数', value: stats.totals.archived, unit: '件' })}
</div>

<div class="grid cols">
  ${panel({
    code: 'SEC-01',
    en: 'Briefing',
    jp: '本日の要点',
    body:
      digest.length > 0
        ? `<ul class="digest">${digest.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>`
        : '<p class="empty">要点を出せるだけの記事がまだありません。</p>',
  })}
  ${panel({ code: 'SEC-02', en: 'Feed Status', jp: '情報源の稼働', body: sourceGauge(stats.sources) })}
</div>

<div class="grid cols-2">
  ${panel({ code: 'SEC-03', en: 'Volume · 14d', jp: '記事量の推移', body: dailyChart(stats.daily) })}
  ${panel({ code: 'SEC-04', en: 'By Category', jp: 'カテゴリ別', body: categoryBars(stats.byCategory) })}
</div>

${panel({ code: 'SEC-05', en: 'Frequent Terms', jp: '頻出する語', body: tagCloud(stats.tags) })}

<div class="controls">
${chips
  .map(
    (chip, i) =>
      `  <button class="chip" type="button" data-cat="${escapeHtml(chip.id)}" aria-pressed="${i === 0}">${
        i === 0 ? '' : `<span class="dot" style="background:${seriesOf(chip.id)}"></span>`
      }${escapeHtml(chip.label)}</button>`,
  )
  .join('\n')}
</div>
<input class="search" id="q" type="search" placeholder="&gt; キーワードで絞り込む（施設名・地名・企業名など）" autocomplete="off">

${renderGroups(articles)}
<p class="empty" id="noresult">条件に合う記事はありません。</p>

<footer class="bottom">
  ${panel({
    code: 'SEC-06',
    en: 'Source Log',
    jp: '情報源の取得結果',
    body: `<details><summary>${stats.sources.ok} / ${stats.sources.total} 系統から取得（詳細を開く）</summary>${sourceList(status)}
    <p>✕ が続く情報源は <code>news/config.mjs</code> の <code>urls</code> を書き換えるか、行ごと消してください。</p></details>
    <p style="margin-bottom:0">要約は${meta.engine === 'claude' ? 'Claude が自動生成しています' : '本文から機械的に抜き出しています'}。必ず原文で確認してください。</p>`,
  })}
</footer>`

  return layout({ title: site.title, description: site.subtitle, body })
}

/** 日別アーカイブページ */
export function renderDay({ day, articles, meta, stats }) {
  const body = `
${pageHeader({
  meta,
  stats,
  extra: `<span><a href="../index.html">最新 ▸</a></span><span><a href="../archive.html">一覧 ▸</a></span>`,
})}

${panel({
  code: 'ARC-01',
  en: 'Archive',
  jp: dayFormat.format(new Date(`${day}T12:00:00+09:00`)),
  body: `<p style="margin:0">この日の記事 <b class="mono">${articles.length}</b> 件</p>`,
})}

${renderGroups(articles)}
<p class="empty" id="noresult">条件に合う記事はありません。</p>

<footer class="bottom">
  <p>要約は${meta.engine === 'claude' ? 'Claude が自動生成しています' : '本文から機械的に抜き出しています'}。必ず原文で確認してください。</p>
</footer>`

  return layout({ title: `${day} | ${site.title}`, description: `${day} の${site.title}`, body })
}

/** アーカイブ一覧 */
export function renderArchiveIndex({ days, meta, stats }) {
  const max = Math.max(1, ...days.map((d) => d.count))
  const body = `
${pageHeader({ meta, stats, extra: '<span><a href="./index.html">最新 ▸</a></span>' })}

${panel({
  code: 'ARC-00',
  en: 'Archive Index',
  jp: '日別の記録',
  body:
    days.length === 0
      ? '<p class="empty">まだ蓄積がありません。</p>'
      : `<div class="catbars">
${days
  .map(
    ({ day, count }) => `  <div class="catbar">
    <span class="nm"><a href="./archive/${escapeHtml(day)}.html">${escapeHtml(day)}</a></span>
    <span class="track"><span class="fill" style="width:0;background:var(--cyan)" data-w="${Math.round((count / max) * 100)}%"></span></span>
    <span class="ct">${count}</span>
  </div>`,
  )
  .join('\n')}
</div>`,
})}
`
  return layout({ title: `過去の記事 | ${site.title}`, description: '日別アーカイブ', body })
}
