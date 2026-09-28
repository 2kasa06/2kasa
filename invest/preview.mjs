#!/usr/bin/env node
// 作り物のデータで画面だけを組む。外に出ないので、見た目をいじるときはこれが速い。
//
//   node invest/preview.mjs   → dist-invest-preview/index.html
//
// 生成物には「表示サンプル」の帯が出るので、実データと取り違えることはない。

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { markets, watchlist } from './config.mjs'
import { summarizeSeries } from './lib/market.mjs'
import { writeSite } from './build.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'dist-invest-preview')

// 再現できる乱数（毎回同じ絵になるように）
let seed = 42
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

function series(start, drift, vol, days = 260) {
  const points = []
  let v = start
  const day = new Date('2025-10-01T00:00:00Z')
  while (points.length < days) {
    day.setUTCDate(day.getUTCDate() + 1)
    if (day.getUTCDay() === 0 || day.getUTCDay() === 6) continue
    v *= 1 + drift + (rand() - 0.5) * vol
    points.push({ t: day.toISOString().slice(0, 10), c: v })
  }
  return points
}

const BASES = {
  n225: [38000, 0.0008, 0.028], topix: [2800, 0.0006, 0.024], spx: [5600, 0.0006, 0.022], ndq: [17800, 0.0008, 0.03],
  dji: [42000, 0.0004, 0.018], vix: [16, -0.0005, 0.12], usdjpy: [148, 0.0001, 0.012], eurjpy: [160, 0.0002, 0.012],
  us10y: [4.2, -0.0003, 0.03], gold: [2600, 0.0012, 0.02], wti: [74, -0.0006, 0.04], btc: [62000, 0.0015, 0.06],
  7203: [2800, 0.0003, 0.03], 6758: [3200, 0.0009, 0.035], 8306: [1600, 0.0007, 0.03], 9984: [8800, 0.0012, 0.05],
  NVDA: [120, 0.0015, 0.05], AAPL: [220, 0.0004, 0.028],
}

const quotes = {}
for (const item of [...markets, ...watchlist]) {
  const key = item.id || item.code
  const [start, drift, vol] = BASES[key] || [100, 0, 0.02]
  quotes[key] = { ...summarizeSeries(series(start, drift, vol)), ok: true, stale: false, via: 'サンプル' }
}
// 取得に失敗して前回値を出している状態も見せる
quotes.wti.stale = true
quotes.wti.ok = false

const now = new Date()
const hoursAgo = (h) => new Date(now.getTime() - h * 3600 * 1000).toISOString()

