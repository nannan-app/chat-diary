export interface DiaryDay {
  id: number;
  date: string;
  summary: string | null;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  diary_day_id: number;
  kind: "text" | "image" | "mood" | "ai_reply" | "article" | "tag_change" | "system" | "file";
  content: string | null;
  image_id: number | null;
  article_id: number | null;
  file_id: number | null;
  mood: string | null;
  quote_ref_id: number | null;
  source: "app" | "telegram" | "wechat" | "quick_capture";
  sort_order: number;
  created_at: string;
  updated_at: string;
  quote_content: string | null;
  thumbnail: number[] | null;
  article_preview: string | null;
  file_name: string | null;
  file_size: number | null;
  file_mime_type: string | null;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  is_system: boolean;
  sort_order: number;
}

export interface Article {
  id: number;
  diary_day_id: number;
  title: string;
  content: string;
  word_count: number;
  created_at: string;
  updated_at: string;
  date: string | null;
}

export interface Favorite {
  id: number;
  message_id: number | null;
  article_id: number | null;
  content_preview: string | null;
  source_date: string;
  created_at: string;
}

export interface Achievement {
  id: number;
  key: string;
  unlocked_at: string | null;
}

export interface WritingStats {
  total_days: number;
  days_with_entries: number;
  total_words: number;
  first_entry_date: string | null;
}

export interface SearchResult {
  diary_date: string;
  content_preview: string;
  kind: "message" | "article";
  message_id: number | null;
  article_id: number | null;
}

export interface LoginResult {
  space: "private" | "public" | "none" | "denied";
  is_first_time: boolean;
}

export interface SetupResponse {
  recovery_code: string;
}

export interface FileItem {
  id: number;
  diary_day_id: number;
  file_hash: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  date: string | null;
}

export type NavSection = "diary" | "gallery" | "library" | "favorites" | "achievements" | "files";

export type SpaceType = "private" | "public";
