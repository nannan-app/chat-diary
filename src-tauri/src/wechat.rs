use std::path::PathBuf;
use tauri::{AppHandle, Emitter};
use tokio::sync::watch;

use crate::db::{connection, diary_repo, media_repo};
use crate::error::MurmurError;
use crate::media::{storage, thumbnail};
use crate::state::SpaceType;

const DEFAULT_BASE_URL: &str = "https://ilinkai.weixin.qq.com";
const CHANNEL_VERSION: &str = "murmur-diary-0.1.0";

/// Handle to a running WeChat bot, used to stop it
pub struct WechatBotHandle {
    pub abort_handle: tokio::task::AbortHandle,
    pub account_id: String,
}

// ── QR Login ────────────────────────────────────────────────────────────────

#[derive(serde::Serialize, Clone, Debug)]
pub struct QrCodeResult {
    /// Opaque QR code ID for polling status
    pub qrcode: String,
    /// Base64 data URI of the generated QR code PNG image
    pub qrcode_data_uri: String,
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct QrStatusResult {
    /// "wait" | "scaned" | "confirmed" | "expired"
    pub status: String,
    /// Populated on "confirmed"
    pub bot_token: Option<String>,
    pub bot_id: Option<String>,
    pub base_url: Option<String>,
    pub user_id: Option<String>,
}

/// Fetch a new QR code for WeChat login
pub async fn fetch_qr_code() -> Result<QrCodeResult, MurmurError> {
    let url = format!("{}/ilink/bot/get_bot_qrcode?bot_type=3", DEFAULT_BASE_URL);
    let client = reqwest::Client::new();
    let resp: serde_json::Value = client
        .get(&url)
        .send()
        .await
        .map_err(|e| MurmurError::General(format!("Failed to fetch QR code: {}", e)))?
        .json()
        .await
        .map_err(|e| MurmurError::General(format!("Failed to parse QR response: {}", e)))?;

    let qrcode = resp["qrcode"]
        .as_str()
        .ok_or_else(|| MurmurError::General("No qrcode in response".to_string()))?
        .to_string();
    let qrcode_img_content = resp["qrcode_img_content"]
        .as_str()
        .ok_or_else(|| MurmurError::General("No qrcode_img_content in response".to_string()))?;

    // Generate QR code image locally from the URL content
    let qr = qrcode::QrCode::new(qrcode_img_content.as_bytes())
        .map_err(|e| MurmurError::General(format!("Failed to generate QR code: {}", e)))?;
    let png_bytes = qr
        .render::<image::Luma<u8>>()
        .quiet_zone(true)
        .min_dimensions(384, 384)
        .build();

    let mut png_buf: Vec<u8> = Vec::new();
    {
        use image::ImageEncoder;
        let encoder = image::codecs::png::PngEncoder::new(&mut png_buf);
        encoder
            .write_image(
                png_bytes.as_raw(),
                png_bytes.width(),
                png_bytes.height(),
                image::ExtendedColorType::L8,
            )
            .map_err(|e| MurmurError::General(format!("Failed to encode QR PNG: {}", e)))?;
    }

    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&png_buf);
    let data_uri = format!("data:image/png;base64,{}", b64);

    Ok(QrCodeResult {
        qrcode,
        qrcode_data_uri: data_uri,
    })
}

/// Poll QR code scan status
pub async fn poll_qr_status(qrcode: &str) -> Result<QrStatusResult, MurmurError> {
    let url = format!(
        "{}/ilink/bot/get_qrcode_status?qrcode={}",
        DEFAULT_BASE_URL,
        urlencoding::encode(qrcode)
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(40))
        .build()
        .unwrap_or_default();

    let resp = client
        .get(&url)
        .header("iLink-App-ClientVersion", "1")
        .send()
        .await;

    let resp = match resp {
        Ok(r) => r,
        Err(e) => {
            // Timeout means "wait"
            if e.is_timeout() {
                return Ok(QrStatusResult {
                    status: "wait".to_string(),
                    bot_token: None,
                    bot_id: None,
                    base_url: None,
                    user_id: None,
                });
            }
            return Err(MurmurError::General(format!("QR status poll failed: {}", e)));
        }
    };

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| MurmurError::General(format!("Failed to parse QR status: {}", e)))?;

    let status = body["status"]
        .as_str()
        .unwrap_or("wait")
        .to_string();

    Ok(QrStatusResult {
        status,
        bot_token: body["bot_token"].as_str().map(|s| s.to_string()),
        bot_id: body["ilink_bot_id"].as_str().map(|s| s.to_string()),
        base_url: body["baseurl"].as_str().map(|s| s.to_string()),
        user_id: body["ilink_user_id"].as_str().map(|s| s.to_string()),
    })
}

