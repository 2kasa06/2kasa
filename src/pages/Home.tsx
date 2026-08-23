import { useRef, useState } from "react";
import { Link } from "wouter";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import {
  BeforeAfterSection,
  TestimonialsSection,
  ServiceFlowSection,
  FAQSection,
  BookingSection,
} from "@/components/CommonSections";
import { useScrollReveal, useStaggerReveal } from "@/hooks/useScrollAnimation";

/* ============================================================
   Beauty Produce — Home Page
   Design: Soft Luminism — 光の拡散・有機的な動き・余白の呼吸
   iOS Safari 互換: oklch → hsl
   ============================================================ */

const HERO_IMG = "/images/hero-illustration.webp";

const AGE_CARDS = [
  {
    range: "10代〜20代",
    en: "Teens & Twenties",
    concept: "垢抜けて、自分らしく輝く",
    href: "/teens",
    img: "/images/age-teens.webp",
  },
  {
    range: "30代",
    en: "Thirties",
    concept: "自信をまとい、美しさを再定義する",
    href: "/thirties",
    img: "/images/age-30s.webp",
  },
  {
    range: "40代",
    en: "Forties",
    concept: "本当にやりたい自分を見つける",
    href: "/forties",
    img: "/images/age-40s.webp",
  },
  {
    range: "50代〜60代",
    en: "Fifties & Beyond",
    concept: "今の魅力を、最大限に輝かせる",
    href: "/fifties",
    img: "/images/age-50s.webp",
  },
];

