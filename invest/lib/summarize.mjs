// 記事を日本語3行に要約し、カテゴリ・市場への向き・注目度を付ける。
//
// ANTHROPIC_API_KEY があれば Claude で要約する。無ければ本文から機械的に抜き出す。
// 鍵が無くてもサイトは成立させたいので、代替は常に用意しておく。

import { categories, categoryIds, keywords, watchlist } from '../config.mjs'

// 大量の短い要約なので、速くて安いモデルで足りる
const MODEL = 'claude-sonnet-5'
const BATCH_SIZE = 8

const SENTIMENTS = ['positive', 'negative', 'neutral']

const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer', description: '入力で与えた記事番号' },
          category: { type: 'string', enum: categoryIds },
          summary: {
            type: 'array',
            items: { type: 'string' },
            description: 'ちょうど3行。各行60字以内の日本語。',
          },
          impact: { type: 'string', description: 'どの資産・銘柄にどう効きうるか。1文、80字以内。' },
          sentiment: {
            type: 'string',
            enum: SENTIMENTS,
            description: '記事の内容が、主に関係する資産の価格に対して追い風か向かい風か',
          },
          assets: {
            type: 'array',
            items: { type: 'string' },
            description: '影響を受ける銘柄・指数・通貨・商品の名前。最大4つ。',
          },
          importance: { type: 'string', enum: ['high', 'normal', 'low'] },
        },
        required: ['index', 'category', 'summary', 'impact', 'sentiment', 'assets', 'importance'],
        additionalProperties: false,
      },
    },
  },
  required: ['results'],
  additionalProperties: false,
}

const DIGEST_SCHEMA = {
  type: 'object',
  properties: {
    points: {
      type: 'array',
      items: { type: 'string' },
      description: '今日の要点。3〜5行。各行90字以内。',
    },
  },
  required: ['points'],
  additionalProperties: false,
}

const SYSTEM = `あなたは経済部で長く市場を担当してきた記者です。
読者は日本株・米国株・為替などに投資している個人投資家で、毎朝このページで情報を仕入れます。

要約の方針:
- 事実を圧縮する。記事に書かれていないことは書かない。推測で数字を作らない。
- 企業名・指標名・数値（金額、率、前年比）・日付を優先して残す。
- 3行は「何が起きたか」「数字や中身の具体」「市場の受け止め / 次の注目点」の順で組む。
- 見出しだけで本文が無い記事は、見出しから確実に言えることだけを書く。
- 売買の推奨はしない。「買い」「売り」を勧める表現は使わない。

sentiment の目安（記事が主に関係する資産の価格にとって）:
- positive: 上方修正・増配・利下げ期待・需要増など追い風
- negative: 下方修正・減配・規制強化・急落など向かい風
- neutral: どちらとも言えない、制度の解説、定例の発表

importance の目安:
- high: 中央銀行の政策変更、指数の急変、大型M&A・TOB、主要企業の業績修正、ウォッチ銘柄の重要材料
- normal: 通常の決算・指標発表、相場の解説
- low: 背景として拾っておく程度のもの`

const CATEGORY_GUIDE = categories.map((c) => `- ${c.id}: ${c.label}（${c.blurb}）`).join('\n')
const WATCH_GUIDE = watchlist.map((w) => `${w.name}（${w.code}）`).join('、')

export function claudeAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
}

async function getClient() {
  if (!claudeAvailable()) return null
  // 「リンクされたアカウント」で作ったキーは、ワークスペースの指定が毎回要る。
  // 詳しくは news/README.md の「APIキーの種類に注意」。
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID?.trim()
  const options = workspaceId ? { defaultHeaders: { 'anthropic-workspace-id': workspaceId } } : {}
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    return new Anthropic(options)
  } catch {
    return null
  }
}