// ── Message Polling ─────────────────────────────────────────────────────────

/// Start the WeChat bot polling loop in a background task.
pub fn start_polling(
    token: String,
    account_id: String,
    base_url: String,
    db_path: PathBuf,
    media_dir: PathBuf,
    data_dir: PathBuf,
    space: SpaceType,
    master_key: Option<[u8; 32]>,
    shutdown_rx: watch::Receiver<bool>,
    app_handle: AppHandle,
) -> WechatBotHandle {
    let id = account_id.clone();
    let join_handle = tokio::spawn(polling_loop(
        token,
        account_id,
        base_url,
        db_path,
        media_dir,
        data_dir,
        space,
        master_key,
        shutdown_rx,
        app_handle,
    ));

    WechatBotHandle {
        abort_handle: join_handle.abort_handle(),
        account_id: id,
    }
}

/// Load sync buffer from app data dir
fn load_sync_buf(data_dir: &PathBuf) -> String {
    let sync_path = data_dir.join("wechat_sync.json");
    let data = match std::fs::read_to_string(&sync_path) {
        Ok(d) => d,
        Err(_) => return String::new(),
    };

    #[derive(serde::Deserialize)]
    struct SyncBuf {
        buf: Option<String>,
    }

    match serde_json::from_str::<SyncBuf>(&data) {
        Ok(s) => s.buf.unwrap_or_default(),
        Err(_) => String::new(),
    }
}

/// Save sync buffer to app data dir
fn save_sync_buf(data_dir: &PathBuf, buf: &str) {
    let sync_path = data_dir.join("wechat_sync.json");
    let data = serde_json::json!({ "buf": buf });
    let _ = std::fs::write(&sync_path, data.to_string());
}

