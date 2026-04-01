mod commands;
mod crypto;
mod db;
mod error;
mod media;
mod state;
mod telegram;

use tauri::Manager;
use tauri::webview::WebviewWindowBuilder;

use state::AppState;

fn register_quick_capture_shortcut(app_handle: &tauri::AppHandle, shortcut: &str) {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;

    // Unregister all existing shortcuts first
    let _ = app_handle.global_shortcut().unregister_all();

    let handle = app_handle.clone();
    if let Err(e) = app_handle.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
        if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
            if let Some(w) = handle.get_webview_window("quick-capture") {
                w.show().ok();
                w.set_focus().ok();
            } else {
                let url = if cfg!(debug_assertions) {
                    tauri::WebviewUrl::External("http://localhost:1420/#/quick-capture".parse().unwrap())
                } else {
                    tauri::WebviewUrl::App("index.html#/quick-capture".into())
                };
                if let Ok(w) = WebviewWindowBuilder::new(&handle, "quick-capture", url)
                    .title("Quick Capture")
                    .inner_size(480.0, 72.0)
                    .resizable(false)
                    .decorations(false)
                    .transparent(true)
                    .always_on_top(true)
                    .center()
                    .visible(true)
                    .skip_taskbar(true)
                    .build()
                {
                    w.set_focus().ok();
                }
            }
        }
    }) {
        eprintln!("[shortcut] Failed to register '{}': {}", shortcut, e);
    }
}

#[tauri::command]
fn update_quick_capture_shortcut(app_handle: tauri::AppHandle, shortcut: String) -> Result<(), error::MurmurError> {
    register_quick_capture_shortcut(&app_handle, &shortcut);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init());

    // WebDriver plugin for e2e testing (debug builds only)
    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(tauri_plugin_webdriver_automation::init());
    }

    let app = builder
        .setup(|app| {
            // Allow overriding data dir via env var (for e2e tests isolation)
            let data_dir = if let Ok(dir) = std::env::var("MURMUR_DATA_DIR") {
                std::path::PathBuf::from(dir)
            } else {
                app.path()
                    .app_data_dir()
                    .expect("Failed to get app data dir")
            };
            std::fs::create_dir_all(&data_dir).ok();

            let app_state = AppState::new(data_dir);
            app.manage(app_state);

            // Register default global shortcut for quick capture
            register_quick_capture_shortcut(app.handle(), "CmdOrCtrl+Shift+M");

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
            commands::auth::change_password,
            commands::auth::reset_password_with_recovery,
            commands::auth::regenerate_recovery_code,
            commands::auth::update_password_hint,
            commands::auth::get_wrong_password_action,
            commands::auth::set_wrong_password_action,
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
            commands::diary::get_article,
            commands::diary::get_diary_dates,
            commands::diary::search,
            commands::diary::get_random_diary_day,
            commands::diary::quick_capture_send,
            // Media
            commands::media::upload_image,
            commands::media::get_full_image,
            commands::media::get_thumbnail,
            commands::media::list_all_images_with_thumbnails,
            commands::media::upload_file,
            commands::media::get_file_data,
            commands::media::list_all_files,
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
            commands::tags::set_message_tags,
            commands::tags::get_message_tags,
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
            commands::export::import_database,
            commands::export::delete_all_data,
            // Telegram
            commands::telegram::start_telegram_bot,
            commands::telegram::stop_telegram_bot,
            commands::telegram::get_telegram_status,
            // URL Meta
            commands::url_meta::fetch_url_meta,
            // Shortcut
            update_quick_capture_shortcut,
        ])
        .on_window_event(|window, event| {
            // macOS: hide window on close instead of quitting
            #[cfg(target_os = "macos")]
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window.hide().ok();
                api.prevent_close();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    // macOS: re-show window when dock icon is clicked
    #[cfg(target_os = "macos")]
    {
        use tauri::Manager;
        let app_handle = app.handle().clone();
        app.run(move |_app_handle, event| {
            if let tauri::RunEvent::Reopen { .. } = event {
                if let Some(w) = app_handle.get_webview_window("main") {
                    w.show().ok();
                    w.set_focus().ok();
                }
            }
        });
    }

    #[cfg(not(target_os = "macos"))]
    app.run(|_, _| {});
}
