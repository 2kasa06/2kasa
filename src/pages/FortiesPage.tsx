import AgePageTemplate, { type AgePageConfig } from "@/pages/AgePageTemplate";

const config: AgePageConfig = {
  range: "40代",
  en: "Forties",
  concept: "似合うものより、着たいものを選べていますか",
  subConcept:
    "若く見せることでも、年齢に合わせて抑えることでもなく。積み重ねてきた時間が、いちばん似合う装いに変わります。",
  heroImage: "/images/age-40s.webp",
  heroColor: "hsl(30, 35%, 93%)",
  tagline: "本当にやりたい自分を見つける",
  description:
    "何を着ても少し野暮ったく見えるとしたら、原因は色と素材のわずかなズレかもしれません。今のご自身に合う配分を見つけ直して、装いをもっと自由にしていきます。",
  painPoints: [
    "クローゼットは多いのに、着ていく服がないと感じる",
    "髪と肌の変化に、いつものメイクが追いつかない",
    "若作りにも老け見えにもしたくないが、加減がわからない",
    "人に会う予定が増えたのに、勝負服がない",
    "自分らしさを取り戻したいが、何から始めればいいか迷う",
  ],
  services: [
    { icon: "✦", title: "骨格診断", desc: "体型の特徴を活かすスタイリングを提案" },
    { icon: "💄", title: "コスメアテンド", desc: "肌に合ったコスメを一緒に選びます" },
    { icon: "💎", title: "アクセサリー提案", desc: "全体のコーデを完成させる小物選び" },
    { icon: "📸", title: "ビフォーアフター撮影", desc: "変化の記録を美しく残します" },
  ],
  scenes: [
    { label: "プレゼン・面談", desc: "落ち着きと明るさを両立する顔まわりの色に。" },
    { label: "学校行事", desc: "写真に残ることを前提に、明るく上品な一式を。" },
    { label: "同窓会・会食", desc: "久しぶりに会う人に、印象を更新してもらう装い。" },
    { label: "旅行・観劇", desc: "長時間でも疲れない素材で、きちんと感のある服を。" },
  ],
  accentColor: "hsl(30, 35%, 68%)",
};

export default function FortiesPage() {
  return <AgePageTemplate config={config} />;
}
