use std::path::PathBuf;
use tauri::{AppHandle, Emitter};
use tokio::sync::watch;

use crate::db::{connection, diary_repo, media_repo};
use crate::error::MurmurError;
use crate::media::{storage, thumbnail};
use crate::state::SpaceType;

/// Handle to a running Telegram bot, used to stop it
pub struct TelegramBotHandle {
    pub abort_handle: tokio::task::AbortHandle,
    pub bot_username: String,
}

/// Verify the bot token and return the bot username
pub async fn verify_token(token: &str) -> Result<String, MurmurError> {
    let url = format!("https://api.telegram.org/bot{}/getMe", token);
    let client = reqwest::Client::new();
    let resp: serde_json::Value = client
        .get(&url)
        .send()
        .await
        .map_err(|e| MurmurError::General(format!("Telegram API request failed: {}", e)))?
        .json()
        .await
        .map_err(|e| MurmurError::General(format!("Failed to parse Telegram response: {}", e)))?;

    if resp["ok"].as_bool() != Some(true) {
        return Err(MurmurError::General(format!(
            "Telegram API error: {}",
            resp["description"].as_str().unwrap_or("unknown error")
        )));
    }

    let username = resp["result"]["username"]
        .as_str()
        .unwrap_or("unknown")
        .to_string();
    Ok(username)
}

/// Start the Telegram bot polling loop in a background task.
/// Returns a handle that can be used to stop the bot.
pub fn start_polling(
    token: String,
    bot_username: String,
    db_path: PathBuf,
    media_dir: PathBuf,
    space: SpaceType,
    master_key: Option<[u8; 32]>,
    shutdown_rx: watch::Receiver<bool>,
    app_handle: AppHandle,
) -> TelegramBotHandle {
    let join_handle = tokio::spawn(polling_loop(
        token,
        db_path,
        media_dir,
        space,
        master_key,
        shutdown_rx,
        app_handle,
    ));

    TelegramBotHandle {
        abort_handle: join_handle.abort_handle(),
        bot_username,
    }
}

async fn polling_loop(
    token: String,
    db_path: PathBuf,
    media_dir: PathBuf,
    space: SpaceType,
    master_key: Option<[u8; 32]>,
    mut shutdown_rx: watch::Receiver<bool>,
    app_handle: AppHandle,
) {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .unwrap_or_default();

    // Open a dedicated DB connection for the bot task
    let conn = match connection::open_or_create(&db_path) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[telegram] Failed to open database: {}", e);
            return;
        }
    };

    let mut offset: i64 = 0;

    loop {
        // Check for shutdown signal
        if *shutdown_rx.borrow() {
            eprintln!("[telegram] Shutdown signal received, stopping polling loop");
            break;
        }

        let url = format!(
            "https://api.telegram.org/bot{}/getUpdates?offset={}&timeout=30",
            token, offset
        );

        let resp = tokio::select! {
            result = client.get(&url).send() => result,
            _ = shutdown_rx.changed() => {
                eprintln!("[telegram] Shutdown signal received during polling");
                break;
            }
        };

        let resp = match resp {
            Ok(r) => r,
            Err(e) => {
                eprintln!("[telegram] Network error: {}, retrying in 5s", e);
                tokio::select! {
                    _ = tokio::time::sleep(std::time::Duration::from_secs(5)) => {}
                    _ = shutdown_rx.changed() => { break; }
                }
                continue;
            }
        };

        let body: serde_json::Value = match resp.json().await {
            Ok(v) => v,
            Err(e) => {
                eprintln!("[telegram] Failed to parse response: {}, retrying in 5s", e);
                tokio::select! {
                    _ = tokio::time::sleep(std::time::Duration::from_secs(5)) => {}
                    _ = shutdown_rx.changed() => { break; }
                }
                continue;
            }
        };

        if body["ok"].as_bool() != Some(true) {
            eprintln!(
                "[telegram] API error: {}, retrying in 10s",
                body["description"].as_str().unwrap_or("unknown")
            );
            tokio::select! {
                _ = tokio::time::sleep(std::time::Duration::from_secs(10)) => {}
                _ = shutdown_rx.changed() => { break; }
            }
            continue;
        }

        let updates = match body["result"].as_array() {
            Some(arr) => arr,
            None => continue,
        };

        for update in updates {
            let update_id = update["update_id"].as_i64().unwrap_or(0);
            if update_id >= offset {
                offset = update_id + 1;
            }

            if let Some(message) = update.get("message") {
                let chat_id = message["chat"]["id"].as_i64().unwrap_or(0);

                if let Some(photos) = message.get("photo").and_then(|p| p.as_array()) {
                    // Photo message: pick the largest size
                    if let Some(largest) = photos.last() {
                        let file_id = largest["file_id"].as_str().unwrap_or("");
                        let caption = message
                            .get("caption")
                            .and_then(|c| c.as_str())
                            .map(|s| s.to_string());

                        // Download photo bytes first (async), then save to DB (sync)
                        match download_telegram_file(&client, &token, file_id).await {
                            Ok(image_bytes) => {
                                if let Err(e) = save_photo(
                                    &conn,
                                    &media_dir,
                                    &space,
                                    master_key.as_ref(),
                                    &image_bytes,
                                    caption.as_deref(),
                                ) {
                                    eprintln!("[telegram] Failed to save photo: {}", e);
                                    send_reply(&client, &token, chat_id, "❌ 图片保存失败").await;
                                } else {
                                    app_handle.emit("telegram-message-received", ()).ok();
                                    send_reply(&client, &token, chat_id, "✅ 已记录").await;
                                }
                            }
                            Err(e) => {
                                eprintln!("[telegram] Failed to download photo: {}", e);
                                send_reply(&client, &token, chat_id, "❌ 图片下载失败").await;
                            }
                        }
                    }
                } else if let Some(text) = message.get("text").and_then(|t| t.as_str()) {
                    // Skip bot commands like /start
                    if text.starts_with('/') {
                        send_reply(
                            &client,
                            &token,
                            chat_id,
                            "👋 Hi! Send me text or photos and I'll save them as diary entries.",
                        )
                        .await;
                        continue;
                    }

                    if let Err(e) = handle_text(&conn, text) {
                        eprintln!("[telegram] Failed to handle text: {}", e);
                        send_reply(&client, &token, chat_id, "❌ 保存失败").await;
                    } else {
                        app_handle.emit("telegram-message-received", ()).ok();
                        send_reply(&client, &token, chat_id, "✅ 已记录").await;
                    }
                }
            }
        }
    }

    eprintln!("[telegram] Polling loop exited");
}

