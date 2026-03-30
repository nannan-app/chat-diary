use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiaryDay {
    pub id: i64,
    pub date: String,
    pub summary: Option<String>,
    pub word_count: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: i64,
    pub diary_day_id: i64,
    pub kind: String,
    pub content: Option<String>,
    pub image_id: Option<i64>,
    pub article_id: Option<i64>,
    pub mood: Option<String>,
    pub quote_ref_id: Option<i64>,
    pub source: String,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
    // Joined fields for display
    pub quote_content: Option<String>,
    pub thumbnail: Option<Vec<u8>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageRecord {
    pub id: i64,
    pub diary_day_id: i64,
    pub file_hash: String,
    pub original_width: Option<i32>,
    pub original_height: Option<i32>,
    pub file_size: Option<i64>,
    pub mime_type: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Article {
    pub id: i64,
    pub diary_day_id: i64,
    pub title: String,
    pub content: String,
    pub word_count: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub is_system: bool,
    pub sort_order: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Favorite {
    pub id: i64,
    pub message_id: Option<i64>,
    pub article_id: Option<i64>,
    pub content_preview: Option<String>,
    pub source_date: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Achievement {
    pub id: i64,
    pub key: String,
    pub unlocked_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WritingStats {
    pub total_days: i64,
    pub days_with_entries: i64,
    pub total_words: i64,
    pub first_entry_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub diary_date: String,
    pub content_preview: String,
    pub kind: String, // "message" | "article"
    pub message_id: Option<i64>,
    pub article_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResult {
    pub space: String, // "private" | "public"
    pub is_first_time: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetupResponse {
    pub recovery_code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GalleryImage {
    pub id: i64,
    pub thumbnail: Vec<u8>,
    pub date: String,
}
