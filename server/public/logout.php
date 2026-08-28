<?php
declare(strict_types=1);
define('NEWS_APP', true);
require __DIR__ . '/lib/auth.php';

news_start_session();
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', (bool)$params['secure'], true);
}
session_destroy();

header('Location: ' . news_base_url() . '/login.php');
exit;
