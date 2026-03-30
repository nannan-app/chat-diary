use tauri::State;

use crate::db::models::Tag;
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

const MORANDI_COLORS: &[&str] = &[
    "#8faabe", "#9cb89c", "#c9ad8a", "#a89bc4", "#8ab5b0",
    "#c9a0a0", "#bf9bab", "#a8b896", "#b8a07e", "#7ea8b8",
];

#[tauri::command]
pub fn get_tags(state: State<AppState>) -> Result<Vec<Tag>, MurmurError> {
    with_db(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT id, name, color, is_system, sort_order FROM tags ORDER BY sort_order"
        )?;
        let tags = stmt
            .query_map([], |row| {
                Ok(Tag {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                    is_system: row.get(3)?,
                    sort_order: row.get(4)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(tags)
    })
}

#[tauri::command]
pub fn create_tag(state: State<AppState>, name: String) -> Result<Tag, MurmurError> {
    with_db(&state, |conn| {
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM tags", [], |row| row.get(0))?;
        let color = MORANDI_COLORS[(count as usize) % MORANDI_COLORS.len()];
        let sort_order = count + 1;

        conn.execute(
            "INSERT INTO tags (name, color, is_system, sort_order) VALUES (?1, ?2, 0, ?3)",
            rusqlite::params![name, color, sort_order],
        )?;
        let id = conn.last_insert_rowid();
        Ok(Tag {
            id,
            name,
            color: color.to_string(),
            is_system: false,
            sort_order,
        })
    })
}

#[tauri::command]
pub fn delete_tag(state: State<AppState>, tag_id: i64) -> Result<(), MurmurError> {
    with_db(&state, |conn| {
        conn.execute("DELETE FROM diary_day_tags WHERE tag_id = ?1", [tag_id])?;
        conn.execute("DELETE FROM tags WHERE id = ?1 AND is_system = 0", [tag_id])?;
        Ok(())
    })
}

#[tauri::command]
pub fn set_day_tags(state: State<AppState>, diary_day_id: i64, tag_ids: Vec<i64>) -> Result<(), MurmurError> {
    with_db(&state, |conn| {
        conn.execute("DELETE FROM diary_day_tags WHERE diary_day_id = ?1", [diary_day_id])?;
        for tag_id in &tag_ids {
            conn.execute(
                "INSERT INTO diary_day_tags (diary_day_id, tag_id) VALUES (?1, ?2)",
                rusqlite::params![diary_day_id, tag_id],
            )?;
        }
        Ok(())
    })
}

#[tauri::command]
pub fn get_day_tags(state: State<AppState>, diary_day_id: i64) -> Result<Vec<Tag>, MurmurError> {
    with_db(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT t.id, t.name, t.color, t.is_system, t.sort_order
             FROM tags t JOIN diary_day_tags dt ON dt.tag_id = t.id
             WHERE dt.diary_day_id = ?1 ORDER BY t.sort_order"
        )?;
        let tags = stmt
            .query_map([diary_day_id], |row| {
                Ok(Tag {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                    is_system: row.get(3)?,
                    sort_order: row.get(4)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(tags)
    })
}
