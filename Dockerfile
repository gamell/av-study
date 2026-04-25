# syntax=docker/dockerfile:1.7

# ─── Base ────────────────────────────────────────────────────────────────────
FROM oven/bun:1 AS base
WORKDIR /app

# ─── Dependencies (all, incl. dev for the build step) ────────────────────────
# `better-sqlite3` is a native module compiled via node-gyp during install.
# The oven/bun:1 (Debian) image does not ship python3/make/g++ or node-gyp —
# install them here so the prebuild-install fallback can build from source.
# nodejs+npm are needed because `npm install -g node-gyp` is the canonical
# way to put a `node-gyp` binary on PATH; bun does not provide its own.
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 make g++ ca-certificates nodejs npm \
 && npm install -g node-gyp \
 && apt-get purge -y --auto-remove npm \
 && rm -rf /var/lib/apt/lists/* /root/.npm
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# ─── Build ───────────────────────────────────────────────────────────────────
# Runs `next build --webpack` which emits `.next/standalone` + the service
# worker at `public/sw.js`.
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# ─── Runtime ─────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/app/data

# Standalone output ships all runtime node_modules it needs. We copy:
# - public/ (static assets + manifest + precached sw.js)
# - .next/standalone/ (server.js + trimmed node_modules)
# - .next/static/ (hashed JS/CSS)
# - drizzle/ (migrations applied on first request via ensureDatabase())
# - src/data/ (seed JSON decks)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/src/data ./src/data

# Writable data volume (SQLite + WAL files live here).
RUN mkdir -p "$DATA_DIR" && chown -R bun:bun "$DATA_DIR" /app
USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:'+ (process.env.PORT||3000) +'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "server.js"]
