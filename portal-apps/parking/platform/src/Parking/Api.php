<?php

declare(strict_types=1);

namespace App\Parking;

use App\Database;
use App\Mileage\Input;
use App\Trpc\Server;
use App\Trpc\TrpcException;
use DateTimeImmutable;

/**
 * 駐車場の空き状況アプリの手続き。
 *
 *   parking.state     いまの空き状況（駐車場・今日の駐車・満車報告）
 *   parking.park      ここに停めた
 *   parking.leave     出庫した
 *   parking.report    満車だった / 空いていた
 *   parking.saveLot   駐車場の追加・変更（管理者）
 *   parking.deleteLot 駐車場の削除（管理者）
 *
 * 更新系はどれも、終わったあとの状態（parking.state と同じ形）を返す。
 * 画面はそれをそのまま描き直すので、押した直後に数字が変わる。
 *
 * 日時は画面にミリ秒の整数で渡す。画面は素の JavaScript で、
 * superjson の Date 注記を読まないため。
 */
final class Api
{
    /** 画面はこの文面と完全一致したときだけログイン画面へ飛ばす。訳さないこと */
    public const UNAUTHORIZED = 'Please login (10001)';

    /** 「満車だった」を有効にしておく分数。画面側の REPORT_MIN と合わせる */
    public const REPORT_MINUTES = 60;

    public static function server(): Server
    {
        // 画面は入力を {"json": …} で包んで送る。応答も包んで返すよう固定する。
        // 入力の無い手続き（parking.state）は判定材料が無いため。
        $server = new Server(true);

        $server->query('parking.state', static fn ($input, array $user): array => self::state($user));

        $server->mutation('parking.park', static function ($input, array $user): array {
            $in = Input::object($input);
            $lot = self::activeLot(Input::int($in, 'lotId', 1));
            $today = self::today();

            // 前日以前の押し忘れをまとめて片付ける。表を社員の人数より大きくしないため
            Database::run('DELETE FROM parking_spots WHERE parked_on < ?', [$today]);

            Database::run(
                'INSERT INTO parking_spots (user_id, lot_id, parked_on, parked_at)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE lot_id = VALUES(lot_id), parked_on = VALUES(parked_on),
                                         parked_at = VALUES(parked_at)',
                [(int) $user['id'], (int) $lot['id'], $today, self::now()]
            );

            return self::state($user);
        });

        $server->mutation('parking.leave', static function ($input, array $user): array {
            Database::run('DELETE FROM parking_spots WHERE user_id = ?', [(int) $user['id']]);

            return self::state($user);
        });

        $server->mutation('parking.report', static function ($input, array $user): array {
            $in = Input::object($input);
            $lot = self::activeLot(Input::int($in, 'lotId', 1));
            $state = Input::choice($in, 'state', ['full', 'clear']);

            Database::run(
                'INSERT INTO parking_reports (lot_id, state, reported_by, reported_at)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE state = VALUES(state), reported_by = VALUES(reported_by),
                                         reported_at = VALUES(reported_at)',
                [(int) $lot['id'], $state, (int) $user['id'], self::now()]
            );

            return self::state($user);
        });

        $server->mutation('parking.saveLot', static function ($input, array $user): array {
            self::requireAdmin($user);
            $in = Input::object($input);

            $id = Input::optionalInt($in, 'id');
            $capacity = Input::int($in, 'capacity', 0, 999);
            $fixed = Input::int($in, 'fixed', 0, 999);

            if ($fixed > $capacity) {
                throw TrpcException::badRequest('固定の台数が、駐車場の台数より多くなっています。');
            }

            $values = [
                Input::text($in, 'name', 30),
                $capacity,
                $fixed,
                Input::text($in, 'memo', 60, false),
                Input::int($in, 'order', -9999, 9999),
            ];

            if ($id === null) {
                Database::run(
                    'INSERT INTO parking_lots (name, capacity, fixed_count, memo, sort_order, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [...$values, self::now(), self::now()]
                );
            } else {
                self::activeLot($id);
                Database::run(
                    'UPDATE parking_lots SET name = ?, capacity = ?, fixed_count = ?, memo = ?, sort_order = ?,
                            updated_at = ?
                     WHERE id = ?',
                    [...$values, self::now(), $id]
                );
            }

            return self::state($user);
        });

        $server->mutation('parking.deleteLot', static function ($input, array $user): array {
            self::requireAdmin($user);
            $in = Input::object($input);
            $lot = self::activeLot(Input::int($in, 'id', 1));

            Database::run(
                'UPDATE parking_lots SET is_active = 0, updated_at = ? WHERE id = ?',
                [self::now(), (int) $lot['id']]
            );
            // 消した駐車場に停めていることになっている人を残さない
            Database::run('DELETE FROM parking_spots WHERE lot_id = ?', [(int) $lot['id']]);

            return self::state($user);
        });

        return $server;
    }

