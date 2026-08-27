// 防衛施設・自衛隊基地・防衛関連の建築土木にテーマを絞ったニュース収集の設定。
//
// ここだけ編集すれば、追いかける話題も情報源も差し替えられる。

/** サイト全体の設定 */
export const site = {
  title: '防衛施設ウォッチ',
  subtitle: '自衛隊基地・防衛施設の整備と、防衛に関わる建築土木を毎日追う',
  lang: 'ja',
  timeZone: 'Asia/Tokyo',
  // 記事を何日分ためて表示するか
  windowDays: 7,
  // アーカイブに残す日数
  archiveDays: 120,
  // 1回の実行で本文取得を試みる記事数の上限（実行時間とAPI費用の歯止め）
  maxArticlesPerRun: 60,
}

/**
 * カテゴリ。表示順はこの配列の順序。
 * `id` は要約モデルが分類に使うので、意味の重なりが少ない粒度で切っている。
 */
export const categories = [
  {
    id: 'nansei',
    label: '南西諸島・馬毛島',
    blurb: '馬毛島基地、石垣・宮古島・与那国の駐屯地、南西シフトに伴う施設整備',
  },
  {
    id: 'usfj',
    label: '辺野古・在日米軍再編',
    blurb: '普天間代替施設、埋立・地盤改良、米軍施設の返還と再編',
  },
  {
    id: 'kyoujinka',
    label: '施設の強靱化・整備計画',
    blurb: '司令部地下化、火薬庫、老朽更新、防衛力整備計画の施設分',
  },
  {
    id: 'chotatsu',
    label: '発注・入札・受注',
    blurb: '地方防衛局の発注、大型工事の入札・落札、ゼネコンの防衛関連受注',
  },
  {
    id: 'chiiki',
    label: '駐屯地と地元',
    blurb: '新設・移転・用地取得、自治体との協議、住民説明会、環境影響評価',
  },
  {
    id: 'seisaku',
    label: '予算・政策',
    blurb: '防衛予算の施設関連費、制度改正、技術基準、業界動向',
  },
]

export const categoryIds = categories.map((c) => c.id)

/**
 * テーマ判定用のキーワード。
 *
 * このサイトが追うのは「防衛」×「施設・建築土木」の交差点であって、
 * 防衛ニュース全般でも建設ニュース全般でもない。だから判定は次の形にする。
 *
 *   topic が1つ当たる                  … それだけで採用（この分野固有の語）
 *   defense と facility が両方当たる    … 採用
 *   それ以外                            … 不採用
 *
 * 片方だけで通すと「自衛隊が離島で訓練」や「歩道橋の架け替えが着工」まで
 * 入ってきて、読む前に絞る意味がなくなる。
 */
export const keywords = {
  // この分野に固有で、1語で文脈が確定する語
  topic: [
    '馬毛島', '辺野古', '普天間', '基地建設', '防衛施設', '自衛隊施設', '駐屯地',
    '分屯地', '演習場', '火薬庫', '弾薬庫', '司令部地下化', '掩体',
    '特定利用空港', '特定利用港湾', '防衛力整備計画', '強靱化', '強靭化',
    '在日米軍', '米軍基地', '米軍再編', '嘉手納', 'キャンプ・シュワブ',
    '基地機能', '基地負担', '南西シフト',
  ],
  // 防衛の主体・領域を指す語
  defense: [
    '防衛省', '防衛局', '防衛装備庁', '自衛隊', '陸上自衛隊', '海上自衛隊',
    '航空自衛隊', '陸自', '海自', '空自', '米軍', '日米', '防衛大臣',
    '日米合同委員会', '国民保護', 'シェルター', '防衛関連',
  ],
  // 施設・建築土木を指す語
  facility: [
    '施設', '工事', '建設', '土木', '整備', '造成', '埋立', '地盤改良',
    '滑走路', '格納庫', '庁舎', '隊舎', '宿舎', '倉庫', '桟橋', '岸壁',
    '入札', '落札', '発注', '受注', '契約', '公告', '着工', '竣工', '完成',
    '用地取得', '用地', '環境影響評価', '設計', '改修', '新設', '移転', '再編',
    'ゼネコン', '建設業', '共同企業体', '予定価格', '概算要求', '事業費',
  ],
  exclude: [
    '占い', '星座', 'ライブ配信', '声優', 'アイドル', 'ゲーム攻略',
  ],
}

/**
 * Google ニュースのキーワード検索フィード。
 * 公開エンドポイントで鍵が要らないうえ、媒体を横断して拾えるので探索の主力。
 */
