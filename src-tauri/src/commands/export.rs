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
