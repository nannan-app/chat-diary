use rusqlite::Connection;
use crate::error::MurmurError;

const CURRENT_VERSION: i32 = 1;

pub fn run_migrations(conn: &Connection) -> Result<(), MurmurError> {
    conn.execute_batch("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))")?;

    let version: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if version < 1 {
        migrate_v1(conn)?;
    }

    Ok(())
}

fn migrate_v1(conn: &Connection) -> Result<(), MurmurError> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS key_store (
            id                      INTEGER PRIMARY KEY CHECK (id = 1),
            master_key_by_password  BLOB NOT NULL,
            master_key_by_recovery  BLOB NOT NULL,
            password_salt           BLOB NOT NULL,
            recovery_salt           BLOB NOT NULL,
            password_nonce          BLOB NOT NULL,
            recovery_nonce          BLOB NOT NULL,
            password_hint           TEXT,
            created_at              TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS diary_days (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            date        TEXT NOT NULL UNIQUE,
            summary     TEXT,
            word_count  INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_diary_days_date ON diary_days(date);

        CREATE TABLE IF NOT EXISTS images (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            diary_day_id    INTEGER NOT NULL REFERENCES diary_days(id) ON DELETE CASCADE,
            file_hash       TEXT NOT NULL UNIQUE,
            thumbnail       BLOB NOT NULL,
            original_width  INTEGER,
            original_height INTEGER,
            file_size       INTEGER,
            mime_type       TEXT NOT NULL DEFAULT 'image/jpeg',
            created_at      TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS articles (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            diary_day_id    INTEGER NOT NULL REFERENCES diary_days(id) ON DELETE CASCADE,
            title           TEXT NOT NULL,
            content         TEXT NOT NULL,
            word_count      INTEGER NOT NULL DEFAULT 0,
            created_at      TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS messages (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            diary_day_id    INTEGER NOT NULL REFERENCES diary_days(id) ON DELETE CASCADE,
            kind            TEXT NOT NULL CHECK (kind IN (
                                'text', 'image', 'mood', 'ai_reply',
                                'article', 'tag_change', 'system'
                            )),
            content         TEXT,
            image_id        INTEGER REFERENCES images(id),
            article_id      INTEGER REFERENCES articles(id),
            mood            TEXT,
            quote_ref_id    INTEGER REFERENCES messages(id),
            source          TEXT DEFAULT 'app' CHECK (source IN ('app', 'telegram', 'wechat', 'quick_capture')),
            sort_order      INTEGER NOT NULL,
            created_at      TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_messages_day ON messages(diary_day_id, sort_order);

        CREATE TABLE IF NOT EXISTS tags (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL UNIQUE,
            color       TEXT NOT NULL,
            is_system   INTEGER NOT NULL DEFAULT 0,
            sort_order  INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS diary_day_tags (
            diary_day_id    INTEGER NOT NULL REFERENCES diary_days(id) ON DELETE CASCADE,
            tag_id          INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY (diary_day_id, tag_id)
        );

        CREATE TABLE IF NOT EXISTS favorites (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id      INTEGER REFERENCES messages(id) ON DELETE SET NULL,
            article_id      INTEGER REFERENCES articles(id) ON DELETE SET NULL,
            content_preview TEXT,
            source_date     TEXT NOT NULL,
            created_at      TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS achievements (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            key         TEXT NOT NULL UNIQUE,
            unlocked_at TEXT
        );

        CREATE TABLE IF NOT EXISTS settings (
            key     TEXT PRIMARY KEY,
            value   TEXT NOT NULL
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
            content,
            content='messages',
            content_rowid='id'
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
            title,
            content,
            content='articles',
            content_rowid='id'
        );

        INSERT INTO schema_version (version) VALUES (1);
        ",
    )?;

    // Insert system tags
    conn.execute_batch(
        "
        INSERT OR IGNORE INTO tags (name, color, is_system, sort_order) VALUES ('工作', '#8faabe', 1, 1);
        INSERT OR IGNORE INTO tags (name, color, is_system, sort_order) VALUES ('生活', '#9cb89c', 1, 2);
        INSERT OR IGNORE INTO tags (name, color, is_system, sort_order) VALUES ('旅行', '#c9ad8a', 1, 3);
        INSERT OR IGNORE INTO tags (name, color, is_system, sort_order) VALUES ('感悟', '#a89bc4', 1, 4);
        INSERT OR IGNORE INTO tags (name, color, is_system, sort_order) VALUES ('学习', '#8ab5b0', 1, 5);
        ",
    )?;

    // Insert all achievements (locked by default)
    conn.execute_batch(
        "
        INSERT OR IGNORE INTO achievements (key) VALUES ('first_entry');
        INSERT OR IGNORE INTO achievements (key) VALUES ('seven_days');
        INSERT OR IGNORE INTO achievements (key) VALUES ('thirty_days');
        INSERT OR IGNORE INTO achievements (key) VALUES ('one_year');
        INSERT OR IGNORE INTO achievements (key) VALUES ('thousand_words');
        INSERT OR IGNORE INTO achievements (key) VALUES ('ten_thousand_words');
        INSERT OR IGNORE INTO achievements (key) VALUES ('hundred_thousand_words');
        INSERT OR IGNORE INTO achievements (key) VALUES ('sunny_week');
        INSERT OR IGNORE INTO achievements (key) VALUES ('mood_painter');
        INSERT OR IGNORE INTO achievements (key) VALUES ('first_photo');
        INSERT OR IGNORE INTO achievements (key) VALUES ('hundred_photos');
        INSERT OR IGNORE INTO achievements (key) VALUES ('ai_first');
        INSERT OR IGNORE INTO achievements (key) VALUES ('remote_delivery');
        INSERT OR IGNORE INTO achievements (key) VALUES ('time_traveler');
        INSERT OR IGNORE INTO achievements (key) VALUES ('night_owl');
        ",
    )?;

    Ok(())
}
