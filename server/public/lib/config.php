<?php
// さくらインターネットに置く設定。公開ディレクトリの中にあるが、
// 同じ階層の .htaccess で lib/ への直接アクセスを拒否している。
//
// このファイルは複製して使う想定。GitHub のトークンが入るので、
// リポジトリにそのまま置いたり、他人に見せたりしないこと。

declare(strict_types=1);

// 直接叩かれても何も返さない
if (!defined('NEWS_APP')) {
    http_response_code(404);
    exit;
}

return [
    // ---- GitHub とやりとりするための設定 ----
    // 更新ボタンで収集を起こし、出来た生成物を取りに行くのに使う。
    // fine-grained トークンで、権限は次の2つだけあればよい。
    //   Actions:  Read and write  … 収集を起こす
    //   Contents: Read            … 生成物を取りに行く
    // 空のままだと更新ボタンは動きを見せて読み込み直すだけになる。
    'github' => [
        'token' => '',                 // 例: github_pat_xxxxxxxx
        'owner' => '2kasa06',
        'repo' => '2kasa',
        'workflow' => 'news.yml',
        // dispatch の対象ブランチ。ワークフローは既定ブランチに置くこと。
        'ref' => 'main',   // 既定ブランチ
    ],

    // 収集はサーバに負荷をかける。連打されないよう間隔を空ける（秒）
    'refresh_interval' => 300,

    // 収集にかかるおおよその時間（秒）。進み具合の目安に使う
    'expected_duration' => 210,

    // ログインの試行制限
    'login' => [
        'max_attempts' => 5,
        'window' => 600,   // 秒。この時間内に max_attempts を超えたら待たせる
        'lockout' => 900,  // 秒
    ],

    // ログイン試行の記録などの置き場所。書き込みできる場所にすること。
    // 既定はアプリ直下の state/。同梱の .htaccess で外からは読めない。
    // サーバの都合で公開ディレクトリの外に置けるなら、その方が確実。
    'state_dir' => __DIR__ . '/../state',

    // サイト名（ログイン画面に出る）
    'site_name' => '防衛施設ウォッチ',
];
