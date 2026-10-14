# 駐車場の空き状況(社内ポータル用)

本社まわりの社員駐車場ごとに、いま何台空いているかを表示するアプリです。
`portal.n-higuchi.jp/apps/parking/` で動きます。ログインはポータルのものをそのまま使います。

- 社員は、停めたら「ここに停めた」、帰るときに「出庫した」を押す
- 押し忘れても、記録はその日のうちだけ有効。翌日 0 時に自動で消える
- 行ってみて満車だったときは「満車だった」を押すと、60 分間は満車として表示される
- 駐車場の名前・台数・固定台数(来客用など)は、ポータルの管理者が画面の下から変更できる
- 他の人の入出庫は 20 秒ごとに画面へ反映される

作りは走行距離申告アプリと同じです。画面は `apps/parking/` の静的ファイル、
データの保存はポータル本体の PHP(tRPC 互換の受け口 `App\Trpc\Server`)が受けます。

## ファイルと置き場所

左がこのフォルダ、右がさくらのサーバー上の置き場所です。

| このフォルダ | サーバー(`~/www/platform/` の下) | 内容 |
|---|---|---|
| `web/index.html` `web/style.css` `web/app.js` | `apps/parking/` | 画面(新規フォルダ) |
| `platform/src/Parking/Api.php` | `src/Parking/Api.php` | 手続き本体(新規フォルダ) |
| `platform/src/Controllers/ParkingController.php` | `src/Controllers/` | 通信の入口(新規) |
| `platform/db/parking.sql` | `db/` | テーブル定義(新規) |
| `platform/public/index.php` | `public/index.php` | **上書き**。ルートを 2 行追加 |
| `platform/db/setup.php` | `db/setup.php` | **上書き**。`migrate` に parking.sql を追加 |

上書きする 2 ファイルは、2026/10/14 にサーバーから受け取った版に追記したものです。
それ以降にサーバー側で書き換えていたら、上書きせず、次の差分だけを手で足してください。

`public/index.php`

```php
use App\Controllers\ParkingController;          // use の並びに追加

$parking = new ParkingController();             // $mileage = … の下に追加

// /apps/mileage/api/trpc の 2 行の下、「社内アプリの配信」より前に追加
$router->get('/apps/parking/api/trpc/{path*}', static fn (array $p) => $parking->trpc($p));
$router->post('/apps/parking/api/trpc/{path*}', static fn (array $p) => $parking->trpc($p));
```

`db/setup.php` の `migrate`(書類棚のテーブルを作ったあと)

```php
$parkingSql = file_get_contents(__DIR__ . '/parking.sql');
Database::pdo()->exec($parkingSql);
```

## 設置の手順

1. 上の表のとおりファイルを置く(ファイルマネージャーの「アップロード」で可)
2. テーブルを作る。SSH で:
   ```
   cd ~/www/platform
   php db/setup.php migrate
   ```
   「駐車場の空き状況のテーブルを作成しました。」と出れば完了。何度実行しても安全です。
   SSH が使えない場合は、phpMyAdmin の「SQL」タブに `db/parking.sql` の中身を貼って実行。
3. ポータルの管理画面「アプリ」→「アプリを追加」で登録する
   - URL 名: `parking`(フォルダ名と同じにする)
   - 名前: 駐車場の空き状況
   - 種別: 取り込み型 / 入口ファイル: `index.html`
   - 公開範囲: まず **管理者のみ** にして試す
4. 管理者で開き、画面下の「駐車場の設定」で駐車場と台数を登録する
5. 「ここに停めた」「出庫した」「満車だった」を一通り試し、問題なければ公開範囲を **全員** にする

公開範囲が「管理者のみ」の間は、一般社員は画面だけでなく通信(記録の書き込み)も拒否されます。

## 決めたこと

- **記録は「いまどこに停めているか」だけ。** 1 人 1 行で、停め直すと上書き、出庫で削除。
  履歴は残さないので、表は社員の人数より大きくならない
- **日付の境目は PHP で決める。** MySQL の `NOW()` はサーバー設定で UTC になることがあり、
  0 時のリセットが 9 時に起きてしまうため、日時はすべて PHP(Asia/Tokyo)で作って渡す
- **駐車場は削除せず停止にする。** 停止した駐車場に停めていた記録はその場で消す
- **入力の検査は走行距離アプリの `App\Mileage\Input` を使い回している。**
  走行距離アプリを消すときは、このクラスを残すか `App\Parking` 側へ移すこと
- 未ログイン時の文面 `Please login (10001)` は画面との取り決め。訳さないこと

## 手元での確認(2026/10/14)

MariaDB とサーバーから受け取った `src` `db` でポータルを手元に立て、次を確かめました。

- `php db/setup.php migrate` で 3 テーブルが作られる
- 未ログインは 401、公開範囲「管理者のみ」の間は一般社員が 403
- 駐車・出庫・満車報告・駐車場の追加/変更/停止が通り、応答で画面の数字が変わる
- 一般社員の設定変更は 403、更新系の GET 呼び出しは 405、不正な入力は 400
- 前日の押し忘れは数えられない
- 画面(PC 幅・スマホ幅)でコンソールエラーなし
