
![SpamBuster](/spambuster.jpg)

[![Next.js](https://img.shields.io/badge/Next.js-16.1.0-black?style=flat&logo=next.js)](https://nextjs.org)
[![Electron](https://img.shields.io/badge/Electron-39.3.0-blue?style=flat&logo=electron)](https://www.electronjs.org/)
[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![GitHub Releases](https://img.shields.io/github/downloads/lelenaic/spambuster/latest/total.svg)](https://github.com/lelenaic/spambuster/releases/latest)

AI-powered spam email cleaner for your emails (Outlook, Gmail and IMAP)

Uses OpenRouter or Ollama to classify emails based on your custom anti-spam rules.

## ✨ Features

- **AI-Driven Spam Detection**: Leverage powerful LLMs via OpenRouter or local Ollama.
- **Multiple Integrations**: Connect to Gmail (using Google API), Outlook (using Microsoft API), or any IMAP server.
- **Custom Rules**: Configure rules sent to AI for intelligent spam filtering.
- **Cross-Platform**: Electron builds for macOS (DMG), Windows (NSIS), Linux (AppImage, Snap).
- **Modern UI**: Shadcn UI components, Tailwind CSS, Lucide React icons, Sonner toasts.
- **Vector database**: LanceDB included to match with previous analyzed emails for a better analysis

<img width="1150" height="730" alt="CleanShot 2026-03-01 at 20 08 03" src="https://github.com/user-attachments/assets/4159bc75-5c70-49ca-afcb-bdd4b6167416" />


## 🚀 Installation

Download pre-built binaries from the [latest release](https://github.com/lelenaic/spambuster/releases/latest) for Linux, MacOS and Windows.

[![Get it from the Snap Store](https://snapcraft.io/en/dark/install.svg)](https://snapcraft.io/spambuster)


## ？How does it work?
You start by configuring a mail account and an AI provider. Then every x minutes it will check your new emails, download them and send them to the configured AI model to analyze them. You can configure custom rules too to restrict spam check or whitelist some senders for example. You can enable a integrated vector database that will stored the analyzed emails and will be use to match similar emails to guide AI thanks to previous analysis.


## 📋 TODO
- Auto update
- Publish rules to community marketplace
- Create a full web dockerized version

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
