import AgePageTemplate, { type AgePageConfig } from "@/pages/AgePageTemplate";

const config: AgePageConfig = {
  range: "50代〜60代",
  en: "Fifties & Beyond",
  concept: "これからの時間を、いちばん好きな自分で過ごすために",
  subConcept:
    "子育てや仕事がひと段落し、自分のために時間を使えるようになる時期。似合うものを絞り込むほど、毎日は軽やかになります。",
  heroImage: "/images/age-50s.webp",
  heroColor: "hsl(215, 25%, 94%)",
  tagline: "今の魅力を、最大限に輝かせる",
  description:
    "髪色が変われば、似合う色も変わります。今のご自身をあらためて診断して、これから増える予定に合わせたワードローブへ。手放すことから始める、いちばん自由な年代です。",
  painPoints: [
    "白髪や肌の変化に、これまでの服の色が合わなくなってきた",
    "気づくと暗い色ばかりを選んでしまう",
    "クローゼットを整理したいが、残す基準がわからない",
    "新しい趣味や集まりに、着ていく服がない",
    "長年使い続けているコスメを、そろそろ見直したい",
  ],
  services: [
    { icon: "🎨", title: "パーソナルカラー診断", desc: "あなたを最も輝かせる色を科学的に分析" },
    { icon: "💄", title: "コスメ見直し", desc: "今の肌に合うアイテムへアップデート" },
    { icon: "🌿", title: "ライフスタイル提案", desc: "美しさを日常に取り入れる生活提案" },
    { icon: "🌟", title: "プロカメラマン撮影", desc: "新しいあなたをプロが撮影します" },
  ],
  scenes: [
    { label: "お稽古・サークル", desc: "動きやすさと品のよさを兼ねた、通いやすい装い。" },
    { label: "記念写真", desc: "節目の日にふさわしい、華やかで落ち着いた一式を。" },
    { label: "旅行", desc: "少ない枚数で着回せる、荷物の軽い組み合わせに。" },
    { label: "日常のお買い物", desc: "普段こそ気持ちが上がる、無理のない色使いを。" },
  ],
  accentColor: "hsl(215, 28%, 72%)",
};

export default function FiftiesPage() {
  return <AgePageTemplate config={config} />;
}
