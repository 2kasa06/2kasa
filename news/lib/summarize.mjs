// 記事を日本語3行に要約し、カテゴリと注目度を付ける。
//
// ANTHROPIC_API_KEY があれば Claude で要約する。無ければ本文の要点抽出で代替する。
// 鍵が無くてもサイトは成立させたいので、フォールバックは常に用意しておく。

import { categories, categoryIds, keywords } from '../config.mjs'

const MODEL = 'claude-opus-5'
const BATCH_SIZE = 6

/** 出力を機械的に扱えるよう、スキーマで形を固定する */
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
            // minItems / maxItems は 0 か 1 しか受け付けられない
            // （For 'array' type, 'minItems' values other than 0 or 1 are not supported）。
            // 行数は説明で伝え、受け取ったあとコード側で3行に整える。
            description: 'ちょうど3行。各行60字以内の日本語。',
          },
          why: { type: 'string', description: 'なぜこの記事が押さえる価値があるか。1文。' },
          importance: { type: 'string', enum: ['high', 'normal', 'low'] },
        },
        required: ['index', 'category', 'summary', 'why', 'importance'],
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
      description: '本日の要点。1〜5行。各行80字以内。',
    },
  },
  required: ['points'],
  additionalProperties: false,
}

const SYSTEM = `あなたは防衛施設と建設分野を長く担当してきた専門記者です。
読者は自衛隊基地・防衛施設の整備と、防衛に関わる建築土木を継続的に追っている人です。

要約の方針:
- 事実を圧縮する。印象や評価を足さない。
- 場所・施設名・金額・時期・発注者・受注者・工程といった具体を優先して残す。
- 記事に書かれていないことは書かない。推測しない。
- 3行は「何が起きたか」「規模や中身の具体」「次に何が起こるか / 位置づけ」の順で組む。
- 情報が乏しく3行埋まらない場合は、その旨がわかる短い行にする。字数稼ぎの繰り返しはしない。
- 見出しだけで本文が無い記事は、見出しから確実に言えることだけを書く。

importance の目安:
- high: 新規の基地・大型施設の着工や決定、大型契約、方針転換、地元合意の成立や破綻
- normal: 通常の進捗、定例の公表、個別工事の発注
- low: 関連は薄いが背景として拾えるもの`

const CATEGORY_GUIDE = categories
  .map((c) => `- ${c.id}: ${c.label}（${c.blurb}）`)
  .join('\n')

/** Claude を呼べる状態か。要約を作り直すかどうかの判断に使う。 */
export function claudeAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
}

function getClient() {
  if (!claudeAvailable()) return null

  // 「リンクされたアカウント」で作ったキーは、どのワークスペースとして
  // 動くのかを毎回のリクエストで指定しないと 400 を返す。
  //   anthropic-workspace-id is required when authenticating with
  //   an identity-linked API key
  // ワークスペースを指定して作ったキーでは不要なので、あるときだけ付ける。
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID?.trim()
  const options = workspaceId
    ? { defaultHeaders: { 'anthropic-workspace-id': workspaceId } }
    : {}

  return import('@anthropic-ai/sdk')
    .then(({ default: Anthropic }) => new Anthropic(options))
    .catch(() => null)
}

/** 記事1件を、モデルに渡す短いブロックに整形する */
function renderArticle(article, index) {
  const body = (article.body || '').slice(0, 3500)
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
    '次の記事それぞれについて、日本語3行の要約とカテゴリ、注目度を付けてください。',
    '',
    'カテゴリの選択肢:',
    CATEGORY_GUIDE,
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
      // 要約は難しい推論ではないので、effort は落として費用を抑える
      effort: 'low',
      format: { type: 'json_schema', schema: SUMMARY_SCHEMA },
    },
  })

  if (response.stop_reason === 'refusal') {
    throw new Error(`モデルが応答を拒否: ${response.stop_details?.category ?? '理由不明'}`)
  }

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
  return JSON.parse(text).results
}

/** 3行に揃える。多ければ削り、足りなければ埋める。 */
function toThreeLines(lines) {
  const cleaned = (Array.isArray(lines) ? lines : []).map((s) => String(s).trim()).filter(Boolean)
  const three = cleaned.slice(0, 3)
  while (three.length < 3) three.push('（この記事はここまでしか要点がありません）')
  return three
}

// --- Claude が使えないときの代替 ---------------------------------------

/** 本文を文単位に割る。日本語の句点と改行を区切りに使う。 */
function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[。！？])\s*|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 10)
}

function guessCategory(text) {
  const rules = [
    ['nansei', ['馬毛島', '石垣', '宮古島', '与那国', '奄美', '南西', '西之表']],
    ['usfj', ['辺野古', '普天間', '米軍', '在日米軍', '嘉手納', '日米']],
    ['chotatsu', ['入札', '落札', '発注', '契約', '受注', '公告', 'ゼネコン', '共同企業体', 'JV']],
    ['kyoujinka', ['強靱化', '強靭化', '火薬庫', '弾薬庫', '地下化', '老朽', '耐震', '整備計画']],
    ['seisaku', ['予算', '概算要求', '基準', '制度', '政策', '国会', '閣議']],
    ['chiiki', ['住民', '説明会', '自治体', '市長', '知事', '議会', '用地', '環境影響評価', '反対']],
  ]
  let best = { id: 'kyoujinka', score: 0 }
  for (const [id, words] of rules) {
    const score = words.filter((word) => text.includes(word)).length
    if (score > best.score) best = { id, score }
  }
  return best.id
}

