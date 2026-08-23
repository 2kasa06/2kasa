import { useState, useRef } from "react";
import { ChevronDown, ChevronRight, Star, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useScrollReveal, useStaggerReveal } from "@/hooks/useScrollAnimation";

/* ============================================================
   Beauty Produce — Common Sections
   iOS Safari 互換: oklch → hsl
   ============================================================ */

// ─── Before / After Section ───────────────────────────────────
interface BeforeAfterItem {
  label: string;
  before: string;
  after: string;
  description: string;
}

const defaultBeforeAfterItems: BeforeAfterItem[] = [
  {
    label: "ファッション提案",
    before: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=85",
    after: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=85",
    description: "骨格診断×パーソナルカラーで、本当に似合う一着を発見",
  },
  {
    label: "メイクアップ提案",
    before: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&q=85",
    after: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&q=85",
    description: "自分の魅力を最大限に引き出すメイクへアップデート",
  },
  {
    label: "スタイリング全体",
    before: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=85",
    after: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&q=85",
    description: "トータルプロデュースで、自信に満ちた新しい自分へ",
  },
];

export function BeforeAfterSection({ items = defaultBeforeAfterItems }: { items?: BeforeAfterItem[] }) {
  const { ref, isRevealed } = useScrollReveal();

  return (
    <section
      id="before-after"
      className="py-24 relative overflow-hidden"
      style={{ background: "hsl(40, 30%, 98%)" }}
    >
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5 animate-float-1 pointer-events-none"
        style={{ background: "var(--rose-beige)", transform: "translate(30%, -30%)" }}
      />

      <div className="container">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={`text-center mb-16 reveal ${isRevealed ? "revealed" : ""}`}
        >
          <p className="section-label mb-3">Before & After</p>
          <h2 className="section-title mb-4">変化の物語</h2>
          <p className="section-subtitle max-w-xl mx-auto">
            お客様の実際の変化をご覧ください。<br />
            外見だけでなく、内側から輝く自信が生まれます。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map((item, i) => (
            <BeforeAfterCard key={i} item={item} delay={i * 150} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BeforeAfterCard({ item, delay }: { item: BeforeAfterItem; delay: number }) {
  const { ref, isRevealed } = useScrollReveal();
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = ((e.clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.min(Math.max(pos, 5), 95));
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.min(Math.max(pos, 5), 95));
  };

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`reveal ${isRevealed ? "revealed" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="card-glow p-4 space-y-4">
        <p
          className="text-xs tracking-widest text-center"
          style={{ color: "var(--rose-beige)", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}
        >
          {item.label}
        </p>

        {/* Slider */}
        <div
          ref={containerRef}
          className="before-after-container aspect-[3/4] select-none"
          onMouseDown={() => (isDragging.current = true)}
          onMouseUp={() => (isDragging.current = false)}
          onMouseLeave={() => (isDragging.current = false)}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
        >
          {/* After (base) */}
          <img
            src={item.after}
            alt="After"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Before (clipped) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${sliderPos}%` }}
          >
            <img
              src={item.before}
              alt="Before"
              className="w-full h-full object-cover"
              style={{ width: `${10000 / sliderPos}%`, maxWidth: "none" }}
            />
          </div>
          {/* Divider */}
          <div
            className="absolute top-0 bottom-0 w-0.5 cursor-ew-resize"
            style={{
              left: `${sliderPos}%`,
              background: "white",
              boxShadow: "0 0 10px rgba(0,0,0,0.3)",
            }}
          >
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}
            >
              <span className="text-xs" style={{ color: "var(--rose-beige)" }}>⟷</span>
            </div>
          </div>
          {/* Labels */}
          <div className="absolute top-3 left-3">
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.85)", color: "var(--medium-brown)" }}>Before</span>
          </div>
          <div className="absolute top-3 right-3">
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(190,130,120,0.85)", color: "white" }}>After</span>
          </div>
        </div>

        <p className="text-sm text-center leading-relaxed" style={{ color: "var(--medium-brown)" }}>
          {item.description}
        </p>
      </div>
    </div>
  );
}

// ─── Testimonials Section ─────────────────────────────────────
interface Testimonial {
  name: string;
  age: string;
  text: string;
  service: string;
  rating: number;
}

