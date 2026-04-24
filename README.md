# Pilot Study

A self-hosted flashcard study app for the FAA Private Pilot knowledge test and checkride oral exam. Features spaced repetition (SM-2), AI-generated study texts, a progress dashboard, and a **fully offline-capable PWA** so you can keep studying on your phone with no signal.

## Features

- **Two Study Decks**: Knowledge Test (written exam) and Checkride Oral (practical test)
- **Spaced Repetition**: SM-2 algorithm schedules reviews at optimal intervals
- **500+ Seed Cards**: Pre-loaded flashcards covering all ACS areas of operation
- **Offline-First PWA**: Install to your phone's home screen; cards, progress, notes, and search all work in Airplane Mode. Reviews queue locally and sync back to the server the next time you're online.
- **Multi-Device Sync**: Server SQLite is the source of truth; laptop and phone stay in sync automatically (SM-2 review scores are additive so nothing is lost).
- **AI-Powered Extensions**: Generate additional cards or study texts using OpenAI, Anthropic, or Google Gemini (online only)
- **Study Text Generator**: Creates conversational review texts from failed cards (for Speechify/audio)
- **Progress Dashboard**: Track mastery by category with weak area highlighting
- **Dark Mode**: System-aware with manual toggle
- **Docker Ready**: Single container deployment

## Run with Docker (recommended for homelab)

This is the easiest way to run Pilot Study. One `docker compose up` and you're done.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 20.10+ with the Compose v2 plugin (`docker compose ...`, not the old `docker-compose`).
- That's it. No Node, no Bun, no build tooling required on the host.

### First-time setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/pilot-study.git
cd pilot-study

# 2. (Optional) Enable AI features.
#    Skip this entirely if you only want the offline flashcards — the study,
#    review, progress, notes, and search flows work without any keys. The
#    "Generate cards", "Generate study text", and "AI chat" buttons simply
#    show a clear error when tapped if no key is set.
cp .env.example .env
${EDITOR:-nano} .env          # set LLM_PROVIDER and the matching API key

# 3. Build the image and start the container (detached).
docker compose up -d --build
```

The first build takes 1–3 minutes (installs dependencies, compiles the Next.js app, bundles the service worker). Subsequent `up -d` runs are instant unless you re-build.

### Verify it's running

```bash
# Container should be "healthy" within ~20 seconds
docker compose ps

# Hit the health endpoint
curl http://localhost:3000/api/health
# → {"status":"ok","cards":570}
```

Then open [http://localhost:3000](http://localhost:3000) in any browser. On first request the app auto-runs drizzle migrations and seeds ~570 flashcards from the bundled JSON decks.

### Day-to-day commands

| Command | What it does |
|---------|--------------|
| `docker compose up -d` | Start in background. |
| `docker compose down` | Stop and remove the container (data in `./data` is preserved). |
| `docker compose logs -f` | Tail logs. `Ctrl+C` to exit. |
| `docker compose restart` | Restart without rebuilding (e.g. after editing `.env`). |
| `docker compose ps` | See status + healthcheck result. |
| `docker compose up -d --build` | Rebuild image and restart (use after pulling new code). |

### Updating to a new version

```bash
git pull
docker compose up -d --build
```

The bind-mounted `./data` directory keeps your SQLite database across rebuilds, so all progress is preserved.

### Changing the host port

The container always listens on port 3000 internally. To publish it on a different host port, either set `PORT` in `.env`:

```bash
echo "PORT=8080" >> .env
docker compose up -d
```

…or export it inline for a single run: `PORT=8080 docker compose up -d`.

### Backups

Everything the app knows — cards, edits, progress, sessions, AI-generated content, notes — lives in `./data/pilot-study.db*`. Back up that directory and you've backed up the entire app state.

```bash
# Stop the container for a consistent snapshot, copy, and start again.
docker compose down
cp -a ./data ./data-backup-$(date +%F)
docker compose up -d
```

Downtime is 1–2 seconds. For hot backups while the app keeps running, use SQLite's online backup API (e.g. via `sqlite3 data/pilot-study.db ".backup backup.db"` from the host, since the DB file is bind-mounted).

### HTTPS for iOS PWA install

iOS Safari only lets you "Add to Home Screen" from an HTTPS origin. For a homelab, the easiest options are:

- **Tailscale Serve / Funnel** — point it at `http://localhost:3000` and get a real `*.ts.net` HTTPS URL.
- **Caddy** as a reverse proxy with automatic Let's Encrypt certs:
  ```
  pilot-study.yourdomain.com {
      reverse_proxy localhost:3000
  }
  ```
- **mkcert** for dev/LAN testing over HTTPS.