async fn polling_loop(
    token: String,
    account_id: String,
    base_url: String,
    db_path: PathBuf,
    media_dir: PathBuf,
    data_dir: PathBuf,
    space: SpaceType,
    master_key: Option<[u8; 32]>,
    mut shutdown_rx: watch::Receiver<bool>,
    app_handle: AppHandle,
) {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .unwrap_or_default();

    let conn = match connection::open_or_create(&db_path) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[wechat] Failed to open database: {}", e);
            return;
        }
    };

    let mut get_updates_buf = load_sync_buf(&data_dir);
    let mut consecutive_failures: u32 = 0;

    eprintln!("[wechat] Polling started for account {}", account_id);

    loop {
        if *shutdown_rx.borrow() {
            eprintln!("[wechat] Shutdown signal received, stopping polling loop");
            break;
        }

        let url = format!(
            "{}{}ilink/bot/getupdates",
            base_url,
            if base_url.ends_with('/') { "" } else { "/" }
        );

        let body = serde_json::json!({
            "get_updates_buf": get_updates_buf,
            "base_info": { "channel_version": CHANNEL_VERSION }
        });

        let resp = tokio::select! {
            result = client.post(&url)
                .header("Content-Type", "application/json")
                .header("AuthorizationType", "ilink_bot_token")
                .header("Authorization", format!("Bearer {}", token))
                .header("X-WECHAT-UIN", random_wechat_uin())
                .json(&body)
                .send() => result,
            _ = shutdown_rx.changed() => {
                eprintln!("[wechat] Shutdown signal received during polling");
                break;
            }
        };

        let resp = match resp {
            Ok(r) => r,
            Err(e) => {
                consecutive_failures += 1;
                eprintln!("[wechat] Network error: {}", e);
                if consecutive_failures >= 3 {
                    eprintln!("[wechat] 3 consecutive failures, waiting 30s");
                    consecutive_failures = 0;
                    tokio::select! {
                        _ = tokio::time::sleep(std::time::Duration::from_secs(30)) => {}
                        _ = shutdown_rx.changed() => { break; }
                    }
                } else {
                    tokio::select! {
                        _ = tokio::time::sleep(std::time::Duration::from_secs(2)) => {}
                        _ = shutdown_rx.changed() => { break; }
                    }
                }
                continue;
            }
        };

        let body_value: serde_json::Value = match resp.json().await {
            Ok(v) => v,
            Err(e) => {
                eprintln!("[wechat] Failed to parse response: {}, retrying in 5s", e);
                tokio::select! {
                    _ = tokio::time::sleep(std::time::Duration::from_secs(5)) => {}
                    _ = shutdown_rx.changed() => { break; }
                }
                continue;
            }
        };

        // Check for API errors
        let ret = body_value["ret"].as_i64().unwrap_or(0);
        let errcode = body_value["errcode"].as_i64().unwrap_or(0);
        if ret != 0 || errcode != 0 {
            consecutive_failures += 1;
            eprintln!(
                "[wechat] API error: ret={} errcode={} errmsg={}",
                ret,
                errcode,
                body_value["errmsg"].as_str().unwrap_or("")
            );
            if consecutive_failures >= 3 {
                consecutive_failures = 0;
                tokio::select! {
                    _ = tokio::time::sleep(std::time::Duration::from_secs(30)) => {}
                    _ = shutdown_rx.changed() => { break; }
                }
            } else {
                tokio::select! {
                    _ = tokio::time::sleep(std::time::Duration::from_secs(2)) => {}
                    _ = shutdown_rx.changed() => { break; }
                }
            }
            continue;
        }

        consecutive_failures = 0;

        // Update sync buffer
        if let Some(buf) = body_value["get_updates_buf"].as_str() {
            if !buf.is_empty() {
                save_sync_buf(&data_dir, buf);
                get_updates_buf = buf.to_string();
            }
        }

        // Process messages
        if let Some(msgs) = body_value["msgs"].as_array() {
            for msg in msgs {
                // Only process USER messages (message_type == 1)
                let msg_type = msg["message_type"].as_i64().unwrap_or(0);
                if msg_type != 1 {
                    continue;
                }

                let from_user_id = msg["from_user_id"].as_str().unwrap_or("unknown");

                if let Some(items) = msg["item_list"].as_array() {
                    for item in items {
                        let item_type = item["type"].as_i64().unwrap_or(0);
                        match item_type {
                            // TEXT
                            1 => {
                                if let Some(text) = item["text_item"]["text"].as_str() {
                                    if !text.is_empty() {
                                        if let Err(e) = handle_text(&conn, text) {
                                            eprintln!("[wechat] Failed to handle text: {}", e);
                                            send_reply(
                                                &client, &token, &base_url, from_user_id,
                                                msg["context_token"].as_str(),
                                                "❌ 保存失败",
                                            ).await;
                                        } else {
                                            app_handle.emit("wechat-message-received", ()).ok();
                                            send_reply(
                                                &client, &token, &base_url, from_user_id,
                                                msg["context_token"].as_str(),
                                                "✅ 已记录",
                                            ).await;
                                        }
                                    }
                                }
                            }
                            // IMAGE
                            2 => {
                                let image_item = &item["image_item"];
                                // Dump image_item JSON for debugging (truncate to avoid huge messages)
                                let debug_json = {
                                    let full = serde_json::to_string(image_item).unwrap_or_default();
                                    if full.len() > 800 { format!("{}...", &full[..800]) } else { full }
                                };
                                eprintln!("[wechat] image_item JSON: {}", debug_json);
                                match download_wechat_image(&client, image_item).await {
                                    Ok(image_bytes) => {
                                        if let Err(e) = save_photo(
                                            &conn,
                                            &media_dir,
                                            &space,
                                            master_key.as_ref(),
                                            &image_bytes,
                                            None,
                                        ) {
                                            let magic = image_bytes.iter().take(8)
                                                .map(|b| format!("{:02x}", b))
                                                .collect::<Vec<_>>().join(" ");
                                            eprintln!("[wechat] Failed to save photo (len={}, magic={}): {}", image_bytes.len(), magic, e);
                                            // Send truncated image_item JSON so user can report back
                                            let short_json = if debug_json.len() > 500 {
                                                format!("{}...", &debug_json[..500])
                                            } else {
                                                debug_json.clone()
                                            };
                                            let err_msg = format!("❌ 图片保存失败\nmagic=[{}] len={}\n\nimage_item:\n{}", magic, image_bytes.len(), short_json);
                                            send_reply(
                                                &client, &token, &base_url, from_user_id,
                                                msg["context_token"].as_str(),
                                                &err_msg,
                                            ).await;
                                        } else {
                                            app_handle.emit("wechat-message-received", ()).ok();
                                            send_reply(
                                                &client, &token, &base_url, from_user_id,
                                                msg["context_token"].as_str(),
                                                "✅ 已记录",
                                            ).await;
                                        }
                                    }
                                    Err(e) => {
                                        eprintln!("[wechat] Failed to download image: {}", e);
                                        send_reply(
                                            &client, &token, &base_url, from_user_id,
                                            msg["context_token"].as_str(),
                                            "❌ 图片下载失败",
                                        ).await;
                                    }
                                }
                            }
                            // VOICE - extract recognized text if available
                            3 => {
                                if let Some(text) = item["voice_item"]["text"].as_str() {
                                    if !text.is_empty() {
                                        if let Err(e) = handle_text(&conn, text) {
                                            eprintln!("[wechat] Failed to handle voice text: {}", e);
                                        } else {
                                            app_handle.emit("wechat-message-received", ()).ok();
                                            send_reply(
                                                &client, &token, &base_url, from_user_id,
                                                msg["context_token"].as_str(),
                                                "✅ 已记录",
                                            ).await;
                                        }
                                    }
                                }
                            }
                            _ => {
                                // Ignore other types (file, video, etc.)
                            }
                        }
                    }
                }
            }
        }
    }

    eprintln!("[wechat] Polling loop exited");
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
        "wechat",
    )?;
    Ok(())
}

