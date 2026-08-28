<?php
// GitHub から生成物を取りに行く。
//
// さくらの国外IPアドレスフィルタは「外から入ってくる接続」だけを止める。
// こちらから出ていく通信は素通りするので、押し込まれるのではなく取りに行く。
// これでフィルタを有効なままにできる。

declare(strict_types=1);

if (!defined('NEWS_APP')) {
    http_response_code(404);
    exit;
}

function news_site_dir(): string
{
    return dirname(__DIR__) . '/site';
}

/** 取り込み済みの版を覚えておく。同じものを何度も落とさないため。 */
function news_pulled_sha(): string
{
    $state = json_decode((string)@file_get_contents(news_state_path('pulled.json')), true) ?: [];
    return (string)($state['sha'] ?? '');
}

/**
 * 既定ブランチの先端を見て、まだ取り込んでいなければ取り込む。
 *
 * @return array{ok: bool, changed: bool, sha: string, error: string}
 */
function news_pull_if_needed(bool $force = false): array
{
    $ref = (string)(news_config()['github']['ref'] ?? 'main');

    $head = news_github('GET', news_github_repo() . '/commits/' . rawurlencode($ref));
    if (!$head['ok']) {
        return ['ok' => false, 'changed' => false, 'sha' => '', 'error' => 'GitHub の先端を調べられませんでした'];
    }

    $sha = (string)($head['body']['sha'] ?? '');
    if ($sha === '') {
        return ['ok' => false, 'changed' => false, 'sha' => '', 'error' => '先端の識別子が空でした'];
    }

    // 同じ版が入っていて中身もあるなら、何もしない
    if (!$force && $sha === news_pulled_sha() && is_file(news_site_dir() . '/index.html')) {
        return ['ok' => true, 'changed' => false, 'sha' => $sha, 'error' => ''];
    }

    return news_pull($sha);
}

/**
 * 指定の版を取り込む。二重に走らないよう鍵をかける。
 *
 * @return array{ok: bool, changed: bool, sha: string, error: string}
 */
function news_pull(string $sha): array
{
    $fail = static fn(string $why): array
        => ['ok' => false, 'changed' => false, 'sha' => $sha, 'error' => $why];

    $lock = @fopen(news_state_path('pull.lock'), 'c');
    if ($lock === false) {
        return $fail('鍵ファイルを作れません。state/ が書き込み可能か確かめてください');
    }
    // 先客がいるなら待たない。次の巡回に任せる。
    if (!flock($lock, LOCK_EX | LOCK_NB)) {
        fclose($lock);
        return ['ok' => true, 'changed' => false, 'sha' => $sha, 'error' => ''];
    }

    $work = news_state_path('pull-work');
    try {
        news_rmtree($work);
        if (!@mkdir($work, 0700, true)) {
            return $fail('作業場所を作れません: ' . $work);
        }

        $archive = $work . '/repo.tar.gz';
        $got = news_download_tarball($sha, $archive);
        if ($got !== '') {
            return $fail($got);
        }

        // 展開先。書庫の中身は {owner}-{repo}-{短い識別子}/ から始まる。
        $unpacked = $work . '/unpacked';
        $err = news_extract_tar_gz($archive, $unpacked);
        if ($err !== '') {
            return $fail($err);
        }

        $docs = news_find_docs($unpacked);
        if ($docs === null) {
            return $fail('書庫の中に docs/ が見つかりません');
        }
        if (!is_file($docs . '/index.html')) {
            return $fail('docs/index.html がありません。まだ生成されていない可能性があります');
        }

        // 入れ替えは rename で行う。中途半端な site/ を見せる時間を最小にする。
        $site = news_site_dir();
        $retired = $work . '/retired';
        if (is_dir($site) && !@rename($site, $retired)) {
            return $fail('古い site/ を退けられません。書き込み権限を確かめてください');
        }
        if (!@rename($docs, $site)) {
            // 戻せるなら戻す。site/ が消えたままにはしない。
            if (is_dir($retired)) {
                @rename($retired, $site);
            }
            return $fail('新しい site/ を置けません');
        }

        @file_put_contents(
            news_state_path('pulled.json'),
            json_encode(['sha' => $sha, 'at' => time()], JSON_UNESCAPED_UNICODE)
        );

        return ['ok' => true, 'changed' => true, 'sha' => $sha, 'error' => ''];
    } finally {
        news_rmtree($work);
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

/** 書庫を落とす。失敗したら理由を返し、成功なら空文字を返す。 */
function news_download_tarball(string $sha, string $dest): string
{
    $config = news_config()['github'];
    if (($config['token'] ?? '') === '') {
        return 'GitHub のトークンが設定されていません（lib/config.php）';
    }

    $fh = @fopen($dest, 'wb');
    if ($fh === false) {
        return '書庫を保存できません: ' . $dest;
    }

    $url = 'https://api.github.com' . news_github_repo() . '/tarball/' . rawurlencode($sha);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => [
            'Accept: application/vnd.github+json',
            'Authorization: Bearer ' . $config['token'],
            'X-GitHub-Api-Version: 2022-11-28',
            'User-Agent: boueishisetsu-watch',
        ],
        // 書庫の実体は別ホストに転送される。ここは追う必要がある。
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 5,
        CURLOPT_FILE => $fh,
        CURLOPT_TIMEOUT => 120,
        CURLOPT_CONNECTTIMEOUT => 10,
    ]);
    $ok = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    fclose($fh);

    if ($ok === false) {
        return '書庫を落とせません: ' . ($error !== '' ? $error : '通信に失敗しました');
    }
    if ($status < 200 || $status >= 300) {
        return '書庫を落とせません（HTTP ' . $status . '）。トークンの権限を確かめてください';
    }
    if (@filesize($dest) < 1024) {
        return '書庫が小さすぎます。中身が空の可能性があります';
    }
    return '';
}

/** tar.gz を展開する。Phar が使えない環境では tar コマンドに落とす。 */
function news_extract_tar_gz(string $archive, string $dest): string
{
    if (!@mkdir($dest, 0700, true)) {
        return '展開先を作れません: ' . $dest;
    }

    if (class_exists('PharData')) {
        try {
            $phar = new PharData($archive);
            $phar->extractTo($dest, null, true);
            return '';
        } catch (Throwable $e) {
            // PharData が使えないこともある。下の tar に任せる。
        }
    }

    if (function_exists('exec')) {
        $out = [];
        $code = 0;
        exec('tar -xzf ' . escapeshellarg($archive) . ' -C ' . escapeshellarg($dest) . ' 2>&1', $out, $code);
        if ($code === 0) {
            return '';
        }
        return '書庫を展開できません: ' . implode(' ', array_slice($out, 0, 3));
    }

    return '書庫を展開する手段がありません（PharData も tar も使えません）';
}

/** 展開した中から docs/ を探す。書庫の最上位は一段だけ深い。 */
function news_find_docs(string $root): ?string
{
    foreach ((array)@scandir($root) as $entry) {
        if ($entry === '.' || $entry === '..') {
            continue;
        }
        $docs = $root . '/' . $entry . '/docs';
        if (is_dir($docs)) {
            return $docs;
        }
    }
    return null;
}

function news_rmtree(string $path): void
{
    if (!file_exists($path)) {
        return;
    }
    if (!is_dir($path) || is_link($path)) {
        @unlink($path);
        return;
    }
    foreach ((array)@scandir($path) as $entry) {
        if ($entry !== '.' && $entry !== '..') {
            news_rmtree($path . '/' . $entry);
        }
    }
    @rmdir($path);
}
