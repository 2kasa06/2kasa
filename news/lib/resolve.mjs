// Google ニュースのリンクから元記事のURLを取り出す。
//
// 診断（news/tools/probe.mjs）で分かったこと:
//   - リンク先は 580KB の Angular 製ページで、HTTP のリダイレクトは起きない
//   - HTML の中に元記事のURLは含まれない（外部ホストは解析・CDN のみ）
//   - 記事IDの base64 にもURLは埋まっていない（旧形式は廃止済み）
//   - 飛ばしているのは window.location による JavaScript の遷移
//
// つまり HTTP だけでは解決できない。ブラウザで開いて、実際に飛んだ先を見るしかない。
// Playwright が入っていない環境では解決を諦め、見出しだけの記事として扱う。

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

const NULL_RESOLVER = {
  available: false,
  reason: 'Playwright が使えないため、元記事URLの解決を行いません',
  async resolve() {
    return null
  },
  async close() {},
}

/**
 * @returns {Promise<{available: boolean, reason?: string, resolve: (url: string) => Promise<string|null>, close: () => Promise<void>}>}
 */
export async function createResolver({ timeoutMs = 20000 } = {}) {
  let chromium
  try {
    ;({ chromium } = await import('playwright'))
  } catch {
    return NULL_RESOLVER
  }

  let browser
  try {
    browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  } catch (err) {
    return { ...NULL_RESOLVER, reason: `ブラウザを起動できません: ${err.message}` }
  }

  const context = await browser.newContext({ locale: 'ja-JP', userAgent: UA })
  // 画像やフォントは遷移に関係ない。落とすと目に見えて速くなる。
  await context.route('**/*', (route) => {
    const type = route.request().resourceType()
    if (type === 'image' || type === 'font' || type === 'media') return route.abort()
    return route.continue()
  })

  return {
    available: true,
    async resolve(url) {
      const page = await context.newPage()
      try {
        await page.goto(url, { waitUntil: 'commit', timeout: timeoutMs })
        // news.google.com から出たら、そこが元記事
        await page.waitForURL((current) => current.hostname !== 'news.google.com', {
          timeout: timeoutMs,
        })
        const final = page.url()
        return new URL(final).hostname === 'news.google.com' ? null : final
      } catch {
        return null
      } finally {
        await page.close().catch(() => {})
      }
    },
    async close() {
      await context.close().catch(() => {})
      await browser.close().catch(() => {})
    },
  }
}
