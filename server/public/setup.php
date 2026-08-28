<?php
// 最初の利用者を登録するための、一度きりのページ。
//
// パスワードのハッシュを作って見せるだけで、何も保存しない。
// lib/users.php に一人でも登録されたら、このページは自ら 404 を返す。
// 使い終わったらファイルごと消すこと。

declare(strict_types=1);
define('NEWS_APP', true);
require __DIR__ . '/lib/auth.php';

// すでに登録済みなら、この入口は閉じる
$users = require __DIR__ . '/lib/users.php';
if (is_array($users) && $users !== []) {
    http_response_code(404);
    exit;
}

$config = news_config();
$h = static fn(string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');

$error = '';
$line = '';
$id = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = trim((string)($_POST['id'] ?? ''));
    $password = (string)($_POST['password'] ?? '');
    $confirm = (string)($_POST['confirm'] ?? '');

    if (!preg_match('/^[a-z0-9._-]{3,32}$/i', $id)) {
        $error = 'IDは英数字と . _ - だけ、3〜32文字にしてください。';
    } elseif (mb_strlen($password) < 12) {
        $error = 'パスワードが短すぎます。12文字以上にしてください。';
    } elseif ($password !== $confirm) {
        $error = '確認用のパスワードが一致しません。';
    } else {
        $line = "    '" . $id . "' => '" . password_hash($password, PASSWORD_DEFAULT) . "',";
    }
}
?>
<!doctype html>
<html lang="ja">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>初期設定 | <?= $h($config['site_name']) ?></title>
<style>
:root{
  --bg:#060d12; --panel:#0b1720; --line:#17384a; --line-soft:#102734;
  --cyan:#5fe0ff; --cyan-dim:#3d97b5; --text:#d5ecf5; --text-dim:#8bb0c1;
  --text-faint:#5d7f8e; --critical:#d03b3b; --warn:#e0a33b;
  --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}
*{box-sizing:border-box}
html{background:var(--bg)}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:28px 18px;
  background:var(--bg);color:var(--text);
  font-family:"Hiragino Sans","Noto Sans JP",system-ui,sans-serif}
.box{width:min(560px,100%);background:linear-gradient(160deg,var(--panel),#0e1f2a);
  border:1px solid var(--line);padding:30px 28px}
h1{margin:0 0 4px;font-size:1.15rem;letter-spacing:.04em}
h1 span{color:var(--cyan)}
.sub{font-family:var(--mono);font-size:.64rem;letter-spacing:.3em;color:var(--cyan-dim);
  margin:0 0 20px;text-transform:uppercase}
.lead{font-size:.82rem;line-height:1.8;color:var(--text-dim);margin:0 0 22px;
  padding-bottom:18px;border-bottom:1px solid var(--line-soft)}
label{display:block;font-family:var(--mono);font-size:.68rem;letter-spacing:.14em;
  color:var(--text-faint);text-transform:uppercase;margin-bottom:5px}
input{width:100%;padding:10px 12px;margin-bottom:16px;font-family:var(--mono);font-size:.9rem;
  border:1px solid var(--line);background:#081118;color:var(--text)}
input:focus{outline:none;border-color:var(--cyan);box-shadow:0 0 12px rgba(95,224,255,.2)}
button{width:100%;padding:11px;font-family:var(--mono);font-size:.82rem;letter-spacing:.12em;
  cursor:pointer;border:1px solid var(--cyan);background:var(--cyan);color:#04222c;font-weight:700}
.error{border:1px solid var(--critical);background:rgba(208,59,59,.1);color:#f0a5a5;
  padding:10px 12px;margin-bottom:18px;font-size:.8rem}
.done{border:1px solid var(--cyan-dim);background:rgba(95,224,255,.07);
  padding:16px;margin-bottom:20px}
.done p{margin:0 0 10px;font-size:.82rem;line-height:1.8;color:var(--text-dim)}
pre{margin:0;padding:14px;background:#04101a;border:1px solid var(--line);
  overflow-x:auto;font-family:var(--mono);font-size:.72rem;line-height:1.7;color:var(--cyan)}
ol{margin:0;padding-left:1.3em;font-size:.82rem;line-height:1.9;color:var(--text-dim)}
code{font-family:var(--mono);font-size:.76rem;color:var(--text)}
.warn{margin:22px 0 0;padding:12px 14px;border:1px solid var(--warn);
  background:rgba(224,163,59,.08);font-size:.78rem;line-height:1.7;color:#e8c894}
.note{margin:18px 0 0;font-size:.72rem;color:var(--text-faint);font-family:var(--mono)}
</style>
<body>
<div class="box">
  <h1><span>◤</span> 初期設定</h1>
  <p class="sub"><?= $h($config['site_name']) ?></p>

<?php if ($line !== ''): ?>
  <div class="done">
    <p>できました。下の1行を <code>lib/users.php</code> に貼り付けてください。</p>
    <pre><?= $h($line) ?></pre>
  </div>
  <ol>
    <li>ファイルマネージャーで <code>www/news/lib/users.php</code> を編集</li>
    <li><code>return [</code> と <code>];</code> のあいだに、上の1行を貼る</li>
    <li>保存する</li>
    <li><strong>この <code>setup.php</code> を削除する</strong></li>
  </ol>
  <p class="warn">貼り付けが済んだら、必ず <code>setup.php</code> を消してください。
    消し忘れても、利用者が登録された時点でこのページは開けなくなりますが、
    残しておく理由はありません。</p>
<?php else: ?>
  <p class="lead">ログインできる人を、最初の一人だけ登録します。<br>
    入力したパスワードはどこにも保存されず、貼り付ける用の文字列を作って見せるだけです。</p>

  <?php if ($error !== ''): ?><div class="error"><?= $h($error) ?></div><?php endif; ?>

  <form method="post" autocomplete="off">
    <label for="id">ログインID</label>
    <input id="id" name="id" value="<?= $h($id) ?>" required autofocus
           pattern="[A-Za-z0-9._-]{3,32}">

    <label for="password">パスワード（12文字以上）</label>
    <input id="password" name="password" type="password" required minlength="12">

    <label for="confirm">パスワード（確認）</label>
    <input id="confirm" name="confirm" type="password" required minlength="12">

    <button type="submit">作る</button>
  </form>
  <p class="note">社内ポータルとは別のIDです</p>
<?php endif; ?>
</div>