/// Download image from WeChat CDN and decrypt it.
/// Key priority: image_item.aeskey (hex) > image_item.media.aes_key (base64)
async fn download_wechat_image(
    client: &reqwest::Client,
    image_item: &serde_json::Value,
) -> Result<Vec<u8>, MurmurError> {
    let media = &image_item["media"];

    // Determine download URL: full_url takes precedence
    let download_url = if let Some(full_url) = media["full_url"].as_str() {
        full_url.to_string()
    } else {
        let encrypt_query_param = media["encrypt_query_param"]
            .as_str()
            .ok_or_else(|| MurmurError::General("No encrypt_query_param in image".to_string()))?;
        format!(
            "https://novac2c.cdn.weixin.qq.com/c2c/download?encrypted_query_param={}",
            urlencoding::encode(encrypt_query_param)
        )
    };

    let resp = client
        .get(&download_url)
        .send()
        .await
        .map_err(|e| MurmurError::General(format!("CDN download failed: {}", e)))?;

    if !resp.status().is_success() {
        return Err(MurmurError::General(format!(
            "CDN download returned status {}",
            resp.status()
        )));
    }

    let raw_bytes = resp
        .bytes()
        .await
        .map_err(|e| MurmurError::General(format!("CDN read failed: {}", e)))?
        .to_vec();

    // Resolve AES key following official SDK priority:
    // 1. image_item.aeskey (hex-encoded 16 bytes) → decode from hex
    // 2. image_item.media.aes_key (base64) → decode, then check if it's hex-inside-base64
    let aes_key = resolve_aes_key(image_item)?;

    if let Some(key) = aes_key {
        decrypt_aes_128_ecb(&raw_bytes, &key)
    } else {
        Ok(raw_bytes)
    }
}

