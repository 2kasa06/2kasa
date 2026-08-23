import AgePageTemplate, { type AgePageConfig } from "@/pages/AgePageTemplate";

const config: AgePageConfig = {
  range: "30代",
  en: "Thirties",
  concept: "20代と同じ選び方では、しっくりこなくなる時期です",
  subConcept:
    "仕事も暮らしも役割が増えるほど、迷う時間はもったいない。自分の基準を一度つくれば、毎朝の選択が驚くほど速くなります。",
  heroImage: "/images/age-30s.webp",
  heroColor: "hsl(8, 45%, 93%)",
  tagline: "自信をまとい、美しさを再定義する",
  description:
    "似合うものが変わるのは、あなたが変わった証拠です。今の自分にふさわしい質感と余白を選び直して、仕事もプライベートも無理なく成立する装いへ。",
  painPoints: [
    "20代の頃に似合っていた服が、急に浮いて見えるようになった",
    "朝、着る服を決めるのに時間がかかってしまう",
    "仕事着と普段着が分断していて、服が増える一方",
    "きちんと感を出したいのに、地味になってしまう",
    "自分にお金と時間を使うことに、少し迷いがある",
  ],
  services: [
    { icon: "🎨", title: "パーソナルカラー診断", desc: "あなたを最も輝かせる色を科学的に分析" },
    { icon: "✦", title: "骨格診断", desc: "体型の特徴を活かすスタイリングを提案" },
    { icon: "💄", title: "コスメアテンド", desc: "肌に合ったコスメを一緒に選びます" },
    { icon: "🌟", title: "トータルプロデュース", desc: "診断から実践まで一貫してサポート" },
  ],
  scenes: [
    { label: "オフィス・商談", desc: "信頼感が伝わる配色とシルエットを選びます。" },
    { label: "保護者会・入園式", desc: "浮かず、地味すぎず。場に馴染む上品さを。" },
    { label: "友人の結婚式", desc: "手持ちを活かす小物合わせまでご提案します。" },
    { label: "週末のおでかけ", desc: "動きやすさと今っぽさを両立させる休日の型。" },
  ],
  accentColor: "hsl(8, 40%, 72%)",
};

export default function ThirtiesPage() {
  return <AgePageTemplate config={config} />;
}
