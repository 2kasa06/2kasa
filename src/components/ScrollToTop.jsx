import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ページ遷移時にスクロール位置をリセットします。
 * navigate('/', { state: { scrollTo: 'services' } }) が渡された場合は、
 * 遷移後に該当セクションまでスムーススクロールします。
 */
export default function ScrollToTop() {
  const { pathname, state } = useLocation()

  useEffect(() => {
    const target = state?.scrollTo
    if (target) {
      const id = window.setTimeout(() => {
        document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
      return () => window.clearTimeout(id)
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, state])

  return null
}
