import { useRef } from "react";
import { Link } from "wouter";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronRight, ArrowLeft } from "lucide-react";
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
   Beauty Produce — Age Page Template
   iOS Safari 互換: oklch → hsl
   ============================================================ */

export interface AgePageConfig {
  range: string;
  en: string;
  concept: string;
  subConcept: string;
  heroImage: string;
  heroColor: string;
  tagline: string;
  description: string;
  painPoints: string[];
  services: { icon: string; title: string; desc: string }[];
  scenes?: { label: string; desc: string }[];
  accentColor: string;
  testimonials?: {
    name: string;
    age: string;
    text: string;
    service: string;
    rating: number;
  }[];
}

export default function AgePageTemplate({ config }: { config: AgePageConfig }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>
      <Navigation />

      {/* ── Hero ── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{ background: "hsl(40, 30%, 98%)" }}
      >
        {/* Floating shapes */}
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-10 animate-float-1 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${config.accentColor} 0%, transparent 70%)`,
            transform: "translate(20%, -20%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-8 animate-float-2 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${config.accentColor} 0%, transparent 70%)`,
            transform: "translate(-30%, 30%)",
          }}
        />

        {/* Hero illustration */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ y: heroY }}
        >
          <img
            src={config.heroImage}
            alt={config.range}
            className="absolute right-0 top-0 h-full w-auto object-cover"
            style={{ maxWidth: "55%" }}
          />
        </motion.div>

        {/* Gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to right, rgba(253,250,246,0.97) 35%, rgba(253,250,246,0.6) 55%, rgba(253,250,246,0.2) 80%), linear-gradient(to bottom, transparent 60%, rgba(253,250,246,0.3) 100%)",
          }}
        />

        {/* Content */}
        <motion.div className="container relative z-10 pt-24 pb-16" style={{ opacity: heroOpacity }}>
          <div className="max-w-xl">
            {/* Back link */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <Link
                href="/#age-select"
                className="inline-flex items-center gap-2 text-xs tracking-wider transition-colors duration-200 hover:text-[var(--rose-beige)]"
                style={{ color: "var(--light-brown)" }}
              >
                <ArrowLeft size={14} />
                ステージ選択に戻る
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
              className="section-label mb-4"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span className="inline-block w-8 h-px" style={{ background: "var(--rose-beige)" }} />
              {config.en}
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
              className="mb-3"
              style={{
                fontFamily: "'Cormorant Garamond', 'Noto Serif JP', serif",
                fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
                fontWeight: 300,
                color: "var(--warm-brown)",
                letterSpacing: "0.05em",
              }}
            >
              {config.range}
            </motion.h1>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="mb-6"
              style={{
                fontFamily: "'Cormorant Garamond', 'Noto Serif JP', serif",
                fontSize: "clamp(1.6rem, 4vw, 3rem)",
                fontWeight: 300,
                lineHeight: 1.3,
                color: "var(--warm-brown)",
                letterSpacing: "0.02em",
                wordBreak: "keep-all",
              }}
            >
              <em style={{ fontStyle: "italic", color: "var(--rose-beige)" }}>
                {config.tagline}
              </em>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35, ease: [0.23, 1, 0.32, 1] }}
              className="mb-8 text-sm leading-loose"
              style={{ color: "var(--medium-brown)", letterSpacing: "0.06em", maxWidth: "40ch" }}
            >
              {config.description}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex flex-wrap gap-4"
            >
              <Link href="/#booking" className="btn-primary">
                無料カウンセリングを予約する
                <ChevronRight size={16} />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── Pain Points ── */}
      <PainPointsSection config={config} />

      {/* ── Services ── */}
      <AgeServicesSection config={config} />

      {/* ── Scenes (if any) ── */}
      {config.scenes && config.scenes.length > 0 && (
        <ScenesSection config={config} />
      )}

      {/* ── Before/After ── */}
      <BeforeAfterSection />

      {/* ── Testimonials ── */}
      <TestimonialsSection testimonials={config.testimonials} />

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

// ─── Pain Points Section ──────────────────────────────────────
function PainPointsSection({ config }: { config: AgePageConfig }) {
  const { ref, isRevealed } = useScrollReveal();

  return (
    <section
      className="py-20 relative overflow-hidden"
      style={{ background: "hsl(42, 35%, 96%)" }}
    >
      <div className="container relative z-10">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={`reveal ${isRevealed ? "revealed" : ""}`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="section-label mb-3">こんなお悩みはありませんか？</p>
              <h2 className="section-title mb-6">{config.concept}</h2>
              <p className="section-subtitle mb-8">{config.subConcept}</p>
            </div>
            <div className="space-y-3">
              {config.painPoints.map((point, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                  className="flex items-start gap-3 p-4 rounded-xl"
                  style={{ background: "rgba(253,250,246,0.7)" }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                    style={{ background: "var(--rose-beige)" }}
                  />
                  <p className="text-sm leading-relaxed" style={{ color: "var(--warm-brown)", letterSpacing: "0.04em" }}>
                    {point}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Age Services Section ─────────────────────────────────────
function AgeServicesSection({ config }: { config: AgePageConfig }) {
  const { ref, isRevealed } = useScrollReveal();
  const { containerRef, revealedItems } = useStaggerReveal(config.services.length, 0.05);

  return (
    <section
      className="py-24 relative overflow-hidden"
      style={{ background: "hsl(40, 30%, 98%)" }}
    >
      <div className="container">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={`text-center mb-16 reveal ${isRevealed ? "revealed" : ""}`}
        >
          <p className="section-label mb-3">Services</p>
          <h2 className="section-title mb-4">提供サービス</h2>
        </div>

        <div
          ref={containerRef as React.RefObject<HTMLDivElement>}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {config.services.map((service, i) => (
            <div
              key={service.title}
              className={`card-glow p-6 reveal ${revealedItems[i] ? "revealed" : ""}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div
                className="text-3xl mb-4 w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(190,130,120,0.1)" }}
              >
                {service.icon}
              </div>
              <h3
                className="text-sm font-medium mb-2"
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
    </section>
  );
}

// ─── Scenes Section ───────────────────────────────────────────
function ScenesSection({ config }: { config: AgePageConfig }) {
  const { ref, isRevealed } = useScrollReveal();

  return (
    <section
      className="py-24"
      style={{ background: "hsl(42, 35%, 96%)" }}
    >
      <div className="container">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={`text-center mb-16 reveal ${isRevealed ? "revealed" : ""}`}
        >
          <p className="section-label mb-3">Scene Styling</p>
          <h2 className="section-title mb-4">シーン別スタイリング</h2>
          <p className="section-subtitle">
            あらゆるシーンで輝くあなたを演出します。
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {config.scenes!.map((scene, i) => (
            <motion.div
              key={scene.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="card-glow p-6 text-center"
            >
              <h3
                className="text-lg mb-2"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--rose-beige)" }}
              >
                {scene.label}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--medium-brown)" }}>
                {scene.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
