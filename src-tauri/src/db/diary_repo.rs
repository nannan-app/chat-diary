use rusqlite::Connection;

use crate::error::MurmurError;
use super::models::{DiaryDay, Message};

/// Get or create a diary day for the given date
pub fn get_or_create_day(conn: &Connection, date: &str) -> Result<DiaryDay, MurmurError> {
    // Try to get existing
    let result = conn.query_row(
        "SELECT id, date, summary, word_count, created_at, updated_at FROM diary_days WHERE date = ?1",
        [date],
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
    );

    match result {
        Ok(day) => Ok(day),
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            conn.execute(
                "INSERT INTO diary_days (date) VALUES (?1)",
                [date],
            )?;
            let id = conn.last_insert_rowid();
            Ok(DiaryDay {
                id,
                date: date.to_string(),
                summary: None,
                word_count: 0,
                created_at: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
                updated_at: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
            })
        }
        Err(e) => Err(e.into()),
    }
}

/// List diary days for a given year-month, ordered by date desc
pub fn list_days(conn: &Connection, year: i32, month: u32) -> Result<Vec<DiaryDay>, MurmurError> {
    let date_prefix = format!("{:04}-{:02}", year, month);
    let mut stmt = conn.prepare(
        "SELECT id, date, summary, word_count, created_at, updated_at
         FROM diary_days
         WHERE date LIKE ?1
           AND EXISTS (SELECT 1 FROM messages WHERE diary_day_id = diary_days.id)
         ORDER BY date DESC",
    )?;

    let days = stmt
        .query_map([format!("{}%", date_prefix)], |row| {
            Ok(DiaryDay {
                id: row.get(0)?,
                date: row.get(1)?,
                summary: row.get(2)?,
                word_count: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(days)
}

/// Get all messages for a diary day
pub fn get_messages(conn: &Connection, diary_day_id: i64) -> Result<Vec<Message>, MurmurError> {
    let mut stmt = conn.prepare(
        "SELECT m.id, m.diary_day_id, m.kind, m.content, m.image_id, m.article_id,
                m.mood, m.quote_ref_id, m.source, m.sort_order, m.created_at, m.updated_at,
                q.content as quote_content,
                i.thumbnail,
                SUBSTR(a.content, 1, 200) as article_preview
         FROM messages m
         LEFT JOIN messages q ON m.quote_ref_id = q.id
         LEFT JOIN images i ON m.image_id = i.id
         LEFT JOIN articles a ON m.article_id = a.id
         WHERE m.diary_day_id = ?1
         ORDER BY m.sort_order ASC",
    )?;

    let messages = stmt
        .query_map([diary_day_id], |row| {
            Ok(Message {
                id: row.get(0)?,
                diary_day_id: row.get(1)?,
                kind: row.get(2)?,
                content: row.get(3)?,
                image_id: row.get(4)?,
                article_id: row.get(5)?,
                mood: row.get(6)?,
                quote_ref_id: row.get(7)?,
                source: row.get(8)?,
                sort_order: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
                quote_content: row.get(12)?,
                thumbnail: row.get(13)?,
                article_preview: row.get(14)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(messages)
}

/// Get next sort_order for a diary day
pub fn next_sort_order(conn: &Connection, diary_day_id: i64) -> Result<i64, MurmurError> {
    let max: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), 0) FROM messages WHERE diary_day_id = ?1",
            [diary_day_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    Ok(max + 1)
}

/// Insert a new message
pub fn insert_message(
    conn: &Connection,
    diary_day_id: i64,
    kind: &str,
    content: Option<&str>,
    image_id: Option<i64>,
    article_id: Option<i64>,
    mood: Option<&str>,
    quote_ref_id: Option<i64>,
    source: &str,
) -> Result<Message, MurmurError> {
    let sort_order = next_sort_order(conn, diary_day_id)?;

    conn.execute(
        "INSERT INTO messages (diary_day_id, kind, content, image_id, article_id, mood, quote_ref_id, source, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![diary_day_id, kind, content, image_id, article_id, mood, quote_ref_id, source, sort_order],
    )?;

    let id = conn.last_insert_rowid();
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Update word count if text message
    if kind == "text" {
        if let Some(text) = content {
            let word_count = text.chars().count() as i64;
            conn.execute(
                "UPDATE diary_days SET word_count = word_count + ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
                rusqlite::params![word_count, diary_day_id],
            )?;
        }
    }

    // Update FTS index
    if let Some(text) = content {
        conn.execute(
            "INSERT INTO messages_fts (rowid, content) VALUES (?1, ?2)",
            rusqlite::params![id, text],
        )?;
    }

    Ok(Message {
        id,
        diary_day_id,
        kind: kind.to_string(),
        content: content.map(|s| s.to_string()),
        image_id,
        article_id,
        mood: mood.map(|s| s.to_string()),
        quote_ref_id,
        source: source.to_string(),
        sort_order,
        created_at: now.clone(),
        updated_at: now,
        quote_content: None,
        thumbnail: None,
        article_preview: None,
    })
}

/// Edit a message's content
pub fn edit_message(conn: &Connection, message_id: i64, content: &str) -> Result<(), MurmurError> {
    conn.execute(
        "UPDATE messages SET content = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
        rusqlite::params![content, message_id],
    )?;
    // Update FTS
    conn.execute(
        "DELETE FROM messages_fts WHERE rowid = ?1",
        [message_id],
    )?;
    conn.execute(
        "INSERT INTO messages_fts (rowid, content) VALUES (?1, ?2)",
        rusqlite::params![message_id, content],
    )?;
    Ok(())
}

/// Delete a message
pub fn delete_message(conn: &Connection, message_id: i64) -> Result<(), MurmurError> {
    conn.execute(
        "DELETE FROM messages_fts WHERE rowid = ?1",
        [message_id],
    )?;
    conn.execute("DELETE FROM messages WHERE id = ?1", [message_id])?;
    Ok(())
}

/// Delete an entire diary day and all its messages
pub fn delete_diary_day(conn: &Connection, diary_day_id: i64) -> Result<(), MurmurError> {
    // Delete FTS entries for messages
    conn.execute(
        "DELETE FROM messages_fts WHERE rowid IN (SELECT id FROM messages WHERE diary_day_id = ?1)",
        [diary_day_id],
    )?;
    // CASCADE will handle messages, images, articles, diary_day_tags
    conn.execute("DELETE FROM diary_days WHERE id = ?1", [diary_day_id])?;
    Ok(())
}

/// Search messages and articles
pub fn search(conn: &Connection, query: &str) -> Result<Vec<super::models::SearchResult>, MurmurError> {
    let mut results = Vec::new();
    let like_pattern = format!("%{}%", query);

    // Search messages using LIKE for substring matching (better CJK support)
    let mut stmt = conn.prepare(
        "SELECT m.id, d.date, m.content
         FROM messages m
         JOIN diary_days d ON d.id = m.diary_day_id
         WHERE m.content LIKE ?1
         ORDER BY d.date DESC
         LIMIT 50",
    )?;
    let msg_results = stmt.query_map([&like_pattern], |row| {
        Ok(super::models::SearchResult {
            message_id: Some(row.get(0)?),
            article_id: None,
            diary_date: row.get(1)?,
            content_preview: row.get(2)?,
            kind: "message".to_string(),
        })
    })?;
    for r in msg_results {
        results.push(r?);
    }

    // Search articles using LIKE for substring matching
    let mut stmt = conn.prepare(
        "SELECT a.id, d.date, a.title
         FROM articles a
         JOIN diary_days d ON d.id = a.diary_day_id
         WHERE a.title LIKE ?1 OR a.content LIKE ?1
         ORDER BY d.date DESC
         LIMIT 50",
    )?;
    let art_results = stmt.query_map([&like_pattern], |row| {
        Ok(super::models::SearchResult {
            message_id: None,
            article_id: Some(row.get(0)?),
            diary_date: row.get(1)?,
            content_preview: row.get(2)?,
            kind: "article".to_string(),
        })
    })?;
    for r in art_results {
        results.push(r?);
    }

    Ok(results)
}