const defaultTestimonials: Testimonial[] = [
  {
    name: "S.K様",
    age: "28歳",
    text: "何を着ても似合わないと思っていたのに、骨格診断で自分のタイプを知ってから、毎日のコーデが楽しくなりました。鏡を見るのが好きになれたことが一番の変化です。",
    service: "骨格診断 + ファッションアテンド",
    rating: 5,
  },
  {
    name: "M.T様",
    age: "35歳",
    text: "仕事でもプライベートでも「なんか垢抜けたね」と言われるようになりました。パーソナルカラー診断で似合う色を知ったことで、買い物の失敗がなくなりました。",
    service: "パーソナルカラー診断 + コスメアテンド",
    rating: 5,
  },
  {
    name: "Y.N様",
    age: "43歳",
    text: "40代になって何が自分に似合うのかわからなくなっていました。トータルプロデュースを受けて、今の自分に合ったスタイルを見つけられた気がします。",
    service: "トータルプロデュース",
    rating: 5,
  },
  {
    name: "K.H様",
    age: "55歳",
    text: "長年使い続けていたコスメを見直すきっかけになりました。今の自分の魅力を最大限に引き出してもらえて、写真撮影も楽しかったです。",
    service: "コスメ見直し + 撮影体験",
    rating: 5,
  },
  {
    name: "R.A様",
    age: "22歳",
    text: "SNSで見た垢抜けたい気持ちで申し込みました。自分の顔タイプを知って、メイクの方向性がわかったことで自信がつきました！",
    service: "顔タイプ分析 + メイク提案",
    rating: 5,
  },
  {
    name: "E.M様",
    age: "38歳",
    text: "ハイブランド導入サポートで初めて高級バッグを購入しました。自分への投資の仕方がわかって、毎日が豊かになった気がします。",
    service: "ハイブランド導入サポート",
    rating: 5,
  },
];

