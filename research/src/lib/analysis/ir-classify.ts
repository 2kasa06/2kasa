// IR の重要度をルールで判定する。AI を使わない判定なので、根拠をそのまま表示できる。
// AI 分類を後から足す場合も、このルールの結果を下敷きにして「AIによる分類」と分けて出す。

import type { IrDocument, IrImportance, IrType } from '@/lib/types'

interface Rule {
  importance: IrImportance
  /** 一致したときに表示する根拠 */
  reason: string
  types?: IrType[]
  words?: string[]
}

// 上から順に評価し、最初に当たったものを採る。重い順に並べてある。
const RULES: Rule[] = [
  { importance: 'critical', reason: '業績予想の修正（通期見通しの変更）', types: ['業績予想修正'] },
  { importance: 'critical', reason: '業績予想の修正に言及', words: ['上方修正', '下方修正', '業績予想の修正', '通期業績予想'] },
  { importance: 'critical', reason: '企業買収・合併・TOB', types: ['M&A'], words: ['公開買付', 'TOB', '経営統合', '合併'] },
  { importance: 'critical', reason: '決算発表（決算短信）', types: ['決算短信'] },
  { importance: 'important', reason: '自己株式の取得（株主還元）', types: ['自社株買い'], words: ['自己株式の取得', '自社株買い'] },
  { importance: 'important', reason: '配当方針・配当予想の変更', types: ['配当'], words: ['増配', '減配', '配当予想'] },
  { importance: 'important', reason: '株式分割（投資単位の変更）', types: ['株式分割'] },
  { importance: 'important', reason: '決算説明資料', types: ['決算説明資料'] },
  { importance: 'important', reason: '代表者の異動', words: ['代表取締役', '社長交代', 'CEO'] },
  { importance: 'normal', reason: '定期的な法定開示', types: ['有価証券報告書'] },
  { importance: 'normal', reason: '人事・組織', types: ['人事'] },
  { importance: 'normal', reason: '新商品・サービス', types: ['新商品'] },
]

export function classifyIr(doc: Pick<IrDocument, 'type' | 'title'>): { importance: IrImportance; reason: string } {
  for (const rule of RULES) {
    const typeHit = rule.types?.includes(doc.type) ?? false
    const wordHit = rule.words?.some((w) => doc.title.includes(w)) ?? false
    if (typeHit || wordHit) return { importance: rule.importance, reason: rule.reason }
  }
  return { importance: 'normal', reason: 'その他の開示' }
}

export const IMPORTANCE_LABEL: Record<IrImportance, string> = {
  critical: '最重要',
  important: '重要',
  normal: '通常',
}
