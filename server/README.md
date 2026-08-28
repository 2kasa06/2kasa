# さくらインターネットへの設置

社内の人だけが見られるように、ログインを通してから記事を返す仕組み。

収集そのものは GitHub Actions が行う。さくらの共用サーバでは Node も Chromium も
動かないため、ここが担うのは「配信」「ログイン」「更新ボタンの受付」の3つだけ。

```
朝7時 / 更新ボタン
  → GitHub Actions が収集・要約・HTML生成
  → FTPS で さくら の site/ に配信
  → 社員がブラウザで見る（ログイン必須）
```

## この設置での値

さくらのコントロールパネルで確認した、実際の設置先。

| | |
|---|---|
| 公開URL | `https://news.n-higuchi.jp/` |
| サーバのホスト名 | `n-higuchi.sakura.ne.jp` |
| アカウント | `n-higuchi` |
| 公開フォルダ | `/home/n-higuchi/www/news` |

同じサーバに社内ポータル（`portal.n-higuchi.jp`）が同居している。
ログイン画面はどちらに入ろうとしているのか分かるよう、背景に日本地図を敷き、
「社内ポータルとは別のID」と明記してある。

## 置くもの

`server/public/` の中身を、公開フォルダ（`/home/n-higuchi/www/news`）に置く。

```
/home/n-higuchi/www/news/
  index.php        入口
  gate.php         ログインを確かめて HTML を返す
  login.php        ログイン画面
  logout.php
  api/refresh.php  更新ボタンの受け口
  api/status.php   進み具合
  lib/             設定と共通処理（.htaccess で外から読めない）
  state/           ログイン試行の記録（.htaccess で外から読めない）
  site/            生成された HTML。GitHub Actions が FTPS で置く
  assets/          ログイン画面の背景に使う日本地図
  .htaccess
  robots.txt
```

`site/` は空のまま作っておけばよい。最初の更新で中身が入る。
`state/` は PHP が書き込むので、書き込み可能にしておく（`chmod 700` 程度）。

## 設定する

### 1. ログインできる人を決める

パスワードのハッシュを作る。

```bash
php server/tools/hash.php 'じゅうぶんに長いパスワード'
```

出た文字列を `lib/users.php` に貼る。

```php
return [
    'yamada' => '$2y$12$....................................................',
    'suzuki' => '$2y$12$....................................................',
];
```

パスワードは平文で置かない。人を減らすときは行を消すだけでよい。

### 2. 更新ボタンを効かせる

`lib/config.php` に GitHub のトークンを入れる。

```php
'github' => [
    'token' => 'github_pat_xxxxxxxx',
    'owner' => '2kasa06',
    'repo'  => '2kasa',
    'workflow' => 'news.yml',
    'ref' => 'main',      // ワークフローが置かれている既定ブランチ
],
```

トークンは fine-grained personal access token で、対象リポジトリに対して
**Actions: Read and write** だけあればよい。これ以上の権限は要らない。

**注意**: GitHub は既定ブランチにあるワークフローしか起動できない。
`.github/workflows/news.yml` を既定ブランチに入れておくこと。入っていないと
更新ボタンは「更新を始められませんでした」と返す。

トークンを空のままにしても画面は動く。その場合、更新ボタンはローディングを
見せて最新の内容を読み込み直すだけになる（収集はしない）。

### 3. 配信をつなぐ

GitHub リポジトリの Settings → Secrets and variables → Actions に登録する。

| 名前 | 中身 |
|---|---|
| `SAKURA_FTP_HOST` | `n-higuchi.sakura.ne.jp` |
| `SAKURA_FTP_USER` | `n-higuchi` |
| `SAKURA_FTP_PASS` | さくらの FTP パスワード |
| `SAKURA_FTP_PATH` | `/home/n-higuchi/www/news` |

`SAKURA_FTP_HOST` が空のあいだ、配信の手順は丸ごと飛ばされる。

接続は FTPS（明示的 TLS）で、証明書も検証する。平文 FTP は使わない。
パスワードは lftp へ標準入力から渡すので、`ps` にもログにも出ない。

PHP 一式の設置は `ログイン機構をさくらへ設置`（`.github/workflows/deploy-server.yml`）が
受け持つ。Actions の画面から手で実行する。設置後に外から見て、ログイン画面が出ることと
`lib/` `state/` `site/` が遮断されていることを確かめ、駄目なら失敗で止まる。

配信されるのは生成物（`docs/`）だけで、PHP 一式は同期しない。
`lib/config.php` に鍵が入っているため、上書きされないようにしてある。

### 4. HTTPS にする

さくらの無料SSLを有効にする。有効でないと、ログインの入力が平文で流れる。
セッションの Cookie も HTTPS のときだけ Secure が付く。

## 守り方

- パスワードは `password_hash` で保存し、平文では持たない
- ログイン失敗が続くと、その接続元をしばらく受け付けない
- IDが存在しない場合も存在する場合と同じだけ時間をかけ、応答の速さで
  IDの有無を推測されないようにしている
- ログイン成功時にセッションIDを振り直す（固定化を防ぐ）
- ログイン後の戻り先は自分の配下だけに限る（外部サイトへ誘導されない）
- 更新ボタンは CSRF トークンと、実行間隔の制限を通す
- `site/` `lib/` `state/` は `.htaccess` で直接読めない。`mod_rewrite` が
  無効でも効くよう、各ディレクトリに拒否設定を置いている
- 生成物への要求は `gate.php` が受け、決め打ちした形以外は 404 にする
  （組み立てたパスを後から検査するのではなく、想定した形以外を受け付けない）
- `robots.txt` と `X-Robots-Tag` で検索避けをしている

## うまくいかないとき

- **ログイン後に「まだ生成されていません」** … `site/` が空。GitHub Actions を
  一度動かすか、`docs/` の中身を手で置く。
- **更新ボタンが「始められませんでした」** … トークンか、ワークフローが既定
  ブランチに無い。`state/refresh-error.log` に理由が残る。
- **更新が終わっても内容が変わらない** … 配信の秘密が未設定。Actions の
  「さくらインターネットへ配信」の手順が飛ばされていないか確認する。
- **ログインできなくなった** … `state/login-attempts.json` を消せば制限は解ける。
