<?php
declare(strict_types=1);
define('NEWS_APP', true);
require __DIR__ . '/lib/auth.php';

news_start_session();
$config = news_config();
$base = news_base_url();
$next = (string)($_GET['next'] ?? $_POST['next'] ?? '');

// 開いたページに戻す。外部サイトへ飛ばされないよう、自分の配下だけ許す。
if ($next !== '' && !preg_match('#^' . preg_quote($base, '#') . '/[A-Za-z0-9._/\-]*$#', $next)) {
    $next = '';
}
$target = $next !== '' ? $next : $base . '/';

if (news_is_logged_in()) {
    header('Location: ' . $target);
    exit;
}

$error = '';
$lockedUntil = news_login_locked_until();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($lockedUntil > 0) {
        $error = '試行が続いたため、しばらく受け付けません（あと' . (int)ceil(($lockedUntil - time()) / 60) . '分）。';
    } elseif (!news_check_csrf((string)($_POST['csrf'] ?? ''))) {
        $error = '画面が古くなっています。読み込み直してからもう一度お試しください。';
    } else {
        $user = trim((string)($_POST['user'] ?? ''));
        $password = (string)($_POST['password'] ?? '');

        if (news_verify($user, $password)) {
            news_clear_login_failures();
            session_regenerate_id(true);   // 固定化を防ぐ
            $_SESSION['user'] = $user;
            $_SESSION['login_at'] = time();
            unset($_SESSION['csrf']);
            header('Location: ' . $target);
            exit;
        }
        news_record_login_failure();
        // IDが違うのかパスワードが違うのかは伝えない
        $error = 'IDまたはパスワードが違います。';
        $lockedUntil = news_login_locked_until();
    }
}

$csrf = news_csrf_token();
$h = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
?><!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>ログイン | <?= $h($config['site_name']) ?></title>
<style>
:root {
  color-scheme: dark;
  --bg:#060d12; --panel:#0b1720; --line:#17384a; --line-soft:#102734;
  --cyan:#5fe0ff; --cyan-dim:#3d97b5; --text:#d5ecf5; --text-dim:#8bb0c1;
  --text-faint:#5d7f8e; --critical:#d03b3b;
  --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}
*{box-sizing:border-box}
html{background:var(--bg)}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--text);
  font-family:"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic Medium",Meiryo,system-ui,sans-serif;
  line-height:1.8;font-size:15px;padding:24px}
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:3;
  background:repeating-linear-gradient(180deg,rgba(95,224,255,.028) 0 1px,transparent 1px 3px)}
body::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
  background:linear-gradient(rgba(23,56,74,.30) 1px,transparent 1px) 0 0/100% 44px,
             linear-gradient(90deg,rgba(23,56,74,.30) 1px,transparent 1px) 0 0/44px 100%;
  mask-image:radial-gradient(ellipse 70% 60% at 50% 40%,#000 20%,transparent 75%)}
/* 社内には別のポータルがある。どちらに入ろうとしているのか一目で分かるよう、
   このサイトでしか出てこない日本地図を背景に敷く。 */
.map{position:fixed;inset:0;z-index:0;pointer-events:none;display:grid;place-items:center;
  opacity:.18}
/* 中央に置くとカードの裏に本州が隠れ、北海道と沖縄だけが浮いて見える。
   列島の全体が見えるよう、カードの脇に寄せる。 */
.map img{height:min(72vh,620px);width:auto;transform:translateX(-34%);
  filter:drop-shadow(0 0 26px rgba(95,224,255,.3))}
@media (max-width:900px){.map{opacity:.09}.map img{transform:none;height:min(80vh,680px)}}
.box{position:relative;z-index:1;width:min(400px,100%);background:linear-gradient(160deg,var(--panel),#0e1f2a);
  border:1px solid var(--line);padding:30px 28px}
.box::before,.box::after{content:"";position:absolute;width:13px;height:13px;border-color:var(--cyan);border-style:solid;border-width:0}
.box::before{top:-1px;left:-1px;border-top-width:2px;border-left-width:2px}
.box::after{bottom:-1px;right:-1px;border-bottom-width:2px;border-right-width:2px}
h1{margin:0;font-size:1.2rem;letter-spacing:.1em;text-shadow:0 0 16px rgba(95,224,255,.45)}
h1 span{color:var(--cyan)}
.sub{font-family:var(--mono);font-size:.64rem;letter-spacing:.3em;color:var(--cyan-dim);
  text-transform:uppercase;margin:6px 0 12px}
.lead{font-size:.8rem;line-height:1.7;color:var(--text-dim);margin:0 0 22px;
  padding-bottom:18px;border-bottom:1px solid var(--line-soft)}
label{display:block;font-family:var(--mono);font-size:.68rem;letter-spacing:.14em;
  color:var(--text-faint);text-transform:uppercase;margin-bottom:5px}
input{width:100%;padding:10px 12px;margin-bottom:16px;font-family:var(--mono);font-size:.9rem;
  border:1px solid var(--line);background:#081118;color:var(--text)}
input:focus{outline:none;border-color:var(--cyan);box-shadow:0 0 12px rgba(95,224,255,.2)}
button{width:100%;padding:11px;font-family:var(--mono);font-size:.82rem;letter-spacing:.12em;
  cursor:pointer;border:1px solid var(--cyan);background:var(--cyan);color:#04222c;font-weight:700}
button:hover{background:#8ceaff}
button:disabled{opacity:.4;cursor:default}
.error{border:1px solid var(--critical);background:rgba(208,59,59,.1);color:#f0a5a5;
  padding:9px 12px;font-size:.8rem;margin-bottom:18px}
.note{margin:20px 0 0;font-size:.72rem;color:var(--text-faint);font-family:var(--mono)}
</style>
</head>
<body>
<div class="map" aria-hidden="true"><img src="assets/japan.svg" alt=""></div>
<div class="box">
  <h1><span>◤</span> <?= $h($config['site_name']) ?></h1>
  <p class="sub">Defense Facility Watch</p>
  <p class="lead">自衛隊基地・防衛施設の整備と、<br>防衛に関わる建築土木を追うページです。</p>

  <?php if ($error !== ''): ?>
    <p class="error" role="alert"><?= $h($error) ?></p>
  <?php endif; ?>

  <form method="post" autocomplete="on">
    <input type="hidden" name="csrf" value="<?= $h($csrf) ?>">
    <input type="hidden" name="next" value="<?= $h($next) ?>">

    <label for="user">ID</label>
    <input id="user" name="user" type="text" autocapitalize="off" autocorrect="off"
           autocomplete="username" required autofocus>

    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required>

    <button type="submit" <?= $lockedUntil > 0 ? 'disabled' : '' ?>>ログイン</button>
  </form>

  <p class="note">社内限定 / 社内ポータルとは別のIDです</p>
</div>
</body>
</html>
