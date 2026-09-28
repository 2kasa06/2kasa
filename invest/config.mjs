// 投資情報ウォッチの設定。
//
// ふだん触るのはこのファイルだけでよい。追う指標・ウォッチ銘柄・ニュースの
// 分類と情報源をここで決める。

/** サイト全体の設定 */
export const site = {
  title: '投資情報ウォッチ',
  subtitle: '主要マーケットの値動きと、投資判断に関わるニュースを毎日まとめる',
  lang: 'ja',
  timeZone: 'Asia/Tokyo',
  // ニュースを何日分表示するか
  windowDays: 3,
  // 記事をためておく日数（日別アーカイブに出る範囲）
  archiveDays: 60,
  // 1回の実行で本文取得と要約に回す記事数の上限（実行時間とAPI費用の歯止め）
  maxArticlesPerRun: 50,
  // 値上がり・値下がりの色。'jp' は日本の証券会社に多い「上昇=赤・下落=青」、
  // 'global' は海外で一般的な「上昇=緑・下落=赤」。どちらでも ▲▼ と符号は付く。
  upDownStyle: 'jp',
}

/**
 * 市況ボードに並べる指標。表示順はこの配列の順序。
 *
 * yahoo … Yahoo Finance のシンボル（主経路。1年分の日足を取る）
 * stooq … Stooq のシンボル（Yahoo が落ちたときの予備。無ければ省略可）
 * digits … 表示する小数点以下の桁数
 * unit … 値の後ろに付ける単位（表示用）
 */
export const markets = [
  { id: 'n225', name: '日経平均', yahoo: '^N225', stooq: '^nkx', digits: 0, unit: '円', group: '日本' },
  { id: 'topix', name: 'TOPIX連動ETF', note: '1306', yahoo: '1306.T', stooq: '1306.jp', digits: 0, unit: '円', group: '日本' },
  { id: 'spx', name: 'S&P 500', yahoo: '^GSPC', stooq: '^spx', digits: 0, group: '米国' },
  { id: 'ndq', name: 'NASDAQ総合', yahoo: '^IXIC', stooq: '^ndq', digits: 0, group: '米国' },
  { id: 'dji', name: 'NYダウ', yahoo: '^DJI', stooq: '^dji', digits: 0, unit: 'ドル', group: '米国' },
  { id: 'vix', name: 'VIX（恐怖指数）', yahoo: '^VIX', digits: 2, group: '米国' },
  { id: 'usdjpy', name: 'ドル円', yahoo: 'JPY=X', stooq: 'usdjpy', digits: 2, unit: '円', group: '為替・金利' },
  { id: 'eurjpy', name: 'ユーロ円', yahoo: 'EURJPY=X', stooq: 'eurjpy', digits: 2, unit: '円', group: '為替・金利' },
  { id: 'us10y', name: '米10年債利回り', yahoo: '^TNX', stooq: '10usy.b', digits: 3, unit: '%', group: '為替・金利' },
  { id: 'gold', name: '金（先物）', yahoo: 'GC=F', stooq: 'gc.f', digits: 1, unit: 'ドル', group: '商品・暗号資産' },
  { id: 'wti', name: 'WTI原油', yahoo: 'CL=F', stooq: 'cl.f', digits: 2, unit: 'ドル', group: '商品・暗号資産' },
  { id: 'btc', name: 'ビットコイン', yahoo: 'BTC-USD', stooq: 'btcusd', digits: 0, unit: 'ドル', group: '商品・暗号資産' },
]

/**
 * ウォッチ銘柄。自分が持っている・気にしている銘柄をここに並べる。
 *
 * aliases … ニュースの見出しや本文にこの語が出たら、その銘柄の記事として印を付ける。
 *           社名の略称や主力ブランドを入れる。短すぎる語（2文字の英字など）は誤爆するので避ける。
 * search  … Google ニュースで銘柄ごとに探すときの検索語。省略すると「社名 株」で探す。
 *           false にすると銘柄別の検索はしない（記事の印付けだけ行う）。
 */
