<?php
// パスワードのハッシュを作る。
//   php server/tools/hash.php 'ここにパスワード'
// 出た文字列を server/public/lib/users.php に貼る。

declare(strict_types=1);

$password = $argv[1] ?? '';
if ($password === '') {
    fwrite(STDERR, "使い方: php hash.php 'パスワード'\n");
    exit(1);
}
if (strlen($password) < 10) {
    fwrite(STDERR, "警告: 10文字未満です。総当たりに弱いので長くしてください。\n");
}
echo password_hash($password, PASSWORD_DEFAULT), "\n";
