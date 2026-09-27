'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { Input } from './ui/input'
import { cn } from './ui/utils'

interface Hit {
  code: string
  name: string
  nameEn: string
  ticker: string
  market: string
}

/** 銘柄コード・名称・英語名・ティッカーで探す。Enter で最上位の候補へ移動 */
export function StockSearch({ className }: { className?: string }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [failed, setFailed] = useState(false)
  const listId = useId()
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const query = q.trim()
    if (!query) return
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
        const json = await res.json()
        setHits(res.ok ? json.data : [])
        setFailed(!res.ok)
        setActive(0)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setFailed(true)
      }
    }, 150)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [q])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const go = (code: string) => {
    setOpen(false)
    setQ('')
    router.push(`/stocks/${encodeURIComponent(code)}`)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, visible.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (visible[active]) go(visible[active].code)
      else if (/^[0-9A-Za-z]{3,6}$/.test(q.trim())) go(q.trim())
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && q.trim().length > 0
  // 検索語を消したときは前回の候補を出さない（state を消すより派生させる方が描画が1回で済む）
  const visible = q.trim() ? hits : []

  return (
    <div ref={box} className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="銘柄コード・名称・ティッカー（例: 7203 / トヨタ / Toyota）"
        className="pl-8"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="銘柄検索"
      />
      {showList && (
        <ul id={listId} role="listbox" className="absolute top-full right-0 left-0 z-50 mt-1 max-h-80 overflow-auto rounded-md border bg-card p-1 shadow-lg">
          {failed && <li className="px-3 py-2 text-sm text-down">検索に失敗しました</li>}
          {!failed && visible.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">該当する銘柄がありません</li>}
          {visible.map((h, i) => (
            <li
              key={h.code}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault()
                go(h.code)
              }}
              onMouseEnter={() => setActive(i)}
              className={cn('flex cursor-pointer items-baseline gap-2 rounded px-2.5 py-2 text-sm', i === active && 'bg-muted')}
            >
              <span className="tabular w-12 shrink-0 font-semibold">{h.code}</span>
              <span className="truncate">{h.name}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">{h.market}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
