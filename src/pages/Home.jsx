import { Link } from 'react-router-dom'
import { ages, brand, services } from '../data/content'
import { useParallax, useScrollAnimation } from '../hooks/useScrollAnimation'
import {
  BeforeAfterSection,
  ContactSection,
  CtaBand,
  FaqSection,
  FloatingShapes,
  FlowSection,
  SectionHeading,
  TestimonialsSection,
} from '../components/CommonSections'

function Hero() {
  const ref = useScrollAnimation()
  const parallax = useParallax(14)

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center overflow-hidden pt-28 pb-20"
      style={{
        background:
          'linear-gradient(160deg, var(--warm-white) 0%, var(--ivory) 45%, var(--pale-pink) 100%)',
      }}
    >
      <FloatingShapes />

      <div className="container relative grid gap-14 lg:grid-cols-2 lg:gap-10 items-center">
        <div className="order-2 lg:order-1">
          <p className="section-label reveal-left mb-6">{brand.name}</p>
          <h1
            className="reveal-left mb-8"
            style={{
              fontFamily: "'Cormorant Garamond', 'Noto Serif JP', serif",
              fontSize: 'clamp(2.4rem, 5.5vw, 4.5rem)',
              lineHeight: 1.25,
              fontWeight: 400,
              color: 'var(--warm-brown)',
              letterSpacing: '0.02em',
              transitionDelay: '90ms',
            }}
          >
            あなたらしさを、
            <br />
            いちばん美しく。
          </h1>
          <p
            className="section-subtitle max-w-lg mb-10 reveal-left"
            style={{ transitionDelay: '180ms' }}
          >
            {brand.lead}
          </p>

          <div
            className="flex flex-wrap items-center gap-4 reveal-left"
            style={{ transitionDelay: '260ms' }}
          >
            <a href="#contact" className="btn-primary">
              はじめての方へ
            </a>
            <a href="#ages" className="btn-outline">
              年代から選ぶ
            </a>
          </div>

          <dl
            className="mt-14 grid grid-cols-3 gap-4 max-w-md reveal-left"
            style={{ transitionDelay: '340ms' }}
          >
            {[
              { n: '8', label: 'メニュー' },
              { n: '4', label: '年代別プラン' },
              { n: '10代-60代', label: '対応年代' },
            ].map((stat) => (
              <div key={stat.label}>
                <dt
                  className="text-2xl mb-1"
                  style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--rose-beige)' }}
                >
                  {stat.n}
                </dt>
                <dd className="text-xs tracking-wider" style={{ color: 'var(--light-brown)' }}>
                  {stat.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="order-1 lg:order-2 relative reveal-right">
          <div
            className="relative mx-auto max-w-md lg:max-w-none"
            style={{ transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0)`, transition: 'transform 600ms var(--ease-out-soft)' }}
          >
            <span
              className="absolute -inset-6 rounded-[3rem] animate-pulse-glow"
              style={{ backgroundColor: 'var(--pale-pink)', opacity: 0.5 }}
              aria-hidden="true"
            />
            <img
              src="/images/hero-illustration.svg"
              alt="似合う色と形を見つけたときの、やわらかな表情のイラスト"
              className="relative w-full rounded-[2.5rem]"
              width="800"
              height="800"
            />
          </div>
        </div>
      </div>

      <a
        href="#concept"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        aria-label="下へスクロール"
      >
        <span
          className="text-[0.6rem] tracking-[0.3em]"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--light-brown)' }}
        >
          SCROLL
        </span>
        <span className="block w-px h-10 animate-pulse-glow" style={{ backgroundColor: 'var(--rose-beige)' }} />
      </a>
    </section>
  )
}

function Concept() {
  const ref = useScrollAnimation()

  return (
    <section id="concept" ref={ref} className="py-24 lg:py-32" style={{ backgroundColor: 'var(--warm-white)' }}>
      <div className="container grid gap-14 lg:grid-cols-12 items-center">
        <div className="lg:col-span-5 reveal-left">
          <div
            className="rounded-[2rem] overflow-hidden"
            style={{ border: '1px solid var(--greige)' }}
          >
            <img
              src="/images/age-30s.svg"
              alt="カウンセリングの様子をイメージしたイラスト"
              className="w-full"
              width="800"
              height="800"
              loading="lazy"
            />
          </div>
        </div>

        <div className="lg:col-span-7 lg:pl-6">
          <SectionHeading
            align="left"
            label="CONCEPT"
            title="診断で終わらせない。"
            subtitle="似合う色や形がわかっても、明日の服が決まらなければ意味がありません。診断結果を、そのまま毎日の選択に使えるところまで一緒に落とし込みます。"
          />

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { title: '理由まで伝える', body: 'なぜ似合うのかを言葉にして残すので、ひとりでも判断できるようになります。' },
              { title: '手持ちから始める', body: 'まず持っている服とコスメを見直します。買い足しは最小限です。' },
              { title: '年代に合わせる', body: '同じ診断結果でも、年代によって取り入れ方は変わります。' },
            ].map((item, index) => (
              <div key={item.title} className="reveal" style={{ transitionDelay: `${index * 90}ms` }}>
                <span
                  className="block w-10 h-px mb-4"
                  style={{ backgroundColor: 'var(--rose-beige)' }}
                  aria-hidden="true"
                />
                <h3 className="text-base mb-3" style={{ color: 'var(--warm-brown)' }}>
                  {item.title}
                </h3>
                <p className="text-sm leading-loose" style={{ color: 'var(--medium-brown)' }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Services() {
  const ref = useScrollAnimation()

  return (
    <section id="services" ref={ref} className="py-24 lg:py-32" style={{ backgroundColor: 'var(--ivory)' }}>
      <div className="container">
        <SectionHeading
          label="SERVICE"
          title="8つのメニュー"
          subtitle="単体でのご利用も、組み合わせも可能です。どれを選べばよいか迷う場合は、カウンセリングでご一緒に決めます。"
        />

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => (
            <article
              key={service.id}
              className="card-glow p-7 flex flex-col reveal"
              style={{ transitionDelay: `${(index % 4) * 80}ms` }}
            >
              <span
                className="text-3xl mb-4"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--rose-beige)' }}
              >
                {service.number}
              </span>
              <h3 className="text-lg mb-3" style={{ color: 'var(--warm-brown)' }}>
                {service.title}
              </h3>
              <p className="text-sm leading-loose mb-6 flex-1" style={{ color: 'var(--medium-brown)' }}>
                {service.excerpt}
              </p>
              <dl
                className="flex items-center justify-between text-xs pt-4"
                style={{ borderTop: '1px solid var(--greige)', color: 'var(--light-brown)' }}
              >
                <div className="flex items-center gap-1.5">
                  <dt className="tracking-widest">TIME</dt>
                  <dd style={{ color: 'var(--medium-brown)' }}>{service.duration}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <dt className="tracking-widest">PRICE</dt>
                  <dd style={{ color: 'var(--medium-brown)' }}>{service.price}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>

        <p className="mt-10 text-center text-xs" style={{ color: 'var(--light-brown)' }}>
          ※ 表示価格は税込です。組み合わせ割引についてはお問い合わせください。
        </p>
      </div>
    </section>
  )
}

function Ages() {
  const ref = useScrollAnimation()

  return (
    <section
      id="ages"
      ref={ref}
      className="relative py-24 lg:py-32 overflow-hidden"
      style={{ backgroundColor: 'var(--warm-white)' }}
    >
      <FloatingShapes variant="warm" />
      <div className="container relative">
        <SectionHeading
          label="BY AGE"
          title="年代から選ぶ"
          subtitle="同じ「似合う」でも、必要なものは年代で変わります。いまのご自身に近いところからご覧ください。"
        />

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ages.map((age, index) => (
            <Link
              key={age.slug}
              to={age.path}
              className="age-card block reveal"
              style={{ transitionDelay: `${index * 90}ms` }}
            >
              <img
                src={age.image}
                alt={`${age.range}向けのイメージイラスト`}
                className="w-full aspect-[3/4] object-cover"
                width="800"
                height="800"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 z-10 p-6 text-left">
                <p
                  className="text-[0.6rem] tracking-[0.28em] mb-2"
                  style={{ fontFamily: "'Cormorant Garamond', serif", color: 'rgba(255,255,255,0.85)' }}
                >
                  {age.label}
                </p>
                <h3
                  className="text-xl mb-2"
                  style={{ fontFamily: "'Noto Serif JP', serif", color: 'var(--warm-white)' }}
                >
                  {age.range}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {age.cardCopy}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <>
      <Hero />
      <Concept />
      <Services />
      <Ages />
      <FlowSection />
      <BeforeAfterSection />
      <TestimonialsSection />
      <FaqSection />
      <ContactSection />
      <CtaBand />
    </>
  )
}