const articles = [
  {
    title: '日銀、政策金利を据え置き　植田総裁「賃金と物価の好循環を見極め」', publisher: '日本経済新聞', category: 'macro', sentiment: 'neutral', importance: 'high',
    summary: ['日銀は金融政策決定会合で政策金利を0.75%に据え置いた。', '賛成8・反対1で、1人の委員は0.25%の利上げを提案した。', '次回12月会合での追加利上げの有無に市場の関心が移る。'],
    impact: '据え置きは想定通りで、円相場と銀行株への影響は限定的。', assets: ['ドル円', '銀行株'], tickers: [], hoursAgo: 3,
  },
  {
    title: 'トヨタ、通期営業利益予想を上方修正　円安と北米販売が寄与', publisher: 'ロイター', category: 'jpstock', sentiment: 'positive', importance: 'high',
    summary: ['トヨタ自動車は2026年3月期の営業利益予想を4.3兆円に引き上げた。', '従来予想から3000億円の上積みで、想定為替レートも1ドル=145円に見直した。', '株主還元の拡充も発表し、決算説明会での関税の見通しに注目が集まる。'],
    impact: 'トヨタ株と自動車セクター全体に追い風。', assets: ['トヨタ自動車', '自動車株'], tickers: ['7203'], hoursAgo: 5,
  },
  {
    title: 'NY株、ナスダック続落　半導体株に利益確定売り', publisher: '時事通信', category: 'global', sentiment: 'negative', importance: 'normal',
    summary: ['ナスダック総合指数は前日比1.2%安で取引を終えた。', 'エヌビディアが3%下げ、半導体指数(SOX)は2.4%安となった。', '今週のPCEデフレーター発表を控え、持ち高調整の動きが出た。'],
    impact: '東京市場でも半導体関連株に売りが波及する可能性。', assets: ['NASDAQ', 'エヌビディア', '半導体株'], tickers: ['NVDA'], hoursAgo: 9,
  },
  {
    title: '円相場、1ドル=149円台に下落　日米金利差を意識', publisher: 'NHK', category: 'fx', sentiment: 'negative', importance: 'normal',
    summary: ['東京外国為替市場で円は対ドルで149円台まで下落した。', '米長期金利が4.3%台に上昇し、日米金利差の拡大が意識された。', '市場では150円を節目に政府・日銀の介入警戒感が強まっている。'],
    impact: '輸出株には追い風、輸入企業のコスト増に。', assets: ['ドル円'], tickers: [], hoursAgo: 12,
  },
  {
    title: '金価格が最高値更新　地政学リスクで逃避買い', publisher: 'ブルームバーグ', category: 'commodity', sentiment: 'positive', importance: 'normal',
    summary: ['ニューヨーク金先物は1オンス=2800ドルを超え、最高値を更新した。', '中東情勢の緊迫化で、安全資産としての需要が膨らんだ。', '中央銀行による金購入も続いており、先高観は根強い。'],
    impact: '', assets: ['金'], tickers: [], hoursAgo: 20, generatedBy: 'extractive',
  },
  {
    title: '新NISA、口座数が2800万に　成長投資枠の利用が拡大', publisher: '金融庁', category: 'personal', sentiment: 'neutral', importance: 'low',
    summary: ['金融庁の集計で、NISA口座数は6月末時点で2800万口座となった。', '成長投資枠の買付額は前年同期比で1.4倍に増えた。', '政府は2027年までに3400万口座の目標を掲げている。'],
    impact: '投資信託への資金流入が続く見通し。', assets: ['投資信託'], tickers: [], hoursAgo: 30,
  },
  {
    title: 'ソニーG、半導体子会社の分離上場を検討', publisher: '東洋経済オンライン', category: 'jpstock', sentiment: 'positive', importance: 'high',
    summary: ['ソニーグループがイメージセンサー事業の分離上場を検討していることが分かった。', '上場時の時価総額は数兆円規模になる可能性がある。', 'エンタメ事業への経営資源集中を進める狙いとみられる。'],
    impact: 'ソニー株の評価見直しにつながる可能性。', assets: ['ソニーグループ'], tickers: ['6758'], hoursAgo: 40,
  },
].map((a, i) => ({
  key: `sample-${i}`,
  link: 'https://example.com/',
  publishedAt: hoursAgo(a.hoursAgo),
  via: [a.publisher],
  generatedBy: 'claude',
  ...a,
}))

const digest = [
  '日銀は政策金利を据え置き。反対票が1票出ており、12月会合での追加利上げ観測がくすぶる。',
  'トヨタが通期予想を上方修正。円安が輸出企業の業績を押し上げる構図が続いている。',
  '米国では半導体株に利益確定売りが出てナスダックが続落。東京市場の値がさ株に波及する可能性がある。',
  'ドル円は149円台。150円を前に介入警戒感が強まっている。',
]

const status = [
  { id: 'boj', name: '日本銀行 新着情報', ok: true, picked: 3, note: '' },
  { id: 'nhk', name: 'NHK 経済', ok: true, picked: 8, note: '' },
  { id: 'x', name: 'ダイヤモンド・オンライン', ok: false, picked: 0, note: 'https://diamond.jp/list/feed/rss/dol → HTTP 404' },
]

const meta = { updatedAt: now.toISOString(), engine: 'claude', sourcesOk: 2, sourcesTotal: 3, status }
const banner = '<div style="background:#b26b00;color:#fff;text-align:center;font-size:13px;padding:4px">表示サンプル — 値とニュースは作り物です</div>'

await writeSite({ recent: articles, merged: articles, quotes, digest, status, meta, out: OUT, banner })
console.log(`書き出しました: ${path.relative(ROOT, OUT)}/index.html`)
