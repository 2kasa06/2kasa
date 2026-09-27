// 構造化ログ。本番では1行1JSONで標準出力に出し、ログ基盤で拾う想定。
// APIエラー・取得失敗・異常値・AI API エラー・認証エラー・DB エラーをここに集める。

type Level = 'debug' | 'info' | 'warn' | 'error'

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }
const MIN = ORDER[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? ORDER.info

function write(level: Level, event: string, fields: Record<string, unknown> = {}) {
  if (ORDER[level] < MIN) return
  const entry = { time: new Date().toISOString(), level, event, ...fields }
  const line = JSON.stringify(entry, (_k, v) => (v instanceof Error ? { name: v.name, message: v.message, stack: v.stack } : v))
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  debug: (event: string, fields?: Record<string, unknown>) => write('debug', event, fields),
  info: (event: string, fields?: Record<string, unknown>) => write('info', event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => write('warn', event, fields),
  error: (event: string, fields?: Record<string, unknown>) => write('error', event, fields),
}
