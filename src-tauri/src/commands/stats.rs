use tauri::State;

use crate::db::models::{Achievement, WritingStats};
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
pub fn get_writing_stats(state: State<AppState>) -> Result<WritingStats, MurmurError> {
    with_db(&state, |conn| {
        let total_days: i64 = conn.query_row(
            "SELECT COUNT(*) FROM diary_days", [], |row| row.get(0)
        ).unwrap_or(0);

        let days_with_entries: i64 = conn.query_row(
            "SELECT COUNT(*) FROM diary_days WHERE word_count > 0", [], |row| row.get(0)
        ).unwrap_or(0);

        let total_words: i64 = conn.query_row(
            "SELECT COALESCE(SUM(word_count), 0) FROM diary_days", [], |row| row.get(0)
        ).unwrap_or(0);

        let first_entry_date: Option<String> = conn.query_row(
            "SELECT MIN(date) FROM diary_days WHERE word_count > 0", [], |row| row.get(0)
        ).unwrap_or(None);

        Ok(WritingStats {
            total_days,
            days_with_entries,
            total_words,
            first_entry_date,
        })
    })
}

#[tauri::command]
pub fn get_achievements(state: State<AppState>) -> Result<Vec<Achievement>, MurmurError> {
    with_db(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT id, key, unlocked_at FROM achievements ORDER BY id"
        )?;
        let achievements = stmt
            .query_map([], |row| {
                Ok(Achievement {
                    id: row.get(0)?,
                    key: row.get(1)?,
                    unlocked_at: row.get(2)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(achievements)
    })
}

#[tauri::command]
pub fn check_and_unlock_achievements(state: State<AppState>) -> Result<Vec<String>, MurmurError> {
    with_db(&state, |conn| {
        let mut newly_unlocked = Vec::new();
        let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

        // Helper: unlock if not already
        let try_unlock = |conn: &rusqlite::Connection, key: &str, now: &str| -> Result<bool, MurmurError> {
            let already: bool = conn.query_row(
                "SELECT unlocked_at IS NOT NULL FROM achievements WHERE key = ?1",
                [key], |row| row.get(0)
            ).unwrap_or(true);
            if !already {
                conn.execute(
                    "UPDATE achievements SET unlocked_at = ?1 WHERE key = ?2",
                    rusqlite::params![now, key],
                )?;
                return Ok(true);
            }
            Ok(false)
        };

        let days_with_entries: i64 = conn.query_row(
            "SELECT COUNT(*) FROM diary_days WHERE word_count > 0", [], |row| row.get(0)
        ).unwrap_or(0);

        let total_words: i64 = conn.query_row(
            "SELECT COALESCE(SUM(word_count), 0) FROM diary_days", [], |row| row.get(0)
        ).unwrap_or(0);

        let total_images: i64 = conn.query_row(
            "SELECT COUNT(*) FROM images", [], |row| row.get(0)
        ).unwrap_or(0);

        // first_entry
        if days_with_entries >= 1 && try_unlock(conn, "first_entry", &now)? {
            newly_unlocked.push("first_entry".to_string());
        }
        if days_with_entries >= 7 && try_unlock(conn, "seven_days", &now)? {
            newly_unlocked.push("seven_days".to_string());
        }
        if days_with_entries >= 30 && try_unlock(conn, "thirty_days", &now)? {
            newly_unlocked.push("thirty_days".to_string());
        }
        if days_with_entries >= 365 && try_unlock(conn, "one_year", &now)? {
            newly_unlocked.push("one_year".to_string());
        }
        if total_words >= 1000 && try_unlock(conn, "thousand_words", &now)? {
            newly_unlocked.push("thousand_words".to_string());
        }
        if total_words >= 10000 && try_unlock(conn, "ten_thousand_words", &now)? {
            newly_unlocked.push("ten_thousand_words".to_string());
        }
        if total_words >= 100000 && try_unlock(conn, "hundred_thousand_words", &now)? {
            newly_unlocked.push("hundred_thousand_words".to_string());
        }
        if total_images >= 1 && try_unlock(conn, "first_photo", &now)? {
            newly_unlocked.push("first_photo".to_string());
        }
        if total_images >= 100 && try_unlock(conn, "hundred_photos", &now)? {
            newly_unlocked.push("hundred_photos".to_string());
        }

        // Night owl: check current hour
        let hour = chrono::Local::now().hour();
        if hour == 3 && try_unlock(conn, "night_owl", &now)? {
            newly_unlocked.push("night_owl".to_string());
        }

        // sunny_week: 7 consecutive days with happy mood
        let happy_days: i64 = conn.query_row(
            "SELECT COUNT(DISTINCT m.diary_day_id) FROM messages m
             JOIN diary_days d ON d.id = m.diary_day_id
             WHERE m.kind = 'mood' AND m.mood IN ('😊', '😄', '🥰')
             AND d.date >= date('now', '-7 days')",
            [], |row| row.get(0)
        ).unwrap_or(0);
        if happy_days >= 7 && try_unlock(conn, "sunny_week", &now)? {
            newly_unlocked.push("sunny_week".to_string());
        }

        // mood_painter: used all mood types
        let distinct_moods: i64 = conn.query_row(
            "SELECT COUNT(DISTINCT mood) FROM messages WHERE kind = 'mood' AND mood IS NOT NULL",
            [], |row| row.get(0)
        ).unwrap_or(0);
        if distinct_moods >= 10 && try_unlock(conn, "mood_painter", &now)? {
            newly_unlocked.push("mood_painter".to_string());
        }

        // ai_first: used AI summary at least once
        let ai_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM messages WHERE kind = 'ai_reply'",
            [], |row| row.get(0)
        ).unwrap_or(0);
        if ai_count >= 1 && try_unlock(conn, "ai_first", &now)? {
            newly_unlocked.push("ai_first".to_string());
        }

        // remote_delivery: first message from telegram/wechat
        let remote_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM messages WHERE source IN ('telegram', 'wechat')",
            [], |row| row.get(0)
        ).unwrap_or(0);
        if remote_count >= 1 && try_unlock(conn, "remote_delivery", &now)? {
            newly_unlocked.push("remote_delivery".to_string());
        }

        // time_traveler: used random memory feature (tracked via settings)
        let used_random: bool = conn.query_row(
            "SELECT COUNT(*) FROM settings WHERE key = 'used_random_memory' AND value = 'true'",
            [], |row| row.get::<_, i64>(0).map(|c| c > 0)
        ).unwrap_or(false);
        if used_random && try_unlock(conn, "time_traveler", &now)? {
            newly_unlocked.push("time_traveler".to_string());
        }

        Ok(newly_unlocked)
    })
}

use chrono::Timelike;
