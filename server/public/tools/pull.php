<?php
// さくらの cron から呼ぶ入口。GitHub の最新の生成物を取りに行く。
//
//   cd /home/n-higuchi/www/news && php tools/pull.php
//
// 何も変わっていなければ落とさずに終わる。何度呼んでも害はない。

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

define('NEWS_APP', true);
require __DIR__ . '/../lib/auth.php';
require __DIR__ . '/../lib/github.php';
require __DIR__ . '/../lib/pull.php';

$force = in_array('--force', $argv ?? [], true);
$result = news_pull_if_needed($force);

$stamp = date('Y-m-d H:i:s');
if (!$result['ok']) {
    fwrite(STDERR, "[$stamp] 取り込めませんでした: {$result['error']}\n");
    exit(1);
}
if ($result['changed']) {
    echo "[$stamp] 取り込みました: " . substr($result['sha'], 0, 7) . "\n";
} else {
    echo "[$stamp] 変わりありません\n";
}
