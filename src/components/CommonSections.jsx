import { useCallback, useEffect, useRef, useState } from 'react'
import { beforeAfter, brand, faqs, flow, testimonials } from '../data/content'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

/* ============================================================
   セクション見出し
   ============================================================ */
export function SectionHeading({ label, title, subtitle, align = 'center' }) {
  const alignment = align === 'center' ? 'text-center items-center' : 'text-left items-start'
  return (
    <div className={`flex flex-col ${alignment} gap-4 reveal`}>
      <p className="section-label">{label}</p>
      <h2 className="section-title">{title}</h2>
      {subtitle && (
        <p className={`section-subtitle max-w-2xl ${align === 'center' ? 'mx-auto' : ''}`}>{subtitle}</p>
      )}
    </div>
  )
}

/* ============================================================
   浮遊する装飾シェイプ
   ============================================================ */
export function FloatingShapes({ variant = 'default' }) {
  const palettes = {
    default: ['var(--pale-pink)', 'var(--greige)', 'var(--gold-accent)'],
    warm: ['var(--pale-pink)', 'var(--gold-accent)', 'var(--greige)'],
  }
  const [a, b, c] = palettes[variant] ?? palettes.default

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <span
        className="float-shape animate-float-1"
        style={{ top: '8%', left: '6%', width: '180px', height: '180px', backgroundColor: a, opacity: 0.45 }}
      />
      <span
        className="float-shape animate-float-2"
        style={{ top: '52%', right: '4%', width: '260px', height: '260px', backgroundColor: b, opacity: 0.35 }}
      />
      <span
        className="float-shape animate-float-3"
        style={{ bottom: '6%', left: '22%', width: '110px', height: '110px', backgroundColor: c, opacity: 0.25 }}
      />
      <span
        className="float-shape animate-pulse-glow"
        style={{ top: '24%', right: '26%', width: '64px', height: '64px', backgroundColor: c, opacity: 0.3 }}
      />
    </div>
  )
}

/* ============================================================
   ご利用の流れ
   ============================================================ */
