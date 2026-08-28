<?php
// 更新ボタンの受け口。収集そのものは GitHub Actions が行う。
// さくらの共用サーバでは Node も Chromium も動かないため、ここでは起動だけする。

declare(strict_types=1);
define('NEWS_APP', true);
require __DIR__ . '/../lib/auth.php';
require __DIR__ . '/../lib/github.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    news_json(['ok' => false, 'message' => 'POST で呼んでください'], 405);
}
if (!news_is_logged_in()) {
    news_json(['ok' => false, 'message' => 'ログインが切れています。読み込み直してください。'], 401);
}

$input = json_decode((string)file_get_contents('php://input'), true) ?: [];
if (!news_check_csrf((string)($input['token'] ?? ''))) {
    news_json(['ok' => false, 'message' => '画面が古くなっています。読み込み直してください。'], 400);
}

$config = news_config();
$statePath = news_state_path('refresh.json');
$state = json_decode((string)@file_get_contents($statePath), true) ?: [];

// 連打で GitHub と情報源の双方に負荷をかけないよう間隔を空ける
$since = time() - (int)($state['dispatched_at'] ?? 0);
if ($since < $config['refresh_interval']) {
    $wait = $config['refresh_interval'] - $since;
    news_json([
        'ok' => false,
        'message' => 'さきほど更新したばかりです。あと' . (int)ceil($wait / 60) . '分ほどお待ちください。',
    ], 429);
}

$gh = news_config()['github'];
$result = news_github(
    'POST',
    news_github_repo() . '/actions/workflows/' . rawurlencode($gh['workflow']) . '/dispatches',
    ['ref' => $gh['ref']]
);

if (!$result['ok']) {
    // 失敗の中身はログにだけ残し、画面には出さない
    @file_put_contents(
        news_state_path('refresh-error.log'),
        date('c') . ' ' . $result['status'] . ' ' . $result['error'] . "\n",
        FILE_APPEND | LOCK_EX
    );
    $message = $result['status'] === 404
        ? '更新を始められませんでした。ワークフローが既定ブランチにあるか確認してください。'
        : '更新を始められませんでした。しばらくしてからお試しください。';
    news_json(['ok' => false, 'message' => $message], 502);
}

@file_put_contents(
    $statePath,
    json_encode(['dispatched_at' => time(), 'by' => $_SESSION['user'] ?? '']),
    LOCK_EX
);

news_json(['ok' => true]);
