use std::fs;
use std::io::{Read, Write};
use std::path::PathBuf;
use tauri::State;

use crate::error::MurmurError;
use crate::state::AppState;

/// Export database + media to a zip file
#[tauri::command]
pub fn export_database(state: State<AppState>, output_path: String) -> Result<(), MurmurError> {
    let output = PathBuf::from(output_path);
    let file = fs::File::create(&output)?;
    let mut zip = zip::ZipWriter::new(file);

    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // Add private.db
    let private_db_path = state.data_dir.join("private.db");
    if private_db_path.exists() {
        let mut buf = Vec::new();
        fs::File::open(&private_db_path)?.read_to_end(&mut buf)?;
        zip.start_file("private.db", options)
            .map_err(|e| MurmurError::General(format!("Zip error: {}", e)))?;
        zip.write_all(&buf)?;
    }

    // Add public.db
    let public_db_path = state.data_dir.join("public.db");
    if public_db_path.exists() {
        let mut buf = Vec::new();
        fs::File::open(&public_db_path)?.read_to_end(&mut buf)?;
        zip.start_file("public.db", options)
            .map_err(|e| MurmurError::General(format!("Zip error: {}", e)))?;
        zip.write_all(&buf)?;
    }

    // Add media files
    let media_dir = &state.media_dir;
    if media_dir.exists() {
        for entry in walkdir(media_dir)? {
            let rel_path = entry.strip_prefix(&state.data_dir)
                .unwrap_or(&entry)
                .to_string_lossy()
                .to_string();
            let mut buf = Vec::new();
            fs::File::open(&entry)?.read_to_end(&mut buf)?;
            zip.start_file(rel_path, options)
                .map_err(|e| MurmurError::General(format!("Zip error: {}", e)))?;
            zip.write_all(&buf)?;
        }
    }

    zip.finish()
        .map_err(|e| MurmurError::General(format!("Zip finish error: {}", e)))?;

    Ok(())
}

/// Recursively list files in a directory
fn walkdir(dir: &std::path::Path) -> Result<Vec<PathBuf>, MurmurError> {
    let mut files = Vec::new();
    if dir.is_dir() {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                files.extend(walkdir(&path)?);
            } else {
                files.push(path);
            }
        }
    }
    Ok(files)
}

/// Export a single diary day as text
#[tauri::command]
pub fn export_diary_day(
    state: State<AppState>,
    diary_day_id: i64,
    format: String,
) -> Result<String, MurmurError> {
    use crate::db::diary_repo;
    use crate::state::SpaceType;

    let space = state.space.lock().unwrap().clone();
    let db_lock = match space {
        SpaceType::Private => state.private_db.lock().unwrap(),
        SpaceType::Public => state.public_db.lock().unwrap(),
    };
    let conn = db_lock.as_ref().ok_or(MurmurError::NotAuthenticated)?;

    let messages = diary_repo::get_messages(conn, diary_day_id)?;
    let day = conn.query_row(
        "SELECT date FROM diary_days WHERE id = ?1",
        [diary_day_id],
        |row| row.get::<_, String>(0),
    )?;

    let mut output = String::new();

    if format == "document" {
        output.push_str(&format!("# {} 日记\n\n", day));
        for msg in &messages {
            match msg.kind.as_str() {
                "text" => {
                    if let Some(c) = &msg.content {
                        output.push_str(&format!("{}\n\n", c));
                    }
                }
                "ai_reply" => {
                    if let Some(c) = &msg.content {
                        output.push_str(&format!("> AI: {}\n\n", c));
                    }
                }
                "mood" => {
                    if let Some(m) = &msg.mood {
                        output.push_str(&format!("心情: {}\n\n", m));
                    }
                }
                "article" => {
                    if let Some(c) = &msg.content {
                        output.push_str(&format!("## {}\n\n", c));
                    }
                }
                _ => {}
            }
        }
    } else {
        // Chat bubble style (plain text representation)
        output.push_str(&format!("=== {} ===\n\n", day));
        for msg in &messages {
            let time = &msg.created_at[11..16]; // HH:MM
            match msg.kind.as_str() {
                "text" => {
                    if let Some(c) = &msg.content {
                        output.push_str(&format!("[{}] 我: {}\n", time, c));
                    }
                }
                "ai_reply" => {
                    if let Some(c) = &msg.content {
                        output.push_str(&format!("[{}] AI: {}\n", time, c));
                    }
                }
                "mood" => {
                    if let Some(m) = &msg.mood {
                        output.push_str(&format!("[{}] 心情: {}\n", time, m));
                    }
                }
                _ => {}
            }
        }
    }

    Ok(output)
}