const SERVICES = [
  { icon: "🎨", title: "パーソナルカラー診断", desc: "あなたを最も輝かせる色を科学的に分析" },
  { icon: "✦", title: "骨格診断", desc: "体型の特徴を活かすスタイリングを提案" },
  { icon: "👗", title: "ファッションアテンド", desc: "実際のショッピングに同行してサポート" },
  { icon: "💄", title: "コスメアテンド", desc: "肌に合ったコスメを一緒に選びます" },
  { icon: "💎", title: "アクセサリー提案", desc: "全体のコーデを完成させる小物選び" },
  { icon: "🌿", title: "ライフスタイル提案", desc: "美しさを日常に取り入れる生活提案" },
  { icon: "📸", title: "ビフォーアフター撮影", desc: "変化の記録を美しく残します" },
  { icon: "🌟", title: "プロカメラマン撮影", desc: "新しいあなたをプロが撮影します" },
];

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>
      <Navigation />

      {/* ── Hero Section ── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{ background: "hsl(40, 30%, 98%)" }}
      >
        {/* Floating background shapes */}
        <FloatingShapes />

        {/* Hero illustration (parallax) */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ y: heroY }}
        >
          <img
            src={HERO_IMG}
            alt=""
            className="absolute right-0 top-0 h-full w-auto max-w-none object-cover opacity-90"
            style={{ maxWidth: "65%" }}
          />
        </motion.div>

        {/* Gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to right, rgba(253,250,246,0.95) 35%, rgba(253,250,246,0.5) 60%, transparent 80%)",
          }}
        />

        {/* Hero content */}
        <motion.div
          className="container relative z-10 pt-24 pb-16"
          style={{ opacity: heroOpacity }}
        >
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            >
              <p
                className="section-label mb-6"
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <span
                  className="inline-block w-8 h-px"
                  style={{ background: "var(--rose-beige)" }}
                />
                Beauty Produce
              </p>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
              className="mb-6"
              style={{
                fontFamily: "'Cormorant Garamond', 'Noto Serif JP', serif",
                fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
                fontWeight: 300,
                lineHeight: 1.15,
                color: "var(--warm-brown)",
                letterSpacing: "0.02em",
              }}
            >
              あなたらしい美しさを、<br />
              <em style={{ fontStyle: "italic", color: "var(--rose-beige)" }}>もっと自由に。</em>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="mb-10 text-base leading-loose"
              style={{ color: "var(--medium-brown)", letterSpacing: "0.06em", maxWidth: "38ch" }}
            >
              人生のステージごとに変化する美しさ・自信・魅力に寄り添う、
              あなただけの美容プロデュースサービス。
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-wrap items-center gap-4"
            >
              <Link href="#booking" className="btn-primary">
                無料カウンセリングを予約する
                <ChevronRight size={16} />
              </Link>
              <Link href="#age-select" className="btn-outline">
                あなたのステージを選ぶ
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.7 }}
              className="flex items-center gap-8 mt-12 pt-8"
              style={{ borderTop: "1px solid rgba(200, 185, 170, 0.4)" }}
            >
              {[
                { num: "1,200+", label: "累計お客様数" },
                { num: "98%", label: "満足度" },
                { num: "10年+", label: "実績" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p
                    className="text-2xl font-light"
                    style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--rose-beige)" }}
                  >
                    {stat.num}
                  </p>
                  <p className="text-xs tracking-wider" style={{ color: "var(--light-brown)" }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <span className="text-xs tracking-widest" style={{ color: "var(--light-brown)" }}>
            scroll
          </span>
          <motion.div
            className="w-px h-12"
            style={{ background: "linear-gradient(to bottom, var(--rose-beige), transparent)" }}
            animate={{ scaleY: [1, 0.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      </section>

      {/* ── Age Selection Section ── */}
      <section
        id="age-select"
        className="py-24 relative overflow-hidden"
        style={{ background: "hsl(42, 35%, 96%)" }}
      >
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 10% 50%, rgba(190,130,120,0.06) 0%, transparent 40%), radial-gradient(circle at 90% 30%, rgba(240,200,190,0.08) 0%, transparent 40%)",
          }}
        />

        <div className="container relative z-10">
          <AgeSectionHeader />
          <AgeCards />
        </div>
      </section>

      {/* ── Services Section ── */}
      <section
        id="services"
        className="py-24 relative overflow-hidden"
        style={{ background: "hsl(40, 30%, 98%)" }}
      >
        <ServicesSection />
      </section>

      {/* ── Brand Message ── */}
      <BrandMessageSection />

      {/* ── Before/After ── */}
      <BeforeAfterSection />

      {/* ── Testimonials ── */}
      <TestimonialsSection />

      {/* ── Service Flow ── */}
      <ServiceFlowSection />

      {/* ── FAQ ── */}
      <FAQSection />

      {/* ── Booking ── */}
      <BookingSection />

      <Footer />
    </div>
  );
}

// ─── Floating Shapes ─────────────────────────────────────────
function FloatingShapes() {
  return (
    <>
      <div
        className="float-shape animate-float-1 opacity-20"
        style={{
          width: "400px",
          height: "400px",
          top: "-100px",
          left: "-100px",
          background: "radial-gradient(circle, hsl(8,40%,65%) 0%, transparent 70%)",
        }}
      />
      <div
        className="float-shape animate-float-2 opacity-15"
        style={{
          width: "300px",
          height: "300px",
          bottom: "10%",
          left: "5%",
          background: "radial-gradient(circle, hsl(8,50%,88%) 0%, transparent 70%)",
        }}
      />
      <div
        className="float-shape animate-float-3 opacity-10"
        style={{
          width: "200px",
          height: "200px",
          top: "30%",
          left: "40%",
          background: "radial-gradient(circle, hsl(45,55%,60%) 0%, transparent 70%)",
        }}
      />
      {/* SVG decorative lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-10"
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <circle cx="200" cy="200" r="150" stroke="hsl(8,40%,65%)" strokeWidth="0.5" />
        <circle cx="200" cy="200" r="250" stroke="hsl(8,40%,65%)" strokeWidth="0.3" />
        <path
          d="M 100 600 Q 400 400 700 500 T 1300 300"
          stroke="hsl(8,40%,65%)"
          strokeWidth="0.5"
          fill="none"
        />
        <circle cx="1200" cy="700" r="100" stroke="hsl(8,50%,88%)" strokeWidth="0.5" />
      </svg>
    </>
  );
}

// ─── Age Section Header ───────────────────────────────────────
function AgeSectionHeader() {
  const { ref, isRevealed } = useScrollReveal();

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`text-center mb-16 reveal ${isRevealed ? "revealed" : ""}`}
    >
      <p className="section-label mb-3">Your Life Stage</p>
      <h2 className="section-title mb-4">
        あなたのステージを選んでください
      </h2>
      <p className="section-subtitle max-w-lg mx-auto">
        人生のどのステージにいても、<br />
        あなたらしい美しさを見つける旅は始められます。
      </p>
    </div>
  );
}

// ─── Age Cards ────────────────────────────────────────────────
function AgeCards() {
  const { containerRef, revealedItems } = useStaggerReveal(4, 0.1);

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
    >
      {AGE_CARDS.map((card, i) => (
        <AgeCard key={card.range} card={card} isRevealed={revealedItems[i]} delay={i * 100} />
      ))}
    </div>
  );
}

function AgeCard({
  card,
  isRevealed,
  delay,
}: {
  card: (typeof AGE_CARDS)[0];
  isRevealed: boolean;
  delay: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={card.href}>
      <div
        className={`age-card reveal ${isRevealed ? "revealed" : ""}`}
        style={{
          transitionDelay: `${delay}ms`,
          aspectRatio: "3/4",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <img
          src={card.img}
          alt={card.range}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700"
          style={{ transform: hovered ? "scale(1.05)" : "scale(1)" }}
        />

        {/* Gradient overlay */}
        <div
          className="absolute inset-0 z-10 transition-all duration-500"
          style={{
            background: hovered
              ? "linear-gradient(to bottom, transparent 10%, rgba(190,110,100,0.65) 100%)"
              : "linear-gradient(to bottom, transparent 30%, rgba(50,35,30,0.55) 100%)",
          }}
        />

        {/* Content */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-6">
          <p
            className="text-xs tracking-widest mb-1 transition-all duration-300"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: "italic",
              color: hovered ? "hsl(8,60%,90%)" : "rgba(255,255,255,0.7)",
            }}
          >
            {card.en}
          </p>
          <h3
            className="text-xl mb-2 transition-all duration-300"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 400,
              color: "white",
              letterSpacing: "0.05em",
            }}
          >
            {card.range}
          </h3>
          <p
            className="text-xs leading-relaxed transition-all duration-500"
            style={{
              color: "rgba(255,255,255,0.85)",
              letterSpacing: "0.04em",
              maxHeight: hovered ? "3rem" : "0",
              overflow: "hidden",
              opacity: hovered ? 1 : 0,
            }}
          >
            {card.concept}
          </p>
          <div
            className="flex items-center gap-2 mt-3 transition-all duration-300"
            style={{ opacity: hovered ? 1 : 0, transform: hovered ? "translateY(0)" : "translateY(8px)" }}
          >
            <span className="text-xs text-white tracking-wider">詳しく見る</span>
            <ChevronRight size={14} className="text-white" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Services Section ─────────────────────────────────────────
