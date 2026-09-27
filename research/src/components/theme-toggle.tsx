'use client'

import { Moon, Sun } from 'lucide-react'
import { Button } from './ui/button'

/** 明暗の切替。選んだ方を覚える（覚えられない環境でも表示は正しく動く） */
export function ThemeToggle() {
  const toggle = () => {
    const dark = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch {
      // プライベートモードなど。保存できなくても切替は効いている
    }
    window.dispatchEvent(new Event('themechange'))
  }
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="ライト／ダークを切り替える">
      <Sun className="hidden size-4 dark:block" aria-hidden />
      <Moon className="size-4 dark:hidden" aria-hidden />
    </Button>
  )
}
