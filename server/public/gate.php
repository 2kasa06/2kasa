<?php
// 生成された HTML を、ログイン済みの人にだけ返す。
//
// HTML そのものは site/ に置き、.htaccess で直接アクセスを拒否している。
// 読むのはこのファイル経由だけ。

declare(strict_types=1);
define('NEWS_APP', true);
require __DIR__ . '/lib/auth.php';

news_require_login();

$requested = (string)($_GET['f'] ?? 'index.html');

// 許す形をここで決め打ちする。組み立てたパスを後から検査するのではなく、
// 最初から想定した形以外は受け付けない。これで上位ディレクトリへは辿れない。
$allowed = $requested === 'index.html'
    || $requested === 'archive.html'
    || (bool)preg_match('#^archive/\d{4}-\d{2}-\d{2}\.html$#', $requested);

if (!$allowed) {
    http_response_code(404);
    exit('Not Found');
}

$path = __DIR__ . '/site/' . $requested;
if (!is_file($path)) {
    http_response_code(404);
    exit('まだ生成されていません。');
}

$html = (string)file_get_contents($path);
$base = news_base_url();

// 更新ボタンの受け口を、この配信のときだけ教える。
// 静的に置いたときは差し込まれないので、ボタンは動きを見せて読み込み直すだけになる。
$api = json_encode([
    'refresh' => $base . '/api/refresh.php',
    'status' => $base . '/api/status.php',
    'logout' => $base . '/logout.php',
    'user' => (string)($_SESSION['user'] ?? ''),
    'csrf' => news_csrf_token(),
], JSON_UNESCAPED_SLASHES);

$inject = '<script>window.NEWS_API=' . $api . ';</script>';
$html = str_replace('<!--NEWS_API-->', $inject, $html);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('X-Frame-Options: SAMEORIGIN');
echo $html;
