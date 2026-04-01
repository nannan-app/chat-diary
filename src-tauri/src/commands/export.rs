use std::fs;
use std::io::{Read, Write};
use std::path::PathBuf;
use tauri::State;

use crate::error::MurmurError;
use crate::state::{AppState, SpaceType};

/// Export database + media to a zip file
#[tauri::command]
pub fn export_database(state: State<AppState>, output_path: String) -> Result<(), MurmurError> {
    let output = PathBuf::from(output_path);
    let file = fs::File::create(&output)?;
    let mut zip = zip::ZipWriter::new(file);

    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // Add private.db
    let private_db_path = state.data_dir.join("private.db");
    if private_db_path.exists() {
        let mut buf = Vec::new();
        fs::File::open(&private_db_path)?.read_to_end(&mut buf)?;
        zip.start_file("private.db", options)
            .map_err(|e| MurmurError::General(format!("Zip error: {}", e)))?;
        zip.write_all(&buf)?;
    }

    // Add public.db
    let public_db_path = state.data_dir.join("public.db");
    if public_db_path.exists() {
        let mut buf = Vec::new();
        fs::File::open(&public_db_path)?.read_to_end(&mut buf)?;
        zip.start_file("public.db", options)
            .map_err(|e| MurmurError::General(format!("Zip error: {}", e)))?;
        zip.write_all(&buf)?;
    }

    // Add media files
    let media_dir = &state.media_dir;
    if media_dir.exists() {
        for entry in walkdir(media_dir)? {
            let rel_path = entry.strip_prefix(&state.data_dir)
                .unwrap_or(&entry)
                .to_string_lossy()
                .to_string();
            let mut buf = Vec::new();
            fs::File::open(&entry)?.read_to_end(&mut buf)?;
            zip.start_file(rel_path, options)
                .map_err(|e| MurmurError::General(format!("Zip error: {}", e)))?;
            zip.write_all(&buf)?;
        }
    }

    zip.finish()
        .map_err(|e| MurmurError::General(format!("Zip finish error: {}", e)))?;

    Ok(())
}

/// Recursively list files in a directory
fn walkdir(dir: &std::path::Path) -> Result<Vec<PathBuf>, MurmurError> {
    let mut files = Vec::new();
    if dir.is_dir() {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                files.extend(walkdir(&path)?);
            } else {
                files.push(path);
            }
        }
    }
    Ok(files)
}