/// Import database from a zip backup file
#[tauri::command]
pub fn import_database(state: State<AppState>, zip_path: String, password: String) -> Result<(), MurmurError> {
    use crate::crypto::master_key as mk;
    use crate::db::connection;

    let zip_file = fs::File::open(&zip_path)?;
    let mut archive = zip::ZipArchive::new(zip_file)
        .map_err(|e| MurmurError::General(format!("Failed to open zip: {}", e)))?;

    // Extract to a temp dir first
    let temp_dir = state.data_dir.join("_import_temp");
    if temp_dir.exists() {
        fs::remove_dir_all(&temp_dir)?;
    }
    fs::create_dir_all(&temp_dir)?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| MurmurError::General(format!("Zip read error: {}", e)))?;
        let outpath = temp_dir.join(file.name());
        if let Some(parent) = outpath.parent() {
            fs::create_dir_all(parent)?;
        }
        if !file.name().ends_with('/') {
            let mut outfile = fs::File::create(&outpath)?;
            std::io::copy(&mut file, &mut outfile)?;
        }
    }

    // Verify password against the imported private.db
    let imported_private_db = temp_dir.join("private.db");
    if imported_private_db.exists() {
        let conn = connection::open_or_create(&imported_private_db)?;
        let (wrapped_key, salt, nonce): (Vec<u8>, Vec<u8>, Vec<u8>) = conn.query_row(
            "SELECT master_key_by_password, password_salt, password_nonce FROM key_store WHERE id = 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )?;
        let mut salt_arr = [0u8; 16];
        salt_arr.copy_from_slice(&salt);
        let mut nonce_arr = [0u8; 12];
        nonce_arr.copy_from_slice(&nonce);

        mk::try_unlock_with_password(&password, &wrapped_key, &salt_arr, &nonce_arr)
            .map_err(|_| MurmurError::InvalidPassword)?;
    }

    // Close current connections
    *state.private_db.lock().unwrap() = None;
    *state.public_db.lock().unwrap() = None;
    *state.master_key.lock().unwrap() = None;

    // Replace files
    let private_db_dest = state.data_dir.join("private.db");
    let public_db_dest = state.data_dir.join("public.db");
    let temp_private = temp_dir.join("private.db");
    let temp_public = temp_dir.join("public.db");

    if private_db_dest.exists() { fs::remove_file(&private_db_dest)?; }
    if public_db_dest.exists() { fs::remove_file(&public_db_dest)?; }

    if temp_private.exists() { fs::rename(&temp_private, &private_db_dest)?; }
    if temp_public.exists() { fs::rename(&temp_public, &public_db_dest)?; }

    // Copy media files
    let temp_media = temp_dir.join("media");
    if temp_media.exists() {
        if state.media_dir.exists() {
            fs::remove_dir_all(&state.media_dir)?;
        }
        // rename temp media to real media dir
        fs::rename(&temp_media, &state.media_dir)?;
    }

    // Cleanup temp
    if temp_dir.exists() {
        fs::remove_dir_all(&temp_dir).ok();
    }

    Ok(())
}

/// Delete all data
#[tauri::command]
pub fn delete_all_data(state: State<AppState>) -> Result<(), MurmurError> {
    // Close connections
    *state.private_db.lock().unwrap() = None;
    *state.public_db.lock().unwrap() = None;
    *state.master_key.lock().unwrap() = None;

    // Delete files
    let private_db = state.data_dir.join("private.db");
    let public_db = state.data_dir.join("public.db");
    let media_dir = &state.media_dir;

    if private_db.exists() { fs::remove_file(private_db)?; }
    if public_db.exists() { fs::remove_file(public_db)?; }
    if media_dir.exists() { fs::remove_dir_all(media_dir)?; }

    // Recreate media dir
    fs::create_dir_all(media_dir)?;

    Ok(())
}