export function TestimonialsSection({ testimonials = defaultTestimonials }: { testimonials?: Testimonial[] }) {
  const { ref, isRevealed } = useScrollReveal();

  return (
    <section
      id="testimonials"
      className="py-24 relative overflow-hidden"
      style={{ background: "hsl(42, 35%, 96%)" }}
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, rgba(190,130,120,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(240,200,190,0.1) 0%, transparent 40%)",
        }}
      />

      <div className="container relative z-10">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={`text-center mb-16 reveal ${isRevealed ? "revealed" : ""}`}
        >
          <p className="section-label mb-3">Testimonials</p>
          <h2 className="section-title mb-4">お客様の声</h2>
          <p className="section-subtitle max-w-xl mx-auto">
            変化を体験されたお客様からのご感想をご紹介します。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <TestimonialCard key={i} testimonial={t} delay={i * 100} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ testimonial, delay }: { testimonial: Testimonial; delay: number }) {
  const { ref, isRevealed } = useScrollReveal();

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`testimonial-card reveal ${isRevealed ? "revealed" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: testimonial.rating }).map((_, i) => (
          <Star key={i} size={12} fill="currentColor" style={{ color: "var(--gold-accent)" }} />
        ))}
      </div>
      <p
        className="text-sm leading-relaxed mb-4 relative z-10"
        style={{ color: "var(--warm-brown)", letterSpacing: "0.04em" }}
      >
        {testimonial.text}
      </p>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--warm-brown)" }}>
            {testimonial.name}
          </p>
          <p className="text-xs" style={{ color: "var(--light-brown)" }}>
            {testimonial.age}
          </p>
        </div>
        <span
          className="text-xs px-3 py-1 rounded-full"
          style={{
            background: "rgba(190,130,120,0.1)",
            color: "var(--rose-beige)",
          }}
        >
          {testimonial.service}
        </span>
      </div>
    </div>
  );
}

// ─── Service Flow Section ─────────────────────────────────────
const flowSteps = [
  {
    number: "01",
    title: "無料カウンセリング",
    description: "お悩みやご希望をじっくりお聴きします。どんな些細なことでもお気軽にご相談ください。",
    icon: "💬",
  },
  {
    number: "02",
    title: "診断・分析",
    description: "パーソナルカラー・骨格・顔タイプなど、科学的な手法であなたの魅力を分析します。",
    icon: "✨",
  },
  {
    number: "03",
    title: "プロデュースプラン提案",
    description: "診断結果をもとに、あなただけのオーダーメイドプランをご提案します。",
    icon: "📋",
  },
  {
    number: "04",
    title: "アテンド・実践",
    description: "実際のショッピングやメイクアップなど、リアルな場でのサポートを行います。",
    icon: "👗",
  },
  {
    number: "05",
    title: "撮影・記録",
    description: "プロカメラマンによる撮影で、新しいあなたを美しく記録します。",
    icon: "📸",
  },
];

export function ServiceFlowSection() {
  const { ref, isRevealed } = useScrollReveal();

  return (
    <section
      id="flow"
      className="py-24 relative overflow-hidden"
      style={{ background: "hsl(40, 30%, 98%)" }}
    >
      <div className="container">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={`text-center mb-16 reveal ${isRevealed ? "revealed" : ""}`}
        >
          <p className="section-label mb-3">How It Works</p>
          <h2 className="section-title mb-4">サービスの流れ</h2>
          <p className="section-subtitle max-w-xl mx-auto">
            初めての方でも安心してご利用いただけるように、<br />
            丁寧にサポートいたします。
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <div
              className="absolute left-6 top-0 bottom-0 w-px"
              style={{ background: "linear-gradient(to bottom, transparent, rgba(190,130,120,0.25), transparent)" }}
            />
            <div className="space-y-8">
              {flowSteps.map((step, i) => (
                <FlowStep key={i} step={step} index={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FlowStep({ step, index }: { step: typeof flowSteps[0]; index: number }) {
  const { ref, isRevealed } = useScrollReveal();

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`reveal ${isRevealed ? "revealed" : ""} flex items-start gap-6`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 relative z-10"
        style={{
          background: "hsl(8, 40%, 65%)",
          color: "white",
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "1rem",
          boxShadow: "0 0 0 6px rgba(190,130,120,0.12), 0 0 0 12px rgba(190,130,120,0.06)",
        }}
      >
        {step.number}
      </div>
      <div
        className="card-glow p-6 flex-1"
        style={{ marginTop: "0.25rem" }}
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl">{step.icon}</span>
          <h3
            className="text-lg"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--warm-brown)" }}
          >
            {step.title}
          </h3>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "var(--medium-brown)" }}>
          {step.description}
        </p>
      </div>
    </div>
  );
}

// ─── FAQ Section ──────────────────────────────────────────────
const defaultFaqs = [
  {
    q: "初めてでも大丈夫ですか？",
    a: "はい、もちろんです。美容に詳しくない方や、何から始めればいいかわからない方こそ、ぜひご相談ください。無料カウンセリングで丁寧にお話を伺います。",
  },
  {
    q: "診断の所要時間はどのくらいですか？",
    a: "パーソナルカラー診断・骨格診断は各90〜120分程度です。トータルプロデュースコースは複数回に分けて行うことが多く、お客様のご希望に合わせてスケジュールを組みます。",
  },
  {
    q: "オンラインでの対応は可能ですか？",
    a: "カウンセリングや一部の相談はオンラインでも対応しております。ただし、パーソナルカラー診断・骨格診断は対面での実施を推奨しております。",
  },
  {
    q: "料金はどのくらいかかりますか？",
    a: "サービス内容によって異なります。パーソナルカラー診断単体は¥15,000〜、トータルプロデュースコースは¥50,000〜となっております。詳しくはお問い合わせください。",
  },
  {
    q: "男性でも利用できますか？",
    a: "現在は女性のお客様を対象としたサービスを提供しております。将来的には男性向けサービスも検討しております。",
  },
  {
    q: "プレゼントとして利用できますか？",
    a: "はい、ギフト券のご用意もございます。大切な方への特別なプレゼントとしてもご利用いただけます。",
  },
];

export function FAQSection({ faqs = defaultFaqs }: { faqs?: typeof defaultFaqs }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { ref, isRevealed } = useScrollReveal();

  return (
    <section
      id="faq"
      className="py-24"
      style={{ background: "hsl(42, 35%, 96%)" }}
    >
      <div className="container">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={`text-center mb-16 reveal ${isRevealed ? "revealed" : ""}`}
        >
          <p className="section-label mb-3">FAQ</p>
          <h2 className="section-title mb-4">よくあるご質問</h2>
        </div>

        <div className="max-w-2xl mx-auto space-y-0">
          {faqs.map((faq, i) => (
            <FAQItem
              key={i}
              faq={faq}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              delay={i * 60}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({
  faq,
  isOpen,
  onToggle,
  delay,
}: {
  faq: { q: string; a: string };
  isOpen: boolean;
  onToggle: () => void;
  delay: number;
}) {
  const { ref, isRevealed } = useScrollReveal();

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`faq-item reveal ${isRevealed ? "revealed" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <button
        className="w-full flex items-center justify-between py-5 text-left gap-4"
        onClick={onToggle}
      >
        <span
          className="text-sm leading-relaxed"
          style={{ color: "var(--warm-brown)", letterSpacing: "0.04em" }}
        >
          {faq.q}
        </span>
        <ChevronDown
          size={18}
          className="flex-shrink-0 transition-transform duration-300"
          style={{
            color: "var(--rose-beige)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <p
              className="pb-5 text-sm leading-relaxed"
              style={{ color: "var(--medium-brown)", letterSpacing: "0.04em" }}
            >
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Booking Section ──────────────────────────────────────────
export function BookingSection() {
  const { ref, isRevealed } = useScrollReveal();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section
      id="booking"
      className="py-24 relative overflow-hidden"
      style={{ background: "hsl(40, 30%, 98%)" }}
    >
      <div
        className="absolute top-0 left-0 w-80 h-80 rounded-full opacity-5 animate-float-2 pointer-events-none"
        style={{ background: "var(--rose-beige)", transform: "translate(-40%, -40%)" }}
      />
      <div
        className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-5 animate-float-3 pointer-events-none"
        style={{ background: "var(--pale-pink)", transform: "translate(30%, 30%)" }}
      />

      <div className="container relative z-10">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={`text-center mb-16 reveal ${isRevealed ? "revealed" : ""}`}
        >
          <p className="section-label mb-3">Reservation</p>
          <h2 className="section-title mb-4">ご予約・お問い合わせ</h2>
          <p className="section-subtitle max-w-xl mx-auto">
            まずは無料カウンセリングから。<br />
            あなたの物語を、一緒に始めましょう。
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 space-y-4"
            >
              <CheckCircle size={48} className="mx-auto" style={{ color: "var(--rose-beige)" }} />
              <h3
                className="text-2xl"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--warm-brown)" }}
              >
                お問い合わせありがとうございます
              </h3>
              <p className="text-sm" style={{ color: "var(--medium-brown)" }}>
                2営業日以内にご連絡いたします。
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs tracking-wider" style={{ color: "var(--medium-brown)" }}>
                    お名前 <span style={{ color: "var(--rose-beige)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                    style={{
                      background: "hsl(42, 35%, 96%)",
                      border: "1px solid rgba(200,185,170,0.5)",
                      color: "var(--warm-brown)",
                    }}
                    placeholder="山田 花子"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs tracking-wider" style={{ color: "var(--medium-brown)" }}>
                    メールアドレス <span style={{ color: "var(--rose-beige)" }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                    style={{
                      background: "hsl(42, 35%, 96%)",
                      border: "1px solid rgba(200,185,170,0.5)",
                      color: "var(--warm-brown)",
                    }}
                    placeholder="hanako@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs tracking-wider" style={{ color: "var(--medium-brown)" }}>
                  ご希望のサービス
                </label>
                <select
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{
                    background: "hsl(42, 35%, 96%)",
                    border: "1px solid rgba(200,185,170,0.5)",
                    color: formData.service ? "var(--warm-brown)" : "var(--light-brown)",
                  }}
                >
                  <option value="">選択してください</option>
                  <option value="counseling">無料カウンセリング</option>
                  <option value="color">パーソナルカラー診断</option>
                  <option value="skeleton">骨格診断</option>
                  <option value="fashion">ファッションアテンド</option>
                  <option value="cosme">コスメアテンド</option>
                  <option value="total">トータルプロデュース</option>
                  <option value="photo">プロフィール撮影</option>
                  <option value="other">その他</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs tracking-wider" style={{ color: "var(--medium-brown)" }}>
                  ご相談内容・ご質問
                </label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 resize-none"
                  style={{
                    background: "hsl(42, 35%, 96%)",
                    border: "1px solid rgba(200,185,170,0.5)",
                    color: "var(--warm-brown)",
                  }}
                  placeholder="お気軽にご相談ください..."
                />
              </div>

              <div className="text-center pt-4">
                <button type="submit" className="btn-primary px-12 py-4">
                  送信する
                  <ChevronRight size={16} />
                </button>
                <p className="text-xs mt-3" style={{ color: "var(--light-brown)" }}>
                  ※ 無料カウンセリングは完全予約制です
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