/// Convert TipTap HTML to Markdown (handles common rich-text elements)
fn html_to_markdown(html: &str) -> String {
    let mut s = html.to_string();

    // Block elements → Markdown (order matters: process before stripping tags)
    // Headings
    for level in 1..=3 {
        let open = format!("<h{}>", level);
        let close = format!("</h{}>", level);
        let prefix = "#".repeat(level);
        s = s.replace(&open, &format!("\n{} ", prefix));
        s = s.replace(&close, "\n");
    }

    // Lists: convert <li> to list markers, strip <ul>/<ol> wrappers
    // We'll handle bullet vs ordered by checking context
    // Simple approach: replace <li> inside <ol> with numbered, <li> inside <ul> with -
    let mut result = String::new();
    let mut in_ol = false;
    let mut ol_counter = 0u32;
    let mut chars = s.chars().peekable();
    let mut buf = String::new();

    // Collect into buf for tag-based processing
    while let Some(c) = chars.next() {
        buf.push(c);
    }

    // Process tags sequentially
    let s = buf;
    let s = s.replace("<ul>", "\n").replace("</ul>", "\n");
    let s = s.replace("<ol>", "\n<ol>").replace("</ol>", "</ol>\n");

    // Split and process <ol> sections
    let mut final_text = String::new();
    let mut remaining = s.as_str();

    while let Some(ol_start) = remaining.find("<ol>") {
        // Text before <ol>
        let before = &remaining[..ol_start];
        final_text.push_str(&before.replace("<li>", "\n- ").replace("</li>", ""));
        remaining = &remaining[ol_start + 4..]; // skip <ol>

        if let Some(ol_end) = remaining.find("</ol>") {
            let ol_content = &remaining[..ol_end];
            let mut counter = 1;
            for part in ol_content.split("<li>") {
                let cleaned = part.replace("</li>", "");
                let trimmed = cleaned.trim();
                if !trimmed.is_empty() {
                    final_text.push_str(&format!("\n{}. {}", counter, trimmed));
                    counter += 1;
                }
            }
            remaining = &remaining[ol_end + 5..]; // skip </ol>
        }
    }
    // Process remaining text
    final_text.push_str(&remaining.replace("<li>", "\n- ").replace("</li>", ""));
    let s = final_text;

    // Blockquote
    let s = s.replace("<blockquote>", "\n> ").replace("</blockquote>", "\n");

    // Code blocks
    let s = s.replace("<pre><code>", "\n```\n").replace("</code></pre>", "\n```\n");
    // Handle code blocks with class (language)
    let mut s = s;
    while let Some(start) = s.find("<pre><code class=\"") {
        if let Some(end) = s[start..].find("\">") {
            let lang_start = start + 18; // len of <pre><code class="
            let lang_end = start + end;
            let lang = &s[lang_start..lang_end].replace("language-", "");
            let replacement = format!("\n```{}\n", lang);
            s = format!("{}{}{}", &s[..start], replacement, &s[lang_end + 2..]);
        } else {
            break;
        }
    }

    // Inline formatting
    let s = s.replace("<strong>", "**").replace("</strong>", "**");
    let s = s.replace("<b>", "**").replace("</b>", "**");
    let s = s.replace("<em>", "*").replace("</em>", "*");
    let s = s.replace("<i>", "*").replace("</i>", "*");
    let s = s.replace("<u>", "").replace("</u>", ""); // No standard MD for underline
    let s = s.replace("<s>", "~~").replace("</s>", "~~");
    let s = s.replace("<del>", "~~").replace("</del>", "~~");
    let s = s.replace("<code>", "`").replace("</code>", "`");

    // Links: <a href="url">text</a> → [text](url)
    let mut s = s;
    while let Some(start) = s.find("<a ") {
        if let Some(href_start) = s[start..].find("href=\"") {
            let href_begin = start + href_start + 6;
            if let Some(href_end) = s[href_begin..].find('"') {
                let url = s[href_begin..href_begin + href_end].to_string();
                if let Some(tag_end) = s[start..].find('>') {
                    let content_start = start + tag_end + 1;
                    if let Some(close) = s[content_start..].find("</a>") {
                        let text = s[content_start..content_start + close].to_string();
                        let replacement = format!("[{}]({})", text, url);
                        s = format!("{}{}{}", &s[..start], replacement, &s[content_start + close + 4..]);
                        continue;
                    }
                }
            }
        }
        break; // Avoid infinite loop on malformed HTML
    }

    // Images: <img src="url"> → ![](url)
    let mut s = s;
    while let Some(start) = s.find("<img ") {
        if let Some(src_start) = s[start..].find("src=\"") {
            let src_begin = start + src_start + 5;
            if let Some(src_end) = s[src_begin..].find('"') {
                let url = s[src_begin..src_begin + src_end].to_string();
                if let Some(tag_end) = s[start..].find('>') {
                    let replacement = format!("![]({})", url);
                    s = format!("{}{}{}", &s[..start], replacement, &s[start + tag_end + 1..]);
                    continue;
                }
            }
        }
        break;
    }

    // Horizontal rule
    let s = s.replace("<hr>", "\n---\n").replace("<hr/>", "\n---\n").replace("<hr />", "\n---\n");

    // Paragraphs and line breaks
    let s = s.replace("<p>", "").replace("</p>", "\n\n");
    let s = s.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n");

    // Strip any remaining HTML tags
    let mut result = String::new();
    let mut in_tag = false;
    for ch in s.chars() {
        if ch == '<' { in_tag = true; continue; }
        if ch == '>' { in_tag = false; continue; }
        if !in_tag { result.push(ch); }
    }

    // Clean up excessive newlines
    while result.contains("\n\n\n") {
        result = result.replace("\n\n\n", "\n\n");
    }

    result.trim().to_string()
}

