use tauri::State;

use crate::crypto::master_key as mk;
use crate::db::{connection, models::{LoginResult, SetupResponse}};
use crate::error::MurmurError;
use crate::state::{AppState, MasterKey, SpaceType};
use crate::crypto::{aes, argon2_kdf};

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

    // Read wrong_password_action setting
    let wrong_pw_action: String = private_conn
        .query_row(
            "SELECT wrong_password_action FROM key_store WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| "public".to_string());

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
            if wrong_pw_action == "deny" {
                // Wrong password → deny access
                Ok(LoginResult {
                    space: "denied".to_string(),
                    is_first_time: false,
                })
            } else {
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

/// Change password (verify old, set new)
#[tauri::command]
pub fn change_password(
    state: State<AppState>,
    old_password: String,
    new_password: String,
    new_hint: Option<String>,
) -> Result<(), MurmurError> {
    let conn_lock = state.private_db.lock().unwrap();
    let conn = conn_lock.as_ref().ok_or(MurmurError::NotAuthenticated)?;

    // Read current key_store
    let (wrapped_key, salt, nonce): (Vec<u8>, Vec<u8>, Vec<u8>) = conn.query_row(
        "SELECT master_key_by_password, password_salt, password_nonce FROM key_store WHERE id = 1",
        [],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    )?;

    let mut salt_arr = [0u8; 16];
    salt_arr.copy_from_slice(&salt);
    let mut nonce_arr = [0u8; 12];
    nonce_arr.copy_from_slice(&nonce);

    // Verify old password by unwrapping master key
    let master_key = mk::try_unlock_with_password(&old_password, &wrapped_key, &salt_arr, &nonce_arr)?;

    // Re-wrap with new password
    let new_salt = argon2_kdf::generate_salt();
    let new_nonce = aes::generate_nonce();
    let new_derived = argon2_kdf::derive_key(&new_password, &new_salt)?;
    let new_wrapped = mk::wrap(&master_key, &new_derived, &new_nonce)?;

    // Update key_store (only password side, recovery stays the same)
    conn.execute(
        "UPDATE key_store SET master_key_by_password = ?1, password_salt = ?2, password_nonce = ?3, password_hint = ?4, updated_at = datetime('now', 'localtime') WHERE id = 1",
        rusqlite::params![new_wrapped, new_salt.to_vec(), new_nonce.to_vec(), new_hint],
    )?;

    Ok(())
}

/// Reset password using recovery code. Returns new recovery code.
#[tauri::command]
pub fn reset_password_with_recovery(
    state: State<AppState>,
    recovery_code: String,
    new_password: String,
    new_hint: Option<String>,
) -> Result<SetupResponse, MurmurError> {
    let private_db_path = state.data_dir.join("private.db");
    let conn = connection::open_or_create(&private_db_path)?;

    // Read key_store
    let (recovery_wrapped, recovery_salt, recovery_nonce): (Vec<u8>, Vec<u8>, Vec<u8>) = conn.query_row(
        "SELECT master_key_by_recovery, recovery_salt, recovery_nonce FROM key_store WHERE id = 1",
        [],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    )?;

    let mut salt_arr = [0u8; 16];
    salt_arr.copy_from_slice(&recovery_salt);
    let mut nonce_arr = [0u8; 12];
    nonce_arr.copy_from_slice(&recovery_nonce);

    // Verify recovery code
    let master_key = mk::try_unlock_with_recovery(&recovery_code, &recovery_wrapped, &salt_arr, &nonce_arr)?;

    // Generate new password wrapping
    let new_password_salt = argon2_kdf::generate_salt();
    let new_password_nonce = aes::generate_nonce();
    let new_password_derived = argon2_kdf::derive_key(&new_password, &new_password_salt)?;
    let new_password_wrapped = mk::wrap(&master_key, &new_password_derived, &new_password_nonce)?;

    // Generate new recovery code
    let new_recovery_code = mk::generate_recovery_code();
    let new_recovery_salt = argon2_kdf::generate_salt();
    let new_recovery_nonce = aes::generate_nonce();
    let new_recovery_derived = argon2_kdf::derive_key(&new_recovery_code, &new_recovery_salt)?;
    let new_recovery_wrapped = mk::wrap(&master_key, &new_recovery_derived, &new_recovery_nonce)?;

    // Update key_store
    conn.execute(
        "UPDATE key_store SET master_key_by_password = ?1, password_salt = ?2, password_nonce = ?3, master_key_by_recovery = ?4, recovery_salt = ?5, recovery_nonce = ?6, password_hint = ?7, updated_at = datetime('now', 'localtime') WHERE id = 1",
        rusqlite::params![
            new_password_wrapped, new_password_salt.to_vec(), new_password_nonce.to_vec(),
            new_recovery_wrapped, new_recovery_salt.to_vec(), new_recovery_nonce.to_vec(),
            new_hint,
        ],
    )?;

    // Set state as logged in to private space
    *state.private_db.lock().unwrap() = Some(conn);
    *state.master_key.lock().unwrap() = Some(MasterKey(master_key));
    *state.space.lock().unwrap() = SpaceType::Private;
    *state.is_setup.lock().unwrap() = true;

    let public_db_path = state.data_dir.join("public.db");
    let public_conn = connection::open_or_create(&public_db_path)?;
    *state.public_db.lock().unwrap() = Some(public_conn);

    Ok(SetupResponse {
        recovery_code: new_recovery_code,
    })
}

/// Regenerate recovery code (requires being logged in with master key)
#[tauri::command]
pub fn regenerate_recovery_code(
    state: State<AppState>,
) -> Result<String, MurmurError> {
    let mk_lock = state.master_key.lock().unwrap();
    let master_key = mk_lock.as_ref().ok_or(MurmurError::NotAuthenticated)?;

    let conn_lock = state.private_db.lock().unwrap();
    let conn = conn_lock.as_ref().ok_or(MurmurError::NotAuthenticated)?;

    // Generate new recovery code
    let new_recovery_code = mk::generate_recovery_code();
    let new_recovery_salt = argon2_kdf::generate_salt();
    let new_recovery_nonce = aes::generate_nonce();
    let new_recovery_derived = argon2_kdf::derive_key(&new_recovery_code, &new_recovery_salt)?;
    let new_recovery_wrapped = mk::wrap(&master_key.0, &new_recovery_derived, &new_recovery_nonce)?;

    conn.execute(
        "UPDATE key_store SET master_key_by_recovery = ?1, recovery_salt = ?2, recovery_nonce = ?3, updated_at = datetime('now', 'localtime') WHERE id = 1",
        rusqlite::params![new_recovery_wrapped, new_recovery_salt.to_vec(), new_recovery_nonce.to_vec()],
    )?;

    Ok(new_recovery_code)
}

/// Get wrong password action setting
#[tauri::command]
pub fn get_wrong_password_action(state: State<AppState>) -> Result<String, MurmurError> {
    let conn_lock = state.private_db.lock().unwrap();
    let conn = conn_lock.as_ref().ok_or(MurmurError::NotAuthenticated)?;

    let action: String = conn
        .query_row(
            "SELECT wrong_password_action FROM key_store WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| "public".to_string());

    Ok(action)
}

/// Set wrong password action: "public" (enter public notebook) or "deny" (reject login)
#[tauri::command]
pub fn set_wrong_password_action(
    state: State<AppState>,
    action: String,
) -> Result<(), MurmurError> {
    let conn_lock = state.private_db.lock().unwrap();
    let conn = conn_lock.as_ref().ok_or(MurmurError::NotAuthenticated)?;

    conn.execute(
        "UPDATE key_store SET wrong_password_action = ?1, updated_at = datetime('now', 'localtime') WHERE id = 1",
        rusqlite::params![action],
    )?;

    Ok(())
}

/// Update password hint only
#[tauri::command]
pub fn update_password_hint(
    state: State<AppState>,
    hint: Option<String>,
) -> Result<(), MurmurError> {
    let conn_lock = state.private_db.lock().unwrap();
    let conn = conn_lock.as_ref().ok_or(MurmurError::NotAuthenticated)?;

    conn.execute(
        "UPDATE key_store SET password_hint = ?1, updated_at = datetime('now', 'localtime') WHERE id = 1",
        rusqlite::params![hint],
    )?;

    Ok(())
}
