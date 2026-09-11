import type { Sauna } from '@/types';

/**
 * 一覧で取得した施設を詳細画面から引くための軽いキャッシュ。
 * 詳細のためだけに Places を叩き直すと課金が増えるので、まずここを見る。
 */
const cache = new Map<string, Sauna>();

export function rememberSaunas(items: Sauna[]): void {
  for (const item of items) cache.set(item.id, item);
}

export function getCachedSauna(id: string): Sauna | undefined {
  return cache.get(id);
}