    /**
     * 画面に渡す、いまの状態。
     *
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    public static function state(array $user): array
    {
        $lots = array_map(
            static fn (array $r): array => [
                'id' => (int) $r['id'],
                'name' => (string) $r['name'],
                'capacity' => (int) $r['capacity'],
                'fixed' => (int) $r['fixed_count'],
                'memo' => (string) $r['memo'],
                'order' => (int) $r['sort_order'],
            ],
            Database::all('SELECT * FROM parking_lots WHERE is_active = 1 ORDER BY sort_order, id')
        );

        // 今日の分だけ数える。昨日の押し忘れはここで自然に消える。
        // 利用停止にした社員の分も数えない（その人はもう停めに来ない）
        $parked = array_map(
            static fn (array $r): array => [
                'userId' => (int) $r['user_id'],
                'name' => (string) $r['name'],
                'lotId' => (int) $r['lot_id'],
                'parkedAt' => self::millis((string) $r['parked_at']),
            ],
            Database::all(
                "SELECT s.user_id, s.lot_id, s.parked_at, u.name
                 FROM parking_spots s
                 JOIN users u ON u.id = s.user_id AND u.status = 'active'
                 JOIN parking_lots l ON l.id = s.lot_id AND l.is_active = 1
                 WHERE s.parked_on = ?
                 ORDER BY s.parked_at",
                [self::today()]
            )
        );

        $since = (new DateTimeImmutable('-' . self::REPORT_MINUTES . ' minutes'))->format('Y-m-d H:i:s');
        $reports = array_map(
            static fn (array $r): array => [
                'lotId' => (int) $r['lot_id'],
                'state' => (string) $r['state'],
                'at' => self::millis((string) $r['reported_at']),
            ],
            Database::all('SELECT lot_id, state, reported_at FROM parking_reports WHERE reported_at >= ?', [$since])
        );

        return [
            'me' => [
                'id' => (int) $user['id'],
                'name' => (string) $user['name'],
                'isAdmin' => ($user['role'] ?? '') === 'admin',
            ],
            'now' => (int) round(microtime(true) * 1000),
            'lots' => $lots,
            'parked' => $parked,
            'reports' => $reports,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function activeLot(int $id): array
    {
        $lot = Database::one('SELECT * FROM parking_lots WHERE id = ? AND is_active = 1', [$id]);

        if ($lot === null) {
            throw TrpcException::notFound('駐車場が見つかりません。画面を開き直してください。');
        }

        return $lot;
    }

    /**
     * @param array<string, mixed> $user
     */
    private static function requireAdmin(array $user): void
    {
        if (($user['role'] ?? '') !== 'admin') {
            throw TrpcException::forbidden('駐車場の設定は管理者だけが変更できます。');
        }
    }

    /**
     * 日時は PHP 側で作って渡す。MySQL の NOW() はサーバーの設定次第で
     * UTC になることがあり、日付の境目が 9 時間ずれる。
     * タイムゾーンは bootstrap.php で Asia/Tokyo に固定されている。
     */
    private static function now(): string
    {
        return date('Y-m-d H:i:s');
    }

    private static function today(): string
    {
        return date('Y-m-d');
    }

    private static function millis(string $datetime): int
    {
        return (new DateTimeImmutable($datetime))->getTimestamp() * 1000;
    }
}
