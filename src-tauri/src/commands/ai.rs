use tauri::State;

use crate::db::{diary_repo, models::Message};
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

/// Request AI summary for today's diary. Collects all messages, sends to AI, inserts reply.
#[tauri::command]
pub async fn ai_summarize(
    state: State<'_, AppState>,
    diary_day_id: i64,
    api_provider: String,
    api_key: String,
    api_url: Option<String>,
    personality: String,
) -> Result<Message, MurmurError> {
    // Collect today's messages
    let messages_text = with_db(&state, |conn| {
        let messages = diary_repo::get_messages(conn, diary_day_id)?;
        let mut text = String::new();
        for msg in &messages {
            match msg.kind.as_str() {
                "text" => {
                    if let Some(c) = &msg.content {
                        text.push_str(&format!("用户: {}\n", c));
                    }
                }
                "ai_reply" => {
                    if let Some(c) = &msg.content {
                        text.push_str(&format!("AI: {}\n", c));
                    }
                }
                "mood" => {
                    if let Some(m) = &msg.mood {
                        text.push_str(&format!("用户心情: {}\n", m));
                    }
                }
                _ => {}
            }
        }
        Ok(text)
    })?;

    if messages_text.trim().is_empty() {
        return Err(MurmurError::General("今天还没有写日记内容".into()));
    }

    // Rate limit for built-in AI (10/day)
    if api_provider == "builtin" {
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let count = with_db(&state, |conn| {
            let count: i64 = conn.query_row(
                "SELECT COUNT(*) FROM messages WHERE diary_day_id IN (SELECT id FROM diary_days WHERE date = ?1) AND kind = 'ai_reply' AND source = 'app'",
                [&today],
                |row| row.get(0),
            ).unwrap_or(0);
            Ok(count)
        })?;
        if count >= 10 {
            return Err(MurmurError::General("今日内置 AI 使用次数已达上限（10次/天），请设置自定义 API Key 获得无限次使用".into()));
        }
    }

    // Build AI prompt
    let system_prompt = format!(
        "{}。请阅读用户今天的日记内容，给出温暖的总结和反馈。不要太长，2-3段即可。",
        personality
    );

    // Call AI API based on provider
    let ai_reply = match api_provider.as_str() {
        "openai" | "custom" => {
            let url = api_url.unwrap_or_else(|| "https://api.openai.com/v1/chat/completions".to_string());
            call_openai_compatible(&url, &api_key, &system_prompt, &messages_text).await?
        }
        "anthropic" => {
            call_anthropic(&api_key, &system_prompt, &messages_text).await?
        }
        _ => {
            // Built-in MiniMax - for now return a placeholder
            // In production, this would call MiniMax API with the developer's key
            format!("📝 今天你记录了不少内容呢！\n\n{}",
                "看起来今天过得很充实。继续保持记录的习惯，未来的你会感谢现在的自己。")
        }
    };

    // Insert AI reply as message
    let message = with_db(&state, |conn| {
        diary_repo::insert_message(
            conn,
            diary_day_id,
            "ai_reply",
            Some(&ai_reply),
            None,
            None,
            None,
            None,
            "app",
        )
    })?;

    Ok(message)
}

async fn call_openai_compatible(
    url: &str,
    api_key: &str,
    system_prompt: &str,
    user_content: &str,
) -> Result<String, MurmurError> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        "max_tokens": 500
    });

    let resp = client
        .post(url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| MurmurError::General(format!("AI request failed: {}", e)))?;

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| MurmurError::General(format!("AI response parse failed: {}", e)))?;

    json["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| MurmurError::General("AI returned empty response".into()))
}

async fn call_anthropic(
    api_key: &str,
    system_prompt: &str,
    user_content: &str,
) -> Result<String, MurmurError> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 500,
        "system": system_prompt,
        "messages": [
            {"role": "user", "content": user_content}
        ]
    });

    let resp = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| MurmurError::General(format!("AI request failed: {}", e)))?;

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| MurmurError::General(format!("AI response parse failed: {}", e)))?;

    json["content"][0]["text"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| MurmurError::General("AI returned empty response".into()))
}
