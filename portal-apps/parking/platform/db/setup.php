<?php

declare(strict_types=1);

/**
 * 初期セットアップ用のコマンドラインスクリプト。
 *
 * ブラウザからは実行できないようにしてあります（設置用の管理者作成ページを
 * Web に置くと、消し忘れたときにそのまま乗っ取りの入口になるため）。
 *
 * さくらのレンタルサーバに SSH でログインして実行してください:
 *
 *   cd ~/www/platform
 *   php db/setup.php check                       … 設定と接続の確認
 *   php db/setup.php migrate                     … テーブルの作成
 *   php db/setup.php check-map                   … 距離の自動計算の確認
 *   php db/setup.php mileage-status <メール>     … 走行距離アプリの状態を見る
 *   php db/setup.php create-admin you@example.co.jp "山田 太郎"
 *
 * SSH が使えない契約の場合は、テーブル作成は phpMyAdmin から db/schema.sql を
 * 実行し、最初の管理者だけ docs/02-deploy.md の手順で作成してください。
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit("このスクリプトはコマンドラインからのみ実行できます。\n");
}

require dirname(__DIR__) . '/src/bootstrap.php';

use App\Config;
use App\Database;
use App\Models\User;
use App\PasswordPolicy;

$command = $argv[1] ?? '';

/**
 * @param array<int, string> $lines
 */
function out(array $lines): void
{
    echo implode(PHP_EOL, $lines) . PHP_EOL;
}

