use tauri::State;

use crate::db::{media_repo, file_repo, diary_repo, models::{Message, GalleryImage}};
use crate::error::MurmurError;
use crate::media::{storage, thumbnail};
use crate::state::{AppState, SpaceType};

/// Upload an image: generate thumbnail, store original (encrypted if private), create message
#[tauri::command]
pub fn upload_image(
    state: State<AppState>,
    diary_day_id: i64,
    image_bytes: Vec<u8>,
    _compress: bool,
) -> Result<Message, MurmurError> {
    // Generate thumbnail
    let (thumb_bytes, width, height) = thumbnail::generate(&image_bytes)?;
    let file_hash = storage::compute_hash(&image_bytes);
    let file_size = image_bytes.len() as i64;

    let space = state.space.lock().unwrap().clone();

    // Store original image
    match space {
        SpaceType::Private => {
            let mk = state.master_key.lock().unwrap();
            let master_key = mk.as_ref().ok_or(MurmurError::NotAuthenticated)?;
            let media_dir = state.media_dir.join("private");
            std::fs::create_dir_all(&media_dir)?;
            storage::save_encrypted(&master_key.0, &image_bytes, &media_dir, &file_hash)?;
        }
        SpaceType::Public => {
            let media_dir = state.media_dir.join("public");
            std::fs::create_dir_all(&media_dir)?;
            storage::save_plain(&image_bytes, &media_dir, &file_hash)?;
        }
    }

    // Insert into database
    let db_lock = match space {
        SpaceType::Private => state.private_db.lock().unwrap(),
        SpaceType::Public => state.public_db.lock().unwrap(),
    };
    let conn = db_lock.as_ref().ok_or(MurmurError::NotAuthenticated)?;

    let image_record = media_repo::insert_image(
        conn,
        diary_day_id,
        &file_hash,
        &thumb_bytes,
        Some(width as i32),
        Some(height as i32),
        Some(file_size),
        "image/jpeg",
    )?;

    // Create message
    let message = diary_repo::insert_message(
        conn,
        diary_day_id,
        "image",
        None,
        Some(image_record.id),
        None,
        None,
        None,
        "app",
    )?;

    Ok(message)
}

/// Get full-size image (decrypted if private)
#[tauri::command]
pub fn get_full_image(state: State<AppState>, image_id: i64) -> Result<Vec<u8>, MurmurError> {
    let space = state.space.lock().unwrap().clone();

    let db_lock = match space {
        SpaceType::Private => state.private_db.lock().unwrap(),
        SpaceType::Public => state.public_db.lock().unwrap(),
    };
    let conn = db_lock.as_ref().ok_or(MurmurError::NotAuthenticated)?;

    let image = media_repo::get_image(conn, image_id)?;

    match space {
        SpaceType::Private => {
            let mk = state.master_key.lock().unwrap();
            let master_key = mk.as_ref().ok_or(MurmurError::NotAuthenticated)?;
            let media_dir = state.media_dir.join("private");
            storage::load_decrypted(&master_key.0, &media_dir, &image.file_hash)
        }
        SpaceType::Public => {
            let media_dir = state.media_dir.join("public");
            storage::load_plain(&media_dir, &image.file_hash)
        }
    }
}

/// Get image thumbnail
#[tauri::command]
pub fn get_thumbnail(state: State<AppState>, image_id: i64) -> Result<Vec<u8>, MurmurError> {
    let space = state.space.lock().unwrap().clone();
    let db_lock = match space {
        SpaceType::Private => state.private_db.lock().unwrap(),
        SpaceType::Public => state.public_db.lock().unwrap(),
    };
    let conn = db_lock.as_ref().ok_or(MurmurError::NotAuthenticated)?;

    media_repo::get_thumbnail(conn, image_id)
}

