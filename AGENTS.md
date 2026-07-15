# SpamBuster - Agent Instructions

This is a **Next.js (frontend) + AdonisJS (backend) web app** for AI-powered spam email cleaning. It connects to IMAP/Gmail/Outlook, uses OpenRouter/Ollama for AI spam detection, and LanceDB for vector similarity search. Data is persisted server-side in a SQLite database (via AdonisJS Lucid).

## Repository Layout

The project is split into two apps under the repo root:

```
web/            # Next.js 16 frontend (App Router, React 19, Tailwind v4)
  app/          # App Router pages
    login/      # Login / signup
    wizard/     # Setup wizard steps (multi-step form)
    settings/   # Settings tabs (mail accounts, AI, general)
    stats/      # Statistics page
    page.tsx    # Main dashboard
  components/   # React components (UI + feature)
    ui/         # shadcn/ui components (new-york style)
  lib/          # Shared frontend code
    api.ts      # Community API client
    bridge.ts   # HTTP/SSE bridge exposing the v1 `window.*` API surface
    ai/         # Frontend AI helpers (spam detector, rule generator)
    mail/       # Frontend mail provider factory
    contexts/   # React contexts (processing, update notification)
    hooks/      # React hooks (email processing)
    types.ts    # Shared frontend types
  types/        # TS types (electron.d.ts legacy shim)
server/         # AdonisJS 7 backend (ESM/TS, Node)
  app/
    controllers/  # HTTP controllers (accounts, rules, settings, process, ...)
    models/       # Lucid models (user, account, rule, ai_setting, ...)
    services/     # Business logic
      ai/          # AI factory, Ollama/OpenRouter services, spam detector
      mail/        # Mail factory, IMAP/Google/Microsoft providers
      processing/  # Processing + scheduler services
      vector/      # LanceDB wrapper
      alert/       # Alert service
    middleware/    # auth, container bindings, force-json
    transformers/  # Response transformers
  config/       # AdonisJS config (app, database, auth, cors, ...)
  database/
    migrations/  # SQL migrations
    schema.ts    # Schema definitions
  start/        # routes.ts, kernel.ts, env.ts, validator.ts
  providers/    # Service providers
  tests/        # Japa tests
apps/server/    # (placeholder / reserved for additional server tooling)
```

## Quick Commands

### Frontend (`web/`)
| Command | Description |
|---------|-------------|
| `cd web && npm ci` | Install frontend dependencies |
| `cd web && npm run dev` | Start Next.js dev server (port 3000) | NEVER RUN THIS COMMAND
| `cd web && npm run build` | Production `next build` |
| `cd web && npm run start` | Serve production build |
| `cd web && npm run lint` | Run ESLint (`next lint`) |

### Backend (`server/`)
| Command | Description |
|---------|-------------|
| `cd server && npm ci` | Install backend dependencies |
| `cd server && npm run dev` | Start AdonisJS dev server with HMR (`ace serve --hmr`), port 3333 | NEVER RUN THIS COMMAND
| `cd server && node ace build` | Production build |
| `cd server && node ace serve` | Start the built server |
| `cd server && npm run test` | Run Japa tests (`ace test`) |
| `cd server && npm run lint` | Run ESLint |
| `cd server && npm run typecheck` | Run `tsc --noEmit` |
| `cd server && npm run format` | Prettier write |

## Architecture

- **Frontend** (`web/`): Next.js App Router talking to the backend over HTTP + SSE.
- **Backend** (`server/`): AdonisJS 7 API server on port 3333, exposing a versioned REST API under `/api/v1`.
- **Communication boundary**: the frontend never imports backend code. It talks to the backend exclusively through `web/lib/bridge.ts`, which exposes the same `window.*` API surface as the old Electron renderer (e.g. `window.accountsAPI`, `window.aiAPI`, `window.processingEvents`) but implemented over `fetch` + `@adonisjs/transmit` SSE instead of IPC.

**Key boundary**: `server/` is a standalone Node/AdonisJS app (ESM, TS). `web/` is the Next.js app (ESM, TS). They share no modules; the frontend's `lib/bridge.ts` mirrors the backend routes.

## Environment

### Backend (`server/.env`)
- Copy `server/.env.example` to `server/.env`.
- `PORT=3333`, `HOST=localhost`, `APP_KEY` (generate via `node ace generate:key`).
- `CORS_ORIGIN` must allow the frontend origin (e.g. `http://localhost:3000`).
- OAuth secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_TENANT_ID`.
- Database: SQLite via Lucid (`config/database.ts`), configured through env.

### Frontend (`web/.env.local`)
- `NEXT_PUBLIC_API_URL` — backend base URL (default `http://localhost:3333`).
- `NEXT_PUBLIC_API_PREFIX` — API path prefix (default `/api/v1`).
- `NEXT_PUBLIC_APP_VERSION` — version shown in the sidebar / update checker.

## Backend API (AdonisJS)

