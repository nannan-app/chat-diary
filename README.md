# Murmur (喃喃)

A privacy-first, chat-style desktop diary app. Write your daily thoughts like chatting with yourself — text, images, moods, and long-form articles, all encrypted locally.

Built with **Tauri v2** (Rust backend + React frontend).

## Features

- **Chat-style diary** — Messages appear as chat bubbles (green/right for you, white/left for AI). Send text, images, mood cards, and Markdown articles.
- **Dual-space privacy** — Correct password opens your private encrypted space. Wrong password silently opens a decoy public space. No one can tell which is which.
- **Local encryption** — AES-256-GCM field-level encryption with Argon2 key derivation. Your data never leaves your machine.
- **AI summary & feedback** — One-click AI analysis of your day's entries. Built-in provider or bring your own API key.
- **Markdown long-form editor** — Typora-style WYSIWYG editor for longer writing. Articles appear as cards in the chat flow.
- **Tags & moods** — Tag days with custom colored labels. Record moods with emoji cards. View tag indicators in the sidebar.
- **Favorites & search** — Bookmark any message. Full-text search across all entries and articles.
- **Achievement badges** — 15 badges to unlock (first entry, 7-day streak, night owl, etc.) displayed on a growth tree.
- **Gallery** — Photo grid view of all diary images with lightbox preview.
- **Multi-language** — Chinese and English, auto-detected from system language.
- **Quick capture** — Global hotkey (Cmd+Shift+M) for instant thought capture without opening the app.
- **Export/Import** — Full database export as encrypted zip. Single-day export in document or chat format.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| App framework | Tauri v2 |
| Backend | Rust |
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| State management | Zustand |
| Database | SQLite (rusqlite) |
| Encryption | AES-256-GCM + Argon2 |
| Editor | TipTap (WYSIWYG Markdown) |
| Animations | Framer Motion |
| i18n | react-i18next |

## Installation Notes

### macOS

The app is not signed with an Apple Developer certificate. macOS will block it on first launch. Run this command to allow it:

```bash
xattr -cr /Applications/Murmur.app
```

Then open the app normally.

## Development

### Prerequisites

- [Rust](https://rustup.rs/) 1.86+
- [Bun](https://bun.sh/) 1.3+
- [Tauri CLI](https://v2.tauri.app/start/create-project/) v2

### Setup

```bash
bun install
```

### Dev

```bash
bun tauri dev
```

### Build

```bash
bun tauri build
```

### E2E Tests

Requires [tauri-wd](https://crates.io/crates/tauri-wd) for WebDriver automation:

```bash
cargo install tauri-wd
bun tauri build --debug
bun run test:e2e
```

21 test files covering setup, dual-space privacy, diary CRUD, search, articles, tags, favorites, achievements, settings, password management, export, gallery, AI summary, and UI interactions. All tests operate through real UI interactions (not IPC bypasses).

## Project Structure

```
src/                    # React frontend
  components/
    auth/               # Login & setup screens
    diary/              # Chat view, message bubbles, context menu, input
    editor/             # Markdown editor & article viewer
    layout/             # App shell, nav bar
    settings/           # Settings modal
    sidebar/            # Diary list, calendar, search
    favorites/          # Favorites view
    gallery/            # Photo gallery
    achievements/       # Badge wall
    library/            # Article library
    shared/             # Celebrations, particles, drop zone
  stores/               # Zustand stores (auth, diary, ui)
  lib/                  # IPC wrappers, types, i18n, constants

src-tauri/              # Rust backend
  src/
    commands/           # Tauri IPC command handlers
    crypto/             # AES-256-GCM, Argon2, master key management
    db/                 # SQLite repos, migrations, models
    media/              # Image storage, thumbnails
    state.rs            # App state (DB connections, master key)
    error.rs            # Error types

e2e/                    # WebDriverIO e2e tests
```

## License

Private project. All rights reserved.
