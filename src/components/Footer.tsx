import { Link } from "wouter";
import { Instagram, Mail, Phone } from "lucide-react";

/* ============================================================
   Beauty Produce — Footer
   ============================================================ */

const LOGO_URL = "/images/logo-mark.webp";

const stageLinks = [
  { label: "10代〜20代", href: "/teens" },
  { label: "30代", href: "/thirties" },
  { label: "40代", href: "/forties" },
  { label: "50代〜60代", href: "/fifties" },
];

const siteLinks = [
  { label: "サービス", href: "/#services" },
  { label: "変化の物語", href: "/#before-after" },
  { label: "お客様の声", href: "/#testimonials" },
  { label: "サービスの流れ", href: "/#flow" },
  { label: "よくあるご質問", href: "/#faq" },
  { label: "ご予約・お問い合わせ", href: "/#booking" },
];

export default function Footer() {
  return (
    <footer
      className="pt-20 pb-10 relative overflow-hidden"
      style={{ background: "hsl(42, 35%, 96%)", borderTop: "1px solid rgba(200,185,170,0.4)" }}
    >
      <div
        className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-5 animate-float-2 pointer-events-none"
        style={{ background: "var(--rose-beige)", transform: "translate(30%, 30%)" }}
      />

      <div className="container relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-5">
              <img src={LOGO_URL} alt="Beauty Produce" className="w-11 h-11 object-contain" />
              <span className="flex flex-col leading-none">
                <span
                  className="text-lg"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    color: "var(--warm-brown)",
                    letterSpacing: "0.2em",
                  }}
                >
                  Beauty
                </span>
                <span
                  className="text-lg"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    color: "var(--rose-beige)",
                    letterSpacing: "0.2em",
                  }}
                >
                  Produce
                </span>
              </span>
            </Link>

            <p
              className="text-sm leading-loose max-w-sm mb-6"
              style={{ color: "var(--medium-brown)", letterSpacing: "0.06em" }}
            >
              人生のステージごとに変化する美しさ・自信・魅力に寄り添う、
              あなただけの美容プロデュースサービス。
            </p>

            <ul className="space-y-2.5">
              <li>
                <a
                  href="tel:0900000000"
                  className="inline-flex items-center gap-2.5 text-sm transition-colors duration-200 hover:text-[var(--rose-beige)]"
                  style={{ color: "var(--medium-brown)" }}
                >
                  <Phone size={14} style={{ color: "var(--rose-beige)" }} />
                  090-0000-0000
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@example.com"
                  className="inline-flex items-center gap-2.5 text-sm transition-colors duration-200 hover:text-[var(--rose-beige)]"
                  style={{ color: "var(--medium-brown)" }}
                >
                  <Mail size={14} style={{ color: "var(--rose-beige)" }} />
                  info@example.com
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-sm transition-colors duration-200 hover:text-[var(--rose-beige)]"
                  style={{ color: "var(--medium-brown)" }}
                >
                  <Instagram size={14} style={{ color: "var(--rose-beige)" }} />
                  Instagram
                </a>
              </li>
            </ul>
          </div>

          {/* Life stages */}
          <div>
            <p className="section-label mb-5">Life Stage</p>
            <ul className="space-y-2.5">
              {stageLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm transition-colors duration-200 hover:text-[var(--rose-beige)]"
                    style={{ color: "var(--medium-brown)" }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Site links */}
          <div>
            <p className="section-label mb-5">Menu</p>
            <ul className="space-y-2.5">
              {siteLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm transition-colors duration-200 hover:text-[var(--rose-beige)]"
                    style={{ color: "var(--medium-brown)" }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="mt-16 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: "1px solid rgba(200,185,170,0.4)" }}
        >
          <p
            className="text-xs tracking-widest"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--light-brown)" }}
          >
            © {new Date().getFullYear()} Beauty Produce. All rights reserved.
          </p>
          <p
            className="text-xs tracking-widest"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: "italic",
              color: "var(--rose-beige)",
            }}
          >
            Your Story Begins Here
          </p>
        </div>
      </div>
    </footer>
  );
}