export const watchlist = [
  { code: '7203', name: 'トヨタ自動車', yahoo: '7203.T', stooq: '7203.jp', aliases: ['トヨタ'], digits: 1, unit: '円' },
  { code: '6758', name: 'ソニーグループ', yahoo: '6758.T', stooq: '6758.jp', aliases: ['ソニー'], digits: 1, unit: '円' },
  { code: '8306', name: '三菱UFJ FG', yahoo: '8306.T', stooq: '8306.jp', aliases: ['三菱UFJ', 'MUFG'], digits: 1, unit: '円' },
  { code: '9984', name: 'ソフトバンクグループ', yahoo: '9984.T', stooq: '9984.jp', aliases: ['ソフトバンクG', 'ソフトバンクグループ', 'SBG'], digits: 0, unit: '円' },
  { code: 'NVDA', name: 'エヌビディア', yahoo: 'NVDA', stooq: 'nvda.us', aliases: ['エヌビディア', 'NVIDIA'], digits: 2, unit: 'ドル' },
  { code: 'AAPL', name: 'アップル', yahoo: 'AAPL', stooq: 'aapl.us', aliases: ['アップル', 'Apple', 'iPhone'], digits: 2, unit: 'ドル' },
]

/**
 * ニュースのカテゴリ。表示順はこの配列の順序。
 * `id` は要約モデルが分類に使うので、意味の重なりが少ない粒度で切っている。
 */
export const categories = [
  { id: 'macro', label: '金融政策・景気', blurb: '日銀・FRB・ECBの政策、金利見通し、物価、雇用、GDP、景気指標' },
  { id: 'jpstock', label: '日本株・企業', blurb: '国内企業の決算・業績修正、TOB・M&A、株主還元、新規上場、日本株の相場' },
  { id: 'global', label: '米国・海外市場', blurb: '米国株・欧州・中国市場の相場、海外企業の決算、地政学が市場に与える影響' },
  { id: 'fx', label: '為替・債券', blurb: '円相場、介入、国債利回り、債券市場' },
  { id: 'commodity', label: '商品・暗号資産', blurb: '原油・金などの商品、ビットコインなど暗号資産' },
  { id: 'personal', label: '資産形成・制度', blurb: '新NISA・iDeCo・税制・金融庁の制度変更、投資信託、個人投資家の動向' },
]

export const categoryIds = categories.map((c) => c.id)

/**
 * 記事の採否に使う語。
 *
 * 経済面のフィードにも、投資と関係の薄い記事（新商品の発売、人事、事件）は載る。
 * `market` の語が1つでも見出しか説明文の頭に出た記事だけを採る。
 * ウォッチ銘柄の aliases に当たった記事も採る。
 *
 * `strong` は市場への影響が大きくなりがちな語。当たると注目度の点数が上がる。
 */
export const keywords = {
  market: [
    '株価', '株式', '日経平均', 'TOPIX', '東証', '株主', '上場', '売買', '相場', '市場',
    '円安', '円高', '円相場', '為替', 'ドル', '金利', '利回り', '国債', '債券',
    '日銀', '日本銀行', 'FRB', 'FOMC', 'ECB', 'パウエル', '植田', '利上げ', '利下げ', '金融政策', '緩和',
    '物価', 'インフレ', 'CPI', 'GDP', '雇用統計', '景気', '景況感', '短観',
    '決算', '業績', '増益', '減益', '最高益', '上方修正', '下方修正', '通期予想', '配当', '増配', '減配',
    '自社株買い', 'TOB', '買収', 'M&A', 'IPO', '株式分割',
    'NISA', 'iDeCo', '投資信託', '投信', '資産運用', '投資家',
    'S&P', 'ナスダック', 'NASDAQ', 'ダウ', '米国株', '中国株',
    '原油', 'OPEC', '金価格', '金相場', 'ビットコイン', '暗号資産', '仮想通貨',
    '関税', '半導体', '生成AI', '時価総額',
  ],
  strong: [
    '利上げ', '利下げ', '介入', '急落', '急騰', '暴落', '最高値', '上場来高値', 'TOB', '買収',
    '上方修正', '下方修正', '最高益', '赤字', 'ストップ高', 'ストップ安', 'サーキットブレーカー',
    '金融政策決定会合', 'FOMC', '雇用統計', '関税',
  ],
  exclude: ['占い', '星座', 'ゲーム攻略', '声優', 'アイドル', '懸賞', 'プレゼントキャンペーン'],
}