/** Claude が使えないときの抽出型要約。本文の頭から重要そうな3文を拾う。 */
function extractiveSummary(article) {
  const text = `${article.title}\n${article.body || article.description || ''}`
  const sentences = splitSentences(article.body || article.description || '')

  const lines = []
  if (sentences.length > 0) {
    // 先頭の文はリード。ニュースでは要点が入っている。
    lines.push(sentences[0])
    // 残りは具体（数字・固有名詞）を含む文を優先する
    const rest = sentences.slice(1)
    const scored = rest
      .map((sentence) => ({
        sentence,
        score:
          (sentence.match(/[0-9０-９]/g) || []).length +
          keywords.topic.filter((word) => sentence.includes(word)).length * 3 +
          keywords.defense.filter((word) => sentence.includes(word)).length * 2 +
          keywords.facility.filter((word) => sentence.includes(word)).length,
      }))
      .sort((a, b) => b.score - a.score)
    for (const { sentence } of scored) {
      if (lines.length >= 3) break
      if (!lines.includes(sentence)) lines.push(sentence)
    }
  }
  while (lines.length < 3) {
    lines.push(lines.length === 0 ? article.title : '（自動要約なし。原文を参照してください）')
  }

  return {
    category: guessCategory(text),
    summary: lines.slice(0, 3).map((line) => line.slice(0, 120)),
    why: '自動抽出による要約です。原文で確認してください。',
    importance: article.relevance >= 6 ? 'high' : 'normal',
    generatedBy: 'extractive',
  }
}

/**
 * 記事に要約を付けて返す。
 * @returns {Promise<{articles: Array, engine: string, errors: string[]}>}
 */
export async function summarizeArticles(articles) {
  const errors = []
  const client = await getClient()

  if (!client) {
    for (const article of articles) Object.assign(article, extractiveSummary(article))
    return { articles, engine: 'extractive', errors: ['ANTHROPIC_API_KEY が未設定のため抽出型要約を使用'] }
  }

  const batches = []
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    batches.push({ items: articles.slice(i, i + BATCH_SIZE), offset: i })
  }

  const settled = await Promise.all(
    batches.map(async ({ items, offset }) => {
      try {
        return { offset, results: await summarizeBatch(client, items, offset) }
      } catch (err) {
        errors.push(`記事 ${offset}〜${offset + items.length - 1} の要約に失敗: ${err.message}`)
        return { offset, results: null }
      }
    }),
  )

  const byIndex = new Map()
  for (const { results } of settled) {
    if (!results) continue
    for (const result of results) byIndex.set(result.index, result)
  }

  for (const [index, article] of articles.entries()) {
    const result = byIndex.get(index)
    if (result && Array.isArray(result.summary) && result.summary.length > 0) {
      Object.assign(article, {
        category: categoryIds.includes(result.category) ? result.category : guessCategory(article.title),
        summary: toThreeLines(result.summary),
        why: result.why || '',
        importance: result.importance || 'normal',
        generatedBy: 'claude',
      })
    } else {
      // 個別に失敗した記事だけ抽出型で埋める。1件の失敗で全体を落とさない。
      Object.assign(article, extractiveSummary(article))
    }
  }

  const usedClaude = articles.some((a) => a.generatedBy === 'claude')
  return { articles, engine: usedClaude ? 'claude' : 'extractive', errors }
}

/** 全記事の要約から「本日の要点」を作る */
export async function buildDigest(articles) {
  const top = articles
    .filter((a) => a.importance === 'high')
    .concat(articles.filter((a) => a.importance !== 'high'))
    .slice(0, 25)

  if (top.length === 0) return []

  const client = await getClient()
  if (!client) {
    return top
      .slice(0, 5)
      .map((article) => `${article.title}（${article.publisher}）`)
  }

  try {
    const listing = top
      .map((a, i) => `${i + 1}. [${a.category}] ${a.title} — ${(a.summary || []).join(' ')}`)
      .join('\n')

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            '以下は本日集まった記事の要約一覧です。',
            'この中から、防衛施設と防衛関連の建築土木を追う読者が',
            '今日押さえるべき動きを最大5点にまとめてください。',
            '個別記事の再掲ではなく、複数の記事にまたがる流れが見えるならそれを書いてください。',
            '',
            listing,
          ].join('\n'),
        },
      ],
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: DIGEST_SCHEMA },
      },
    })

    if (response.stop_reason === 'refusal') return []
    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
    return JSON.parse(text).points ?? []
  } catch {
    // 要点は無くても本体は読める。ここで全体を止めない。
    return []
  }
}
