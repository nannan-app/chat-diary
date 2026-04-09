# Murmur (喃喃)

[English](./README.md) | [中文](./README_CN.md)

一款注重隐私的聊天式桌面日记应用。像和自己聊天一样记录每天的想法——文字、图片、心情、长文，全部本地加密。

基于 **Tauri v2**（Rust 后端 + React 前端）构建。

## 功能特性

- **聊天式日记** — 消息以聊天气泡形式展示（绿色/右侧为你，白色/左侧为 AI）。支持发送文字、图片、心情卡片和 Markdown 文章。
- **双空间隐私** — 输入正确密码进入你的私密加密空间，输入错误密码则静默打开伪装的公开空间，外人无法分辨。
- **本地加密** — AES-256-GCM 字段级加密 + Argon2 密钥派生，数据永远不会离开你的设备。
- **AI 总结与反馈** — 一键 AI 分析当日日记内容。内置服务商或使用自己的 API Key。
- **Markdown 长文编辑器** — 类似 Typora 的所见即所得编辑器，适合长篇写作。文章以卡片形式嵌入聊天流。
- **标签与心情** — 用自定义彩色标签标记日期，用表情卡片记录心情，侧边栏显示标签指示。
- **收藏与搜索** — 收藏任何消息，全文搜索所有日记和文章。
- **成就徽章** — 15 个可解锁徽章（首篇日记、连续 7 天、夜猫子等），在成长树上展示。
- **图库** — 以照片网格浏览所有日记图片，支持灯箱预览。
- **多语言** — 中文和英文，根据系统语言自动切换。
- **快速记录** — 全局快捷键（Cmd+Shift+M）快速捕捉灵感，无需打开应用。
- **导入导出** — 完整数据库导出为加密压缩包，单日导出为文档或聊天格式。

## 技术栈

| 层级 | 技术 |
|------|------|
| 应用框架 | Tauri v2 |
| 后端 | Rust |
| 前端 | React 19 + TypeScript |
| 样式 | Tailwind CSS v4 |
| 状态管理 | Zustand |
| 数据库 | SQLite (rusqlite) |
| 加密 | AES-256-GCM + Argon2 |
| 编辑器 | TipTap（所见即所得 Markdown） |
| 动画 | Framer Motion |
| 国际化 | react-i18next |

## 开发

### 前置要求

- [Rust](https://rustup.rs/) 1.86+
- [Bun](https://bun.sh/) 1.3+
- [Tauri CLI](https://v2.tauri.app/start/create-project/) v2

### 安装依赖

```bash
bun install
```

### 开发模式

```bash
bun tauri dev
```

### 构建

```bash
bun tauri build
```

### E2E 测试

需要安装 [tauri-wd](https://crates.io/crates/tauri-wd) 用于 WebDriver 自动化：

```bash
cargo install tauri-wd
bun tauri build --debug
bun run test:e2e
```

21 个测试文件，覆盖初始化设置、双空间隐私、日记增删改查、搜索、文章、标签、收藏、成就、设置、密码管理、导出、图库、AI 总结和 UI 交互。所有测试通过真实 UI 操作执行（非 IPC 旁路）。

## 项目结构

```
src/                    # React 前端
  components/
    auth/               # 登录与初始化页面
    diary/              # 聊天视图、消息气泡、右键菜单、输入框
    editor/             # Markdown 编辑器与文章查看器
    layout/             # 应用外壳、导航栏
    settings/           # 设置弹窗
    sidebar/            # 日记列表、日历、搜索
    favorites/          # 收藏视图
    gallery/            # 图库
    achievements/       # 徽章墙
    library/            # 文章库
    shared/             # 庆祝动画、粒子效果、拖放区域
  stores/               # Zustand 状态管理（认证、日记、UI）
  lib/                  # IPC 封装、类型、国际化、常量

src-tauri/              # Rust 后端
  src/
    commands/           # Tauri IPC 命令处理器
    crypto/             # AES-256-GCM、Argon2、主密钥管理
    db/                 # SQLite 仓库、迁移、模型
    media/              # 图片存储、缩略图
    state.rs            # 应用状态（数据库连接、主密钥）
    error.rs            # 错误类型

e2e/                    # WebDriverIO E2E 测试
```

## 许可证

本项目基于 [GNU Affero 通用公共许可证 v3.0](./LICENSE) 开源。
