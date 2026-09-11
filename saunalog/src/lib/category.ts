import type { SaunaCategory } from '@/types';

/**
 * 店名と Places の types から施設種別を推定する。
 * Places API には「サウナ」という type が無いため、日本の施設名の慣習に寄せた判定をしている。
 */
export function categorize(name: string, types: string[] = []): SaunaCategory {
  const n = name.toLowerCase();
  const has = (...words: string[]) => words.some((w) => n.includes(w.toLowerCase()));

  if (has('スーパー銭湯', 'スパ銭', '健康ランド', '湯処', '湯楽', 'ゆー', 'ラクスパ')) {
    return 'super_sento';
  }
  if (has('カプセル', 'ホテル', 'hotel', 'サウナ&カプセル', 'サウナ＆カプセル')) {
    return 'hotel';
  }
  if (has('サウナ', 'sauna', 'テントサウナ', 'ロウリュ')) {
    return 'sauna';
  }
  if (has('銭湯', '湯', '温泉', 'onsen') || types.includes('public_bath')) {
    // 「〜の湯」は銭湯と温泉施設のどちらもある。types で寄せられる方に倒す。
    return types.includes('spa') ? 'spa' : 'sento';
  }
  if (types.includes('spa') || has('スパ', 'spa')) {
    return 'spa';
  }
  return 'other';
}
