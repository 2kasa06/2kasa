// 日付キーの生成。render と stats の両方から使うので独立させている。

import { site } from '../config.mjs'

const dayParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: site.timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** ISO文字列から Asia/Tokyo の YYYY-MM-DD を作る */
export function dayKeyOf(iso) {
  const parts = dayParts.formatToParts(new Date(iso))
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}`
}