/// List all images with thumbnails for gallery view
#[tauri::command]
pub fn list_all_images_with_thumbnails(state: State<AppState>) -> Result<Vec<GalleryImage>, MurmurError> {
    let space = state.space.lock().unwrap().clone();
    let db_lock = match space {
        SpaceType::Private => state.private_db.lock().unwrap(),
        SpaceType::Public => state.public_db.lock().unwrap(),
    };
    let conn = db_lock.as_ref().ok_or(MurmurError::NotAuthenticated)?;

    let mut stmt = conn.prepare(
        "SELECT i.id, i.thumbnail, d.date
         FROM images i
         JOIN diary_days d ON d.id = i.diary_day_id
         ORDER BY i.created_at DESC"
    )?;

    let images = stmt
        .query_map([], |row| {
            Ok(GalleryImage {
                id: row.get(0)?,
                thumbnail: row.get(1)?,
                date: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(images)
}

/// Upload a generic file (document, audio, video, etc.)
#[tauri::command]
pub fn upload_file(
    state: State<AppState>,
    diary_day_id: i64,
    file_bytes: Vec<u8>,
    file_name: String,
    mime_type: String,
) -> Result<Message, MurmurError> {
    let file_hash = storage::compute_hash(&file_bytes);
    let file_size = file_bytes.len() as i64;
    let space = state.space.lock().unwrap().clone();

    // Store file on disk
    match space {
        SpaceType::Private => {
            let mk = state.master_key.lock().unwrap();
            let master_key = mk.as_ref().ok_or(MurmurError::NotAuthenticated)?;
            let media_dir = state.media_dir.join("private");
            std::fs::create_dir_all(&media_dir)?;
            storage::save_encrypted(&master_key.0, &file_bytes, &media_dir, &file_hash)?;
        }
        SpaceType::Public => {
            let media_dir = state.media_dir.join("public");
            std::fs::create_dir_all(&media_dir)?;
            storage::save_plain(&file_bytes, &media_dir, &file_hash)?;
        }
    }

    // Insert into database
    let db_lock = match space {
        SpaceType::Private => state.private_db.lock().unwrap(),
        SpaceType::Public => state.public_db.lock().unwrap(),
    };
    let conn = db_lock.as_ref().ok_or(MurmurError::NotAuthenticated)?;

    let file_record = file_repo::insert_file(
        conn,
        diary_day_id,
        &file_hash,
        &file_name,
        file_size,
        &mime_type,
    )?;

    // Create message with original filename as content for display
    let message = diary_repo::insert_message_full(
        conn,
        diary_day_id,
        "file",
        Some(&file_name),
        None,
        None,
        Some(file_record.id),
        None,
        None,
        "app",
    )?;

    Ok(message)
}

/// List all files for the files panel
#[tauri::command]
pub fn list_all_files(state: State<AppState>) -> Result<Vec<crate::db::models::FileRecord>, MurmurError> {
    let space = state.space.lock().unwrap().clone();
    let db_lock = match space {
        SpaceType::Private => state.private_db.lock().unwrap(),
        SpaceType::Public => state.public_db.lock().unwrap(),
    };
    let conn = db_lock.as_ref().ok_or(MurmurError::NotAuthenticated)?;

    let mut stmt = conn.prepare(
        "SELECT f.id, f.diary_day_id, f.file_hash, f.original_name, f.file_size, f.mime_type, f.created_at, d.date
         FROM files f
         JOIN diary_days d ON d.id = f.diary_day_id
         ORDER BY f.created_at DESC"
    )?;

    let files = stmt
        .query_map([], |row| {
            Ok(crate::db::models::FileRecord {
                id: row.get(0)?,
                diary_day_id: row.get(1)?,
                file_hash: row.get(2)?,
                original_name: row.get(3)?,
                file_size: row.get(4)?,
                mime_type: row.get(5)?,
                created_at: row.get(6)?,
                date: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(files)
}

/// Get file data (decrypted if private)
#[tauri::command]
pub fn get_file_data(state: State<AppState>, file_id: i64) -> Result<Vec<u8>, MurmurError> {
    let space = state.space.lock().unwrap().clone();

    let db_lock = match space {
        SpaceType::Private => state.private_db.lock().unwrap(),
        SpaceType::Public => state.public_db.lock().unwrap(),
    };
    let conn = db_lock.as_ref().ok_or(MurmurError::NotAuthenticated)?;

    let file = file_repo::get_file(conn, file_id)?;

    match space {
        SpaceType::Private => {
            let mk = state.master_key.lock().unwrap();
            let master_key = mk.as_ref().ok_or(MurmurError::NotAuthenticated)?;
            let media_dir = state.media_dir.join("private");
            storage::load_decrypted(&master_key.0, &media_dir, &file.file_hash)
        }
        SpaceType::Public => {
            let media_dir = state.media_dir.join("public");
            storage::load_plain(&media_dir, &file.file_hash)
        }
    }
}