Routes are defined in `server/start/routes.ts`, prefixed with `/api/v1`:

- `POST /api/v1/auth/login`, `POST /api/v1/auth/signup` — auth (issues bearer token).
- `GET /api/v1/account/profile`, `POST /api/v1/account/logout` — session (auth).
- `accounts` resource + `POST /accounts/test`, `GET /accounts/:id/folders`, `POST /accounts/folders` (auth).
- `rules` resource (auth).
- `GET|PUT /settings/general`, `GET|PUT /settings/ai`, `POST /settings/ai/test`, `GET /settings/ai/models`, `GET /settings/ai/embedding-models` (auth).
- `analyzed-emails` (auth), `vector-db/*` (auth), `GET /alerts` (auth).
- `POST /process`, `POST /process/stop` — processing control (auth).
- `community/*` — proxy to the SpamBuster community API (auth).
- OAuth: `GET /api/v1/oauth/google/start`, `GET /api/v1/oauth/google/callback` (unauthenticated callback), `POST /api/v1/oauth/microsoft/device-code`, `POST /api/v1/oauth/microsoft/poll` (auth).

Auth uses AdonisJS auth with bearer access tokens (`#models/user`, `#models/access_token`). Routes are guarded by `middleware.auth()` (see `server/app/middleware/auth_middleware.ts`).

Real-time processing/alert events are pushed over `@adonisjs/transmit` SSE channels `users/:id/processing` and `users/:id/alerts` (authorized per-user).

## Adding a Backend Endpoint

1. Add the route in `server/start/routes.ts` (apply `middleware.auth()` as needed).
2. Implement the controller in `server/app/controllers/` (use `#controllers/*` import alias).
3. Add/extend the Lucid model in `server/app/models/` or run a new migration in `server/database/migrations/`.
4. Add business logic in `server/app/services/` if needed.
5. Mirror the call in `web/lib/bridge.ts` so the frontend (and any copied v1 component) can reach it via `window.<apiName>`.

## AI Providers

`server/app/services/ai/ai_factory.ts` creates an `AIService`:
- `ollama` → `OllamaService(baseUrl)`
- `openrouter` → `OpenRouterService(apiKey)`

Frontend helpers live in `web/lib/ai/` (`spamDetector.ts`, `ruleGenerator.ts`, `ollama.ts`).

## Mail Providers

`server/app/services/mail/mail_factory.ts` creates a `MailProvider`:
- `imap` → `ImapProvider` (imapflow)
- `gmail` → `GoogleWorkspaceProvider`
- `outlook` → `Microsoft365Provider`

OAuth flows are handled server-side in `server/app/controllers/oauth_controller.ts`.

## Vector DB

`server/app/services/vector/lance_db.ts` wraps `@lancedb/lancedb` (SQLite-backed). Embedding model changes are stored in `ai_settings` (`selectedEmbedModel`); the vector service migrates dimensions as needed.

## Scheduler

Cron-based processing via `cron` package in `server/app/services/processing/scheduler_service.ts`. Controlled by general settings (`enableCron`, `cronExpression`, simple mode). Booted once in `server/start/routes.ts` via `app.ready(...)`. Prevents overlapping runs via an internal active flag and broadcasts progress through Transmit SSE.

## Code Style

### Backend (`server/`)
- AdonisJS conventions; ESM `.ts` files; import aliases (`#controllers/*`, `#services/*`, `#models/*`, `#config/*`, etc.) defined in `package.json`.
- ESLint via `@adonisjs/eslint-config`; Prettier via `@adonisjs/prettier-config`.
- `tsconfig.json` strict.

### Frontend (`web/`)
- ESLint: `eslint-config-next` (core-web-vitals + typescript).
- `tsconfig.json`: strict, bundler resolution, `@/*` → `.*`.
- `components.json`: shadcn/ui new-york, RSC enabled, CSS variables.
- Tailwind v4 via `@tailwindcss/postcss`.

## Gotchas

- **No root `package.json`** — this is not a monorepo with a single install; run commands inside `web/` and `server/` separately.
- **No TS in `web/types/electron.d.ts`** — legacy shim kept for copied v1 components; new code should not rely on Electron globals.
- **Backend cannot be imported by the frontend** — they are separate apps; use the HTTP API via `web/lib/bridge.ts`.
- **Secrets stay server-side** — OAuth client secrets belong in `server/.env`, never in the frontend.
- **CORS** — the backend only accepts requests from origins listed in `CORS_ORIGIN`; update it when changing the frontend URL.
- **SSE auth** — `EventSource` cannot send headers, so the frontend opens the Transmit stream via `fetch` with a `Bearer` token (`web/lib/bridge.ts`).
- **No CI in this repo** — README mentions GitHub Actions but the Electron build pipelines are no longer applicable.

## Most important
Never run a command that starts a dev server (e.g. `npm run dev`, `ace serve`) unless explicitly asked.
