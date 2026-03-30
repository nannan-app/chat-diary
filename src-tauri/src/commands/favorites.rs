use tauri::State;

use crate::db::models::Favorite;
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
pub fn add_favorite(
    state: State<AppState>,
    message_id: Option<i64>,
    article_id: Option<i64>,
    content_preview: String,
    source_date: String,
) -> Result<Favorite, MurmurError> {
    with_db(&state, |conn| {
        conn.execute(
            "INSERT INTO favorites (message_id, article_id, content_preview, source_date) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![message_id, article_id, content_preview, source_date],
        )?;
        let id = conn.last_insert_rowid();
        Ok(Favorite {
            id,
            message_id,
            article_id,
            content_preview: Some(content_preview),
            source_date,
            created_at: chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        })
    })
}

#[tauri::command]
pub fn remove_favorite(state: State<AppState>, favorite_id: i64) -> Result<(), MurmurError> {
    with_db(&state, |conn| {
        conn.execute("DELETE FROM favorites WHERE id = ?1", [favorite_id])?;
        Ok(())
    })
}

#[tauri::command]
pub fn get_favorites(state: State<AppState>) -> Result<Vec<Favorite>, MurmurError> {
    with_db(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT id, message_id, article_id, content_preview, source_date, created_at
             FROM favorites ORDER BY created_at DESC"
        )?;
        let favs = stmt
            .query_map([], |row| {
                Ok(Favorite {
                    id: row.get(0)?,
                    message_id: row.get(1)?,
                    article_id: row.get(2)?,
                    content_preview: row.get(3)?,
                    source_date: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(favs)
    })
}
