<?php
// ログイン状態の管理と、共通で使う小物。

declare(strict_types=1);

if (!defined('NEWS_APP')) {
    http_response_code(404);
    exit;
}

function news_config(): array
{
    static $config = null;
    if ($config === null) {
        $config = require __DIR__ . '/config.php';
    }
    return $config;
}

/** 書き込み用のディレクトリを用意する */
function news_state_dir(): string
{
    $dir = news_config()['state_dir'];
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    return $dir;
}

function news_state_path(string $name): string
{
    return news_state_dir() . '/' . preg_replace('/[^a-z0-9._-]/i', '', $name);
}

/** このアプリが置かれている URL の基準（例: /news） */
function news_base_url(): string
{
    $dir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/'));
    // api/ や archive/ の下から呼ばれても、アプリの根に揃える
    $dir = preg_replace('#/(api|archive)$#', '', $dir);
    return $dir === '/' ? '' : rtrim($dir, '/');
}

function news_start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => news_base_url() . '/',
        'httponly' => true,   // JavaScript から読ませない
        'secure' => $secure,  // HTTPS のときだけ送る
        'samesite' => 'Lax',
    ]);
    session_name('newsid');
    session_start();
}

function news_is_logged_in(): bool
{
    news_start_session();
    return !empty($_SESSION['user']);
}

/** 未ログインならログイン画面へ送る */
function news_require_login(): void
{
    if (news_is_logged_in()) {
        return;
    }
    $back = $_SERVER['REQUEST_URI'] ?? '';
    header('Location: ' . news_base_url() . '/login.php?next=' . urlencode($back));
    exit;
}

function news_csrf_token(): string
{
    news_start_session();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function news_check_csrf(string $token): bool
{
    news_start_session();
    return !empty($_SESSION['csrf']) && hash_equals($_SESSION['csrf'], $token);
}

/**
 * ログイン試行の記録。総当たりを遅くする。
 * 利用者は数人なので、ファイル1つで足りる。
 */
function news_login_attempts(): array
{
    $path = news_state_path('login-attempts.json');
    $raw = @file_get_contents($path);
    $data = $raw ? json_decode($raw, true) : null;
    return is_array($data) ? $data : [];
}

function news_login_key(): string
{
    return hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown');
}

function news_login_locked_until(): int
{
    $config = news_config()['login'];
    $entry = news_login_attempts()[news_login_key()] ?? null;
    if (!$entry) {
        return 0;
    }
    if (($entry['count'] ?? 0) < $config['max_attempts']) {
        return 0;
    }
    $until = ($entry['last'] ?? 0) + $config['lockout'];
    return $until > time() ? $until : 0;
}

function news_record_login_failure(): void
{
    $config = news_config()['login'];
    $all = news_login_attempts();
    $key = news_login_key();
    $now = time();

    // 古い記録を捨てる
    foreach ($all as $k => $entry) {
        if (($entry['last'] ?? 0) + $config['lockout'] < $now) {
            unset($all[$k]);
        }
    }

    $entry = $all[$key] ?? ['count' => 0, 'first' => $now];
    if ($entry['first'] + $config['window'] < $now) {
        $entry = ['count' => 0, 'first' => $now];
    }
    $entry['count']++;
    $entry['last'] = $now;
    $all[$key] = $entry;

    @file_put_contents(news_state_path('login-attempts.json'), json_encode($all), LOCK_EX);
}

function news_clear_login_failures(): void
{
    $all = news_login_attempts();
    unset($all[news_login_key()]);
    @file_put_contents(news_state_path('login-attempts.json'), json_encode($all), LOCK_EX);
}

/** IDとパスワードを照合する。合っていれば true。 */
function news_verify(string $user, string $password): bool
{
    $users = require __DIR__ . '/users.php';
    $hash = $users[$user] ?? null;

    if ($hash === null) {
        // 利用者がいない場合でも同じくらい時間をかけ、
        // 応答の速さでIDの有無を推測されないようにする
        password_verify($password, '$2y$12$'.str_repeat('.', 53));
        return false;
    }
    return password_verify($password, $hash);
}

function news_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}