function ServicesSection() {
  const { ref, isRevealed } = useScrollReveal();
  const { containerRef, revealedItems } = useStaggerReveal(8, 0.05);

  return (
    <div className="container">
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className={`text-center mb-16 reveal ${isRevealed ? "revealed" : ""}`}
      >
        <p className="section-label mb-3">Our Services</p>
        <h2 className="section-title mb-4">提供サービス</h2>
        <p className="section-subtitle max-w-xl mx-auto">
          外見だけでなく、内側から輝く自信を育む。<br />
          あなたの人生をアップデートするサービスを提供します。
        </p>
      </div>

      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {SERVICES.map((service, i) => (
          <div
            key={service.title}
            className={`card-glow p-6 text-center reveal ${revealedItems[i] ? "revealed" : ""}`}
            style={{ transitionDelay: `${i * 60}ms` }}
          >
            <div
              className="text-3xl mb-3 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: "rgba(190,130,120,0.08)" }}
            >
              {service.icon}
            </div>
            <h3
              className="text-sm mb-2 font-medium"
              style={{ color: "var(--warm-brown)", letterSpacing: "0.04em" }}
            >
              {service.title}
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: "var(--light-brown)" }}>
              {service.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Brand Message Section ────────────────────────────────────
function BrandMessageSection() {
  const { ref, isRevealed } = useScrollReveal(0.3);

  return (
    <section
      className="py-32 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, hsl(8,45%,93%) 0%, hsl(42,35%,96%) 50%, hsl(8,50%,92%) 100%)",
      }}
    >
      {/* Decorative SVG */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
        viewBox="0 0 1440 600"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <circle cx="720" cy="300" r="200" stroke="hsl(8,40%,65%)" strokeWidth="0.5" />
        <circle cx="720" cy="300" r="350" stroke="hsl(8,40%,65%)" strokeWidth="0.3" />
        <circle cx="720" cy="300" r="500" stroke="hsl(8,40%,65%)" strokeWidth="0.2" />
        <path d="M 0 300 Q 360 200 720 300 T 1440 300" stroke="hsl(8,40%,65%)" strokeWidth="0.5" fill="none" />
      </svg>

      <div
        className="absolute top-8 right-24 w-48 h-48 rounded-full opacity-20 animate-float-1 pointer-events-none"
        style={{ background: "hsl(8,40%,65%)" }}
      />
      <div
        className="absolute bottom-8 left-16 w-32 h-32 rounded-full opacity-15 animate-float-3 pointer-events-none"
        style={{ background: "hsl(8,50%,88%)" }}
      />

      <div className="container relative z-10">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={`text-center max-w-3xl mx-auto reveal ${isRevealed ? "revealed" : ""}`}
        >
          <Sparkles
            size={24}
            className="mx-auto mb-6"
            style={{ color: "var(--rose-beige)" }}
          />
          <h2
            className="mb-8"
            style={{
              fontFamily: "'Cormorant Garamond', 'Noto Serif JP', serif",
              fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
              fontWeight: 300,
              lineHeight: 1.4,
              color: "var(--warm-brown)",
              letterSpacing: "0.04em",
            }}
          >
            美容サロンではなく、<br />
            <em style={{ fontStyle: "italic", color: "var(--rose-beige)" }}>
              「人生をアップデートするブランド」
            </em>
          </h2>
          <p
            className="text-base leading-loose mb-10"
            style={{ color: "var(--medium-brown)", letterSpacing: "0.06em" }}
          >
            自分に本当に似合うものを知り、自分自身をアップデートする体験。<br />
            外見だけでなく、内側から湧き出る自信と魅力を育みます。
          </p>

          {/* Ornament */}
          <div className="ornament-line max-w-xs mx-auto">
            <span
              className="text-sm tracking-widest"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", color: "var(--rose-beige)" }}
            >
              Your Story Begins Here
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
