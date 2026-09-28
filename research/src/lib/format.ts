// 数値・日時の表示。値が無いときは必ず「—」にし、0 と取り違えないようにする。

const DASH = '—'

export function fmtNumber(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return DASH
  return value.toLocaleString('ja-JP', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function fmtSigned(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return DASH
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±'
  return `${sign}${fmtNumber(Math.abs(value), digits)}`
}

export function fmtPct(value: number | null | undefined, digits = 2, signed = true): string {
  if (value == null || !Number.isFinite(value)) return DASH
  return `${signed ? fmtSigned(value, digits) : fmtNumber(value, digits)}%`
}

/** 百万単位の金額を「兆・億」で読みやすく */
export function fmtMillions(value: number | null | undefined, currency: 'JPY' | 'USD' = 'JPY'): string {
  if (value == null || !Number.isFinite(value)) return DASH
  const sign = value < 0 ? '−' : ''
  const abs = Math.abs(value)
  if (currency === 'USD') {
    if (abs >= 1_000_000) return `${sign}${fmtNumber(abs / 1_000_000, 2)}兆ドル`
    if (abs >= 1_000) return `${sign}${fmtNumber(abs / 1_000, 1)}十億ドル`
    return `${sign}${fmtNumber(abs, 0)}百万ドル`
  }
  if (abs >= 1_000_000) return `${sign}${fmtNumber(abs / 1_000_000, 2)}兆円`
  if (abs >= 100) return `${sign}${fmtNumber(abs / 100, 0)}億円`
  return `${sign}${fmtNumber(abs, 0)}百万円`
}

export function fmtPrice(value: number | null | undefined, currency: 'JPY' | 'USD' = 'JPY'): string {
  if (value == null || !Number.isFinite(value)) return DASH
  return currency === 'USD' ? `$${fmtNumber(value, 2)}` : `${fmtNumber(value, value < 1000 ? 1 : 0)}円`
}

const dateFmt = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' })
const dateTimeFmt = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
})
const shortFmt = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric' })

/** 'YYYY-MM-DD' はそのまま日付として、ISO 文字列は日本時間で表示する */
export function fmtDate(value: string | null | undefined): string {
  if (!value) return DASH
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.replace(/-/g, '/')
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? DASH : dateFmt.format(d)
}

export function fmtDateTime(value: string | null | undefined): string {
  if (!value) return DASH
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.replace(/-/g, '/')
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? DASH : dateTimeFmt.format(d)
}

export function fmtShortDate(value: string | null | undefined): string {
  if (!value) return DASH
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+09:00` : value)
  return Number.isNaN(d.getTime()) ? DASH : shortFmt.format(d)
}

export function toneOf(value: number | null | undefined): 'up' | 'down' | 'flat' {
  if (value == null || !Number.isFinite(value) || Math.abs(value) < 1e-9) return 'flat'
  return value > 0 ? 'up' : 'down'
}

/** シグナルの根拠の数値を「名前 値」で並べる。率には % を付ける */
export function fmtValues(values: Record<string, number>): string {
  return Object.entries(values)
    .map(([k, v]) => {
      const digits = k === 'RSI' ? 1 : Math.abs(v) < 100 ? 2 : 0
      return `${k} ${fmtNumber(v, digits)}${k.endsWith('率') || k === 'バンド幅' || k === '5日前' ? '%' : k.endsWith('比') ? '倍' : ''}`
    })
    .join(' / ')
}
