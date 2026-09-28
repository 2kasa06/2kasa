import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-lg font-semibold">銘柄が見つかりません</h1>
      <p className="mt-2 text-sm text-muted-foreground">銘柄コードをご確認ください。上の検索欄から、コード・名称・ティッカーで探せます。</p>
      <Link href="/" className="mt-4 inline-block text-sm text-primary hover:underline">
        マーケットに戻る
      </Link>
    </div>
  )
}