function textOf(response) {
  if (response.stop_reason === 'refusal') throw new Error('モデルが応答を拒否')
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

function renderArticle(article, index) {
  const body = (article.body || article.description || '').slice(0, 3000)
  return [
    `<記事 番号="${index}">`,
    `見出し: ${article.title}`,
    `媒体: ${article.publisher}`,
    `日時: ${article.publishedAt}`,
    body ? `本文:\n${body}` : '本文: （取得できず。見出しのみ）',
    '</記事>',
  ].join('\n')
}

async function summarizeBatch(client, batch, offset) {
  const prompt = [
    '次の記事それぞれについて、日本語3行の要約、カテゴリ、市場への影響、向き、注目度を付けてください。',
    '',
    'カテゴリの選択肢:',
    CATEGORY_GUIDE,
    '',
    `読者のウォッチ銘柄: ${WATCH_GUIDE}`,
    'これらの銘柄に直接関わる記事は importance を一段上げてください。',
    '',
    '記事番号は入力のものをそのまま返してください。全記事について1件ずつ返してください。',
    '',
    batch.map((article, i) => renderArticle(article, offset + i)).join('\n\n'),
  ].join('\n')

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt }],
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: SUMMARY_SCHEMA },
    },
  })
  return JSON.parse(textOf(response)).results
}

function toThreeLines(lines) {
  const three = (Array.isArray(lines) ? lines : []).map((s) => String(s).trim()).filter(Boolean).slice(0, 3)
  while (three.length < 3) three.push('（この記事の要点はここまでです）')
  return three
}

// --- Claude が使えないときの代替 ---------------------------------------

const CATEGORY_RULES = [
  ['macro', ['日銀', '日本銀行', 'FRB', 'FOMC', 'ECB', '利上げ', '利下げ', '金融政策', '物価', 'CPI', 'GDP', '雇用統計', '景気', '短観']],
  ['fx', ['円安', '円高', '円相場', '為替', 'ドル円', '介入', '国債', '利回り', '長期金利', '債券']],
  ['commodity', ['原油', 'OPEC', '金価格', '金相場', 'ビットコイン', '暗号資産', '仮想通貨', '商品先物']],
  ['personal', ['NISA', 'iDeCo', '投資信託', '投信', '資産形成', '資産運用', '金融庁', '税制']],
  ['global', ['米国株', 'ナスダック', 'NASDAQ', 'S&P', 'ダウ', 'ニューヨーク', '欧州', '中国株', '上海', '米企業']],
  ['jpstock', ['日経平均', 'TOPIX', '東証', '決算', '業績', '上方修正', '下方修正', 'TOB', '買収', '配当', '自社株買い', '上場']],
]

export function guessCategory(text) {
  let best = { id: 'jpstock', score: 0 }
  for (const [id, words] of CATEGORY_RULES) {
    const score = words.filter((word) => text.includes(word)).length
    if (score > best.score) best = { id, score }
  }
  return best.id
}

const POSITIVE = ['上方修正', '最高益', '増益', '増配', '最高値', '上場来高値', '急騰', '反発', '続伸', '上昇', '好調', '黒字転換', 'ストップ高', '自社株買い', '買い戻し']
const NEGATIVE = ['下方修正', '減益', '減配', '赤字', '急落', '暴落', '反落', '続落', '下落', '低迷', '不振', 'ストップ安', '懸念', '警戒', '売られ']

/** 語の数で向きを大まかに判定する。当たりが拮抗したら中立。 */
export function guessSentiment(text) {
  const pos = POSITIVE.filter((w) => text.includes(w)).length
  const neg = NEGATIVE.filter((w) => text.includes(w)).length
  if (pos > neg) return 'positive'
  if (neg > pos) return 'negative'
  return 'neutral'
}

function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[。！？])\s*|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 10)
}

export function extractiveSummary(article) {
  const source = article.body || article.description || ''
  const text = `${article.title}\n${source}`
  const sentences = splitSentences(source)

  const lines = []
  if (sentences.length > 0) {
    lines.push(sentences[0])
    const scored = sentences
      .slice(1)
      .map((sentence) => ({
        sentence,
        score:
          (sentence.match(/[0-9０-９%％]/g) || []).length +
          keywords.market.filter((w) => sentence.includes(w)).length * 2 +
          keywords.strong.filter((w) => sentence.includes(w)).length * 3,
      }))
      .sort((a, b) => b.score - a.score)
    for (const { sentence } of scored) {
      if (lines.length >= 3) break
      if (!lines.includes(sentence)) lines.push(sentence)
    }
  }
  while (lines.length < 3) lines.push(lines.length === 0 ? article.title : '（自動要約なし。原文を参照してください）')

  const tickerNames = (article.tickers || [])
    .map((code) => watchlist.find((w) => w.code === code)?.name)
    .filter(Boolean)

  return {
    category: guessCategory(text),
    summary: lines.slice(0, 3).map((line) => line.slice(0, 120)),
    impact: '',
    sentiment: guessSentiment(text),
    assets: tickerNames,
    importance: article.relevance >= 7 || tickerNames.length > 0 ? 'high' : 'normal',
    generatedBy: 'extractive',
  }
}

