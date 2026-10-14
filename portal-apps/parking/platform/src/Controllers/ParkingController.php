<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Models\AppEntry;
use App\Parking\Api;
use App\Request;
use App\Trpc\TrpcException;

/**
 * 駐車場の空き状況アプリの通信の入口。
 *
 *   /apps/parking/api/trpc/<手続き名>
 *
 * 画面は apps/parking/ に置いた静的ファイル。データの保存だけをここで受ける。
 * 形式は走行距離申告アプリと同じ tRPC 互換（App\Trpc\Server）。
 */
final class ParkingController
{
    private const SLUG = 'parking';

    /**
     * @param array<string, string> $params
     */
    public function trpc(array $params): void
    {
        $server = Api::server();
        $procedurePath = trim($params['path'] ?? '', '/');

        $user = Auth::userOrNull();

        // 画面はこの文面を見てログイン画面へ飛ばす。訳さないこと
        if ($user === null || ($user['status'] ?? '') !== 'active') {
            $server->reject(TrpcException::unauthorized(Api::UNAUTHORIZED), $procedurePath);

            return;
        }

        // 画面の配信（AppServeController）と同じ条件で通信も閉じる。
        // ここを見ないと、「管理者のみ」で試している間も、
        // 一般社員が URL を直接叩けば記録できてしまう。
        $app = AppEntry::findBySlug(self::SLUG);
        $isAdmin = ($user['role'] ?? '') === 'admin';
        $open = $app !== null
            && $app['status'] === 'published'
            && ($app['visibility'] !== 'admin' || $isAdmin);

        if (!$open && !$isAdmin) {
            $server->reject(TrpcException::forbidden('このアプリを利用する権限がありません。'), $procedurePath);

            return;
        }

        $server->handle(Request::method(), $procedurePath, $user);
    }
}
