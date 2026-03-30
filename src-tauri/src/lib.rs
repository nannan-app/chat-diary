mod commands;
mod crypto;
mod db;
mod error;
mod media;
mod state;

use tauri::Manager;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            std::fs::create_dir_all(&data_dir).ok();

            let app_state = AppState::new(data_dir);
            app.manage(app_state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Auth
            commands::auth::check_setup,
            commands::auth::setup_password,
            commands::auth::login,
            commands::auth::get_password_hint,
            commands::auth::lock,
            commands::auth::get_space,
            commands::auth::switch_space,
            // Diary
            commands::diary::get_or_create_today,
            commands::diary::get_diary_day,
            commands::diary::list_diary_days,
            commands::diary::get_messages,
            commands::diary::send_message,
            commands::diary::edit_message,
            commands::diary::delete_message,
            commands::diary::delete_diary_day,
            commands::diary::create_article,
            commands::diary::get_all_articles,
            commands::diary::get_diary_dates,
            commands::diary::search,
            // Media
            commands::media::upload_image,
            commands::media::get_full_image,
            commands::media::get_thumbnail,
            // Settings
            commands::settings::get_setting,
            commands::settings::set_setting,
            commands::settings::get_all_settings,
            // Tags
            commands::tags::get_tags,
            commands::tags::create_tag,
            commands::tags::delete_tag,
            commands::tags::set_day_tags,
            commands::tags::get_day_tags,
            // Favorites
            commands::favorites::add_favorite,
            commands::favorites::remove_favorite,
            commands::favorites::get_favorites,
            // Stats
            commands::stats::get_writing_stats,
            commands::stats::get_achievements,
            commands::stats::check_and_unlock_achievements,
            // AI
            commands::ai::ai_summarize,
            // Export
            commands::export::export_database,
            commands::export::export_diary_day,
            commands::export::delete_all_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
