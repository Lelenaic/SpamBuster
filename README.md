# SpamBuster

[![Next.js](https://img.shields.io/badge/Next.js-16.1.0-black?style=flat&logo=next.js)](https://nextjs.org)
[![Electron](https://img.shields.io/badge/Electron-39.2.7-blue?style=flat&logo=electron)](https://www.electronjs.org/)
[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![GitHub Releases](https://img.shields.io/github/downloads/lelenaic/spambuster/latest/total.svg)](https://github.com/lelenaic/spambuster/releases/latest)

AI-powered spam email cleaner for your emails (Outlook, Gmail and IMAP)

Uses OpenRouter or Ollama to classify emails based on your custom anti-spam rules.

## ✨ Features

- **AI-Driven Spam Detection**: Leverage powerful LLMs via OpenRouter or local Ollama.
- **IMAP Integration**: Connect to Gmail, Outlook, or any IMAP server using [imapflow](https://imapflow.com).
- **Custom Rules**: Configure rules sent to AI for intelligent spam filtering.
- **Setup Wizard**: Guided onboarding with welcome, account selection, and IMAP settings.
- **Cross-Platform**: Native builds for macOS (DMG), Windows (NSIS), Linux (AppImage, Snap).
- **Modern UI**: Shadcn UI components, Tailwind CSS, Lucide React icons, Sonner toasts.

## 🚀 Installation

Download pre-built binaries from the [latest release](https://github.com/lelenaic/spambuster/releases/latest) for Linux, MacOS and Windows.

**Note**: A Linux Snap is available `snap install spambuster`.


## 📋 TODO
- Outlook/Microsoft 365 support
- Gmail/Google Workspace support
- Auto update

## 🛠️ Development

```bash
git clone https://github.com/lelenaic/spambuster.git
cd spambuster
npm ci
npm run dev
```

- `npm run dev`: Concurrent Next.js dev server + Electron.
- `npm run build`: Build production app (`next build && electron-builder`).
- `npm run mac-build`: macOS build without auto identity discovery (no app signature).
- `npm run lint`: ESLint check.

## 🔨 CI/CD

[GitHub Actions](https://github.com/lelenaic/spambuster/actions/workflows/ci.yml) builds and publishes releases on tag pushes:

- Ubuntu: AppImage + Snap
- macOS: DMG
- Windows: NSIS installer

Secrets configured for code signing and Snap store.

## 📖 Setup Flow

1. **Welcome**: Introduction to SpamBuster.
2. **Account Selection**: Choose email provider or custom IMAP.
3. **IMAP Settings**: Enter server details, credentials.
4. **AI Configuration**: Select OpenRouter/Ollama, API keys/models.
5. **Rules**: Define custom anti-spam prompts/rules.

## 🤝 Contributing

Contributions welcome! Fork, PRs to `main`.

## � License

[MIT License](LICENSE) © 2025 [Lénaïc Grolleau](https://lenaic.me).

---

⭐ [Star on GitHub](https://github.com/lelenaic/spambuster) · [Issues](https://github.com/lelenaic/spambuster/issues) · [lenaic.me](https://lenaic.me)
