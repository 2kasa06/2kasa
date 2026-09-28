// サーバ無しで動く静的版（GitHub Pages 用）のときの切り替え。
// ビルド時に NEXT_PUBLIC_STATIC_EXPORT=1 と NEXT_PUBLIC_BASE_PATH を渡すと有効になる。
// 静的版ではデータを API ではなく、ビルド時に書き出した JSON から読む。

export const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_EXPORT === '1'
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/** 静的版のデータファイルの場所 */
export const staticDataUrl = (file: string) => `${BASE_PATH}/static-data/${file}`
