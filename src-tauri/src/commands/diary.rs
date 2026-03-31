use tauri::State;

use crate::db::{diary_repo, models::{DiaryDay, Message, SearchResult}};
use crate::error::MurmurError;
use crate::state::{AppState, SpaceType};

/// Helper to get the active database connection
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

/// Get or create today's diary day
#[tauri::command]
pub fn get_or_create_today(state: State<AppState>) -> Result<DiaryDay, MurmurError> {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    with_db(&state, |conn| diary_repo::get_or_create_day(conn, &today))
}

/// Get diary day for a specific date
#[tauri::command]
pub fn get_diary_day(state: State<AppState>, date: String) -> Result<DiaryDay, MurmurError> {
    with_db(&state, |conn| diary_repo::get_or_create_day(conn, &date))
}

/// List diary days for a year-month
#[tauri::command]
pub fn list_diary_days(
    state: State<AppState>,
    year: i32,
    month: u32,
) -> Result<Vec<DiaryDay>, MurmurError> {
    with_db(&state, |conn| diary_repo::list_days(conn, year, month))
}

/// Get all messages for a diary day
#[tauri::command]
pub fn get_messages(
    state: State<AppState>,
    diary_day_id: i64,
) -> Result<Vec<Message>, MurmurError> {
    with_db(&state, |conn| diary_repo::get_messages(conn, diary_day_id))
}

/// Send a new message
#[tauri::command]
pub fn send_message(
    state: State<AppState>,
    diary_day_id: i64,
    kind: String,
    content: Option<String>,
    image_id: Option<i64>,
    article_id: Option<i64>,
    mood: Option<String>,
    quote_ref_id: Option<i64>,
    source: Option<String>,
) -> Result<Message, MurmurError> {
    let src = source.as_deref().unwrap_or("app");
    with_db(&state, |conn| {
        diary_repo::insert_message(
            conn,
            diary_day_id,
            &kind,
            content.as_deref(),
            image_id,
            article_id,
            mood.as_deref(),
            quote_ref_id,
            src,
        )
    })
}

/// Edit a message
#[tauri::command]
pub fn edit_message(
    state: State<AppState>,
    message_id: i64,
    content: String,
) -> Result<(), MurmurError> {
    with_db(&state, |conn| {
        diary_repo::edit_message(conn, message_id, &content)
    })
}

/// Delete a message
#[tauri::command]
pub fn delete_message(state: State<AppState>, message_id: i64) -> Result<(), MurmurError> {
    with_db(&state, |conn| diary_repo::delete_message(conn, message_id))
}

/// Delete entire diary day
#[tauri::command]
pub fn delete_diary_day(state: State<AppState>, diary_day_id: i64) -> Result<(), MurmurError> {
    with_db(&state, |conn| {
        diary_repo::delete_diary_day(conn, diary_day_id)
    })
}

/// Create an article (long-form markdown)
#[tauri::command]
pub fn create_article(
    state: State<AppState>,
    diary_day_id: i64,
    title: String,
    content: String,
) -> Result<Message, MurmurError> {
    with_db(&state, |conn| {
        let word_count = content.chars().count() as i64;
        conn.execute(
            "INSERT INTO articles (diary_day_id, title, content, word_count) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![diary_day_id, title, content, word_count],
        )?;
        let article_id = conn.last_insert_rowid();

        // Update FTS
        conn.execute(
            "INSERT INTO articles_fts (rowid, title, content) VALUES (?1, ?2, ?3)",
            rusqlite::params![article_id, title, content],
        )?;

        // Create article message in chat flow
        diary_repo::insert_message(
            conn,
            diary_day_id,
            "article",
            Some(&title),
            None,
            Some(article_id),
            None,
            None,
            "app",
        )
    })
}

/// Get all articles (for library view)
#[tauri::command]
pub fn get_all_articles(state: State<AppState>) -> Result<Vec<crate::db::models::Article>, MurmurError> {
    with_db(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT a.id, a.diary_day_id, a.title, a.content, a.word_count, a.created_at, a.updated_at
             FROM articles a ORDER BY a.created_at DESC"
        )?;
        let articles = stmt
            .query_map([], |row| {
                Ok(crate::db::models::Article {
                    id: row.get(0)?,
                    diary_day_id: row.get(1)?,
                    title: row.get(2)?,
                    content: row.get(3)?,
                    word_count: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(articles)
    })
}

/// Get a single article by id
#[tauri::command]
pub fn get_article(state: State<AppState>, article_id: i64) -> Result<crate::db::models::Article, MurmurError> {
    with_db(&state, |conn| {
        let article = conn.query_row(
            "SELECT id, diary_day_id, title, content, word_count, created_at, updated_at FROM articles WHERE id = ?1",
            [article_id],
            |row| {
                Ok(crate::db::models::Article {
                    id: row.get(0)?,
                    diary_day_id: row.get(1)?,
                    title: row.get(2)?,
                    content: row.get(3)?,
                    word_count: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            },
        )?;
        Ok(article)
    })
}

/// Get all dates that have diary entries (for calendar dots)
#[tauri::command]
pub fn get_diary_dates(state: State<AppState>, year: i32, month: u32) -> Result<Vec<String>, MurmurError> {
    with_db(&state, |conn| {
        let date_prefix = format!("{:04}-{:02}", year, month);
        let mut stmt = conn.prepare(
            "SELECT date FROM diary_days WHERE date LIKE ?1 AND word_count > 0 ORDER BY date"
        )?;
        let dates = stmt
            .query_map([format!("{}%", date_prefix)], |row| row.get::<_, String>(0))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(dates)
    })
}

/// Search across messages and articles
#[tauri::command]
pub fn search(state: State<AppState>, query: String) -> Result<Vec<SearchResult>, MurmurError> {
    with_db(&state, |conn| diary_repo::search(conn, &query))
}

/// Get a random diary day that has entries
#[tauri::command]
pub fn get_random_diary_day(state: State<AppState>) -> Result<Option<DiaryDay>, MurmurError> {
    with_db(&state, |conn| {
        let day = conn.query_row(
            "SELECT id, date, summary, word_count, created_at, updated_at FROM diary_days WHERE word_count > 0 ORDER BY RANDOM() LIMIT 1",
            [],
            |row| {
                Ok(DiaryDay {
                    id: row.get(0)?,
                    date: row.get(1)?,
                    summary: row.get(2)?,
                    word_count: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        ).ok();

        Ok(day)
    })
}
