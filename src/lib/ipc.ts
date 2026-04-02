import { invoke } from "@tauri-apps/api/core";
import type {
  Achievement,
  Article,
  DiaryDay,
  Favorite,
  FileItem,
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
export const getMessages = (diaryDayId: number) =>
  invoke<Message[]>("get_messages", { diaryDayId });
export const sendMessage = (params: {
  diaryDayId: number;
  kind: string;
  content?: string;
  imageId?: number;
  articleId?: number;
  mood?: string;
  quoteRefId?: number;
  source?: string;
}) =>
  invoke<Message>("send_message", {
    diaryDayId: params.diaryDayId,
    kind: params.kind,
    content: params.content ?? null,
    imageId: params.imageId ?? null,
    articleId: params.articleId ?? null,
    mood: params.mood ?? null,
    quoteRefId: params.quoteRefId ?? null,
    source: params.source ?? null,
  });
export const editMessage = (messageId: number, content: string) =>
  invoke<void>("edit_message", { messageId, content });
export const deleteMessage = (messageId: number) =>
  invoke<void>("delete_message", { messageId });
export const deleteDiaryDay = (diaryDayId: number) =>
  invoke<void>("delete_diary_day", { diaryDayId });
export const getDiaryDates = (year: number, month: number) =>
  invoke<string[]>("get_diary_dates", { year, month });
export const createArticle = (diaryDayId: number, title: string, content: string) =>
  invoke<Message>("create_article", { diaryDayId, title, content });
export const getAllArticles = () =>
  invoke<Article[]>("get_all_articles");
export const getArticle = (articleId: number) =>
  invoke<Article>("get_article", { articleId });
export const searchDiary = (query: string) =>
  invoke<SearchResult[]>("search", { query });

// Media
export const uploadImage = (
  diaryDayId: number,
  imageBytes: number[],
  compress: boolean
) =>
  invoke<Message>("upload_image", { diaryDayId, imageBytes, compress });
export const getFullImage = (imageId: number) =>
  invoke<number[]>("get_full_image", { imageId });
export const getThumbnail = (imageId: number) =>
  invoke<number[]>("get_thumbnail", { imageId });

// Files
export const uploadFile = (
  diaryDayId: number,
  fileBytes: number[],
  fileName: string,
  mimeType: string
) =>
  invoke<Message>("upload_file", { diaryDayId, fileBytes, fileName, mimeType });
export const getFileData = (fileId: number) =>
  invoke<number[]>("get_file_data", { fileId });
export const listAllFiles = () =>
  invoke<FileItem[]>("list_all_files");

// Tags
export const getTags = () => invoke<Tag[]>("get_tags");
export const createTag = (name: string) => invoke<Tag>("create_tag", { name });
export const deleteTag = (tagId: number) => invoke<void>("delete_tag", { tagId });
export const setDayTags = (diaryDayId: number, tagIds: number[]) =>
  invoke<void>("set_day_tags", { diaryDayId, tagIds });
export const getDayTags = (diaryDayId: number) =>
  invoke<Tag[]>("get_day_tags", { diaryDayId });

// Favorites
export const addFavorite = (params: {
  messageId?: number;
  articleId?: number;
  contentPreview: string;
  sourceDate: string;
}) => invoke<Favorite>("add_favorite", params);
export const removeFavorite = (favoriteId: number) =>
  invoke<void>("remove_favorite", { favoriteId });
export const getFavorites = () => invoke<Favorite[]>("get_favorites");

// Stats
export const getWritingStats = () => invoke<WritingStats>("get_writing_stats");
export const getAchievements = () => invoke<Achievement[]>("get_achievements");
export const checkAndUnlockAchievements = () =>
  invoke<string[]>("check_and_unlock_achievements");

// AI
export const aiSummarize = (params: {
  diaryDayId: number;
  apiProvider: string;
  apiKey: string;
  apiUrl?: string;
  apiModel?: string;
  personality: string;
}) => invoke<Message>("ai_summarize", params);

// Auth - extended
export const changePassword = (oldPassword: string, newPassword: string, newHint?: string) =>
  invoke<void>("change_password", { oldPassword, newPassword, newHint: newHint ?? null });
export const resetPasswordWithRecovery = (recoveryCode: string, newPassword: string, newHint?: string) =>
  invoke<SetupResponse>("reset_password_with_recovery", { recoveryCode, newPassword, newHint: newHint ?? null });
export const regenerateRecoveryCode = () =>
  invoke<string>("regenerate_recovery_code");
export const updatePasswordHint = (hint?: string) =>
  invoke<void>("update_password_hint", { hint: hint ?? null });
export const getWrongPasswordAction = () =>
  invoke<string>("get_wrong_password_action");
export const setWrongPasswordAction = (action: string) =>
  invoke<void>("set_wrong_password_action", { action });

// Telegram
export const startTelegramBot = (token: string) =>
  invoke<{ running: boolean; bot_username: string | null }>("start_telegram_bot", { token });
export const stopTelegramBot = () =>
  invoke<{ running: boolean; bot_username: string | null }>("stop_telegram_bot");
export const getTelegramStatus = () =>
  invoke<{ running: boolean; bot_username: string | null }>("get_telegram_status");

// URL Meta
export const fetchUrlMeta = (url: string) =>
  invoke<{ url: string; title: string | null; description: string | null; image: string | null; site_name: string | null }>("fetch_url_meta", { url });

// Shortcut
export const updateQuickCaptureShortcut = (shortcut: string) =>
  invoke<void>("update_quick_capture_shortcut", { shortcut });
export const updateToggleWindowShortcut = (shortcut: string) =>
  invoke<void>("update_toggle_window_shortcut", { shortcut });

// Diary - extended
export const getRandomDiaryDay = () =>
  invoke<DiaryDay | null>("get_random_diary_day");
export const quickCaptureSend = (content: string) =>
  invoke<Message>("quick_capture_send", { content });

// Media - extended
export const listAllImagesWithThumbnails = () =>
  invoke<{id: number; thumbnail: number[]; date: string}[]>("list_all_images_with_thumbnails");

// Tags - extended
export const setMessageTags = (messageId: number, tagIds: number[]) =>
  invoke<void>("set_message_tags", { messageId, tagIds });
export const getMessageTags = (messageId: number) =>
  invoke<Tag[]>("get_message_tags", { messageId });

// Export/Import
export const exportDatabase = (outputPath: string) =>
  invoke<void>("export_database", { outputPath });
export const exportDiaryDay = (diaryDayId: number, format: string) =>
  invoke<string>("export_diary_day", { diaryDayId, format });
export const exportArticle = (articleId: number) =>
  invoke<string>("export_article", { articleId });
export const deleteAllData = () =>
  invoke<void>("delete_all_data");
export const importDatabase = (zipPath: string, password: string) =>
  invoke<void>("import_database", { zipPath, password });

// Settings
export const getSetting = (key: string) =>
  invoke<string | null>("get_setting", { key });
export const setSetting = (key: string, value: string) =>
  invoke<void>("set_setting", { key, value });
export const getAllSettings = () =>
  invoke<[string, string][]>("get_all_settings");