const googleNews = (query, opts = {}) => ({
  id: `gnews:${query}`,
  name: `Google ニュース「${query}」`,
  kind: 'gnews',
  hint: opts.hint,
  urls: [
    `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:14d`)}&hl=ja&gl=JP&ceid=JP:ja`,
  ],
})

/**
 * 情報源。`urls` は候補の配列で、上から順に試して最初に成功したものを使う。
 * サイト側がフィードの場所を変えても、候補を並べておけば拾い直せる。
 *
 * どの情報源から来た記事も、上のキーワード判定を通してから採用する。
 * 防衛専門紙にも施設と関係ない記事は載るし、建設専門紙にも防衛と関係ない
 * 記事は載るので、入口で例外を作らない。
 */
export const sources = [
  // --- 専門媒体・一次情報 ---
  {
    id: 'mod',
    name: '防衛省・自衛隊 報道発表',
    kind: 'rss',
    hint: '一次情報',
    urls: [
      'https://www.mod.go.jp/j/rss/press.xml',
      'https://www.mod.go.jp/j/rss/news.xml',
      'https://www.mod.go.jp/j/rss/index.xml',
    ],
  },
  {
    id: 'j-defense',
    name: 'Jディフェンスニュース',
    kind: 'rss',
    hint: '防衛専門',
    urls: [
      'https://j-defense.ikaros.jp/index.rdf',
      'https://j-defense.ikaros.jp/feed',
      'https://j-defense.ikaros.jp/rss.xml',
    ],
  },
  {
    id: 'kensetsunews',
    name: '建設通信新聞',
    kind: 'rss',
    hint: '建設専門',
    urls: [
      'https://www.kensetsunews.com/feed',
      'https://www.kensetsunews.com/rss',
    ],
  },
  {
    id: 'decn',
    name: '日刊建設工業新聞',
    kind: 'rss',
    hint: '建設専門',
    urls: [
      'https://www.decn.co.jp/feed',
      'https://www.decn.co.jp/?feed=rss2',
    ],
  },
  {
    id: 'kensetsu-plaza',
    name: 'けんせつPlaza',
    kind: 'rss',
    hint: '建設情報',
    urls: [
      'https://www.kensetsu-plaza.com/kiji/feed',
      'https://www.kensetsu-plaza.com/feed',
    ],
  },

  // --- 地元紙。基地・施設の話は全国紙より早く、深い ---
  {
    id: 'okinawatimes',
    name: '沖縄タイムス',
    kind: 'rss',
    hint: '地元紙',
    urls: [
      'https://www.okinawatimes.co.jp/feed',
      'https://www.okinawatimes.co.jp/rss/news.xml',
    ],
  },
  {
    id: 'ryukyushimpo',
    name: '琉球新報',
    kind: 'rss',
    hint: '地元紙',
    urls: [
      'https://ryukyushimpo.jp/feed/',
      'https://ryukyushimpo.jp/rss/',
    ],
  },
  {
    id: '373news',
    name: '南日本新聞',
    kind: 'rss',
    hint: '地元紙（馬毛島）',
    urls: [
      'https://373news.com/feed/',
      'https://373news.com/_rss/news.xml',
    ],
  },

  // --- 総合媒体。キーワードで絞って取りこぼしを拾う ---
  {
    id: 'nhk-main',
    name: 'NHK 主要ニュース',
    kind: 'rss',
    hint: '総合',
    urls: ['https://www.nhk.or.jp/rss/news/cat0.xml'],
  },
  {
    id: 'nhk-politics',
    name: 'NHK 政治',
    kind: 'rss',
    hint: '総合',
    urls: ['https://www.nhk.or.jp/rss/news/cat4.xml'],
  },

  // --- キーワード探索。ここが網羅性を担う ---
  googleNews('馬毛島 基地建設', { hint: '南西諸島' }),
  googleNews('辺野古 埋立 地盤改良', { hint: '在日米軍' }),
  googleNews('自衛隊 駐屯地 新設 整備', { hint: '駐屯地' }),
  googleNews('防衛省 施設整備 強靱化', { hint: '強靱化' }),
  googleNews('防衛省 火薬庫 弾薬庫 整備', { hint: '強靱化' }),
  googleNews('防衛局 工事 入札 落札', { hint: '発注' }),
  googleNews('自衛隊 施設 建設工事 受注', { hint: '発注' }),
  googleNews('南西諸島 石垣 宮古島 与那国 自衛隊 施設', { hint: '南西諸島' }),
  googleNews('司令部 地下化 自衛隊', { hint: '強靱化' }),
  googleNews('特定利用空港 特定利用港湾 整備', { hint: 'インフラ' }),
  googleNews('防衛予算 施設 概算要求', { hint: '予算' }),
  googleNews('米軍再編 施設 返還 工事', { hint: '在日米軍' }),
]
