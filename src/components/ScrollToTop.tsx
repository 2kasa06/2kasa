import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * ページ遷移時にスクロール位置をリセットします。
 * URLにハッシュが含まれる場合は、該当セクションまでスムーススクロールします。
 */
export default function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");

    if (hash) {
      const target = document.getElementById(hash);
      if (target) {
        const id = window.setTimeout(
          () => target.scrollIntoView({ behavior: "smooth", block: "start" }),
          80
        );
        return () => window.clearTimeout(id);
      }
    }

    window.scrollTo({ top: 0, left: 0 });
  }, [location]);

  return null;
}
