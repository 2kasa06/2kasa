import { describe, expect, it } from 'vitest'
import type { NewsArticle } from '@/lib/types'
import { classifyIr } from './ir-classify'
import { groupNews, titleSimilarity } from './news-group'

const article = (id: string, title: string, publishedAt: string, extra: Partial<NewsArticle> = {}): NewsArticle => ({
  id,
  title,
  publishedAt,
  media: `媒体${id}`,
  url: `https://example.com/${id}`,
  category: '決算',
  relatedCodes: ['7203'],
  ...extra,
})

describe('ニュースの束ね', () => {
  it('言い回しの違う同じニュースを1つにまとめる', () => {
    const groups = groupNews([
      article('1', 'トヨタ、通期営業益予想を上方修正　円安と北米販売が寄与', '2026-09-22T06:00:00Z'),
      article('2', '【速報】トヨタ、通期営業利益予想を上方修正', '2026-09-22T06:30:00Z'),
      article('3', 'トヨタ 通期営業益予想を上方修正 北米販売好調と円安で', '2026-09-22T08:00:00Z'),
      article('4', 'トヨタ、新型BEVを国内で発売', '2026-09-24T01:00:00Z'),
    ])
    expect(groups.length).toBe(2)
    const revision = groups.find((g) => g.articles.length === 3)!
    expect(revision.lead.id).toBe('1')
  })
  it('時間が離れた似た見出しは別の束にする', () => {
    const groups = groupNews([
      article('1', 'トヨタ、四半期決算を発表', '2026-05-10T06:00:00Z'),
      article('2', 'トヨタ、四半期決算を発表', '2026-08-10T06:00:00Z'),
    ])
    expect(groups.length).toBe(2)
  })
  it('向きが割れた束は「中立/要確認」', () => {
    const groups = groupNews([
      article('1', 'A社が新工場の建設を発表', '2026-09-22T06:00:00Z', { sentiment: 'positive' }),
      article('2', 'A社が新工場の建設を発表へ', '2026-09-22T07:00:00Z', { sentiment: 'negative' }),
    ])
    expect(groups[0].sentiment).toBe('review')
  })
  it('見出しが似ていても銘柄が違えば束ねない', () => {
    const groups = groupNews([
      article('1', 'トヨタ、四半期決算を発表', '2026-09-22T06:00:00Z', { relatedCodes: ['7203'] }),
      article('2', 'ホンダ、四半期決算を発表', '2026-09-22T06:10:00Z', { relatedCodes: ['7267'] }),
    ])
    expect(groups.length).toBe(2)
  })
  it('短い見出しが長い見出しに含まれる場合も束ねる', () => {
    const groups = groupNews([
      // Jaccard は 0.34 と低いが、短い方の見出しがまるごと長い方に含まれている
      article('1', 'トヨタ、通期営業益予想を上方修正', '2026-09-22T06:00:00Z'),
      article('2', 'トヨタ、通期営業益予想を上方修正　円安と北米販売が寄与、自社株買いや新型車の投入計画も説明', '2026-09-22T07:00:00Z'),
    ])
    expect(groups.length).toBe(1)
  })
  it('無関係な見出しは似ていない', () => {
    expect(titleSimilarity('日銀が政策金利を据え置き', 'トヨタが新型車を発売')).toBeLessThan(0.2)
  })
})

describe('IR の重要度', () => {
  it('業績予想の修正は最重要', () => {
    expect(classifyIr({ type: '適時開示', title: '通期業績予想の上方修正に関するお知らせ' }).importance).toBe('critical')
  })
  it('自社株買いは重要', () => {
    const r = classifyIr({ type: '自社株買い', title: '自己株式取得に係る事項の決定' })
    expect(r.importance).toBe('important')
    expect(r.reason).toContain('自己株式')
  })
  it('それ以外は通常', () => {
    expect(classifyIr({ type: 'その他', title: 'ウェブサイトのリニューアルについて' }).importance).toBe('normal')
  })
})
