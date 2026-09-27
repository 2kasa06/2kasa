import Link from 'next/link'
import { LineChart } from 'lucide-react'
import { StockSearch } from './stock-search'
import { ThemeToggle } from './theme-toggle'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <LineChart className="size-5 text-primary" aria-hidden />
          <span>投資リサーチ</span>
        </Link>
        <nav className="flex gap-3 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            マーケット
          </Link>
          <Link href="/stocks/7203" className="hover:text-foreground">
            銘柄の例
          </Link>
        </nav>
        <div className="order-last w-full sm:order-none sm:ml-auto sm:w-96">
          <StockSearch />
        </div>
        <div className="ml-auto sm:ml-0">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
