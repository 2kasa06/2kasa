<?php
// GitHub API への問い合わせ。トークンはここから外に出さない。

declare(strict_types=1);

if (!defined('NEWS_APP')) {
    http_response_code(404);
    exit;
}

/**
 * @return array{ok: bool, status: int, body: array|null, error: string}
 */
function news_github(string $method, string $path, ?array $payload = null): array
{
    $config = news_config()['github'];
    if (($config['token'] ?? '') === '') {
        return ['ok' => false, 'status' => 0, 'body' => null, 'error' => 'トークンが設定されていません'];
    }

    $ch = curl_init('https://api.github.com' . $path);
    $headers = [
        'Accept: application/vnd.github+json',
        'Authorization: Bearer ' . $config['token'],
        'X-GitHub-Api-Version: 2022-11-28',
        'User-Agent: boueishisetsu-watch',
    ];
    if ($payload !== null) {
        $headers[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    }
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_CONNECTTIMEOUT => 8,
    ]);

    $raw = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($raw === false) {
        return ['ok' => false, 'status' => 0, 'body' => null, 'error' => $error ?: '通信に失敗しました'];
    }

    $body = json_decode((string)$raw, true);
    return [
        'ok' => $status >= 200 && $status < 300,
        'status' => $status,
        'body' => is_array($body) ? $body : null,
        'error' => '',
    ];
}

function news_github_repo(): string
{
    $config = news_config()['github'];
    return '/repos/' . rawurlencode($config['owner']) . '/' . rawurlencode($config['repo']);
}