/**
 * 記事に要約を付ける。
 * @returns {Promise<{engine: string, errors: string[]}>}
 */
export async function summarizeArticles(articles) {
  const errors = []
  const client = await getClient()

  if (!client) {
    for (const article of articles) Object.assign(article, extractiveSummary(article))
    return { engine: 'extractive', errors: ['ANTHROPIC_API_KEY が未設定のため抽出型要約を使用'] }
  }

  const batches = []
  for (let i = 0; i < articles.length; i += BATCH_SIZE) batches.push({ items: articles.slice(i, i + BATCH_SIZE), offset: i })

  const byIndex = new Map()
  await Promise.all(
    batches.map(async ({ items, offset }) => {
      try {
        for (const result of await summarizeBatch(client, items, offset)) byIndex.set(result.index, result)
      } catch (err) {
        errors.push(`記事 ${offset}〜${offset + items.length - 1} の要約に失敗: ${err.message}`)
      }
    }),
  )

  for (const [index, article] of articles.entries()) {
    const result = byIndex.get(index)
    if (result && Array.isArray(result.summary) && result.summary.length > 0) {
      Object.assign(article, {
        category: categoryIds.includes(result.category) ? result.category : guessCategory(article.title),
        summary: toThreeLines(result.summary),
        impact: String(result.impact || ''),
        sentiment: SENTIMENTS.includes(result.sentiment) ? result.sentiment : 'neutral',
        assets: (Array.isArray(result.assets) ? result.assets : []).slice(0, 4).map(String),
        importance: ['high', 'normal', 'low'].includes(result.importance) ? result.importance : 'normal',
        generatedBy: 'claude',
      })
    } else {
      // 失敗した記事だけ抽出型で埋める。1件の失敗で全体を落とさない。
      Object.assign(article, extractiveSummary(article))
    }
  }

  const usedClaude = articles.some((a) => a.generatedBy === 'claude')
  return { engine: usedClaude ? 'claude' : 'extractive', errors }
}

/** 市況の一行説明。要点の材料にも、鍵が無いときの要点そのものにも使う。 */
export function describeMove(name, quote, digits = 2) {
  if (!quote || quote.last == null || quote.changePct == null) return null
  const sign = quote.changePct > 0 ? '+' : quote.changePct < 0 ? '−' : '±'
  const value = quote.last.toLocaleString('ja-JP', { maximumFractionDigits: digits, minimumFractionDigits: digits })
  return `${name} ${value}（${sign}${Math.abs(quote.changePct).toFixed(2)}%）`
}

/**
 * 今日の要点を作る。値動きとニュースの両方を材料にする。
 * @param movers {string[]} describeMove で作った市況の行
 */
export async function buildDigest(articles, movers = []) {
  const top = articles
    .filter((a) => a.importance === 'high')
    .concat(articles.filter((a) => a.importance !== 'high'))
    .slice(0, 30)

  const client = await getClient()
  if (!client) {
    // 鍵が無いときは、大きく動いた指標と注目記事の見出しを並べる
    const heads = top.slice(0, 3).map((a) => `${a.title}（${a.publisher}）`)
    return [...movers.slice(0, 2), ...heads].slice(0, 5)
  }

  try {
    const listing = top.map((a, i) => `${i + 1}. [${a.category}] ${a.title} — ${(a.summary || []).join(' ')}`).join('\n')
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            '以下は直近の市況と、集まったニュースの要約一覧です。',
            '個人投資家が今日押さえるべき動きを3〜5点にまとめてください。',
            '値動きの背景がニュースから読み取れるなら結び付けて書いてください。読み取れない因果は書かないでください。',
            '売買の推奨はしないでください。',
            '',
            '■ 市況（前日比）',
            movers.join('\n') || '（取得できず）',
            '',
            '■ ニュース',
            listing || '（なし）',
          ].join('\n'),
        },
      ],
      output_config: { effort: 'low', format: { type: 'json_schema', schema: DIGEST_SCHEMA } },
    })
    return JSON.parse(textOf(response)).points ?? []
  } catch {
    return []
  }
}