fn handle_text(conn: &rusqlite::Connection, text: &str) -> Result<(), MurmurError> {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let day = diary_repo::get_or_create_day(conn, &today)?;
    diary_repo::insert_message(
        conn,
        day.id,
        "text",
        Some(text),
        None,
        None,
        None,
        None,
        "telegram",
    )?;
    Ok(())
}

/// Download a file from Telegram by file_id. Returns the raw bytes.
async fn download_telegram_file(
    client: &reqwest::Client,
    token: &str,
    file_id: &str,
) -> Result<Vec<u8>, MurmurError> {
    // Get file path from Telegram
    let url = format!(
        "https://api.telegram.org/bot{}/getFile?file_id={}",
        token, file_id
    );
    let resp: serde_json::Value = client
        .get(&url)
        .send()
        .await
        .map_err(|e| MurmurError::General(format!("getFile failed: {}", e)))?
        .json()
        .await
        .map_err(|e| MurmurError::General(format!("getFile parse failed: {}", e)))?;

    let file_path = resp["result"]["file_path"]
        .as_str()
        .ok_or_else(|| MurmurError::General("No file_path in getFile response".to_string()))?
        .to_string();

    // Download the file
    let download_url = format!(
        "https://api.telegram.org/file/bot{}/{}",
        token, file_path
    );
    let bytes = client
        .get(&download_url)
        .send()
        .await
        .map_err(|e| MurmurError::General(format!("File download failed: {}", e)))?
        .bytes()
        .await
        .map_err(|e| MurmurError::General(format!("File read failed: {}", e)))?
        .to_vec();

    Ok(bytes)
}

/// Save downloaded photo bytes to media storage and insert DB records.
/// This is a sync function so it can safely use &Connection without crossing await.
fn save_photo(
    conn: &rusqlite::Connection,
    media_dir: &PathBuf,
    space: &SpaceType,
    master_key: Option<&[u8; 32]>,
    image_bytes: &[u8],
    caption: Option<&str>,
) -> Result<(), MurmurError> {
    let (thumb_bytes, width, height) = thumbnail::generate(image_bytes)?;
    let file_hash = storage::compute_hash(image_bytes);
    let file_size = image_bytes.len() as i64;

    match space {
        SpaceType::Private => {
            let key = master_key
                .ok_or_else(|| MurmurError::General("No master key for private space".to_string()))?;
            let dir = media_dir.join("private");
            std::fs::create_dir_all(&dir)?;
            storage::save_encrypted(key, image_bytes, &dir, &file_hash)?;
        }
        SpaceType::Public => {
            let dir = media_dir.join("public");
            std::fs::create_dir_all(&dir)?;
            storage::save_plain(image_bytes, &dir, &file_hash)?;
        }
    }

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let day = diary_repo::get_or_create_day(conn, &today)?;

    let image_record = media_repo::insert_image(
        conn,
        day.id,
        &file_hash,
        &thumb_bytes,
        Some(width as i32),
        Some(height as i32),
        Some(file_size),
        "image/jpeg",
    )?;

    diary_repo::insert_message(
        conn,
        day.id,
        "image",
        None,
        Some(image_record.id),
        None,
        None,
        None,
        "telegram",
    )?;

    if let Some(caption_text) = caption {
        if !caption_text.is_empty() {
            diary_repo::insert_message(
                conn,
                day.id,
                "text",
                Some(caption_text),
                None,
                None,
                None,
                None,
                "telegram",
            )?;
        }
    }

    Ok(())
}

async fn send_reply(client: &reqwest::Client, token: &str, chat_id: i64, text: &str) {
    let url = format!("https://api.telegram.org/bot{}/sendMessage", token);
    let body = serde_json::json!({
        "chat_id": chat_id,
        "text": text,
    });
    if let Err(e) = client.post(&url).json(&body).send().await {
        eprintln!("[telegram] Failed to send reply: {}", e);
    }
}
