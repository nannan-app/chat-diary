use rusqlite::Connection;
use std::path::Path;

use crate::error::MurmurError;
use super::migrations;

/// Open or create a SQLite database at the given path and run migrations
pub fn open_or_create(path: &Path) -> Result<Connection, MurmurError> {
    let conn = Connection::open(path)?;

    // Enable WAL mode for better concurrency
    conn.execute_batch("PRAGMA journal_mode=WAL")?;
    // Enable foreign keys
    conn.execute_batch("PRAGMA foreign_keys=ON")?;

    migrations::run_migrations(&conn)?;

    Ok(conn)
}

/// Check if the private database has been set up (key_store exists and has data)
pub fn is_setup(path: &Path) -> bool {
    if !path.exists() {
        return false;
    }
    if let Ok(conn) = Connection::open(path) {
        let result: Result<i32, _> = conn.query_row(
            "SELECT COUNT(*) FROM key_store",
            [],
            |row| row.get(0),
        );
        matches!(result, Ok(count) if count > 0)
    } else {
        false
    }
}
