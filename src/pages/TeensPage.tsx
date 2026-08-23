import AgePageTemplate, { type AgePageConfig } from "@/pages/AgePageTemplate";

const config: AgePageConfig = {
  range: "10代〜20代",
  en: "Teens & Twenties",
  concept: "「似合う」がわからないまま、なんとなく選んでいませんか",
  subConcept:
    "情報があふれる時代だからこそ、自分の軸を知ることが近道になります。流行を追うのではなく、流行を使いこなす側へ。",
  heroImage: "/images/age-teens.webp",
  heroColor: "hsl(340, 45%, 92%)",
  tagline: "垢抜けて、自分らしく輝く",
  description:
    "似合う色、似合う形、似合うメイク。自分の魅力を言葉にできるようになると、毎日の選択が驚くほど軽くなります。はじめての方に寄り添って、一緒に見つけていきます。",
  painPoints: [
    "SNSで見たメイクを真似しても、なぜか自分には似合わない",
    "何を着ればいいかわからず、いつも同じ服を選んでしまう",
    "就活やバイトの面接で、きちんとした印象を作りたい",
    "限られた予算で失敗せずに買い物をしたい",
    "自分に自信が持てず、写真に写るのが苦手",
  ],
  services: [
    { icon: "🎨", title: "パーソナルカラー診断", desc: "あなたを最も輝かせる色を科学的に分析" },
    { icon: "💄", title: "顔タイプ分析 + メイク提案", desc: "顔立ちに合うメイクの方向性がわかります" },
    { icon: "✦", title: "骨格診断", desc: "体型の特徴を活かすスタイリングを提案" },
    { icon: "👗", title: "ファッションアテンド", desc: "実際のショッピングに同行してサポート" },
  ],
  scenes: [
    { label: "就活・面接", desc: "清潔感と誠実さが伝わる配色と髪型に整えます。" },
    { label: "成人式・卒業式", desc: "一生残る一日を、いちばん似合う姿で迎えるために。" },
    { label: "デート", desc: "背伸びしない、いつもの延長で可愛く見えるスタイルへ。" },
    { label: "友達との旅行", desc: "写真に残る場面で、自然に映える組み合わせを。" },
  ],
  accentColor: "hsl(340, 50%, 80%)",
};

export default function TeensPage() {
  return <AgePageTemplate config={config} />;
}
