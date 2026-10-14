<?php

declare(strict_types=1);

/**
 * すべてのリクエストの入口（フロントコントローラ）。
 * .htaccess により、実ファイルが存在しない URL はすべてここに流れてくる。
 */

use App\Controllers\Admin\AppController as AdminAppController;
use App\Controllers\Admin\AuditController;
use App\Controllers\Admin\DocumentController as AdminDocumentController;
use App\Controllers\Admin\UserController;
use App\Controllers\AppServeController;
use App\Controllers\AuthController;
use App\Controllers\DashboardController;
use App\Controllers\DocumentController;
use App\Controllers\MileageController;
use App\Controllers\ParkingController;
use App\Request;
use App\Router;

require dirname(__DIR__) . '/src/bootstrap.php';

$path = Request::path();
$isAppDelivery = str_starts_with($path, '/apps/');

// --- 共通のセキュリティヘッダ ---------------------------------------------
header_remove('X-Powered-By');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('X-Frame-Options: SAMEORIGIN');
header('Permissions-Policy: geolocation=(), microphone=(), camera=()');

if (Request::isHttps()) {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}

if ($isAppDelivery) {
    // 取り込んだ既存アプリはインラインの script / style を使っていることが多いので、
    // ここだけ制限を緩める。ただし外部への接続と外部からの読み込みは自サイト内に限定する。
    header(
        "Content-Security-Policy: default-src 'self' data: blob:; "
        . "script-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; "
        . "style-src 'self' 'unsafe-inline'; "
        . "img-src 'self' data: blob:; "
        . "font-src 'self' data:; "
        . "connect-src 'self'; "
        . "frame-ancestors 'self'; "
        . "base-uri 'self'; "
        . "form-action 'self'"
    );
} else {
    // プラットフォーム自身の画面は外部リソースを一切読み込まない
    header(
        "Content-Security-Policy: default-src 'none'; "
        . "script-src 'self'; "
        . "style-src 'self'; "
        . "img-src 'self' data:; "
        . "font-src 'self'; "
        . "connect-src 'self'; "
        . "frame-ancestors 'none'; "
        . "base-uri 'none'; "
        . "form-action 'self'"
    );
}

// --- ルーティング ----------------------------------------------------------
$router = new Router();

$auth = new AuthController();
$dashboard = new DashboardController();
$appServe = new AppServeController();
$adminUsers = new UserController();
$adminApps = new AdminAppController();
$adminAudit = new AuditController();
$mileage = new MileageController();
$parking = new ParkingController();
$documents = new DocumentController();
$adminDocuments = new AdminDocumentController();

// 認証
$router->get('/login', static fn () => $auth->showLogin());
$router->post('/login', static fn () => $auth->login());
$router->post('/logout', static fn () => $auth->logout());

$router->get('/password/change', static fn () => $auth->showChangePassword());
$router->post('/password/change', static fn () => $auth->changePassword());
$router->get('/password/forgot', static fn () => $auth->showForgotPassword());
$router->post('/password/forgot', static fn () => $auth->forgotPassword());
$router->get('/password/reset', static fn () => $auth->showResetPassword());
$router->post('/password/reset', static fn () => $auth->resetPassword());

// ログイン後の画面
$router->get('/', static fn () => $dashboard->index());
$router->get('/profile', static fn () => $dashboard->profile());

// 書類棚（本棚）。会社の様式をダウンロードする画面。
$router->get('/documents', static fn () => $documents->index());
$router->get('/documents/{id}', static fn (array $p) => $documents->show($p));
$router->get('/documents/{id}/download', static fn (array $p) => $documents->download($p));

// 走行距離申告アプリの通信。
// 下の「アプリの配信」より先に書くこと。順に照合して最初に当たったものを使うため、
// 逆に書くとファイル配信の側が拾ってしまい、404 が返る。
$router->get('/apps/mileage/api/trpc/{path*}', static fn (array $p) => $mileage->trpc($p));
$router->post('/apps/mileage/api/trpc/{path*}', static fn (array $p) => $mileage->trpc($p));

// 駐車場の空き状況アプリの通信。走行距離と同じく、アプリの配信より先に書くこと
$router->get('/apps/parking/api/trpc/{path*}', static fn (array $p) => $parking->trpc($p));
$router->post('/apps/parking/api/trpc/{path*}', static fn (array $p) => $parking->trpc($p));

// 社内アプリの配信（/apps/{slug} と /apps/{slug}/以下すべて）
$router->get('/apps/{slug}', static fn (array $p) => $appServe->serve($p + ['path' => '']));
$router->get('/apps/{slug}/{path*}', static fn (array $p) => $appServe->serve($p));

// 管理画面
$router->get('/admin/users', static fn () => $adminUsers->index());
$router->get('/admin/users/new', static fn () => $adminUsers->showCreate());
$router->post('/admin/users', static fn () => $adminUsers->create());
$router->get('/admin/users/{id}/created', static fn (array $p) => $adminUsers->showCreated($p));
$router->get('/admin/users/{id}/edit', static fn (array $p) => $adminUsers->showEdit($p));
$router->post('/admin/users/{id}', static fn (array $p) => $adminUsers->update($p));
$router->post('/admin/users/{id}/status', static fn (array $p) => $adminUsers->setStatus($p));
$router->get('/admin/users/{id}/password', static fn (array $p) => $adminUsers->showPassword($p));
$router->post('/admin/users/{id}/password', static fn (array $p) => $adminUsers->updatePassword($p));

// 書類棚の管理。ファイルはこの画面から直接アップロードする
$router->get('/admin/documents', static fn () => $adminDocuments->index());
$router->get('/admin/documents/new', static fn () => $adminDocuments->showCreate());
$router->post('/admin/documents', static fn () => $adminDocuments->create());
// 棚の操作は {id} より先に書くこと。
// 順に照合して最初に当たったものを使うため、逆にすると
// /admin/documents/shelves が「id が shelves の書類」として扱われ、404 になる。
$router->post('/admin/documents/shelves', static fn () => $adminDocuments->createShelf());
$router->post('/admin/documents/shelves/{id}', static fn (array $p) => $adminDocuments->updateShelf($p));
$router->post('/admin/documents/shelves/{id}/delete', static fn (array $p) => $adminDocuments->deleteShelf($p));

$router->get('/admin/documents/{id}/edit', static fn (array $p) => $adminDocuments->showEdit($p));
$router->post('/admin/documents/{id}', static fn (array $p) => $adminDocuments->update($p));
$router->post('/admin/documents/{id}/delete', static fn (array $p) => $adminDocuments->delete($p));

$router->get('/admin/apps', static fn () => $adminApps->index());
$router->get('/admin/apps/new', static fn () => $adminApps->showCreate());
$router->post('/admin/apps', static fn () => $adminApps->create());
$router->get('/admin/apps/{id}/edit', static fn (array $p) => $adminApps->showEdit($p));
$router->post('/admin/apps/{id}', static fn (array $p) => $adminApps->update($p));
$router->post('/admin/apps/{id}/delete', static fn (array $p) => $adminApps->delete($p));

$router->get('/admin/audit', static fn () => $adminAudit->index());

$router->dispatch(Request::method(), $path);