/// Export a single diary day as Markdown text
#[tauri::command]
pub fn export_diary_day(
    state: State<AppState>,
    diary_day_id: i64,
    format: String,
) -> Result<String, MurmurError> {
    use crate::db::diary_repo;
    use crate::state::SpaceType;

    let space = state.space.lock().unwrap().clone();
    let db_lock = match space {
        SpaceType::Private => state.private_db.lock().unwrap(),
        SpaceType::Public => state.public_db.lock().unwrap(),
    };
    let conn = db_lock.as_ref().ok_or(MurmurError::NotAuthenticated)?;

    let messages = diary_repo::get_messages(conn, diary_day_id)?;
    let day = conn.query_row(
        "SELECT date FROM diary_days WHERE id = ?1",
        [diary_day_id],
        |row| row.get::<_, String>(0),
    )?;

    let mut output = String::new();

    if format == "document" {
        output.push_str(&format!("# {} 日记\n\n", day));
        for msg in &messages {
            match msg.kind.as_str() {
                "text" => {
                    if let Some(c) = &msg.content {
                        output.push_str(&format!("{}\n\n", c));
                    }
                }
                "ai_reply" => {
                    if let Some(c) = &msg.content {
                        // Parse JSON content for structured AI replies
                        let text = if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(c) {
                            parsed.get("text").and_then(|t| t.as_str()).unwrap_or(c).to_string()
                        } else {
                            c.clone()
                        };
                        // Prefix each line with >
                        let quoted = text.lines()
                            .map(|l| format!("> {}", l))
                            .collect::<Vec<_>>()
                            .join("\n");
                        output.push_str(&format!("{}\n\n", quoted));
                    }
                }
                "mood" => {
                    if let Some(m) = &msg.mood {
                        output.push_str(&format!("心情: {}\n\n", m));
                    }
                }
                "image" => {
                    output.push_str("[图片]\n\n");
                }
                "file" => {
                    let name = msg.file_name.as_deref().or(msg.content.as_deref()).unwrap_or("文件");
                    output.push_str(&format!("[文件: {}]\n\n", name));
                }
                "article" => {
                    // Title from message content
                    if let Some(title) = &msg.content {
                        output.push_str(&format!("## {}\n\n", title));
                    }
                    // Fetch and convert article body
                    if let Some(aid) = msg.article_id {
                        if let Ok(article_html) = conn.query_row(
                            "SELECT content FROM articles WHERE id = ?1",
                            [aid],
                            |row| row.get::<_, String>(0),
                        ) {
                            let md = html_to_markdown(&article_html);
                            output.push_str(&format!("{}\n\n", md.trim()));
                        }
                    }
                }
                _ => {}
            }
        }
    } else {
        // Chat bubble style
        output.push_str(&format!("=== {} ===\n\n", day));
        for msg in &messages {
            let time = if msg.created_at.len() >= 16 { &msg.created_at[11..16] } else { "00:00" };
            match msg.kind.as_str() {
                "text" => {
                    if let Some(c) = &msg.content {
                        output.push_str(&format!("[{}] 我: {}\n", time, c));
                    }
                }
                "ai_reply" => {
                    if let Some(c) = &msg.content {
                        let text = if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(c) {
                            parsed.get("text").and_then(|t| t.as_str()).unwrap_or(c).to_string()
                        } else {
                            c.clone()
                        };
                        output.push_str(&format!("[{}] AI: {}\n", time, text));
                    }
                }
                "mood" => {
                    if let Some(m) = &msg.mood {
                        output.push_str(&format!("[{}] 心情: {}\n", time, m));
                    }
                }
                "image" => {
                    output.push_str(&format!("[{}] [图片]\n", time));
                }
                "file" => {
                    let name = msg.file_name.as_deref().or(msg.content.as_deref()).unwrap_or("文件");
                    output.push_str(&format!("[{}] [文件: {}]\n", time, name));
                }
                "article" => {
                    let title = msg.content.as_deref().unwrap_or("长文");
                    output.push_str(&format!("[{}] [长文: {}]\n", time, title));
                }
                _ => {}
            }
        }
    }

    Ok(output)
}

