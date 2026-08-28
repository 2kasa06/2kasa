<?php
// 収集の進み具合を返す。ローディング画面がこれを数秒ごとに聞きに来る。

declare(strict_types=1);
define('NEWS_APP', true);
require __DIR__ . '/../lib/auth.php';
require __DIR__ . '/../lib/github.php';

if (!news_is_logged_in()) {
    news_json(['state' => 'failed', 'label' => 'ログインが切れています'], 401);
}

$config = news_config();
$state = json_decode((string)@file_get_contents(news_state_path('refresh.json')), true) ?: [];
$dispatchedAt = (int)($state['dispatched_at'] ?? 0);

if ($dispatchedAt === 0) {
    news_json(['state' => 'idle', 'percent' => 0, 'label' => '待機中']);
}

$elapsed = time() - $dispatchedAt;

/** 経過時間から進み具合の目安を出す。実際の状態が取れたらそちらを優先する。 */
$estimate = static function (int $elapsed) use ($config): int {
    $expected = max(30, (int)$config['expected_duration']);
    // 90%までを想定時間で進め、残りは完了の合図を待つ
    return (int)min(90, 6 + ($elapsed / $expected) * 84);
};

$gh = $config['github'];
$runs = news_github(
    'GET',
    news_github_repo() . '/actions/workflows/' . rawurlencode($gh['workflow'])
        . '/runs?event=workflow_dispatch&per_page=1'
);

if (!$runs['ok'] || empty($runs['body']['workflow_runs'])) {
    // 状態が取れなくても待たせ続けない。目安だけ返す。
    news_json(['state' => 'running', 'percent' => $estimate($elapsed), 'label' => '収集しています']);
}

$run = $runs['body']['workflow_runs'][0];
$startedAt = strtotime((string)($run['run_started_at'] ?? $run['created_at'] ?? '')) ?: $dispatchedAt;

// 押す前から走っていた実行を掴まないよう、開始が古すぎるものは無視する
if ($startedAt < $dispatchedAt - 120) {
    news_json(['state' => 'running', 'percent' => $estimate($elapsed), 'label' => '順番を待っています']);
}

$status = (string)($run['status'] ?? '');
$conclusion = (string)($run['conclusion'] ?? '');

if ($status === 'completed') {
    if ($conclusion === 'success') {
        news_json(['state' => 'done', 'percent' => 100, 'label' => '更新できました']);
    }
    news_json([
        'state' => 'failed',
        'percent' => 100,
        'label' => '更新に失敗しました（' . ($conclusion !== '' ? $conclusion : '原因不明') . '）',
    ]);
}

if ($status === 'queued') {
    news_json(['state' => 'running', 'percent' => max(6, $estimate($elapsed)), 'label' => '順番を待っています']);
}

// 走っている間は、いま動いている手順の名前をそのまま見せる
$label = '収集しています';
$jobs = news_github('GET', news_github_repo() . '/actions/runs/' . (int)$run['id'] . '/jobs?per_page=1');
if ($jobs['ok'] && !empty($jobs['body']['jobs'][0]['steps'])) {
    foreach ($jobs['body']['jobs'][0]['steps'] as $step) {
        if (($step['status'] ?? '') === 'in_progress') {
            $label = (string)$step['name'];
            break;
        }
    }
}

news_json(['state' => 'running', 'percent' => $estimate($elapsed), 'label' => $label]);
