import { useCallback, useEffect, useRef, useState } from "react";

/* ============================================================
   Beauty Produce — Scroll Animation Hooks
   ============================================================ */

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * 要素がビューポートに入ったら isRevealed を true にします。
 * 一度表示したら監視を解除するので、戻ってきても再アニメーションしません。
 */
export function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLElement | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isRevealed };
}

/**
 * 子要素を順番に表示させるための監視。
 * containerRef をラッパーに渡すと、revealedItems[i] が順に true になります。
 */
export function useStaggerReveal(count: number, threshold = 0.1) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [revealedItems, setRevealedItems] = useState<boolean[]>(() =>
    Array.from({ length: count }, () => false)
  );

  useEffect(() => {
    setRevealedItems((prev) =>
      prev.length === count ? prev : Array.from({ length: count }, () => false)
    );
  }, [count]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const revealAll = () =>
      setRevealedItems(Array.from({ length: count }, () => true));

    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      revealAll();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          revealAll();
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -6% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [count, threshold]);

  return { containerRef, revealedItems };
}

/** 現在のスクロール量（ヘッダーの背景切り替えなどに使用） */
export function useScrollPosition() {
  const [scrollY, setScrollY] = useState(0);

  const onScroll = useCallback(() => {
    setScrollY(window.scrollY);
  }, []);

  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  return scrollY;
}
