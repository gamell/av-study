# Agent Guide

This repo is a self-hosted FAA Private Pilot study app. It is a Next.js PWA with offline-first study flows, server SQLite as the source of truth, and a Dexie IndexedDB mirror on the client.

## VERY IMPORTANT: Keep Docs Updated

Agents MUST keep documentation current as part of every code change. If behavior, architecture, commands, environment variables, migrations, sync behavior, AI behavior, deployment, or user workflows change, update the relevant docs in the same change set.

- Update `README.md` when user-facing setup, features, commands, or operating behavior changes.
- Update `AGENTS.md` when agent-facing architecture, commands, conventions, or gotchas change.
- Update `docs/LEARNINGS.md` when a failure mode, workaround, or repo-specific lesson is discovered.
- Update `docs/CHANGELOG.md` when pushing code to `main`, summarizing the change and verification.
- Do not treat documentation as optional cleanup. A code change is incomplete if the docs it affects are stale.

## Architecture

- `src/app/` contains the Next.js App Router pages and API routes.
- `src/components/` contains shared client UI, including the study card actions, sync status, PWA helpers, and shadcn-style primitives.
- `src/lib/db/` is the server-side Drizzle/SQLite layer. `schema.ts` defines tables, `ensure-seeded.ts` runs migrations and initial deck seeding, and `index.ts` opens `data/pilot-study.db`.
- `src/lib/data/` is the browser-side Dexie mirror plus offline mutation queue. UI reads from IndexedDB first; writes update IndexedDB and enqueue `pendingOps` where offline mutation is supported.
- `src/lib/data/sync.ts` pulls `GET /api/sync/snapshot` into Dexie and flushes queued ops back to API routes. Conflict policy is server-authoritative: pulled rows overwrite local rows unless locked by a pending op. Pull and flush are mutually exclusive (a flush requested during a pull is deferred until the pull finishes) to avoid lost-update flicker. Background timers are `unref()`'d so they don't keep Node/CI processes alive. Repeated review ops per card coalesce to the most recent rating (last-write-wins).
- `src/app/sw.ts` is the Serwist service worker. It caches app shell/documents; `/api/*` remains network-only because data reads come from IndexedDB.
- `drizzle/` contains generated SQL migrations and Drizzle metadata snapshots.
- `data/` contains local SQLite files. Treat these as runtime state, not source code.

## Stack

- Runtime/package manager: Bun
- Framework: Next.js 16 App Router with React 19
- Database: SQLite via Drizzle ORM on the server, Dexie/IndexedDB in the browser
- PWA/offline: Serwist service worker plus Dexie snapshot sync
- Styling/UI: Tailwind CSS v4, shadcn-style primitives, `lucide-react`
- AI: Vercel AI SDK via OpenRouter (`@openrouter/ai-sdk-provider`, single `OPENROUTER_API_KEY`) for text/object generation; OpenRouter image-capable chat models (default `openai/gpt-5.4-image-2`, `modalities:["image","text"]`) for infographics. Models are curated in `src/lib/ai/models.ts` and chosen per feature in the UI.
- Tests: `bun test`, with co-located `__tests__` folders

## Useful Commands

- `bun dev` - start local dev with `.secrets` loaded.
- `bun run dev:no-secrets` - start local dev without `.secrets`.
- `bun test` - run all Bun tests.
- `bun run build` - production build, TypeScript check, and service worker bundle.
- `bun run lint` - run ESLint.
- `bun run db:seed` - seed bundled decks into the SQLite database.
- `bun --bun ./node_modules/.bin/drizzle-kit generate` - generate Drizzle migrations using Bun. Prefer this over `bun run db:generate` on this machine; see `docs/LEARNINGS.md`.

## Environment

- `.secrets` is gitignored and used for local development secrets.
- `.env.example` documents supported variables.
- All AI features (text + image) require a single `OPENROUTER_API_KEY`; without it those endpoints return a 503 and the rest of the app works normally. Optional `OPENROUTER_MODEL` / `OPENROUTER_IMAGE_MODEL` override the server-side default models; `OPENROUTER_SITE_URL` sets the attribution referer.
- Docker Compose reads `.env` for production-style deployments.

## Development Notes

- Preserve unrelated user changes. This branch may have dirty runtime files (`data/*.db*`) and parallel-session edits.
- Keep new synced data modeled as server SQLite rows plus Dexie snapshot rows unless the feature explicitly needs offline mutation.
- If adding a Dexie store, bump the Dexie version and add snapshot reconciliation tests.
- If adding a server table, generate both the SQL migration and `drizzle/meta/*_snapshot.json`.
- Do not cache `/api/*` in the service worker without reconsidering the offline data model.
- Run `bun test` and `bun run build` before claiming implementation completion. Run `bun run lint` too, but check `docs/LEARNINGS.md` if it aborts with the local `simdutf` Node/Homebrew issue.
