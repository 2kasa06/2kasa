import type { Metadata, Viewport } from 'next'
import { SiteHeader } from '@/components/site-header'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: '投資リサーチ｜株価・チャート・テクニカル・IR・決算をひとつの画面で',
    template: '%s｜投資リサーチ',
  },
  description:
    '銘柄コードを入れるだけで、株価・チャート・テクニカル条件・IR・ニュース・決算・財務を一画面で確認できる投資リサーチ・ダッシュボード。売買の推奨は行いません。',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f7f5' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0f13' },
  ],
}

// 描画前に明暗を決める。保存された選択 → OS の設定の順
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})()`

const isMock = (process.env.DATA_SOURCE ?? 'mock') === 'mock'

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        {isMock && (
          <div className="border-b border-warn-fg/20 bg-warn-bg px-4 py-1.5 text-center text-xs text-warn-fg">
            サンプルデータで表示しています。株価・ニュース・IR・財務はすべて開発用の作り物で、実在企業の実際の数値ではありません。
          </div>
        )}
        <SiteHeader />
        <main className="mx-auto max-w-[1400px] px-4 pt-4 pb-16">{children}</main>
        <footer className="border-t">
          <div className="mx-auto max-w-[1400px] space-y-1 px-4 py-6 text-xs text-muted-foreground">
            <p>
              本サイトは情報整理を目的としたもので、特定の銘柄の売買を推奨するものではありません。テクニカル条件・過去データとの比較は事実の提示であり、将来の値動きを示すものではありません。投資判断はご自身の責任で行ってください。
            </p>
            <p>「AI生成」と表示された内容は AI が作成したもので、誤りを含む可能性があります。必ず情報源の原文をご確認ください。</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
