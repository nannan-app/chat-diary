import { invoke } from "@tauri-apps/api/core";
import type {
  Achievement,
  Article,
  DiaryDay,
  Favorite,
  LoginResult,
  Message,
  SearchResult,
  SetupResponse,
  Tag,
  WritingStats,
} from "./types";

// Auth
export const checkSetup = () => invoke<boolean>("check_setup");
export const setupPassword = (password: string, hint?: string) =>
  invoke<SetupResponse>("setup_password", { password, hint });
export const login = (password: string) =>
  invoke<LoginResult>("login", { password });
export const getPasswordHint = () =>
  invoke<string | null>("get_password_hint");
export const lock = () => invoke<void>("lock");
export const getSpace = () => invoke<string>("get_space");
export const switchSpace = (target: string) =>
  invoke<string>("switch_space", { target });

// Diary
export const getOrCreateToday = () =>
  invoke<DiaryDay>("get_or_create_today");
export const getDiaryDay = (date: string) =>
  invoke<DiaryDay>("get_diary_day", { date });
export const listDiaryDays = (year: number, month: number) =>
  invoke<DiaryDay[]>("list_diary_days", { year, month });
export const getMessages = (diary_day_id: number) =>
  invoke<Message[]>("get_messages", { diary_day_id });
export const sendMessage = (params: {
  diary_day_id: number;
  kind: string;
  content?: string;
  image_id?: number;
  article_id?: number;
  mood?: string;
  quote_ref_id?: number;
  source?: string;
}) =>
  invoke<Message>("send_message", {
    diary_day_id: params.diary_day_id,
    kind: params.kind,
    content: params.content ?? null,
    image_id: params.image_id ?? null,
    article_id: params.article_id ?? null,
    mood: params.mood ?? null,
    quote_ref_id: params.quote_ref_id ?? null,
    source: params.source ?? null,
  });
export const editMessage = (message_id: number, content: string) =>
  invoke<void>("edit_message", { message_id, content });
export const deleteMessage = (message_id: number) =>
  invoke<void>("delete_message", { message_id });
export const deleteDiaryDay = (diary_day_id: number) =>
  invoke<void>("delete_diary_day", { diary_day_id });
export const getDiaryDates = (year: number, month: number) =>
  invoke<string[]>("get_diary_dates", { year, month });
export const createArticle = (diary_day_id: number, title: string, content: string) =>
  invoke<Message>("create_article", { diary_day_id, title, content });
export const getAllArticles = () =>
  invoke<Article[]>("get_all_articles");
export const searchDiary = (query: string) =>
  invoke<SearchResult[]>("search", { query });

// Media
export const uploadImage = (
  diary_day_id: number,
  image_bytes: number[],
  compress: boolean
) =>
  invoke<Message>("upload_image", { diary_day_id, image_bytes, compress });
export const getFullImage = (image_id: number) =>
  invoke<number[]>("get_full_image", { image_id });
export const getThumbnail = (image_id: number) =>
  invoke<number[]>("get_thumbnail", { image_id });

// Tags
export const getTags = () => invoke<Tag[]>("get_tags");
export const createTag = (name: string) => invoke<Tag>("create_tag", { name });
export const deleteTag = (tag_id: number) => invoke<void>("delete_tag", { tag_id });
export const setDayTags = (diary_day_id: number, tag_ids: number[]) =>
  invoke<void>("set_day_tags", { diary_day_id, tag_ids });
export const getDayTags = (diary_day_id: number) =>
  invoke<Tag[]>("get_day_tags", { diary_day_id });

// Favorites
export const addFavorite = (params: {
  message_id?: number;
  article_id?: number;
  content_preview: string;
  source_date: string;
}) => invoke<Favorite>("add_favorite", params);
export const removeFavorite = (favorite_id: number) =>
  invoke<void>("remove_favorite", { favorite_id });
export const getFavorites = () => invoke<Favorite[]>("get_favorites");

// Stats
export const getWritingStats = () => invoke<WritingStats>("get_writing_stats");
export const getAchievements = () => invoke<Achievement[]>("get_achievements");
export const checkAndUnlockAchievements = () =>
  invoke<string[]>("check_and_unlock_achievements");

// AI
export const aiSummarize = (params: {
  diary_day_id: number;
  api_provider: string;
  api_key: string;
  api_url?: string;
  personality: string;
}) => invoke<Message>("ai_summarize", params);

// Settings
export const getSetting = (key: string) =>
  invoke<string | null>("get_setting", { key });
export const setSetting = (key: string, value: string) =>
  invoke<void>("set_setting", { key, value });
export const getAllSettings = () =>
  invoke<[string, string][]>("get_all_settings");
