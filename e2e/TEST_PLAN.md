# Murmur E2E Test Plan

Based on PRODUCT_DESIGN.md, mapping every product requirement to concrete e2e tests.
Tests use real Tauri IPC (front-to-back) with isolated test data directory.

## Test Files & Execution Order

Tests run sequentially within a file. Files are ordered so that earlier files set up
state that later files depend on (e.g., setup must happen before diary writing).

---

## 1. `01-setup.e2e.ts` — First Launch & Password Setup

| # | Test | Requirement | How |
|---|------|-------------|-----|
| 1.1 | Welcome screen shows on first launch | §8.1 首次使用 | Check page text contains "欢迎使用喃喃" |
| 1.2 | Shows "创建全新日记本" and "从备份文件导入" buttons | §8.1 选择 | Check both buttons exist |
| 1.3 | Navigate to password step | §8.1 设置密码 | Click "创建全新日记本", verify "设置密码" |
| 1.4 | Password mismatch shows error | §2.1 密码确认 | Enter different passwords, verify error message |
| 1.5 | Set matching password proceeds to hint | §8.1 | Enter matching password, click "下一步" |
| 1.6 | Hint step is optional, can skip | §8.1 密码提示可选 | Verify "跳过" button, click "完成设置" |
| 1.7 | Recovery code is displayed after setup | §2.1.2 恢复码 | Verify recovery code format XXXX-XXXX-XXXX-XXXX-XXXX |
| 1.8 | "开始使用" enters main app | §8.1 | Click button, verify main app loads |

## 2. `02-dual-space.e2e.ts` — Dual Space Privacy

| # | Test | Requirement | How |
|---|------|-------------|-----|
| 2.1 | Correct password → private space | §2.1 正确密码进入私密空间 | Login, check get_space == "private" |
| 2.2 | Wrong password → public space, no error | §2.1 错误密码进入公开空间 | Wrong password, check get_space == "public", no error shown |
| 2.3 | Private data not visible in public space | §2.1 | Write in private, switch to public, data absent |
| 2.4 | Public space can read/write independently | §2.1 公开空间可正常读写 | Write in public, verify stored |
| 2.5 | Switch space from private to public | §2.1 切换查看 | Use switch_space, verify data changes |
| 2.6 | Switch space from public to private | §2.1 | switch_space back, private data returns |
| 2.7 | Cannot switch to private without master key | §2.1 | In public-only session, switch_space returns "public" |

## 3. `03-diary-crud.e2e.ts` — Chat-Style Diary CRUD

| # | Test | Requirement | How |
|---|------|-------------|-----|
| 3.1 | Auto-create today's diary on open | §2.2 今日打开自动创建 | get_or_create_today returns today's date |
| 3.2 | Send text message | §2.2 文字消息 | send_message kind=text, verify content |
| 3.3 | Messages have timestamps | §2.2 每条消息带时间戳 | Check created_at field exists |
| 3.4 | Edit a message | §2.2 编辑 | edit_message, verify content changed |
| 3.5 | Delete a single message | §2.2 删除单条消息 | delete_message, verify gone |
| 3.6 | Send mood message | §2.5 心情标签 | send_message kind=mood, mood="😊" |
| 3.7 | Multiple moods per day | §2.5 一天可打多次心情 | Send 2 moods, both exist |
| 3.8 | Quote reply message | §2.2 引用回复 | Send with quoteRefId, verify stored |
| 3.9 | Message source tracking | §2.7 来源角标 | Send with source="telegram", verify |
| 3.10 | Word count updates on diary day | §2.2 字数统计 | Send text, check day.word_count > 0 |
| 3.11 | Delete entire diary day | §2.2 整天删除 | delete_diary_day, verify messages gone |
| 3.12 | List diary days for a month | §3.2 按天排列 | list_diary_days returns created days |
| 3.13 | Get diary dates (for calendar dots) | §3.2 日历标记 | get_diary_dates returns dates with entries |

## 4. `04-search.e2e.ts` — Full-Text Search

