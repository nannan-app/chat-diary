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
    api_model: Option<String>,
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

    if api_key.is_empty() && api_provider != "ollama" {
        return Err(MurmurError::General("Please configure AI API Key in settings".into()));
    }

    // Build AI prompt
    let system_prompt = format!(
        "{}\n\n你是「喃喃」日记 App 的 AI 伙伴。用户刚刚写完了今天的日记，请你：\n\
        1. 真诚地回应用户今天经历的情绪和事件，像一个懂 ta 的老朋友\n\
        2. 可以轻轻提一句你注意到的亮点或值得珍惜的瞬间\n\
        3. 如果用户情绪低落，给予温柔的共情而非说教\n\
        4. 语气自然随和，不要像客服，不要用「亲」「您」\n\
        5. 控制在 2-3 段，简短有温度即可",
        personality
    );

    // Call AI API based on provider
    let model = api_model.unwrap_or_default();
    let ai_reply: AiReply = match api_provider.as_str() {
        "anthropic" => {
            let m = if model.is_empty() { "claude-sonnet-4-20250514".to_string() } else { model };
            call_anthropic(&api_key, &m, &system_prompt, &messages_text).await?
        }
        "google" => {
            let m = if model.is_empty() { "gemini-2.0-flash".to_string() } else { model };
            call_google_gemini(&api_key, &m, &system_prompt, &messages_text).await?
        }
        "minimax" => {
            let url = api_url.unwrap_or_else(|| "https://api.minimaxi.com/anthropic/v1/messages".to_string());
            let m = if model.is_empty() { "MiniMax-M2.7".to_string() } else { model };
            call_anthropic_compatible(&url, &api_key, &m, &system_prompt, &messages_text).await?
        }
        "minimax_global" => {
            let url = api_url.unwrap_or_else(|| "https://api.minimax.io/anthropic/v1/messages".to_string());
            let m = if model.is_empty() { "MiniMax-M2.7".to_string() } else { model };
            call_anthropic_compatible(&url, &api_key, &m, &system_prompt, &messages_text).await?
        }
        "deepseek" => {
            let url = api_url.unwrap_or_else(|| "https://api.deepseek.com/v1/chat/completions".to_string());
            let m = if model.is_empty() { "deepseek-chat".to_string() } else { model };
            call_openai_compatible(&url, &api_key, &m, &system_prompt, &messages_text).await?
        }
        "ollama" => {
            let url = api_url.unwrap_or_else(|| "http://localhost:11434/v1/chat/completions".to_string());
            let m = if model.is_empty() { "llama3.2".to_string() } else { model };
            let key = if api_key.is_empty() { "ollama".to_string() } else { api_key };
            call_openai_compatible(&url, &key, &m, &system_prompt, &messages_text).await?
        }
        _ => {
            let url = api_url.unwrap_or_else(|| "https://api.openai.com/v1/chat/completions".to_string());
            let m = if model.is_empty() { "gpt-4o-mini".to_string() } else { model };
            call_openai_compatible(&url, &api_key, &m, &system_prompt, &messages_text).await?
        }
    };

    // Insert AI reply as message (content is JSON with thinking/text)
    let content_str = serde_json::to_string(&ai_reply)
        .unwrap_or_else(|_| ai_reply.text.clone());

    let message = with_db(&state, |conn| {
        diary_repo::insert_message(
            conn,
            diary_day_id,
            "ai_reply",
            Some(&content_str),
            None,
            None,
            None,
            None,
            "app",
        )
    })?;

    Ok(message)
}

#[derive(serde::Serialize)]
struct AiReply {
    text: String,
    thinking: Option<String>,
}

