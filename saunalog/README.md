# サウナログ（SaunaLog）

食べログの使い勝手をサウナに持ち込んだ iOS アプリです。現在地まわりのサウナ・銭湯・スーパー銭湯を
検索し、距離・評価・営業状況・施設タイプ・価格帯で絞り込んで一覧できます。

- **技術**: Expo SDK 57 / React Native 0.86 / React 19 / TypeScript / expo-router
- **施設データ**: Google Places API (New) `places:searchText`
- **実装済み**: 検索・一覧・絞り込み（+ 最低限の施設詳細）

---

## セットアップ

```bash
cd saunalog
npm install
cp .env.example .env     # APIキーを書き込む
npm start                # Expo Go / 開発ビルドで読み込む
```

APIキーを設定しない場合はサンプルデータ（架空の12施設）で起動します。UI と絞り込みの挙動は
キー無しでもひと通り確認できます。

```bash
npm run typecheck   # 型チェック
npm test            # 絞り込み・並び替え・距離計算のテスト
```

### Google Places API キーの取り方

1. Google Cloud でプロジェクトを作り、課金を有効にする
2. 「**Places API (New)**」を有効化する（旧 Places API とは別物です）
3. 認証情報からAPIキーを作成する
4. キーに制限をかける
   - アプリケーションの制限: **iOSアプリ** → バンドルID `info.nhct.saunalog`
   - APIの制限: **Places API (New)** のみ
5. `.env` に `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=...` を書く

> `EXPO_PUBLIC_` の変数はアプリのバンドルに埋め込まれ、取り出すことが可能です。
> 上記のキー制限は「やっておくと良い」ではなく必須です。制限なしのキーを配布すると
> 第三者に課金を使われます。キーを完全に隠したい場合は、後述の「今後の拡張」にある
> 自前バックエンド経由に切り替えてください。

### 課金について

`src/api/places.ts` の `FIELD_MASK` が請求額を決めます。フィールドを足すと単価の高い SKU に
上がることがあるので、項目を追加するときは Places API の料金表を確認してください。
また Places のデータはキャッシュ期間などの利用規約上の制限があります。施設情報を自前DBに
溜め込む設計にする場合は、規約の確認が必要です。

---

## 画面と機能

### 検索・一覧（`app/index.tsx`）

- キーワード検索（エリア名・施設名）— 内部では常に「サウナ」を足して問い合わせます
- 現在地の取得（拒否された場合は東京駅を基準に表示）
- 絞り込みシート
  - 並び替え: おすすめ順 / 評価が高い順 / 近い順 / 口コミが多い順
  - 距離: 1km / 3km / 5km / 10km / 30km
  - 評価: 指定なし / ★3.0以上 / ★3.5以上 / ★4.0以上
  - いま営業中のみ
  - 施設タイプ: サウナ専門 / スーパー銭湯 / 銭湯 / ホテル・カプセル / スパ・温泉 / その他
  - 価格帯: 4段階
- 適用中の条件数バッジ、適用前に件数が見えるボタン

**おすすめ順**は単純な平均点順ではなく、口コミ件数で平均に寄せるベイズ平均
（`recommendScore()`）を使っています。口コミ1件で星5の店が上位を占めるのを防ぐためで、
食べログの点数が単純平均でないのと同じ発想です。

### 施設詳細（`app/sauna/[id].tsx`）

写真・評価・住所・電話・サイト・営業時間を表示し、住所タップで地図アプリを開きます。
一覧で取得済みのデータをメモリキャッシュから読むため、詳細を開くたびに課金は発生しません。

---

## ディレクトリ

```
app/                    画面（expo-router のファイルベースルーティング）
├── _layout.tsx         Stack ナビゲーション
├── index.tsx           検索・一覧
└── sauna/[id].tsx      施設詳細
src/
├── api/places.ts       Places API (New) クライアントと正規化
├── api/mock.ts         APIキー無しで動かすためのサンプルデータ
├── components/         Chip / RatingStars / SaunaCard / FilterSheet
├── hooks/              useCurrentLocation / useSaunaSearch
├── lib/filters.ts      絞り込み・並び替え（純関数）
├── lib/geo.ts          距離計算
├── lib/category.ts     店名と types からの施設種別推定
├── lib/store.ts        一覧→詳細の受け渡しキャッシュ
├── theme.ts            配色・余白
└── types.ts            アプリ内の型
```

取得（ネットワーク）と絞り込み（ローカル）を分けてあるので、並び替えや評価の条件を変えても
再取得は走りません。キーワード・現在地・半径を変えたときだけ Places を叩きます。

---

## App Store へのリリース手順

Expo の EAS を使います。**Apple Developer Program（年 $99）への登録が必要**です。
ビルド自体は EAS のクラウドで行われるため Mac は必須ではありませんが、シミュレータでの
確認には Mac があると楽です。

```bash
npm install -g eas-cli
eas login
eas init                 # app.json に EAS プロジェクトIDが書き込まれる
```

### 1. APIキーをビルドに渡す

`.env` はリポジトリに入らないので、EAS 側に登録します。

```bash
eas env:create --name EXPO_PUBLIC_GOOGLE_PLACES_API_KEY --scope project --environment production
```

### 2. ビルド

```bash
eas build --platform ios --profile preview      # 内部配布・動作確認用
eas build --platform ios --profile production   # 審査提出用
```

初回は Apple のアカウント情報を聞かれ、証明書とプロビジョニングプロファイルは EAS が作ります。

### 3. 提出

```bash
eas submit --platform ios --latest
```

App Store Connect でアプリレコードを作成してから実行してください。

### 4. 審査で聞かれやすい点

- **位置情報の用途説明** — `app.json` の `NSLocationWhenInUseUsageDescription` に
  「現在地の近くにあるサウナを探すために位置情報を使用します。」を設定済み
- **Google のデータ表示** — 詳細画面に「施設情報の提供: Google」を出しています。
  Places のデータを使う場合はこの帰属表示が必要です
- **最低限の機能があること** — 検索して結果を見るだけのアプリは「価値が薄い」として
  リジェクトされることがあります。リリース前に下記の拡張のうち1つは入れておくと安全です

変更が JavaScript だけなら、審査を通さず OTA で配信できます。

```bash
eas update --branch production
```

---

## 今後の拡張

食べログとの対比で、まだ無いのはこのあたりです。

| 機能 | 必要なもの |
|---|---|
| サ活（訪問ログ）の記録 | 自前バックエンド + 認証 |
| 口コミ・評価の投稿 | 同上 |
| 行きたいリスト / お気に入り | ローカル保存だけなら AsyncStorage で完結 |
| 地図表示 | `expo-maps`（未導入） |
| サウナ固有の情報（温度・水風呂・ロウリュ・整い椅子） | **Places API には無い**ため自前DBが必要 |

最後の行がこのアプリの肝になる部分です。Places から取れるのは一般的な施設情報までなので、
サウナ室の温度や水風呂の温度、外気浴の有無といった「サウナログらしさ」を出すには、
施設IDに紐づく自前のデータストアが要ります。Places の `id` をキーにして自前DBを重ねる構成が
移行しやすいと思います。

APIキーを隠したい場合も同じで、`src/api/places.ts` の呼び先を自前バックエンドに差し替えれば、
キーはサーバー側だけに置けます。クライアント側は `searchSaunas()` のシグネチャを変えずに済みます。
