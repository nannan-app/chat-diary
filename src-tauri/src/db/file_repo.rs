use rusqlite::Connection;

use crate::error::MurmurError;
use super::models::FileRecord;

/// Insert a file record
pub fn insert_file(
    conn: &Connection,
    diary_day_id: i64,
    file_hash: &str,
    original_name: &str,
    file_size: i64,
    mime_type: &str,
) -> Result<FileRecord, MurmurError> {
    conn.execute(
        "INSERT INTO files (diary_day_id, file_hash, original_name, file_size, mime_type)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![diary_day_id, file_hash, original_name, file_size, mime_type],
    )?;

    let id = conn.last_insert_rowid();
    Ok(FileRecord {
        id,
        diary_day_id,
        file_hash: file_hash.to_string(),
        original_name: original_name.to_string(),
        file_size,
        mime_type: mime_type.to_string(),
        created_at: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    })
}

/// Get file record by id
pub fn get_file(conn: &Connection, file_id: i64) -> Result<FileRecord, MurmurError> {
    let record = conn.query_row(
        "SELECT id, diary_day_id, file_hash, original_name, file_size, mime_type, created_at
         FROM files WHERE id = ?1",
        [file_id],
        |row| {
            Ok(FileRecord {
                id: row.get(0)?,
                diary_day_id: row.get(1)?,
                file_hash: row.get(2)?,
                original_name: row.get(3)?,
                file_size: row.get(4)?,
                mime_type: row.get(5)?,
                created_at: row.get(6)?,
            })
        },
    )?;
    Ok(record)
}