async fn call_openai_compatible(
    url: &str,
    api_key: &str,
    model: &str,
    system_prompt: &str,
    user_content: &str,
) -> Result<AiReply, MurmurError> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": model,
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

    let status = resp.status();
    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| MurmurError::General(format!("AI response parse failed: {}", e)))?;

    if !status.is_success() {
        let err_msg = json["error"]["message"].as_str()
            .or_else(|| json["error"].as_str())
            .unwrap_or("unknown error");
        return Err(MurmurError::General(format!("API {} error: {}", status.as_u16(), err_msg)));
    }

    let text = json["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| MurmurError::General(format!("AI returned unexpected response: {}", json)))?;

    Ok(AiReply { text, thinking: None })
}

async fn call_google_gemini(
    api_key: &str,
    model: &str,
    system_prompt: &str,
    user_content: &str,
) -> Result<AiReply, MurmurError> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model, api_key
    );
    let body = serde_json::json!({
        "system_instruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": [{
            "parts": [{"text": user_content}]
        }],
        "generationConfig": {
            "maxOutputTokens": 500
        }
    });

    let resp = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| MurmurError::General(format!("AI request failed: {}", e)))?;

    let status = resp.status();
    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| MurmurError::General(format!("AI response parse failed: {}", e)))?;

    if !status.is_success() {
        let err_msg = json["error"]["message"].as_str().unwrap_or("unknown error");
        return Err(MurmurError::General(format!("API {} error: {}", status.as_u16(), err_msg)));
    }

    let text = json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| MurmurError::General(format!("AI returned unexpected response: {}", json)))?;

    Ok(AiReply { text, thinking: None })
}

/// Anthropic Messages API compatible endpoint (used by MiniMax etc.)
/// Uses Bearer auth instead of x-api-key header.
/// Extract text and thinking from Anthropic-format content array.
/// Handles both `[{type: "text", text: "..."}]` and `[{type: "thinking", thinking: "..."}, {type: "text", text: "..."}]`.
fn extract_anthropic_content(json: &serde_json::Value) -> Result<AiReply, MurmurError> {
    let content = json["content"].as_array()
        .ok_or_else(|| MurmurError::General(format!("AI returned unexpected response: {}", json)))?;

    let mut text = String::new();
    let mut thinking = String::new();

    for block in content {
        let block_type = block["type"].as_str().unwrap_or("");
        match block_type {
            "text" => {
                if let Some(t) = block["text"].as_str() {
                    text.push_str(t);
                }
            }
            "thinking" => {
                if let Some(t) = block["thinking"].as_str() {
                    thinking.push_str(t);
                }
            }
            _ => {}
        }
    }

    if text.is_empty() {
        return Err(MurmurError::General(format!("AI returned unexpected response: {}", json)));
    }

    Ok(AiReply {
        text,
        thinking: if thinking.is_empty() { None } else { Some(thinking) },
    })
}

async fn call_anthropic_compatible(
    url: &str,
    api_key: &str,
    model: &str,
    system_prompt: &str,
    user_content: &str,
) -> Result<AiReply, MurmurError> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": model,
        "max_tokens": 500,
        "system": system_prompt,
        "messages": [
            {"role": "user", "content": user_content}
        ]
    });

    let resp = client
        .post(url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| MurmurError::General(format!("AI request failed: {}", e)))?;

    let status = resp.status();
    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| MurmurError::General(format!("AI response parse failed: {}", e)))?;

    if !status.is_success() {
        let err_msg = json["error"]["message"].as_str()
            .or_else(|| json["error"].as_str())
            .unwrap_or("unknown error");
        return Err(MurmurError::General(format!("API {} error: {}", status.as_u16(), err_msg)));
    }

    extract_anthropic_content(&json)
}

async fn call_anthropic(
    api_key: &str,
    model: &str,
    system_prompt: &str,
    user_content: &str,
) -> Result<AiReply, MurmurError> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": model,
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

    let status = resp.status();
    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| MurmurError::General(format!("AI response parse failed: {}", e)))?;

    if !status.is_success() {
        let err_msg = json["error"]["message"].as_str()
            .or_else(|| json["error"].as_str())
            .unwrap_or("unknown error");
        return Err(MurmurError::General(format!("API {} error: {}", status.as_u16(), err_msg)));
    }

    extract_anthropic_content(&json)
}
