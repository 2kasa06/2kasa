import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { useScrollPosition } from "@/hooks/useScrollAnimation";

const LOGO_URL = "/images/logo-mark.webp";

const navItems = [
  { label: "サービス", href: "/#services" },
  { label: "10代〜20代", href: "/teens" },
  { label: "30代", href: "/thirties" },
  { label: "40代", href: "/forties" },
  { label: "50代〜60代", href: "/fifties" },
  { label: "お客様の声", href: "/#testimonials" },
];

export default function Navigation() {
  const scrollY = useScrollPosition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();
  const isScrolled = scrollY > 60;

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: isScrolled
            ? "rgba(253, 250, 246, 0.92)"
            : "transparent",
          WebkitBackdropFilter: isScrolled ? "blur(20px)" : "none",
          backdropFilter: isScrolled ? "blur(20px)" : "none",
          boxShadow: isScrolled
            ? "0 1px 30px rgba(50, 35, 30, 0.06)"
            : "none",
        }}
      >
        <div className="container">
          <nav className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <img
                src={LOGO_URL}
                alt="Beauty Produce Logo"
                className="w-9 h-9 object-contain transition-transform duration-300 group-hover:scale-105"
              />
              <div className="flex flex-col leading-none">
                <span
                  className="font-serif text-base tracking-widest"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    color: "var(--warm-brown)",
                    letterSpacing: "0.2em",
                  }}
                >
                  Beauty
                </span>
                <span
                  className="font-serif text-base tracking-widest"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    color: "var(--rose-beige)",
                    letterSpacing: "0.2em",
                  }}
                >
                  Produce
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-8">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="nav-link">
                  {item.label}
                </Link>
              ))}
            </div>

            {/* CTA + Hamburger */}
            <div className="flex items-center gap-4">
              <Link
                href="/#booking"
                className="hidden md:inline-flex btn-primary text-xs py-2.5 px-5"
              >
                ご予約・お問い合わせ
              </Link>
              <button
                className="lg:hidden p-2 rounded-full transition-colors duration-200"
                style={{ color: "var(--warm-brown)" }}
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="メニュー"
              >
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className="fixed inset-0 z-40 lg:hidden transition-all duration-500"
        style={{
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? "auto" : "none",
          background: "rgba(253, 250, 246, 0.97)",
          WebkitBackdropFilter: "blur(20px)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex flex-col items-center justify-center h-full gap-8 px-8">
          {navItems.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xl tracking-widest transition-all duration-300"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                color: "var(--warm-brown)",
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? "translateY(0)" : "translateY(20px)",
                transitionDelay: `${i * 60}ms`,
              }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/#booking"
            className="btn-primary mt-4"
            style={{
              opacity: menuOpen ? 1 : 0,
              transform: menuOpen ? "translateY(0)" : "translateY(20px)",
              transitionDelay: `${navItems.length * 60}ms`,
              transition: "all 300ms cubic-bezier(0.23, 1, 0.32, 1)",
            }}
          >
            ご予約・お問い合わせ
          </Link>
        </div>
      </div>
    </>
  );
}
