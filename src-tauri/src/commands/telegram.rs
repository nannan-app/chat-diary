use serde::Serialize;
use tauri::State;

use crate::error::MurmurError;
use crate::state::{AppState, SpaceType};
use crate::telegram;

#[derive(Serialize)]
pub struct TelegramStatus {
    pub running: bool,
    pub bot_username: Option<String>,
}

#[tauri::command]
pub async fn start_telegram_bot(
    state: State<'_, AppState>,
    token: String,
) -> Result<TelegramStatus, MurmurError> {
    // Check if already running
    {
        let bot = state.telegram_bot.lock().unwrap();
        if bot.is_some() {
            return Err(MurmurError::General(
                "Telegram bot is already running".to_string(),
            ));
        }
    }

    // Verify token
    let bot_username = telegram::verify_token(&token).await?;

    // Determine DB path and space info
    let space = state.space.lock().unwrap().clone();
    let db_path = match space {
        SpaceType::Private => state.data_dir.join("private.db"),
        SpaceType::Public => state.data_dir.join("public.db"),
    };
    let media_dir = state.media_dir.clone();

    // Get master key if in private space
    let master_key = match space {
        SpaceType::Private => {
            let mk = state.master_key.lock().unwrap();
            let key = mk
                .as_ref()
                .ok_or(MurmurError::NotAuthenticated)?;
            Some(key.0)
        }
        SpaceType::Public => None,
    };

    // Save token to settings (using current space's DB)
    {
        let db_lock = match space {
            SpaceType::Private => state.private_db.lock().unwrap(),
            SpaceType::Public => state.public_db.lock().unwrap(),
        };
        let conn = db_lock.as_ref().ok_or(MurmurError::NotAuthenticated)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('telegram_bot_token', ?1)",
            [&token],
        )?;
    }

    // Create shutdown channel
    let (shutdown_tx, shutdown_rx) = tokio::sync::watch::channel(false);

    // Start polling
    let handle = telegram::start_polling(
        token,
        bot_username.clone(),
        db_path,
        media_dir,
        space,
        master_key,
        shutdown_rx,
    );

    // Store handle and shutdown sender
    {
        let mut bot = state.telegram_bot.lock().unwrap();
        *bot = Some(handle);
    }
    {
        let mut tx = state.telegram_shutdown_tx.lock().unwrap();
        *tx = Some(shutdown_tx);
    }

    Ok(TelegramStatus {
        running: true,
        bot_username: Some(bot_username),
    })
}

#[tauri::command]
pub fn stop_telegram_bot(state: State<AppState>) -> Result<TelegramStatus, MurmurError> {
    // Send shutdown signal first
    {
        let mut tx = state.telegram_shutdown_tx.lock().unwrap();
        if let Some(sender) = tx.take() {
            let _ = sender.send(true);
        }
    }

    // Then abort the task
    let mut bot = state.telegram_bot.lock().unwrap();
    if let Some(handle) = bot.take() {
        handle.abort_handle.abort();
    }

    Ok(TelegramStatus {
        running: false,
        bot_username: None,
    })
}

#[tauri::command]
pub fn get_telegram_status(state: State<AppState>) -> Result<TelegramStatus, MurmurError> {
    let bot = state.telegram_bot.lock().unwrap();
    match bot.as_ref() {
        Some(handle) => Ok(TelegramStatus {
            running: !handle.abort_handle.is_finished(),
            bot_username: Some(handle.bot_username.clone()),
        }),
        None => Ok(TelegramStatus {
            running: false,
            bot_username: None,
        }),
    }
}
