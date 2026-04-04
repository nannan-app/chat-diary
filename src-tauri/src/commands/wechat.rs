use serde::Serialize;
use tauri::{AppHandle, State};

use crate::error::MurmurError;
use crate::state::{AppState, SpaceType};
use crate::wechat;

#[derive(Serialize)]
pub struct WechatStatus {
    pub running: bool,
    pub account_id: Option<String>,
}

/// Fetch a new QR code for WeChat login
#[tauri::command]
pub async fn wechat_get_qrcode() -> Result<wechat::QrCodeResult, MurmurError> {
    wechat::fetch_qr_code().await
}

/// Poll the QR code scan status. Returns status and credentials on success.
#[tauri::command]
pub async fn wechat_poll_qr_status(
    state: State<'_, AppState>,
    qrcode: String,
) -> Result<wechat::QrStatusResult, MurmurError> {
    let result = wechat::poll_qr_status(&qrcode).await?;

    // On confirmed, save credentials to settings DB
    if result.status == "confirmed" {
        if let (Some(token), Some(bot_id)) = (&result.bot_token, &result.bot_id) {
            let base_url = result.base_url.as_deref().unwrap_or("https://ilinkai.weixin.qq.com");
            let account_id = bot_id.replace(['@', '.'], "-");

            let space = state.space.lock().unwrap().clone();
            let db_lock = match space {
                SpaceType::Private => state.private_db.lock().unwrap(),
                SpaceType::Public => state.public_db.lock().unwrap(),
            };
            let conn = db_lock.as_ref().ok_or(MurmurError::NotAuthenticated)?;
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('wechat_bot_token', ?1)",
                [token],
            )?;
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('wechat_account_id', ?1)",
                [&account_id],
            )?;
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('wechat_base_url', ?1)",
                [base_url],
            )?;
            if let Some(uid) = &result.user_id {
                conn.execute(
                    "INSERT OR REPLACE INTO settings (key, value) VALUES ('wechat_user_id', ?1)",
                    [uid],
                )?;
            }
        }
    }

    Ok(result)
}

/// Start the WeChat message polling bot using saved credentials
#[tauri::command]
pub async fn start_wechat_bot(
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<WechatStatus, MurmurError> {
    // Check if already running
    {
        let bot = state.wechat_bot.lock().unwrap();
        if bot.is_some() {
            return Err(MurmurError::General(
                "WeChat bot is already running".to_string(),
            ));
        }
    }

    // Read credentials from settings
    let space = state.space.lock().unwrap().clone();
    let (token, account_id, base_url) = {
        let db_lock = match space {
            SpaceType::Private => state.private_db.lock().unwrap(),
            SpaceType::Public => state.public_db.lock().unwrap(),
        };
        let conn = db_lock.as_ref().ok_or(MurmurError::NotAuthenticated)?;

        let token: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'wechat_bot_token'",
                [],
                |row| row.get(0),
            )
            .map_err(|_| {
                MurmurError::General(
                    "WeChat not logged in. Please scan QR code first.".to_string(),
                )
            })?;

        let account_id: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'wechat_account_id'",
                [],
                |row| row.get(0),
            )
            .unwrap_or_else(|_| "unknown".to_string());

        let base_url: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'wechat_base_url'",
                [],
                |row| row.get(0),
            )
            .unwrap_or_else(|_| "https://ilinkai.weixin.qq.com".to_string());

        (token, account_id, base_url)
    };

    let db_path = match space {
        SpaceType::Private => state.data_dir.join("private.db"),
        SpaceType::Public => state.data_dir.join("public.db"),
    };
    let media_dir = state.media_dir.clone();
    let data_dir = state.data_dir.clone();

    let master_key = match space {
        SpaceType::Private => {
            let mk = state.master_key.lock().unwrap();
            let key = mk.as_ref().ok_or(MurmurError::NotAuthenticated)?;
            Some(key.0)
        }
        SpaceType::Public => None,
    };

    let (shutdown_tx, shutdown_rx) = tokio::sync::watch::channel(false);

    let handle = wechat::start_polling(
        token,
        account_id.clone(),
        base_url,
        db_path,
        media_dir,
        data_dir,
        space,
        master_key,
        shutdown_rx,
        app_handle,
    );

    {
        let mut bot = state.wechat_bot.lock().unwrap();
        *bot = Some(handle);
    }
    {
        let mut tx = state.wechat_shutdown_tx.lock().unwrap();
        *tx = Some(shutdown_tx);
    }

    Ok(WechatStatus {
        running: true,
        account_id: Some(account_id),
    })
}

#[tauri::command]
pub fn stop_wechat_bot(state: State<AppState>) -> Result<WechatStatus, MurmurError> {
    {
        let mut tx = state.wechat_shutdown_tx.lock().unwrap();
        if let Some(sender) = tx.take() {
            let _ = sender.send(true);
        }
    }

    let mut bot = state.wechat_bot.lock().unwrap();
    if let Some(handle) = bot.take() {
        handle.abort_handle.abort();
    }

    Ok(WechatStatus {
        running: false,
        account_id: None,
    })
}

#[tauri::command]
pub fn get_wechat_status(state: State<AppState>) -> Result<WechatStatus, MurmurError> {
    let bot = state.wechat_bot.lock().unwrap();
    match bot.as_ref() {
        Some(handle) => Ok(WechatStatus {
            running: !handle.abort_handle.is_finished(),
            account_id: Some(handle.account_id.clone()),
        }),
        None => Ok(WechatStatus {
            running: false,
            account_id: None,
        }),
    }
}

/// Logout: clear saved credentials and stop bot if running
#[tauri::command]
pub fn wechat_logout(state: State<AppState>) -> Result<WechatStatus, MurmurError> {
    // Stop bot first
    {
        let mut tx = state.wechat_shutdown_tx.lock().unwrap();
        if let Some(sender) = tx.take() {
            let _ = sender.send(true);
        }
    }
    {
        let mut bot = state.wechat_bot.lock().unwrap();
        if let Some(handle) = bot.take() {
            handle.abort_handle.abort();
        }
    }

    // Clear credentials from settings
    let space = state.space.lock().unwrap().clone();
    let db_lock = match space {
        SpaceType::Private => state.private_db.lock().unwrap(),
        SpaceType::Public => state.public_db.lock().unwrap(),
    };
    if let Some(conn) = db_lock.as_ref() {
        let _ = conn.execute("DELETE FROM settings WHERE key = 'wechat_bot_token'", []);
        let _ = conn.execute("DELETE FROM settings WHERE key = 'wechat_account_id'", []);
        let _ = conn.execute("DELETE FROM settings WHERE key = 'wechat_base_url'", []);
        let _ = conn.execute("DELETE FROM settings WHERE key = 'wechat_user_id'", []);
    }

    Ok(WechatStatus {
        running: false,
        account_id: None,
    })
}