/// Resolve the 16-byte AES key from image_item, following the official SDK logic:
/// 1. image_item.aeskey (hex string) → hex decode to 16 bytes
/// 2. image_item.media.aes_key (base64) → base64 decode → if 32 ASCII hex chars, hex decode again → 16 bytes
///                                                        → if 16 raw bytes, use directly
fn resolve_aes_key(image_item: &serde_json::Value) -> Result<Option<[u8; 16]>, MurmurError> {
    // Priority 1: image_item.aeskey (hex-encoded, no underscore)
    if let Some(hex_key) = image_item["aeskey"].as_str() {
        if !hex_key.is_empty() {
            let bytes = hex::decode(hex_key)
                .map_err(|e| MurmurError::General(format!("Invalid aeskey hex: {}", e)))?;
            if bytes.len() == 16 {
                eprintln!("[wechat] Using image_item.aeskey (hex → 16 bytes)");
                let mut key = [0u8; 16];
                key.copy_from_slice(&bytes);
                return Ok(Some(key));
            }
        }
    }

    // Priority 2: image_item.media.aes_key (base64)
    if let Some(b64_key) = image_item["media"]["aes_key"].as_str() {
        if !b64_key.is_empty() {
            use base64::Engine;
            let decoded = base64::engine::general_purpose::STANDARD.decode(b64_key)
                .or_else(|_| base64::engine::general_purpose::STANDARD_NO_PAD.decode(b64_key))
                .map_err(|e| MurmurError::General(format!("Invalid aes_key base64: {}", e)))?;

            if decoded.len() == 16 {
                // Direct 16 raw bytes
                eprintln!("[wechat] Using media.aes_key (base64 → 16 raw bytes)");
                let mut key = [0u8; 16];
                key.copy_from_slice(&decoded);
                return Ok(Some(key));
            } else if decoded.len() == 32 && decoded.iter().all(|b| b.is_ascii_hexdigit()) {
                // 32 ASCII hex chars → decode again to get 16 bytes
                let hex_str = std::str::from_utf8(&decoded)
                    .map_err(|e| MurmurError::General(format!("aes_key hex-in-base64 not UTF-8: {}", e)))?;
                let bytes = hex::decode(hex_str)
                    .map_err(|e| MurmurError::General(format!("aes_key hex-in-base64 invalid hex: {}", e)))?;
                eprintln!("[wechat] Using media.aes_key (base64 → 32 hex chars → 16 bytes)");
                let mut key = [0u8; 16];
                key.copy_from_slice(&bytes);
                return Ok(Some(key));
            } else {
                return Err(MurmurError::General(format!(
                    "aes_key base64 decoded to {} bytes (expected 16 or 32 hex chars)",
                    decoded.len()
                )));
            }
        }
    }

    Ok(None)
}

/// AES-128-ECB decryption with PKCS7 auto-unpadding
fn decrypt_aes_128_ecb(ciphertext: &[u8], key: &[u8; 16]) -> Result<Vec<u8>, MurmurError> {
    use aes::cipher::{BlockDecrypt, KeyInit};

    if ciphertext.len() % 16 != 0 {
        return Err(MurmurError::General("Ciphertext not aligned to 16 bytes".to_string()));
    }

    let cipher = aes::Aes128::new(aes::cipher::generic_array::GenericArray::from_slice(key));

    let mut decrypted = ciphertext.to_vec();
    for chunk in decrypted.chunks_mut(16) {
        cipher.decrypt_block(aes::cipher::generic_array::GenericArray::from_mut_slice(chunk));
    }

    // PKCS7 unpadding
    if let Some(&pad_len) = decrypted.last() {
        let pad_len = pad_len as usize;
        if pad_len > 0 && pad_len <= 16 && decrypted.len() >= pad_len {
            let valid = decrypted[decrypted.len() - pad_len..]
                .iter()
                .all(|&b| b == pad_len as u8);
            if valid {
                decrypted.truncate(decrypted.len() - pad_len);
            }
        }
    }

    Ok(decrypted)
}


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
        "wechat",
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
                "wechat",
            )?;
        }
    }

    Ok(())
}

async fn send_reply(
    client: &reqwest::Client,
    token: &str,
    base_url: &str,
    to_user_id: &str,
    context_token: Option<&str>,
    text: &str,
) {
    let url = format!(
        "{}{}ilink/bot/sendmessage",
        base_url,
        if base_url.ends_with('/') { "" } else { "/" }
    );

    let mut msg = serde_json::json!({
        "from_user_id": "",
        "to_user_id": to_user_id,
        "client_id": format!("murmur-{}", uuid::Uuid::new_v4()),
        "message_type": 2,
        "message_state": 2,
        "item_list": [{
            "type": 1,
            "text_item": { "text": text }
        }]
    });

    if let Some(ct) = context_token {
        msg["context_token"] = serde_json::Value::String(ct.to_string());
    }

    let body = serde_json::json!({
        "msg": msg,
        "base_info": { "channel_version": CHANNEL_VERSION }
    });

    if let Err(e) = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("AuthorizationType", "ilink_bot_token")
        .header("Authorization", format!("Bearer {}", token))
        .header("X-WECHAT-UIN", random_wechat_uin())
        .json(&body)
        .send()
        .await
    {
        eprintln!("[wechat] Failed to send reply: {}", e);
    }
}

fn random_wechat_uin() -> String {
    use rand::Rng;
    let n: u32 = rand::thread_rng().gen();
    use base64::Engine;
    base64::engine::general_purpose::STANDARD.encode(n.to_string().as_bytes())
}
