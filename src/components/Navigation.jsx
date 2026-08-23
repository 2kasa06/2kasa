import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { brand, ages } from '../data/content'
import { useScrolled } from '../hooks/useScrollAnimation'

const sectionLinks = [
  { label: 'サービス', hash: 'services' },
  { label: '年代別', hash: 'ages' },
  { label: 'ビフォーアフター', hash: 'before-after' },
  { label: 'お客様の声', hash: 'voice' },
  { label: 'よくある質問', hash: 'faq' },
]

export default function Navigation() {
  const scrolled = useScrolled(24)
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const goToSection = (hash) => {
    setOpen(false)
    if (location.pathname === '/') {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      navigate('/', { state: { scrollTo: hash } })
    }
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'py-3' : 'py-5'
      }`}
      style={{
        backgroundColor: scrolled ? 'rgba(253, 250, 246, 0.88)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(200, 185, 170, 0.35)' : '1px solid transparent',
      }}
    >
      <div className="container flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" aria-label={`${brand.name} ホーム`}>
          <img src="/images/logo-mark.svg" alt="" width="36" height="36" className="w-9 h-9" />
          <span className="leading-tight">
            <span
              className="block text-[0.95rem] tracking-[0.28em]"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--warm-brown)' }}
            >
              BEAUTY
            </span>
            <span
              className="block text-[0.6rem] tracking-[0.34em]"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--rose-beige)' }}
            >
              PRODUCE
            </span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-7" aria-label="メインメニュー">
          {sectionLinks.map((item) => (
            <button key={item.hash} type="button" className="nav-link" onClick={() => goToSection(item.hash)}>
              {item.label}
            </button>
          ))}
          <button type="button" className="btn-primary !py-2.5 !px-7 text-xs" onClick={() => goToSection('contact')}>
            ご予約・ご相談
          </button>
        </nav>

        <button
          type="button"
          className="lg:hidden relative z-50 w-11 h-11 flex flex-col items-center justify-center gap-[5px]"
          aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span
            className="block w-6 h-px transition-all duration-300"
            style={{
              backgroundColor: 'var(--warm-brown)',
              transform: open ? 'translateY(6px) rotate(45deg)' : 'none',
            }}
          />
          <span
            className="block w-6 h-px transition-all duration-300"
            style={{ backgroundColor: 'var(--warm-brown)', opacity: open ? 0 : 1 }}
          />
          <span
            className="block w-6 h-px transition-all duration-300"
            style={{
              backgroundColor: 'var(--warm-brown)',
              transform: open ? 'translateY(-6px) rotate(-45deg)' : 'none',
            }}
          />
        </button>
      </div>

      {/* モバイルメニュー */}
      <div
        className="lg:hidden fixed inset-0 z-40 transition-all duration-500"
        style={{
          backgroundColor: 'var(--warm-white)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transform: open ? 'translateY(0)' : 'translateY(-12px)',
        }}
        aria-hidden={!open}
      >
        <div className="h-full overflow-y-auto px-8 pt-28 pb-16 flex flex-col gap-8">
          <ul className="flex flex-col gap-5">
            {sectionLinks.map((item) => (
              <li key={item.hash}>
                <button
                  type="button"
                  className="text-lg tracking-[0.14em]"
                  style={{ fontFamily: "'Noto Serif JP', serif", color: 'var(--warm-brown)' }}
                  onClick={() => goToSection(item.hash)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          <div>
            <p className="section-label mb-4">BY AGE</p>
            <ul className="grid grid-cols-2 gap-3">
              {ages.map((age) => (
                <li key={age.slug}>
                  <Link
                    to={age.path}
                    className="block px-4 py-3 rounded-2xl text-sm"
                    style={{
                      backgroundColor: 'var(--pale-pink)',
                      color: 'var(--warm-brown)',
                    }}
                  >
                    {age.range}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <button type="button" className="btn-primary w-full" onClick={() => goToSection('contact')}>
            ご予約・ご相談
          </button>

          <div className="mt-auto text-xs leading-loose" style={{ color: 'var(--medium-brown)' }}>
            <p>{brand.tel}</p>
            <p>{brand.email}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
