-- =============================================================================
--  駐車場の空き状況 データベース定義
--
--  db/schema.sql（プラットフォーム本体）を実行したあとに実行してください。
--  社員アカウントは本体の users テーブルをそのまま使います。
--
--    php db/setup.php migrate
--
--  phpMyAdmin から実行する場合は、このファイルの内容を「SQL」タブに貼ります。
-- =============================================================================
--
--  決めたこと
--
--  1. 駐車の記録は「いまどこに停めているか」だけを持ちます。
--     1 人 1 行（user_id が主キー）。停め直すと上書き、出庫で行を消します。
--     履歴を積まないので、何年使っても表は社員の人数より大きくなりません。
--
--  2. 出庫の押し忘れは parked_on（日付）で吸収します。
--     画面には「今日の日付」の行だけを数えるので、翌日には自然に消えます。
--     古い行は、誰かが次に「ここに停めた」を押したときにまとめて削除します。
--
--  3. 駐車場は削除せず is_active = 0 にします。
--     消した駐車場に停めていた記録は、その場で一緒に消します。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 駐車場（A 土地・B 土地 …）。管理者が登録する
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parking_lots (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name         VARCHAR(30) NOT NULL,

    -- 区画の総数
    capacity     SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    -- 来客用・社用車など、記録しないが常に埋まっている台数
    fixed_count  SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    -- 「本社から徒歩2分」など、場所の補足
    memo         VARCHAR(60) NOT NULL DEFAULT '',

    sort_order   INT NOT NULL DEFAULT 0,
    is_active    TINYINT(1) NOT NULL DEFAULT 1,
    created_at   DATETIME NOT NULL,
    updated_at   DATETIME NOT NULL,

    PRIMARY KEY (id),
    KEY idx_parking_lots_active (is_active, sort_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- いま停めている場所。1 人 1 行
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parking_spots (
    user_id    INT UNSIGNED NOT NULL,
    lot_id     INT UNSIGNED NOT NULL,

    -- 日本時間の日付。この日のうちだけ有効
    parked_on  DATE NOT NULL,
    parked_at  DATETIME NOT NULL,

    PRIMARY KEY (user_id),
    KEY idx_parking_spots_day (parked_on, lot_id),
    CONSTRAINT fk_parking_spots_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_parking_spots_lot
        FOREIGN KEY (lot_id) REFERENCES parking_lots (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 「満車だった」の報告。駐車場ごとに最新の 1 件だけ持つ
--
-- 記録していない車（来客・業者）で埋まっていることがあるため、
-- 行ってみた人の報告を 60 分だけ優先して「満車」と表示する。
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parking_reports (
    lot_id       INT UNSIGNED NOT NULL,
    state        ENUM('full', 'clear') NOT NULL,
    reported_by  INT UNSIGNED NULL DEFAULT NULL,
    reported_at  DATETIME NOT NULL,

    PRIMARY KEY (lot_id),
    CONSTRAINT fk_parking_reports_lot
        FOREIGN KEY (lot_id) REFERENCES parking_lots (id) ON DELETE CASCADE,
    CONSTRAINT fk_parking_reports_user
        FOREIGN KEY (reported_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
