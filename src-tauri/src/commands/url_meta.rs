use serde::Serialize;

use crate::error::MurmurError;

#[derive(Debug, Clone, Serialize)]
pub struct UrlMeta {
    pub url: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub image: Option<String>,
    pub site_name: Option<String>,
}

/// Fetch Open Graph meta tags from a URL
#[tauri::command]
pub async fn fetch_url_meta(url: String) -> Result<UrlMeta, MurmurError> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .redirect(reqwest::redirect::Policy::limited(5))
        .build()
        .map_err(|e| MurmurError::General(format!("HTTP client error: {}", e)))?;

    let resp = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 (compatible; MurmurBot/1.0)")
        .send()
        .await
        .map_err(|e| MurmurError::General(format!("Fetch failed: {}", e)))?;

    let html = resp
        .text()
        .await
        .map_err(|e| MurmurError::General(format!("Read failed: {}", e)))?;

    // Parse OG meta tags with simple regex (avoid heavy HTML parser dependency)
    let title = extract_meta(&html, "og:title")
        .or_else(|| extract_meta(&html, "twitter:title"))
        .or_else(|| extract_title_tag(&html));
    let description = extract_meta(&html, "og:description")
        .or_else(|| extract_meta(&html, "twitter:description"))
        .or_else(|| extract_meta(&html, "description"));
    let image = extract_meta(&html, "og:image")
        .or_else(|| extract_meta(&html, "twitter:image"));
    let site_name = extract_meta(&html, "og:site_name");

    Ok(UrlMeta {
        url,
        title,
        description,
        image,
        site_name,
    })
}

fn extract_meta(html: &str, property: &str) -> Option<String> {
    // Match <meta property="og:title" content="..."> or <meta name="description" content="...">
    let html_lower = html.to_lowercase();
    let patterns = [
        format!("property=\"{}\"", property),
        format!("name=\"{}\"", property),
        format!("property='{}'", property),
        format!("name='{}'", property),
    ];

    for pattern in &patterns {
        if let Some(pos) = html_lower.find(pattern.as_str()) {
            // Search for content= in the same <meta> tag
            let tag_start = html_lower[..pos].rfind('<').unwrap_or(0);
            let tag_end = html_lower[pos..].find('>').map(|p| pos + p).unwrap_or(html.len());
            let tag = &html[tag_start..tag_end];
            let tag_lower = tag.to_lowercase();

            if let Some(content) = extract_attr(&tag_lower, tag, "content") {
                return Some(decode_html_entities(&content));
            }
        }
    }
    None
}

fn extract_attr(_tag_lower: &str, tag_original: &str, attr: &str) -> Option<String> {
    let tag_lower = tag_original.to_lowercase();
    let patterns = [
        format!("{}=\"", attr),
        format!("{}='", attr),
    ];

    for pattern in &patterns {
        if let Some(start) = tag_lower.find(pattern.as_str()) {
            let value_start = start + pattern.len();
            let quote = if pattern.ends_with('"') { '"' } else { '\'' };
            if let Some(end) = tag_original[value_start..].find(quote) {
                return Some(tag_original[value_start..value_start + end].to_string());
            }
        }
    }
    None
}

fn extract_title_tag(html: &str) -> Option<String> {
    let lower = html.to_lowercase();
    let start = lower.find("<title")?;
    let content_start = html[start..].find('>')? + start + 1;
    let end = lower[content_start..].find("</title")?;
    let title = html[content_start..content_start + end].trim().to_string();
    if title.is_empty() { None } else { Some(decode_html_entities(&title)) }
}

fn decode_html_entities(s: &str) -> String {
    s.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&apos;", "'")
}
