#!/usr/bin/env node
// ダミーデータで HUD の見た目を確認するためのプレビュー生成。
//
//   node news/preview.mjs [出力先ディレクトリ]
//
// ここに書かれた記事・要約・数値はすべて design 確認用の作り物で、
// 実際のニュースではない。生成物にもその旨の帯が出る。

import fs from 'node:fs/promises'
import path from 'node:path'

import { sources } from './config.mjs'
import { buildStats } from './lib/stats.mjs'
import { renderIndex } from './lib/render.mjs'

const outDir = process.argv[2] || 'dist-news-preview'
const hoursAgo = (h) => new Date(Date.now() - h * 3600_000).toISOString()

const DEMO_ARTICLES = [
  {
    title: '［ダミー］南方の飛行場整備、滑走路2本の造成が第2工区へ',
    category: 'nansei', importance: 'high', publisher: 'サンプル通信', pickups: 3, hasBody: true,
    summary: [
      '地方防衛局が、飛行場の造成工事を第2工区に進めると公表した。',
      '総事業費は約4800億円、うち今年度分は約620億円を計上している。',
      '次の入札公告は来月上旬の予定で、地元説明会も並行して開かれる。',
    ],
    why: '事業費の規模と工程の両方が動いたため、後続の発注計画に影響する。',
  },
  {
    title: '［ダミー］代替施設の地盤改良、追加ボーリング調査の結果を公表',
    category: 'usfj', importance: 'high', publisher: 'サンプル新報', pickups: 2, hasBody: true,
    summary: [
      '軟弱地盤の層厚について、従来想定より深い地点が複数確認された。',
      '改良杭の本数は約7万7000本から増える可能性があるとしている。',
      '工期への影響は精査中で、年度内に見通しを示す方針。',
    ],
    why: '杭本数は工費と工期の主要な変数で、設計変更の前触れになりうる。',
  },
  {
    title: '［ダミー］火薬庫の整備、5か年で130棟の新設計画を提示',
    category: 'kyoujinka', importance: 'normal', publisher: 'サンプル防衛ニュース', pickups: 1, hasBody: true,
    summary: [
      '弾薬の取得量に連動し、火薬庫を段階的に増設する計画が示された。',
      '離隔距離の確保のため、既存施設の再配置と集約も併せて行う。',
      '初年度は既存敷地内での建て替えを中心に着手する。',
    ],
    why: '火薬庫は用地確保の制約が大きく、着手順序が全体工程を左右する。',
  },
  {
    title: '［ダミー］庁舎新築工事、一般競争入札で共同企業体が落札',
    category: 'chotatsu', importance: 'normal', publisher: 'サンプル建設新聞', pickups: 1, hasBody: true,
    summary: [
      '予定価格約38億円に対し、落札率は94.2%だった。',
      '構造は鉄筋コンクリート造4階建て、延床面積は約9200平方メートル。',
      '工期は着工から26か月を見込む。',
    ],
    why: '同種工事の落札率の目安として、後続案件の予定価格を読む材料になる。',
  },
  {
    title: '［ダミー］駐屯地の用地取得、地権者との交渉が最終段階に',
    category: 'chiiki', importance: 'normal', publisher: 'サンプル日報', pickups: 2, hasBody: false,
    summary: [
      '取得予定面積は約23ヘクタールで、うち9割で合意に達したとしている。',
      '残る区画については代替地の提示を含めて協議を続ける。',
      '造成着手の時期は取得完了後に判断する。',
    ],
    why: '用地取得の進捗は、造成から建築までの全工程の起点になる。',
  },
  {
    title: '［ダミー］来年度概算要求、施設整備費は前年度比12%増',
    category: 'seisaku', importance: 'normal', publisher: 'サンプル経済紙', pickups: 4, hasBody: true,
    summary: [
      '施設の強靱化に係る経費として過去最大の要求額が示された。',
      '老朽更新と司令部機能の防護に配分の重心を置く。',
      '資材価格の上昇分をどこまで織り込むかが査定の焦点になる。',
    ],
    why: '要求段階の配分は、翌年度以降の発注量の先行指標になる。',
  },
  {
    title: '［ダミー］特定重要拠点の港湾、岸壁延伸の基本設計に着手',
    category: 'nansei', importance: 'normal', publisher: 'サンプル通信', pickups: 1, hasBody: true,
    summary: [
      '大型船舶の接岸に対応するため、既存岸壁を延伸する設計に入った。',
      '民生利用との併用を前提とした施設配置を検討している。',
      '実施設計は来年度、着工は再来年度を目標とする。',
    ],
    why: '民生併用型の整備は前例が少なく、設計条件の置き方が参考になる。',
  },
  {
    title: '［ダミー］隊舎の老朽更新、木造化を試行する方針',
    category: 'kyoujinka', importance: 'normal', publisher: 'サンプル建設新聞', pickups: 1, hasBody: true,
    summary: [
      '中層の隊舎について、耐火木造での建て替えを試行する。',
      '工期短縮と資材調達の分散が狙いだとしている。',
      '初弾は2棟で、結果を踏まえて適用範囲を判断する。',
    ],
    why: '発注仕様の変化は、参入できる施工者の顔ぶれを変える。',
  },
]

const articles = DEMO_ARTICLES.map((article, i) => ({
  ...article,
  key: `demo-${i}`,
  link: 'https://example.com/demo',
  publishedAt: hoursAgo(3 + i * 9),
  via: ['サンプル'],
  relevance: 8,
}))

// 情報源の一覧は本物の設定から取り、結果だけダミーにする
const status = sources.map((source, i) => ({
  id: source.id,
  name: source.name,
  ok: i % 7 !== 3,
  picked: i % 7 !== 3 ? (i % 5) + 1 : 0,
  note: i % 7 !== 3 ? source.urls[0] : 'HTTP 404 / タイムアウト',
}))

const now = new Date()
// 記事量の推移に起伏を作るため、過去14日分のダミーを混ぜる
const archived = [
  ...articles,
  ...Array.from({ length: 46 }, (_, i) => ({
    ...articles[i % articles.length],
    key: `demo-old-${i}`,
    publishedAt: new Date(now.getTime() - (1 + (i % 13)) * 864e5 - i * 36e5).toISOString(),
  })),
]

const meta = {
  updatedAt: now.toISOString(),
  engine: 'claude',
  demo: true,
  // 帯の文言は NEWS_DEMO_NOTE で差し替えられる（共有用のプレビューを作るとき用）
  demoNote: process.env.NEWS_DEMO_NOTE,
}

const stats = buildStats({ recent: articles, archived, status, freshCount: 3, now })

const digest = [
  '［ダミー］南方の飛行場と港湾で、造成・延伸の工程がそろって次段階に入った。',
  '［ダミー］地盤改良の追加調査で杭本数が増える可能性が出ており、工費・工期の再算定が焦点。',
  '［ダミー］概算要求は施設整備費が12%増。老朽更新と司令部防護に重心が移っている。',
  '［ダミー］庁舎工事の落札率は94.2%。同種案件の予定価格を読む目安になる。',
]

await fs.mkdir(outDir, { recursive: true })
const target = path.join(outDir, 'index.html')
await fs.writeFile(target, renderIndex({ articles, digest, status, meta, stats }), 'utf8')
console.log(`プレビューを書き出しました: ${target}`)