| # | Test | Requirement | How |
|---|------|-------------|-----|
| 4.1 | Search finds text messages | §5.8 聊天文字消息 | search("keyword"), check results |
| 4.2 | Search finds article content | §5.8 长文内容 | Create article, search its content |
| 4.3 | Search returns diary date | §5.8 点击跳转对应日期 | Result has diary_date field |
| 4.4 | Search empty query returns empty | Edge case | search(""), check no crash |
| 4.5 | Search no match returns empty | Edge case | search("zzzznonexistent"), check empty |

## 5. `05-articles.e2e.ts` — Markdown Long-Form Articles

| # | Test | Requirement | How |
|---|------|-------------|-----|
| 5.1 | Create article with title and content | §2.3 长文模式 | create_article, verify returned message |
| 5.2 | Article appears in messages | §2.3 文章卡片插入聊天流 | get_messages shows kind="article" |
| 5.3 | Get all articles (library) | §2.3 文库 | get_all_articles returns created article |
| 5.4 | Multiple articles per day | §2.3 长文数量不限 | Create 2 articles, both in list |
| 5.5 | Article word count | §2.3 字数统计 | Article has word_count > 0 |

## 6. `06-tags.e2e.ts` — Tag System

| # | Test | Requirement | How |
|---|------|-------------|-----|
| 6.1 | System tags exist | §2.6 系统预设标签 | get_tags returns 工作/生活/旅行/感悟/学习 |
| 6.2 | Create custom tag | §2.6 用户自定义 | create_tag, verify returned |
| 6.3 | Custom tag gets Morandi color | §2.6 莫兰迪色系 | Tag color starts with # |
| 6.4 | Set day-level tags | §2.6 标签打在当天日记整体 | set_day_tags, get_day_tags matches |
| 6.5 | Set message-level tags | §2.2 每条消息打标签 | set_message_tags, get_message_tags matches |
| 6.6 | Delete custom tag | §2.6 用户可自定义增删 | delete_tag, verify gone |
| 6.7 | Cannot delete system tag | §2.6 系统预设 | delete_tag on system tag, still exists |
| 6.8 | Delete tag cascades from day associations | §2.6 | After delete, get_day_tags doesn't include it |

## 7. `07-favorites.e2e.ts` — Favorites System

| # | Test | Requirement | How |
|---|------|-------------|-----|
| 7.1 | Add message to favorites | §2.8 右键收藏 | add_favorite with message_id |
| 7.2 | Add article to favorites | §2.8 任何元素可收藏 | add_favorite with article_id |
| 7.3 | List favorites | §2.8 收藏列表 | get_favorites returns both |
| 7.4 | Favorite has content preview | §2.8 内容预览 | content_preview not empty |
| 7.5 | Favorite has source date | §2.8 来源日期 | source_date matches diary date |
| 7.6 | Remove favorite | §2.8 支持取消收藏 | remove_favorite, verify gone |

## 8. `08-stats-achievements.e2e.ts` — Statistics & Achievements

| # | Test | Requirement | How |
|---|------|-------------|-----|
| 8.1 | Writing stats reflect entries | §4.1 | get_writing_stats: days_with_entries, total_words |
| 8.2 | first_entry achievement unlocks | §4.5 初次提笔 | check_and_unlock_achievements includes "first_entry" |
| 8.3 | first_photo achievement unlocks | §4.5 第一帧 | After image upload, achievement unlocks |
| 8.4 | ai_first achievement tracks | §4.5 AI 初见 | Check achievement row exists |
| 8.5 | night_owl checks current hour | §4.5 夜猫子 | Verify achievement logic exists |
| 8.6 | Get all achievements list | §4.5 勋章墙 | get_achievements returns 15 items |

## 9. `09-settings.e2e.ts` — Settings Persistence

| # | Test | Requirement | How |
|---|------|-------------|-----|
| 9.1 | Set and get a setting | §六 设置页面 | set_setting, get_setting matches |
| 9.2 | Get all settings | §六 | get_all_settings returns pairs |
| 9.3 | AI provider setting | §六 AI Provider | Set "ai_provider", persist |
| 9.4 | Send mode setting | §六 回车发送 vs Ctrl+Enter | Set "send_mode" |
| 9.5 | Language setting | §5.4 多语言 | Set "language" to "en" |
| 9.6 | Birthday setting | §9.5 用户生日 | Set "birthday" |
| 9.7 | Display settings | §六 显示 | Set font_size, ambient_bg, seasonal_particles |