switch ($command) {
    case 'check':
        out(['== 設定の確認 ==']);
        out([
            '  サイト名   : ' . Config::get('app.name'),
            '  URL        : ' . Config::get('app.url'),
            '  環境       : ' . Config::get('app.env'),
            '  DB ホスト  : ' . Config::get('db.host'),
            '  DB 名      : ' . Config::get('db.name'),
            '  許可ドメイン: ' . implode(', ', (array) Config::get('security.allowed_email_domains', [])),
            '',
        ]);

        $storage = (string) Config::get('paths.storage');
        $documents = (string) Config::get('paths.documents', APP_ROOT . '/documents');

        foreach ([$storage . '/sessions', $storage . '/logs', $documents] as $dir) {
            if (!is_dir($dir)) {
                @mkdir($dir, 0700, true);
            }
            $state = is_dir($dir) && is_writable($dir) ? 'OK' : '書き込みできません';
            out(['  ' . $dir . ' … ' . $state]);
        }

        out(['', '== データベース接続の確認 ==']);
        try {
            Database::pdo();
            out(['  接続 OK']);

            $tables = [
                'users', 'login_attempts', 'password_resets', 'apps', 'audit_logs',
                'mileage_locations', 'mileage_daily_records', 'mileage_segments',
                'mileage_templates', 'mileage_applications', 'mileage_settings',
                'mileage_route_cache',
                'document_shelves', 'documents',
            ];
            foreach ($tables as $table) {
                $exists = Database::one(
                    'SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
                    [Config::get('db.name'), $table]
                );
                out(['  テーブル ' . $table . ' … ' . (((int) ($exists['c'] ?? 0)) > 0 ? 'あり' : '未作成')]);
            }
        } catch (Throwable $e) {
            out(['  接続に失敗しました: ' . $e->getMessage()]);
            exit(1);
        }

        break;

    case 'migrate':
        $sql = file_get_contents(__DIR__ . '/schema.sql');
        if ($sql === false) {
            out(['db/schema.sql を読み込めませんでした。']);
            exit(1);
        }

        Database::pdo()->exec($sql);
        out(['テーブルを作成しました（すでにあるテーブルはそのままです）。']);

        // 走行距離申告アプリのテーブル。
        // users を参照する外部キーがあるため、必ず schema.sql のあとに実行する。
        $mileageSql = file_get_contents(__DIR__ . '/mileage.sql');
        if ($mileageSql === false) {
            out(['db/mileage.sql を読み込めませんでした。']);
            exit(1);
        }

        Database::pdo()->exec($mileageSql);
        out(['走行距離申告アプリのテーブルを作成しました。']);

        // ---- 既存のテーブルに対する変更（書類棚より先に当てる） ----------------
        // CREATE TABLE IF NOT EXISTS では既存テーブルの列は変わらないため、
        // 必要な変更をここで個別に当てる。何度実行しても安全な書き方にしている。
        //
        // apps.type の拡張は documents.sql より先に行うこと。
        // 書類棚は自分自身を type='builtin' のアプリとして登録するので、
        // 順番が逆だと、その値を受け付けられずに登録が落ちる。
        $dbName = (string) Config::get('db.name');

        $column = Database::one(
            'SELECT COLUMN_TYPE FROM information_schema.columns
             WHERE table_schema = ? AND table_name = ? AND column_name = ?',
            [$dbName, 'apps', 'type']
        );

        if ($column !== null && !str_contains((string) $column['COLUMN_TYPE'], 'builtin')) {
            Database::pdo()->exec(
                "ALTER TABLE apps
                 MODIFY type ENUM('internal', 'download', 'external', 'builtin')
                 NOT NULL DEFAULT 'internal'"
            );
            out(['  apps.type に「download」「builtin」を追加しました。']);
        }

        // 書類棚。users を参照する外部キーがあるため schema.sql のあとに実行する
        $documentsSql = file_get_contents(__DIR__ . '/documents.sql');
        if ($documentsSql === false) {
            out(['db/documents.sql を読み込めませんでした。']);
            exit(1);
        }

        Database::pdo()->exec($documentsSql);
        out(['書類棚のテーブルを作成しました。']);

        // 駐車場の空き状況。users を参照する外部キーがあるため schema.sql のあとに実行する
        $parkingSql = file_get_contents(__DIR__ . '/parking.sql');
        if ($parkingSql === false) {
            out(['db/parking.sql を読み込めませんでした。']);
            exit(1);
        }

        Database::pdo()->exec($parkingSql);
        out(['駐車場の空き状況のテーブルを作成しました。']);

        // 部署。走行距離申告アプリの交通費一覧で使う
        $department = Database::one(
            'SELECT COLUMN_NAME FROM information_schema.columns
             WHERE table_schema = ? AND table_name = ? AND column_name = ?',
            [$dbName, 'users', 'department']
        );

        if ($department === null) {
            Database::pdo()->exec(
                'ALTER TABLE users ADD COLUMN department VARCHAR(128) NULL DEFAULT NULL
                 AFTER must_change_password'
            );
            out(['  users に「department」（部署）を追加しました。']);
        }

        out(['変更の適用が完了しました。']);

        break;

    case 'mileage-status':
        $email = $argv[2] ?? '';

        if ($email === '') {
            out([
                '使い方: php db/setup.php mileage-status <メールアドレス>',
                '例    : php db/setup.php mileage-status tsukasa@nhct.info',
            ]);
            exit(1);
        }

        $user = Database::one('SELECT id, name, email FROM users WHERE email = ?', [$email]);

        if ($user === null) {
            out(['その社員は見つかりません: ' . $email]);
            exit(1);
        }

        out(['== ' . $user['name'] . ' さん（' . $user['email'] . '）==', '']);

        $settings = App\Mileage\Settings::forClient();
        out([
            '締め日の設定 : ' . $settings['periodStartDay'] . ' 日 〜 ' . $settings['periodEndDay'] . ' 日',
            '燃費 / 単価  : ' . $settings['fuelEfficiency'] . ' km/L / ' . $settings['gasolinePrice'] . ' 円/L',
            '',
            '== 月次申請 ==',
        ]);

        $applications = Database::all(
            'SELECT periodYear, periodMonth, status, totalDistance, submittedAt
             FROM mileage_applications WHERE userId = ?
             ORDER BY periodYear DESC, periodMonth DESC',
            [(int) $user['id']]
        );

        if ($applications === []) {
            out(['  申請はまだありません（＝どの期間も編集できます）']);
        } else {
            foreach ($applications as $row) {
                $locked = in_array($row['status'], ['submitted', 'approved'], true);

                out([sprintf(
                    '  %d年%2d月分 … %-10s %6s km %s',
                    (int) $row['periodYear'],
                    (int) $row['periodMonth'],
                    match ($row['status']) {
                        'draft' => '下書き',
                        'submitted' => '申請済み',
                        'approved' => '承認済み',
                        'rejected' => '差戻し',
                        default => (string) $row['status'],
                    },
                    (string) $row['totalDistance'],
                    $locked ? '★ この期間は編集・削除ができません' : ''
                )]);
            }
        }

        out(['', '== 日次記録の件数 ==']);

        $records = Database::all(
            'SELECT recordDate, totalDistance FROM mileage_daily_records
             WHERE userId = ? ORDER BY recordDate DESC LIMIT 20',
            [(int) $user['id']]
        );

        if ($records === []) {
            out(['  まだありません']);
        } else {
            foreach ($records as $row) {
                $period = App\Mileage\Period::monthFor(
                    (string) $row['recordDate'],
                    $settings['periodStartDay'],
                    $settings['periodEndDay']
                );

                out([sprintf(
                    '  %s  %6s km  → %s',
                    (string) $row['recordDate'],
                    (string) $row['totalDistance'],
                    $period === null
                        ? '★ どの締め月にも入りません'
                        : sprintf('%d年%d月分', $period[0], $period[1])
                )]);
            }

            out(['  （新しい順に 20 件まで）']);
        }

        out(['', '== 直近のエラー ==']);

        $logFile = rtrim((string) Config::get('paths.storage'), '/') . '/logs/' . date('Y-m-d') . '.log';

        if (!is_file($logFile)) {
            out(['  本日のログはありません（＝サーバー側でエラーは起きていません）']);
        } else {
            $lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
            $lines = array_slice($lines, -15);

            if ($lines === []) {
                out(['  記録はありません']);
            } else {
                foreach ($lines as $line) {
                    out(['  ' . $line]);
                }
            }
        }

        break;

    case 'check-map':
        out(['== 距離の自動計算の確認 ==']);

        $apiKey = (string) Config::get('map.google_api_key', '');

        if ($apiKey === '') {
            out([
                '  鍵 … 設定されていません',
                '',
                'config/config.php に次を追加してください（\'paths\' の直前）。',
                '',
                "    'map' => [",
                "        'google_api_key' => 'ここに鍵',",
                '    ],',
            ]);
            exit(1);
        }

        // 鍵そのものは出さない。長さと先頭だけで、貼り間違いは十分見分けられる
        out([
            '  鍵 … 設定されています（' . substr($apiKey, 0, 6) . '… / ' . strlen($apiKey) . ' 文字）',
        ]);

        if (!str_starts_with($apiKey, 'AIza')) {
            out(['  ※ Google の鍵は通常 AIza で始まります。貼り間違いかもしれません。']);
        }

        $origin = $argv[2] ?? '福岡県福岡市中央区西中洲1-2-13';
        $destination = $argv[3] ?? '福岡県福岡市西区羽根戸';

        out(['', '== 実際に問い合わせます ==', '  出発 : ' . $origin, '  到着 : ' . $destination, '']);

        $result = App\Mileage\Distance::between($origin, $destination);

        if (($result['success'] ?? false) === true) {
            out([
                '  結果 … 成功',
                '  距離 : ' . $result['distanceKm'] . ' km',
                '  時間 : ' . $result['durationText'],
                '',
                '設定は正しく動いています。',
            ]);
        } else {
            out([
                '  結果 … 失敗',
                '  内容 : ' . ($result['error'] ?? '不明'),
                '',
                '詳しい原因は storage/logs/ の当日のファイルに残っています。',
            ]);
        }

        $today = Database::one(
            'SELECT COUNT(*) AS c FROM mileage_route_cache WHERE updatedAt >= CURDATE()'
        );

        out(['', '本日の問い合わせ回数 : ' . (int) ($today['c'] ?? 0) . ' / 500']);

        break;

    case 'create-admin':
        $email = $argv[2] ?? '';
        $name = $argv[3] ?? '';

        if ($email === '' || $name === '') {
            out([
                '使い方: php db/setup.php create-admin <メールアドレス> "<氏名>"',
                '例    : php db/setup.php create-admin admin@example.co.jp "山田 太郎"',
            ]);
            exit(1);
        }

        $errors = User::validateEmail($email);
        if ($errors !== []) {
            out(array_map(static fn (string $m): string => '  ' . $m, $errors));
            exit(1);
        }

        $password = PasswordPolicy::generate(20);
        $created = User::create($email, $name, 'admin', $password);

        out([
            '',
            '管理者アカウントを作成しました。',
            '',
            '  ログイン ID    : ' . $email,
            '  初期パスワード : ' . $password,
            '',
            '  ログイン URL   : ' . rtrim((string) Config::get('app.url'), '/') . '/login',
            '',
            '初回ログイン時にパスワードの変更を求められます。',
            'この表示は一度きりです。今すぐ控えてください。',
            '',
        ]);

        break;

    default:
        out([
            '使い方:',
            '  php db/setup.php check',
            '      設定ファイル・書き込み権限・DB 接続・テーブルの有無を確認します。',
            '',
            '  php db/setup.php migrate',
            '      db/schema.sql・db/mileage.sql・db/documents.sql・db/parking.sql を実行します。',
            '',
            '  php db/setup.php check-map [出発の住所] [到着の住所]',
            '      距離の自動計算（Google Maps）の設定を確かめます。',
            '',
            '  php db/setup.php mileage-status <メールアドレス>',
            '      走行距離アプリの申請状態・記録・エラーを表示します。',
            '',
            '  php db/setup.php create-admin <メールアドレス> "<氏名>"',
            '      最初の管理者アカウントを作成します。',
            '',
        ]);
        exit($command === '' ? 0 : 1);
}
