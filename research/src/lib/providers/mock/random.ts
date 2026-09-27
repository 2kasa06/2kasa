// モック生成用の決定的な乱数と日付の道具。同じ日・同じ銘柄なら毎回同じデータになる。

export function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32。軽くて十分にばらつく */
export function createRandom(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  /** 標準正規乱数（Box-Muller） */
  const normal = () => {
    const u = Math.max(next(), 1e-12)
    const v = next()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  return { next, normal, range: (min: number, max: number) => min + (max - min) * next() }
}

const DAY = 86_400_000

export function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** 日本時間での「今日」 */
export function todayJst(now = new Date()): Date {
  const jst = new Date(now.getTime() + 9 * 3600_000)
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()))
}

export function isWeekday(d: Date): boolean {
  const w = d.getUTCDay()
  return w !== 0 && w !== 6
}

/**
 * モックの「最新の取引日」。日本時間15:30より前なら前営業日。
 * 祝日は考慮しない（モックなので土日だけ除く）。
 */
export function latestSessionDate(now = new Date()): Date {
  const jstHour = (now.getUTCHours() + 9) % 24 + now.getUTCMinutes() / 60
  let d = todayJst(now)
  if (jstHour < 15.5) d = new Date(d.getTime() - DAY)
  while (!isWeekday(d)) d = new Date(d.getTime() - DAY)
  return d
}

/** from から to まで（両端含む）の平日 */
export function weekdaysBetween(from: Date, to: Date): Date[] {
  const out: Date[] = []
  for (let t = from.getTime(); t <= to.getTime(); t += DAY) {
    const d = new Date(t)
    if (isWeekday(d)) out.push(d)
  }
  return out
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY)
}
