import { Link } from 'react-router-dom'
import { ages, getServicesByIds } from '../data/content'
import { useScrollAnimation } from '../hooks/useScrollAnimation'
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

/**
 * 年代別ページの共通レイアウト。
 * slug を渡すと content.js の該当データでページを組み立てます。
 */
export default function AgePageTemplate({ slug }) {
  const age = ages.find((item) => item.slug === slug)
  const ref = useScrollAnimation({ deps: [slug] })

  if (!age) return null

  const recommended = getServicesByIds(age.recommendedServices)
  const others = ages.filter((item) => item.slug !== slug)

  return (
    <div ref={ref}>
      {/* Hero */}
      <section
        className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden"
        style={{
          background: 'linear-gradient(150deg, var(--warm-white) 0%, var(--ivory) 55%, var(--pale-pink) 100%)',
        }}
      >
        <FloatingShapes />
        <div className="container relative grid gap-12 lg:grid-cols-12 items-center">
          <div className="lg:col-span-7">
            <nav aria-label="パンくずリスト" className="mb-8 text-xs" style={{ color: 'var(--light-brown)' }}>
              <Link to="/" className="hover:text-[var(--rose-beige)]">
                ホーム
              </Link>
              <span className="mx-2">/</span>
              <span>{age.range}</span>
            </nav>

            <p className="section-label reveal-left mb-5">{age.label}</p>
            <h1
              className="reveal-left mb-4"
              style={{
                fontFamily: "'Cormorant Garamond', 'Noto Serif JP', serif",
                fontSize: 'clamp(2rem, 4.6vw, 3.6rem)',
                lineHeight: 1.3,
                fontWeight: 400,
                color: 'var(--warm-brown)',
                transitionDelay: '80ms',
              }}
            >
              {age.range}のあなたへ
            </h1>
            <p
              className="reveal-left mb-7 text-lg"
              style={{
                fontFamily: "'Noto Serif JP', serif",
                color: 'var(--rose-beige)',
                transitionDelay: '150ms',
              }}
            >
              {age.catch}
            </p>
            <p className="section-subtitle max-w-xl reveal-left" style={{ transitionDelay: '220ms' }}>
              {age.heroLead}
            </p>

            <div className="mt-10 flex flex-wrap gap-4 reveal-left" style={{ transitionDelay: '300ms' }}>
              <a href="#contact" className="btn-primary">
                この年代の相談をする
              </a>
              <a href="#age-services" className="btn-outline">
                おすすめメニュー
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 reveal-right">
            <div className="relative">
              <span
                className="absolute -inset-5 rounded-[3rem] animate-pulse-glow"
                style={{ backgroundColor: 'var(--pale-pink)', opacity: 0.45 }}
                aria-hidden="true"
              />
              <img
                src={age.image}
                alt={`${age.range}向けのイメージイラスト`}
                className="relative w-full rounded-[2.5rem]"
                width="800"
                height="800"
              />
            </div>
          </div>
        </div>
      </section>

      {/* お悩み */}
      <section className="py-24 lg:py-32" style={{ backgroundColor: 'var(--warm-white)' }}>
        <div className="container">
          <SectionHeading
            label="CONCERNS"
            title="よくいただくお悩み"
            subtitle={`${age.range}の方から特に多くいただくご相談です。ひとつでも当てはまれば、解決の糸口をご用意できます。`}
          />

          <div className="mt-16 grid gap-6 md:grid-cols-2">
            {age.concerns.map((item, index) => (
              <div
                key={item.title}
                className="card-glow p-8 reveal"
                style={{ transitionDelay: `${(index % 2) * 90}ms` }}
              >
                <div className="flex items-start gap-4">
                  <span
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm"
                    style={{ backgroundColor: 'var(--pale-pink)', color: 'var(--rose-beige)' }}
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="text-base mb-3 leading-relaxed" style={{ color: 'var(--warm-brown)' }}>
                      {item.title}
                    </h3>
                    <p className="text-sm leading-loose" style={{ color: 'var(--medium-brown)' }}>
                      {item.body}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* おすすめサービス */}
      <section id="age-services" className="py-24 lg:py-32" style={{ backgroundColor: 'var(--ivory)' }}>
        <div className="container">
          <SectionHeading
            label="RECOMMENDED"
            title={`${age.range}におすすめのメニュー`}
            subtitle="この年代で得られる効果が大きい順にご紹介します。もちろん他のメニューもご利用いただけます。"
          />

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {recommended.map((service, index) => (
              <article
                key={service.id}
                className="card-glow p-8 flex flex-col reveal"
                style={{ transitionDelay: `${index * 90}ms` }}
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
        </div>
      </section>

      {/* 活躍するシーン */}
      <section
        className="relative py-24 lg:py-32 overflow-hidden"
        style={{ backgroundColor: 'var(--warm-white)' }}
      >
        <FloatingShapes variant="warm" />
        <div className="container relative">
          <SectionHeading
            label="SCENE"
            title="こんな場面で役立ちます"
            subtitle="診断結果は、日常のさまざまな場面で使えます。予定に合わせた具体的な使い方までお伝えします。"
          />

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {age.scenes.map((scene, index) => (
              <div
                key={scene.title}
                className="p-7 rounded-[1.5rem] reveal"
                style={{
                  backgroundColor: 'var(--ivory)',
                  border: '1px solid var(--greige)',
                  transitionDelay: `${(index % 4) * 80}ms`,
                }}
              >
                <span
                  className="block w-8 h-px mb-4"
                  style={{ backgroundColor: 'var(--rose-beige)' }}
                  aria-hidden="true"
                />
                <h3 className="text-base mb-3" style={{ color: 'var(--warm-brown)' }}>
                  {scene.title}
                </h3>
                <p className="text-sm leading-loose" style={{ color: 'var(--medium-brown)' }}>
                  {scene.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FlowSection />
      <BeforeAfterSection />
      <TestimonialsSection />
      <FaqSection />

      {/* 他の年代へ */}
      <section className="py-20" style={{ backgroundColor: 'var(--ivory)' }}>
        <div className="container">
          <p className="section-label text-center mb-10">OTHER AGES</p>
          <div className="grid gap-5 sm:grid-cols-3">
            {others.map((item) => (
              <Link
                key={item.slug}
                to={item.path}
                className="age-card block reveal"
                aria-label={`${item.range}のページへ`}
              >
                <img
                  src={item.image}
                  alt=""
                  className="w-full aspect-[16/9] object-cover"
                  style={{ objectPosition: 'center 18%' }}
                  width="800"
                  height="800"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 z-10 p-5">
                  <p
                    className="text-[0.6rem] tracking-[0.26em] mb-1"
                    style={{ fontFamily: "'Cormorant Garamond', serif", color: 'rgba(255,255,255,0.85)' }}
                  >
                    {item.label}
                  </p>
                  <h3 className="text-lg" style={{ fontFamily: "'Noto Serif JP', serif", color: 'var(--warm-white)' }}>
                    {item.range}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ContactSection />
      <CtaBand
        title={`${age.range}の「似合う」を、見つけにきませんか。`}
        body="所要時間や料金のご相談だけでも構いません。まずはお気軽にお問い合わせください。"
      />
    </div>
  )
}