export function FlowSection() {
  const ref = useScrollAnimation()

  return (
    <section id="flow" ref={ref} className="py-24 lg:py-32" style={{ backgroundColor: 'var(--ivory)' }}>
      <div className="container">
        <SectionHeading
          label="FLOW"
          title="ご利用の流れ"
          subtitle="ご予約から結果のお渡しまで、4つのステップで進みます。はじめての方にも、当日の流れを事前にご案内します。"
        />

        <ol className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {flow.map((item, index) => (
            <li
              key={item.step}
              className="card-glow p-8 reveal"
              style={{ transitionDelay: `${index * 90}ms` }}
            >
              <span
                className="block text-4xl mb-4"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--rose-beige)' }}
              >
                {item.step}
              </span>
              <h3 className="text-lg mb-3" style={{ color: 'var(--warm-brown)' }}>
                {item.title}
              </h3>
              <p className="text-sm leading-loose" style={{ color: 'var(--medium-brown)' }}>
                {item.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ============================================================
   ビフォーアフター（ドラッグ比較スライダー）
   ============================================================ */
function BeforeAfterSlider({ item }) {
  const [position, setPosition] = useState(50)
  const containerRef = useRef(null)
  const draggingRef = useRef(false)

  const updateFromClientX = useCallback((clientX) => {
    const node = containerRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const ratio = ((clientX - rect.left) / rect.width) * 100
    setPosition(Math.min(100, Math.max(0, ratio)))
  }, [])

  useEffect(() => {
    const onMove = (event) => {
      if (!draggingRef.current) return
      const clientX = event.touches ? event.touches[0].clientX : event.clientX
      updateFromClientX(clientX)
    }
    const onUp = () => {
      draggingRef.current = false
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [updateFromClientX])

  const startDrag = (event) => {
    draggingRef.current = true
    const clientX = event.touches ? event.touches[0].clientX : event.clientX
    updateFromClientX(clientX)
  }

  const onKeyDown = (event) => {
    if (event.key === 'ArrowLeft') setPosition((v) => Math.max(0, v - 5))
    if (event.key === 'ArrowRight') setPosition((v) => Math.min(100, v + 5))
  }

  return (
    <figure className="reveal">
      <div
        ref={containerRef}
        className="before-after-container aspect-[4/3]"
        onMouseDown={startDrag}
        onTouchStart={startDrag}
      >
        <img
          src={item.after}
          alt={`${item.title} アフター`}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <img
            src={item.before}
            alt={`${item.title} ビフォー`}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <span
          className="absolute top-4 left-4 px-3 py-1 rounded-full text-[0.65rem] tracking-[0.2em] transition-opacity duration-300"
          style={{
            backgroundColor: 'rgba(253,250,246,0.9)',
            color: 'var(--medium-brown)',
            opacity: position > 18 ? 1 : 0,
          }}
        >
          BEFORE
        </span>
        <span
          className="absolute top-4 right-4 px-3 py-1 rounded-full text-[0.65rem] tracking-[0.2em]"
          style={{ backgroundColor: 'var(--rose-beige)', color: 'var(--warm-white)' }}
        >
          AFTER
        </span>

        <div
          className="absolute top-0 bottom-0 w-px"
          style={{ left: `${position}%`, backgroundColor: 'var(--warm-white)' }}
        >
          <button
            type="button"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center shadow-lg"
            style={{ backgroundColor: 'var(--warm-white)', color: 'var(--rose-beige)' }}
            aria-label={`${item.title} のビフォーアフター比較スライダー`}
            aria-valuenow={Math.round(position)}
            aria-valuemin={0}
            aria-valuemax={100}
            role="slider"
            tabIndex={0}
            onKeyDown={onKeyDown}
            onMouseDown={startDrag}
            onTouchStart={startDrag}
          >
            <span className="text-sm tracking-tighter">◀▶</span>
          </button>
        </div>
      </div>

      <figcaption className="mt-5">
        <h3 className="text-base mb-2" style={{ color: 'var(--warm-brown)' }}>
          {item.title}
        </h3>
        <p className="text-sm leading-loose" style={{ color: 'var(--medium-brown)' }}>
          {item.body}
        </p>
      </figcaption>
    </figure>
  )
}

export function BeforeAfterSection() {
  const ref = useScrollAnimation()

  return (
    <section
      id="before-after"
      ref={ref}
      className="relative py-24 lg:py-32 overflow-hidden"
      style={{ backgroundColor: 'var(--warm-white)' }}
    >
      <FloatingShapes />
      <div className="container relative">
        <SectionHeading
          label="BEFORE / AFTER"
          title="変化のかたち"
          subtitle="大きく変えるのではなく、似合うほうへ少しずつ寄せていく。中央のつまみを動かすと、変化をご覧いただけます。"
        />

        <div className="mt-16 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {beforeAfter.map((item) => (
            <BeforeAfterSlider key={item.id} item={item} />
          ))}
        </div>

        <p className="mt-10 text-center text-xs" style={{ color: 'var(--light-brown)' }}>
          ※ 掲載しているのはイメージです。実例は掲載許可をいただいたもののみ公開しています。
        </p>
      </div>
    </section>
  )
}

/* ============================================================
   お客様の声
   ============================================================ */
export function TestimonialsSection() {
  const ref = useScrollAnimation()

  return (
    <section id="voice" ref={ref} className="py-24 lg:py-32" style={{ backgroundColor: 'var(--ivory)' }}>
      <div className="container">
        <SectionHeading
          label="VOICE"
          title="お客様の声"
          subtitle="診断を受けたあと、日々の選択がどう変わったか。実際にご利用いただいた方からいただいた感想です。"
        />

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {testimonials.map((item, index) => (
            <blockquote
              key={item.id}
              className="testimonial-card reveal"
              style={{ transitionDelay: `${index * 80}ms` }}
            >
              <p className="relative text-sm leading-loose mb-6" style={{ color: 'var(--medium-brown)' }}>
                {item.body}
              </p>
              <footer className="flex items-center gap-3">
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm"
                  style={{ backgroundColor: 'var(--rose-beige)', color: 'var(--warm-white)' }}
                >
                  {item.name.charAt(0)}
                </span>
                <span>
                  <span className="block text-sm" style={{ color: 'var(--warm-brown)' }}>
                    {item.name}
                  </span>
                  <span className="block text-xs" style={{ color: 'var(--light-brown)' }}>
                    {item.meta}
                  </span>
                </span>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   よくある質問（アコーディオン）
   ============================================================ */
export function FaqSection() {
  const ref = useScrollAnimation()
  const [openId, setOpenId] = useState(faqs[0]?.id ?? null)

  return (
    <section id="faq" ref={ref} className="py-24 lg:py-32" style={{ backgroundColor: 'var(--warm-white)' }}>
      <div className="container max-w-3xl">
        <SectionHeading
          label="FAQ"
          title="よくある質問"
          subtitle="ご予約の前に多くいただくご質問をまとめました。ここにないことは、お気軽にお問い合わせください。"
        />

        <div className="mt-14">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id
            return (
              <div key={faq.id} className="faq-item reveal">
                <h3>
                  <button
                    type="button"
                    className="w-full flex items-start justify-between gap-6 py-6 text-left"
                    aria-expanded={isOpen}
                    aria-controls={`${faq.id}-panel`}
                    onClick={() => setOpenId(isOpen ? null : faq.id)}
                  >
                    <span className="flex items-start gap-4">
                      <span
                        className="text-lg leading-none mt-0.5"
                        style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--rose-beige)' }}
                      >
                        Q
                      </span>
                      <span className="text-[0.95rem] leading-relaxed" style={{ color: 'var(--warm-brown)' }}>
                        {faq.q}
                      </span>
                    </span>
                    <span
                      className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-transform duration-300"
                      style={{
                        border: '1px solid var(--greige)',
                        color: 'var(--rose-beige)',
                        transform: isOpen ? 'rotate(45deg)' : 'none',
                      }}
                      aria-hidden="true"
                    >
                      ＋
                    </span>
                  </button>
                </h3>
                <div
                  id={`${faq.id}-panel`}
                  className="overflow-hidden transition-all duration-[400ms]"
                  style={{
                    maxHeight: isOpen ? '400px' : '0px',
                    opacity: isOpen ? 1 : 0,
                    transitionTimingFunction: 'var(--ease-out-soft)',
                  }}
                >
                  <p className="pb-6 pl-8 text-sm leading-loose" style={{ color: 'var(--medium-brown)' }}>
                    {faq.a}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   お問い合わせフォーム
   ============================================================ */
export function ContactSection() {
  const ref = useScrollAnimation()
  const [sent, setSent] = useState(false)

  const onSubmit = (event) => {
    event.preventDefault()
    setSent(true)
  }

  const fieldStyle = {
    backgroundColor: 'var(--warm-white)',
    border: '1px solid var(--border)',
    color: 'var(--warm-brown)',
  }

  return (
    <section
      id="contact"
      ref={ref}
      className="relative py-24 lg:py-32 overflow-hidden"
      style={{ backgroundColor: 'var(--ivory)' }}
    >
      <FloatingShapes variant="warm" />
      <div className="container relative max-w-3xl">
        <SectionHeading
          label="CONTACT"
          title="ご予約・ご相談"
          subtitle="ご希望のメニューと日程をお送りください。2営業日以内にご返信します。迷っている段階のご相談も歓迎です。"
        />

        {sent ? (
          <div className="mt-14 card-glow p-10 text-center reveal">
            <p className="text-lg mb-3" style={{ color: 'var(--warm-brown)' }}>
              送信ありがとうございました。
            </p>
            <p className="text-sm leading-loose" style={{ color: 'var(--medium-brown)' }}>
              内容を確認のうえ、2営業日以内に {brand.email} よりご連絡します。
              <br />
              ※ このReact版はデモのため、実際の送信は行われません。WordPress版では管理者メールへ送信されます。
            </p>
            <button type="button" className="btn-outline mt-8" onClick={() => setSent(false)}>
              フォームに戻る
            </button>
          </div>
        ) : (
          <form className="mt-14 card-glow p-8 lg:p-10 grid gap-6 reveal" onSubmit={onSubmit}>
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="grid gap-2 text-sm" style={{ color: 'var(--medium-brown)' }}>
                <span className="flex items-center gap-1">
                  お名前<span style={{ color: 'var(--rose-beige)' }}>＊</span>
                </span>
                <input type="text" name="name" required className="px-4 py-3 rounded-xl text-sm" style={fieldStyle} />
              </label>
              <label className="grid gap-2 text-sm" style={{ color: 'var(--medium-brown)' }}>
                <span className="flex items-center gap-1">
                  メールアドレス<span style={{ color: 'var(--rose-beige)' }}>＊</span>
                </span>
                <input type="email" name="email" required className="px-4 py-3 rounded-xl text-sm" style={fieldStyle} />
              </label>
            </div>

            <label className="grid gap-2 text-sm" style={{ color: 'var(--medium-brown)' }}>
              ご希望のメニュー
              <select name="menu" className="px-4 py-3 rounded-xl text-sm" style={fieldStyle} defaultValue="">
                <option value="">選択してください</option>
                <option>パーソナルカラー診断</option>
                <option>骨格診断</option>
                <option>顔タイプ診断</option>
                <option>メイクレッスン</option>
                <option>ヘアスタイル提案</option>
                <option>ワードローブ診断</option>
                <option>同行ショッピング</option>
                <option>トータルプロデュース</option>
                <option>まだ決めていない・相談したい</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm" style={{ color: 'var(--medium-brown)' }}>
              ご相談内容
              <textarea
                name="message"
                rows={6}
                className="px-4 py-3 rounded-xl text-sm leading-relaxed"
                style={fieldStyle}
                placeholder="ご希望の日程や、いま気になっていることをお書きください。"
              />
            </label>

            <button type="submit" className="btn-primary justify-self-center mt-2">
              送信する
            </button>

            <p className="text-center text-xs" style={{ color: 'var(--light-brown)' }}>
              お急ぎの場合は {brand.tel} またはInstagramのDMへ。
            </p>
          </form>
        )}
      </div>
    </section>
  )
}

/* ============================================================
   下部CTA
   ============================================================ */
export function CtaBand({ title = '似合うを、いっしょに見つけませんか。', body }) {
  const ref = useScrollAnimation()

  return (
    <section ref={ref} className="py-20 lg:py-24" style={{ backgroundColor: 'var(--pale-pink)' }}>
      <div className="container text-center">
        <div className="ornament-line mb-8">
          <span
            className="text-xs tracking-[0.3em]"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--rose-beige)' }}
          >
            RESERVATION
          </span>
        </div>
        <h2 className="section-title mb-5 reveal">{title}</h2>
        <p className="section-subtitle max-w-xl mx-auto mb-10 reveal">
          {body ?? '所要時間や料金のご相談だけでも構いません。まずはお気軽にお問い合わせください。'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 reveal">
          <a href="#contact" className="btn-primary">
            ご予約フォームへ
          </a>
          <a href={brand.instagram} target="_blank" rel="noreferrer noopener" className="btn-outline">
            Instagramを見る
          </a>
        </div>
      </div>
    </section>
  )
}