Once served over HTTPS, open Safari → Share → Add to Home Screen; the PWA installs and from then on runs fully offline (see [Install as a PWA on your phone](#install-as-a-pwa-on-your-phone) below).

### What's in the image

- Multi-stage Dockerfile built on `oven/bun:1`. Next.js runs in `output: "standalone"` mode, so the runtime image is small and only contains what the server needs at runtime.
- Runs as the non-root `bun` user (uid 1000). If your bind-mount has different ownership, either `sudo chown -R 1000:1000 ./data` on the host or switch to a named volume.
- Healthcheck hits `/api/health` every 30 s; that endpoint also runs drizzle migrations + first-time seed on first call, so the container self-initializes.
- SQLite DB + WAL files live at `/app/data` inside the container (bind-mounted to `./data` on the host).

### Troubleshooting

- **"bind: address already in use"** — something else is on port 3000. Set a different `PORT` in `.env` (see above).
- **Container keeps restarting, `unhealthy`** — `docker compose logs pilot-study` to see the server's stderr. Most commonly this is a file-permission issue on `./data`; run `sudo chown -R 1000:1000 ./data` and `docker compose restart`.
- **Changes to `.env` don't take effect** — Compose only re-reads env files on container (re)creation. Run `docker compose up -d --force-recreate`.
- **ARM vs x86** — the image builds for whatever arch you `docker compose build` on. If you build on your laptop (arm64 Mac) and deploy to an x86 homelab, either build on the target host or use `docker buildx build --platform linux/amd64`.

## Run without Docker (dev)

Useful if you want to hack on the code.

### Prerequisites

- [Bun](https://bun.sh) (v1.1+)

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/pilot-study.git
cd pilot-study
bun install

# Optional: AI features.
cp .env.example .env.local
# Edit .env.local with your API key(s)

bun dev
```

Open [http://localhost:3000](http://localhost:3000). The database is created and seeded on first visit. Note: the service worker is disabled in dev — run `bun run build && bun start` to exercise the PWA path locally.

## Install as a PWA on your phone

Once the app is deployed (or exposed over HTTPS on your LAN), you can install it as a standalone app:

1. Open the site in Safari (iOS) or Chrome (Android).
2. iOS: tap Share → Add to Home Screen. Android: tap the menu → Install app.
3. Launch it from the home screen. The service worker caches the entire app shell; cards, progress, notes, and search keep working offline.
4. Reviews done offline are queued in your browser and automatically flushed the next time the device reconnects. The badge in the nav header shows `N pending` until the queue drains.

Generating cards / study texts and the in-card AI chat require network — those buttons will show a friendly "requires internet" notice when offline.

> **iOS note**: adding a PWA to the home screen requires HTTPS. For LAN testing, use Tailscale, `mkcert`, or `ngrok` to expose an HTTPS origin.

## How sync works

- Server SQLite stays the source of truth. The client keeps a mirror in IndexedDB via Dexie.
- Page reads always hit IndexedDB → instant, offline-capable.
- Writes (reviews, session updates, notes, card edits) are applied to IndexedDB immediately and appended to a durable queue; a small sync engine drains the queue against the existing `/api/*` endpoints when online.
- On boot / reconnect / tab focus / every 60 s, the client pulls a fresh `GET /api/sync/snapshot` and merges it into IndexedDB (rows with pending local ops are preserved until flush completes).
- Two devices reviewing the same card offline simultaneously is safe: SM-2 is applied twice on the server, so both reviews count. All other entities fall back to last-write-wins by `updated_at`.

## Tech Stack

- **Runtime**: Bun
- **Framework**: Next.js 16 (App Router, React Compiler)
- **Database**: SQLite (Drizzle ORM) server-side, IndexedDB (Dexie) client-side
- **PWA**: Serwist service worker + web manifest
- **UI**: Tailwind CSS v4, shadcn/ui components
- **LLM**: Vercel AI SDK (OpenAI, Anthropic, Google Gemini) — online only

## Content Sources

Flashcard content is based on official FAA publications:

- FAA-S-ACS-6C (Private Pilot Airplane ACS)
- FAA-H-8083-25C (Pilot's Handbook of Aeronautical Knowledge)
- FAA-H-8083-3C (Airplane Flying Handbook)
- 14 CFR Parts 61 and 91
- Aeronautical Information Manual (AIM)

## Keyboard Shortcuts (Study Mode)

| Key | Action |
|-----|--------|
| Space / Enter | Flip card |
| 1 | Again (forgot) |
| 2 | Hard |
| 3 | Good |
| 4 | Easy |

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Dev server (Turbopack). PWA service worker is disabled in dev. |
| `bun run build` | Production build (webpack). Generates `public/sw.js` + precache manifest. |
| `bun start` | Start the production server. |
| `bun run db:generate` | Generate a drizzle migration from schema changes. |
| `bun run db:migrate` | Apply pending migrations. |
| `bun run db:seed` | One-shot seed from the bundled JSON decks. |
| `bun run icons:generate` | Regenerate PWA icons from `public/icons/*.svg`. |

## License

MIT