/**
 * Google ニュースのキーワード検索フィード。
 * 鍵が要らず、媒体を横断して拾えるので探索の主力。
 */
export const googleNews = (query, opts = {}) => ({
  id: `gnews:${query}`,
  name: `Google ニュース「${query}」`,
  kind: 'gnews',
  hint: opts.hint,
  urls: [
    `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:3d`)}&hl=ja&gl=JP&ceid=JP:ja`,
  ],
})

/**
 * 情報源。`urls` は候補の配列で、上から順に試して最初に読めたものを使う。
 * `acceptAll: true` の情報源（日銀など、全件が投資判断の材料になる一次情報）は
 * キーワード判定を通さずに採る。
 */
export const sources = [
  // --- 一次情報 ---
  {
    id: 'boj',
    name: '日本銀行 新着情報',
    kind: 'rss',
    hint: '一次情報',
    acceptAll: true,
    urls: ['https://www.boj.or.jp/rss/whatsnew.xml'],
  },
  {
    id: 'fsa',
    name: '金融庁 新着情報',
    kind: 'rss',
    hint: '一次情報',
    urls: ['https://www.fsa.go.jp/fsaNewsListAll_rss2.xml'],
  },

  // --- 経済メディア ---
  { id: 'nhk-business', name: 'NHK 経済', kind: 'rss', hint: '総合', urls: ['https://www.nhk.or.jp/rss/news/cat5.xml'] },
  { id: 'yahoo-business', name: 'Yahoo!ニュース 経済', kind: 'rss', hint: '総合', urls: ['https://news.yahoo.co.jp/rss/topics/business.xml'] },
  { id: 'toyokeizai', name: '東洋経済オンライン', kind: 'rss', hint: '経済誌', urls: ['https://toyokeizai.net/list/feed/rss'] },
  { id: 'diamond', name: 'ダイヤモンド・オンライン', kind: 'rss', hint: '経済誌', urls: ['https://diamond.jp/list/feed/rss/dol'] },
  { id: 'itmedia-business', name: 'ITmedia ビジネス', kind: 'rss', hint: '経済誌', urls: ['https://rss.itmedia.co.jp/rss/2.0/business.xml'] },
  { id: 'jiji', name: '時事通信', kind: 'rss', hint: '通信社', urls: ['https://www.jiji.com/rss/ranking.rdf'] },

  // --- キーワード探索。ここが網羅性を担う ---
  googleNews('日経平均 株価 終値', { hint: '日本株' }),
  googleNews('日銀 金融政策 利上げ', { hint: '金融政策' }),
  googleNews('FRB FOMC 利下げ', { hint: '金融政策' }),
  googleNews('円相場 為替 ドル円', { hint: '為替' }),
  googleNews('決算 上方修正 最高益', { hint: '決算' }),
  googleNews('TOB 買収 株式', { hint: 'M&A' }),
  googleNews('米国株 ナスダック S&P500', { hint: '米国株' }),
  googleNews('長期金利 国債 利回り', { hint: '債券' }),
  googleNews('新NISA 投資信託', { hint: '資産形成' }),
  googleNews('原油価格 金価格', { hint: '商品' }),
  googleNews('ビットコイン 相場', { hint: '暗号資産' }),
  googleNews('自社株買い 増配', { hint: '株主還元' }),
]

/** ウォッチ銘柄ごとの検索を情報源に加えたもの。build はこちらを使う。 */
export function allSources() {
  const perStock = watchlist
    .filter((w) => w.search !== false)
    .map((w) => ({
      ...googleNews(w.search || `${w.name} 株`, { hint: 'ウォッチ銘柄' }),
      watchCode: w.code,
    }))
  return [...sources, ...perStock]
}
