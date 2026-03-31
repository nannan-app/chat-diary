use rusqlite::Connection;

use crate::error::MurmurError;
use super::models::ImageRecord;

/// Insert an image record
pub fn insert_image(
    conn: &Connection,
    diary_day_id: i64,
    file_hash: &str,
    thumbnail: &[u8],
    width: Option<i32>,
    height: Option<i32>,
    file_size: Option<i64>,
    mime_type: &str,
) -> Result<ImageRecord, MurmurError> {
    conn.execute(
        "INSERT INTO images (diary_day_id, file_hash, thumbnail, original_width, original_height, file_size, mime_type)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![diary_day_id, file_hash, thumbnail, width, height, file_size, mime_type],
    )?;

    let id = conn.last_insert_rowid();
    Ok(ImageRecord {
        id,
        diary_day_id,
        file_hash: file_hash.to_string(),
        original_width: width,
        original_height: height,
        file_size,
        mime_type: mime_type.to_string(),
        created_at: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    })
}

/// Get thumbnail for an image
pub fn get_thumbnail(conn: &Connection, image_id: i64) -> Result<Vec<u8>, MurmurError> {
    let thumbnail: Vec<u8> = conn.query_row(
        "SELECT thumbnail FROM images WHERE id = ?1",
        [image_id],
        |row| row.get(0),
    )?;
    Ok(thumbnail)
}

/// Get image record by id
pub fn get_image(conn: &Connection, image_id: i64) -> Result<ImageRecord, MurmurError> {
    let record = conn.query_row(
        "SELECT id, diary_day_id, file_hash, original_width, original_height, file_size, mime_type, created_at
         FROM images WHERE id = ?1",
        [image_id],
        |row| {
            Ok(ImageRecord {
                id: row.get(0)?,
                diary_day_id: row.get(1)?,
                file_hash: row.get(2)?,
                original_width: row.get(3)?,
                original_height: row.get(4)?,
                file_size: row.get(5)?,
                mime_type: row.get(6)?,
                created_at: row.get(7)?,
            })
        },
    )?;
    Ok(record)
}

/// List all images (for gallery view)
pub fn list_all_images(conn: &Connection) -> Result<Vec<(ImageRecord, String)>, MurmurError> {
    let mut stmt = conn.prepare(
        "SELECT i.id, i.diary_day_id, i.file_hash, i.original_width, i.original_height,
                i.file_size, i.mime_type, i.created_at, d.date
         FROM images i
         JOIN diary_days d ON d.id = i.diary_day_id
         ORDER BY i.created_at DESC",
    )?;

    let images = stmt
        .query_map([], |row| {
            Ok((
                ImageRecord {
                    id: row.get(0)?,
                    diary_day_id: row.get(1)?,
                    file_hash: row.get(2)?,
                    original_width: row.get(3)?,
                    original_height: row.get(4)?,
                    file_size: row.get(5)?,
                    mime_type: row.get(6)?,
                    created_at: row.get(7)?,
                },
                row.get::<_, String>(8)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(images)
}
