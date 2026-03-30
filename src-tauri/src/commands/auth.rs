use tauri::State;

use crate::crypto::master_key as mk;
use crate::db::{connection, models::{LoginResult, SetupResponse}};
use crate::error::MurmurError;
use crate::state::{AppState, MasterKey, SpaceType};

/// Check if the app has been set up (password created)
#[tauri::command]
pub fn check_setup(state: State<AppState>) -> Result<bool, MurmurError> {
    let private_db_path = state.data_dir.join("private.db");
    Ok(connection::is_setup(&private_db_path))
}

/// First-time setup: create password and return recovery code
#[tauri::command]
pub fn setup_password(
    state: State<AppState>,
    password: String,
    hint: Option<String>,
) -> Result<SetupResponse, MurmurError> {
    let setup_result = mk::setup(&password)?;

    // Open/create private database
    let private_db_path = state.data_dir.join("private.db");
    let conn = connection::open_or_create(&private_db_path)?;

    // Store key_store
    conn.execute(
        "INSERT OR REPLACE INTO key_store (id, master_key_by_password, master_key_by_recovery, password_salt, recovery_salt, password_nonce, recovery_nonce, password_hint)
         VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            setup_result.master_key_by_password,
            setup_result.master_key_by_recovery,
            setup_result.password_salt.to_vec(),
            setup_result.recovery_salt.to_vec(),
            setup_result.password_nonce.to_vec(),
            setup_result.recovery_nonce.to_vec(),
            hint,
        ],
    )?;

    // Set state
    *state.private_db.lock().unwrap() = Some(conn);
    *state.master_key.lock().unwrap() = Some(MasterKey(setup_result.master_key));
    *state.space.lock().unwrap() = SpaceType::Private;
    *state.is_setup.lock().unwrap() = true;

    // Also ensure public db exists
    let public_db_path = state.data_dir.join("public.db");
    let public_conn = connection::open_or_create(&public_db_path)?;
    *state.public_db.lock().unwrap() = Some(public_conn);

    Ok(SetupResponse {
        recovery_code: setup_result.recovery_code,
    })
}

/// Login with password. Returns private space if correct, public space if wrong.
#[tauri::command]
pub fn login(state: State<AppState>, password: String) -> Result<LoginResult, MurmurError> {
    let private_db_path = state.data_dir.join("private.db");
    let public_db_path = state.data_dir.join("public.db");

    // Check if first time
    if !connection::is_setup(&private_db_path) {
        return Ok(LoginResult {
            space: "none".to_string(),
            is_first_time: true,
        });
    }

    // Open private db to read key_store
    let private_conn = connection::open_or_create(&private_db_path)?;

    // Read key_store
    let (wrapped_key, salt, nonce): (Vec<u8>, Vec<u8>, Vec<u8>) = private_conn.query_row(
        "SELECT master_key_by_password, password_salt, password_nonce FROM key_store WHERE id = 1",
        [],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    )?;

    let mut salt_arr = [0u8; 16];
    salt_arr.copy_from_slice(&salt);
    let mut nonce_arr = [0u8; 12];
    nonce_arr.copy_from_slice(&nonce);

    // Try to unlock with password
    match mk::try_unlock_with_password(&password, &wrapped_key, &salt_arr, &nonce_arr) {
        Ok(master_key) => {
            // Correct password → private space
            *state.private_db.lock().unwrap() = Some(private_conn);
            *state.master_key.lock().unwrap() = Some(MasterKey(master_key));
            *state.space.lock().unwrap() = SpaceType::Private;
            *state.is_setup.lock().unwrap() = true;

            // Also open public db
            let public_conn = connection::open_or_create(&public_db_path)?;
            *state.public_db.lock().unwrap() = Some(public_conn);

            Ok(LoginResult {
                space: "private".to_string(),
                is_first_time: false,
            })
        }
        Err(_) => {
            // Wrong password → public space (no error shown)
            let public_conn = connection::open_or_create(&public_db_path)?;
            *state.public_db.lock().unwrap() = Some(public_conn);
            *state.space.lock().unwrap() = SpaceType::Public;
            *state.is_setup.lock().unwrap() = true;

            Ok(LoginResult {
                space: "public".to_string(),
                is_first_time: false,
            })
        }
    }
}

/// Get password hint
#[tauri::command]
pub fn get_password_hint(state: State<AppState>) -> Result<Option<String>, MurmurError> {
    let private_db_path = state.data_dir.join("private.db");
    if !private_db_path.exists() {
        return Ok(None);
    }

    let conn = connection::open_or_create(&private_db_path)?;
    let hint: Option<String> = conn
        .query_row(
            "SELECT password_hint FROM key_store WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .unwrap_or(None);

    Ok(hint)
}

/// Lock the app (clear master key, return to login)
#[tauri::command]
pub fn lock(state: State<AppState>) -> Result<(), MurmurError> {
    *state.master_key.lock().unwrap() = None;
    *state.private_db.lock().unwrap() = None;
    *state.public_db.lock().unwrap() = None;
    *state.space.lock().unwrap() = SpaceType::Public;
    Ok(())
}

/// Get current space type
#[tauri::command]
pub fn get_space(state: State<AppState>) -> Result<String, MurmurError> {
    let space = state.space.lock().unwrap();
    Ok(match *space {
        SpaceType::Private => "private".to_string(),
        SpaceType::Public => "public".to_string(),
    })
}

/// Switch between private and public space (only available when logged in as private)
#[tauri::command]
pub fn switch_space(state: State<AppState>, target: String) -> Result<String, MurmurError> {
    let has_master_key = state.master_key.lock().unwrap().is_some();
    if !has_master_key {
        // Cannot switch to private without master key
        return Ok("public".to_string());
    }

    match target.as_str() {
        "private" => {
            *state.space.lock().unwrap() = SpaceType::Private;
            Ok("private".to_string())
        }
        "public" => {
            *state.space.lock().unwrap() = SpaceType::Public;
            Ok("public".to_string())
        }
        _ => Ok(state.space.lock().unwrap().clone())
            .map(|s| match s {
                SpaceType::Private => "private".to_string(),
                SpaceType::Public => "public".to_string(),
            }),
    }
}
