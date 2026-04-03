use tauri::State;

use crate::error::MurmurError;
use crate::state::{AppState, SpaceType};

fn with_db<F, T>(state: &State<AppState>, f: F) -> Result<T, MurmurError>
where
    F: FnOnce(&rusqlite::Connection) -> Result<T, MurmurError>,
{
    let space = state.space.lock().unwrap().clone();
    match space {
        SpaceType::Private => {
            let db = state.private_db.lock().unwrap();
            let conn = db.as_ref().ok_or(MurmurError::NotAuthenticated)?;
            f(conn)
        }
        SpaceType::Public => {
            let db = state.public_db.lock().unwrap();
            let conn = db.as_ref().ok_or(MurmurError::NotAuthenticated)?;
            f(conn)
        }
    }
}

#[tauri::command]
pub fn get_setting(state: State<AppState>, key: String) -> Result<Option<String>, MurmurError> {
    with_db(&state, |conn| {
        let result = conn.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            [&key],
            |row| row.get::<_, String>(0),
        );
        match result {
            Ok(val) => Ok(Some(val)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    })
}

#[tauri::command]
pub fn set_setting(state: State<AppState>, key: String, value: String) -> Result<(), MurmurError> {
    with_db(&state, |conn| {
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params![key, value],
        )?;
        Ok(())
    })
}

#[tauri::command]
pub fn delete_setting(state: State<AppState>, key: String) -> Result<(), MurmurError> {
    with_db(&state, |conn| {
        conn.execute("DELETE FROM settings WHERE key = ?1", rusqlite::params![key])?;
        Ok(())
    })
}

#[tauri::command]
pub fn get_all_settings(state: State<AppState>) -> Result<Vec<(String, String)>, MurmurError> {
    with_db(&state, |conn| {
        let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
        let settings = stmt
            .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(settings)
    })
}