/// Export a single article as Markdown
#[tauri::command]
pub fn export_article(state: State<AppState>, article_id: i64) -> Result<String, MurmurError> {
    let space = state.space.lock().unwrap().clone();
    let db_lock = match space {
        SpaceType::Private => state.private_db.lock().unwrap(),
        SpaceType::Public => state.public_db.lock().unwrap(),
    };
    let conn = db_lock.as_ref().ok_or(MurmurError::NotAuthenticated)?;

    let (title, content, created_at): (String, String, String) = conn.query_row(
        "SELECT title, content, created_at FROM articles WHERE id = ?1",
        [article_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    )?;

    let md = html_to_markdown(&content);
    Ok(format!("# {}\n\n> {}\n\n{}", title, created_at, md))
}

/// Import database from a zip backup file
#[tauri::command]
pub fn import_database(state: State<AppState>, zip_path: String, password: String) -> Result<(), MurmurError> {
    use crate::crypto::master_key as mk;
    use crate::db::connection;

    let zip_file = fs::File::open(&zip_path)?;
    let mut archive = zip::ZipArchive::new(zip_file)
        .map_err(|e| MurmurError::General(format!("Failed to open zip: {}", e)))?;

    // Extract to a temp dir first
    let temp_dir = state.data_dir.join("_import_temp");
    if temp_dir.exists() {
        fs::remove_dir_all(&temp_dir)?;
    }
    fs::create_dir_all(&temp_dir)?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| MurmurError::General(format!("Zip read error: {}", e)))?;
        let outpath = temp_dir.join(file.name());
        if let Some(parent) = outpath.parent() {
            fs::create_dir_all(parent)?;
        }
        if !file.name().ends_with('/') {
            let mut outfile = fs::File::create(&outpath)?;
            std::io::copy(&mut file, &mut outfile)?;
        }
    }

    // Verify password against the imported private.db
    let imported_private_db = temp_dir.join("private.db");
    if imported_private_db.exists() {
        let conn = connection::open_or_create(&imported_private_db)?;
        let (wrapped_key, salt, nonce): (Vec<u8>, Vec<u8>, Vec<u8>) = conn.query_row(
            "SELECT master_key_by_password, password_salt, password_nonce FROM key_store WHERE id = 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )?;
        let mut salt_arr = [0u8; 16];
        salt_arr.copy_from_slice(&salt);
        let mut nonce_arr = [0u8; 12];
        nonce_arr.copy_from_slice(&nonce);

        mk::try_unlock_with_password(&password, &wrapped_key, &salt_arr, &nonce_arr)
            .map_err(|_| MurmurError::InvalidPassword)?;
    }

    // Close current connections
    *state.private_db.lock().unwrap() = None;
    *state.public_db.lock().unwrap() = None;
    *state.master_key.lock().unwrap() = None;

    // Replace files
    let private_db_dest = state.data_dir.join("private.db");
    let public_db_dest = state.data_dir.join("public.db");
    let temp_private = temp_dir.join("private.db");
    let temp_public = temp_dir.join("public.db");

    if private_db_dest.exists() { fs::remove_file(&private_db_dest)?; }
    if public_db_dest.exists() { fs::remove_file(&public_db_dest)?; }

    if temp_private.exists() { fs::rename(&temp_private, &private_db_dest)?; }
    if temp_public.exists() { fs::rename(&temp_public, &public_db_dest)?; }

    // Copy media files
    let temp_media = temp_dir.join("media");
    if temp_media.exists() {
        if state.media_dir.exists() {
            fs::remove_dir_all(&state.media_dir)?;
        }
        // rename temp media to real media dir
        fs::rename(&temp_media, &state.media_dir)?;
    }

    // Cleanup temp
    if temp_dir.exists() {
        fs::remove_dir_all(&temp_dir).ok();
    }

    Ok(())
}

/// Delete all data
#[tauri::command]
pub fn delete_all_data(state: State<AppState>) -> Result<(), MurmurError> {
    // Close connections
    *state.private_db.lock().unwrap() = None;
    *state.public_db.lock().unwrap() = None;
    *state.master_key.lock().unwrap() = None;

    // Delete files
    let private_db = state.data_dir.join("private.db");
    let public_db = state.data_dir.join("public.db");
    let media_dir = &state.media_dir;

    if private_db.exists() { fs::remove_file(private_db)?; }
    if public_db.exists() { fs::remove_file(public_db)?; }
    if media_dir.exists() { fs::remove_dir_all(media_dir)?; }

    // Recreate media dir
    fs::create_dir_all(media_dir)?;

    Ok(())
}
