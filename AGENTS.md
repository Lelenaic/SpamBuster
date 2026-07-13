# SpamBuster - Agent Instructions

This is a **Next.js + Electron** desktop app for AI-powered spam email cleaning. It connects to IMAP/Gmail/Outlook, uses OpenRouter/Ollama for AI spam detection, and LanceDB for vector similarity search.

## Quick Commands

| Command | Description |
|---------|-------------|
| `npm ci` | Install dependencies (use ci, not install) |
| `npm run dev` | Start dev: Next.js (port 3000) + Electron concurrently |
| `npm run build` | Production build: `next build && electron-builder` |
| `npm run mac-build` | macOS build without code signing |
| `npm run lint` | Run ESLint |

## Architecture

```
app/            # Next.js App Router pages (renderer)
  wizard/       # Setup wizard steps (multi-step form)
  settings/     # Settings tabs (accounts, AI, rules, general)
  stats/        # Statistics page
  page.tsx      # Main dashboard
main/           # Electron main process (CommonJS, .js)
  main.js       # Entry point: IPC, cron, windows, managers
  preload.js    # Context bridge → window.electronAPI, window.storeAPI, etc.
  *Manager.js   # Rules, Accounts, AI, GeneralSettings, VectorDB
lib/            # Shared TypeScript (renderer + optional main)
  ai/           # AI providers: OpenRouter, Ollama, factory
  mail/         # Mail providers: IMAP, Google Workspace, Microsoft 365
  contexts/     # React contexts (notifications, processing status)
  types/        # Shared TS types + electron.d.ts (window API types)
components/     # React components (UI + feature)
  ui/           # shadcn/ui components (new-york style)
```

**Key boundary**: `main/` is **CommonJS** (Node/Electron), `app/` + `lib/` are **ESM/TS** (Next.js). They communicate only via `preload.js` → `ipcRenderer.invoke` / `ipcMain.handle`.

## Environment

- `.env` contains `NEXT_PUBLIC_API_BASE_URL` (production API endpoint)
- No `.env.local` committed; copy `.env.example` if one exists
- Electron `main.js` runs in Node; it **cannot** import from `lib/` or `app/`

## Adding IPC

1. Add handler in `main/main.js` → `ipcMain.handle('channel', handler)`
2. Expose in `main/preload.js` → `contextBridge.exposeInMainWorld('apiName', {...})`
3. Add types in `lib/types/electron.d.ts` → `Window['apiName']`
4. Call from renderer: `window.apiName.method(...)`

## AI Providers

`lib/ai/factory.ts` creates `AIService` based on `window.aiAPI.getAISource()`:
- `ollama` → `OllamaService(baseUrl)`
- `openrouter` → `OpenRouterService(apiKey)`

## Mail Providers

`lib/mail/factory.ts` creates `MailProvider`:
- `imap` → `ImapProvider`
- `gmail` → `GoogleWorkspaceProvider`
- `outlook` → `Microsoft365Provider`

## Vector DB

`main/vectorDBManager.js` wraps `@lancedb/lancedb`. Embedding model changes trigger dimension migration (`aiManager.setSelectedEmbedModel` → `vectorDBManager.updateEmbeddingModel`).

## Scheduler

Cron jobs via `cron` package in `main/main.js`. Controlled by `generalSettingsManager` (enable, expression, simple mode). Prevents overlapping runs via `isProcessingActive` flag.

## Window Behavior

- Main window hides on close (tray-like), quits only on `app.quit()`
- Wizard opens in separate `BrowserWindow` (`createWizardWindow`)
- Packaged app loads from `out/` via `electron-serve` (`app://` protocol)

## Build Output

- `next.config.ts`: `output: "export"` → static `out/`
- `electron-builder` reads `package.json.build` → outputs to `dist/`
- Files bundled: `main/`, `app/`, `out/`, `node_modules/`, `package.json`

## Code Style

- ESLint: `eslint-config-next` (core-web-vitals + typescript)
- No Prettier config (Next.js default)
- `tsconfig.json`: strict, bundler resolution, `@/*` → `.*`
- `components.json`: shadcn/ui new-york, RSC enabled, CSS variables

## Gotchas

- **No tests** — no test runner configured
- **No typecheck script** — run `npx tsc --noEmit` manually if needed
- **main/ is plain JS** — no TS, no ESM; use `require`
- **Preload is plain JS** — no TS types at runtime; keep `electron.d.ts` in sync
- **No CI in this repo** — README mentions GitHub Actions at `lelenaic/spambuster/.github/workflows/ci.yml`
- **API calls go to production** (`NEXT_PUBLIC_API_BASE_URL`) even in dev unless overridden