## 10. `10-password-management.e2e.ts` — Password & Recovery

| # | Test | Requirement | How |
|---|------|-------------|-----|
| 10.1 | Change password works | §2.1 修改密码 | change_password(old, new), login with new works |
| 10.2 | Old password no longer works after change | §2.1 | Login with old → public space |
| 10.3 | Password hint get/update | §2.1 密码提示 | update_password_hint, get_password_hint |
| 10.4 | Regenerate recovery code | §2.1.2 | regenerate_recovery_code returns new code |
| 10.5 | Reset password with recovery code | §8.3 恢复码重置 | reset_password_with_recovery, login works |
| 10.6 | Old recovery code invalid after reset | §2.1.2 旧恢复码失效 | Old code fails to reset |
| 10.7 | New recovery code returned after reset | §2.1.2 | Response contains new recovery code |

## 11. `11-export.e2e.ts` — Export & Data Management

| # | Test | Requirement | How |
|---|------|-------------|-----|
| 11.1 | Export single diary day (document format) | §5.3 排版文档风格 | export_diary_day format="document", check markdown |
| 11.2 | Export single diary day (chat format) | §5.3 气泡截图风格 | export_diary_day format="chat", check format |
| 11.3 | Export contains message content | §5.3 | Output includes sent text |
| 11.4 | Export contains mood | §5.3 | Output includes mood emoji |
| 11.5 | Delete all data clears everything | §5.2 删除所有数据 | delete_all_data, check_setup returns false |

## 12. `12-random-memory.e2e.ts` — Random Memory

| # | Test | Requirement | How |
|---|------|-------------|-----|
| 12.1 | Random diary day returns an entry | §4.4 随机回忆 | get_random_diary_day returns a day with entries |
| 12.2 | Random returns null when no entries | §4.4 | On fresh DB, returns null |

## 13. `13-image-gallery.e2e.ts` — Image & Gallery

| # | Test | Requirement | How |
|---|------|-------------|-----|
| 13.1 | Upload image creates message | §2.2 图片 | upload_image, verify message kind="image" |
| 13.2 | Get thumbnail returns data | §5.1 缩略图 | get_thumbnail returns bytes |
| 13.3 | Get full image returns data | §5.1 原图 | get_full_image returns bytes |
| 13.4 | List all images for gallery | §3.3 相册 | list_all_images_with_thumbnails returns entries |
| 13.5 | Gallery image has date | §3.3 跳转到日记 | Each image has date field |

## 14. `14-ai-summary.e2e.ts` — AI Summary

| # | Test | Requirement | How |
|---|------|-------------|-----|
| 14.1 | AI summary with builtin returns reply | §2.4 内置AI | ai_summarize provider=builtin, get ai_reply message |
| 14.2 | AI reply appears in messages | §2.4 | get_messages shows kind="ai_reply" |
| 14.3 | Empty diary returns error | §2.4 | ai_summarize on empty day → error |

---

## Coverage Summary

| Design Section | Test File(s) | Tests |
|----------------|-------------|-------|
| §2.1 双空间隐私 | 01, 02, 10 | 16 |
| §2.2 聊天式日记 | 03 | 13 |
| §2.3 Markdown 长文 | 05 | 5 |
| §2.4 AI 总结 | 14 | 3 |
| §2.5 心情标签 | 03 | 2 |
| §2.6 自定义标签 | 06 | 8 |
| §2.8 收藏功能 | 07 | 6 |
| §3.2 日记列表 | 03 | 2 |
| §3.3 相册 | 13 | 5 |
| §4.1 书写统计 | 08 | 1 |
| §4.4 随机回忆 | 12 | 2 |
| §4.5 成就勋章 | 08 | 5 |
| §5.1 数据存储 | 13 | 3 |
| §5.2 数据迁移 | 11 | 5 |
| §5.3 导出功能 | 11 | 4 |
| §5.4 多语言 | 09 | 1 |
| §5.8 搜索 | 04 | 5 |
| §6 设置页面 | 09 | 7 |
| §8.1-8.3 用户流程 | 01, 10 | 15 |
| **Total** | **14 files** | **~85 tests** |
