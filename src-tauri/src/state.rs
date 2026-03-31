use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;
use zeroize::Zeroize;

use crate::telegram::TelegramBotHandle;

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub enum SpaceType {
    Private,
    Public,
}

/// Wraps the master key with secure zeroing on drop
pub struct MasterKey(pub [u8; 32]);

impl Drop for MasterKey {
    fn drop(&mut self) {
        self.0.zeroize();
    }
}

impl std::fmt::Debug for MasterKey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("MasterKey(***)")
    }
}

/// Global application state managed by Tauri
pub struct AppState {
    pub private_db: Mutex<Option<Connection>>,
    pub public_db: Mutex<Option<Connection>>,
    pub master_key: Mutex<Option<MasterKey>>,
    pub space: Mutex<SpaceType>,
    pub data_dir: PathBuf,
    pub media_dir: PathBuf,
    pub is_setup: Mutex<bool>,
    pub telegram_bot: Mutex<Option<TelegramBotHandle>>,
    pub telegram_shutdown_tx: Mutex<Option<tokio::sync::watch::Sender<bool>>>,
}

impl AppState {
    pub fn new(data_dir: PathBuf) -> Self {
        let media_dir = data_dir.join("media");
        std::fs::create_dir_all(&media_dir).ok();
        std::fs::create_dir_all(&data_dir).ok();

        Self {
            private_db: Mutex::new(None),
            public_db: Mutex::new(None),
            master_key: Mutex::new(None),
            space: Mutex::new(SpaceType::Public),
            data_dir,
            media_dir,
            is_setup: Mutex::new(false),
            telegram_bot: Mutex::new(None),
            telegram_shutdown_tx: Mutex::new(None),
        }
    }
}
