import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * .reveal / .reveal-left / .reveal-right を持つ要素を監視し、
 * ビューポートに入ったタイミングで .revealed を付与します。
 * 返り値の ref をセクションのルート要素に渡すと、その中だけを監視します。
 * ref を渡さない場合は document 全体が対象になります。
 */
export function useScrollAnimation({ threshold = 0.15, rootMargin = '0px 0px -8% 0px', deps = [] } = {}) {
  const containerRef = useRef(null)

  useEffect(() => {
    const root = containerRef.current ?? document
    const targets = root.querySelectorAll('.reveal, .reveal-left, .reveal-right')
    if (!targets.length) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.classList.add('revealed'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold, rootMargin }
    )

    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold, rootMargin, ...deps])

  return containerRef
}

/** スクロール量が offset を超えたら true（ナビの背景切り替え用） */
export function useScrolled(offset = 24) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [offset])

  return scrolled
}

/** マウス位置に応じた微細なパララックス（ヒーローの浮遊シェイプ用） */
export function useParallax(strength = 12) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const onMove = useCallback(
    (event) => {
      const { innerWidth, innerHeight } = window
      setOffset({
        x: ((event.clientX / innerWidth) * 2 - 1) * strength,
        y: ((event.clientY / innerHeight) * 2 - 1) * strength,
      })
    },
    [strength]
  )

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(hover: none)').matches) return
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [onMove])

  return offset
}

export default useScrollAnimation
