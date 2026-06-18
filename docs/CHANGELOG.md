# Changelog

Agents MUST update this file whenever they push code to `main`.

## 2026-06-17 - Unified OpenRouter AI, Mobile UI, Sync Hardening

- Summary: Replaced the multi-provider (Anthropic/OpenAI/Google) LLM fallback
  chain and the direct OpenAI Images infographic call with a single OpenRouter
  integration powered by one `OPENROUTER_API_KEY`. Added a per-feature model
  picker (cards, study texts, chat, infographics) persisted in the browser.
  Infographics now use OpenRouter image-capable chat models (default
  `openai/gpt-5.4-image-2`). Also audited/hardened offline progress sync and
  fixed several mobile-UI issues for iPhone/iPad.
- Data/schema: None (reused `provider`/`model` columns; no migration).
- Verification: `bun run build` passes (TypeScript clean, 20 routes). 16/16
  non-sync tests pass via per-file `bun test`. The sync suite
  (`sync.test.ts`) still hangs in its `afterEach` teardown under
  `fake-indexeddb` — pre-existing, see `docs/LEARNINGS.md`; each sync test
  passes individually with `-t`.
- Notes: All AI features are online-only and need `OPENROUTER_API_KEY`. The old
  `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` /
  `LLM_PROVIDER` env vars are no longer used.

## 2026-05-02 - Offline Sync And Infographics

- Summary: Improved offline startup/sync behavior, added randomized study mode
  support, added route warming for the PWA shell, and added per-card
  OpenAI-generated infographics that sync through the SQLite to Dexie snapshot
  path for offline viewing.
- Data/schema: Added `card_infographics` via Drizzle migration
  `0004_third_retro_girl.sql`; Dexie schema bumped with a matching
  `cardInfographics` store.
- Verification: `bun test` passed with 16 tests; `bun run build` passed.
  `bun run lint` could not start because system Node aborts on missing
  `/opt/homebrew/opt/simdutf/lib/libsimdutf.33.dylib`. Forcing ESLint through
  Bun starts the CLI but fails in config validation with
  `JSON.stringify cannot serialize cyclic structures`.
- Notes: Infographic generation is online-only and requires `OPENAI_API_KEY`;
  generated images remain available offline after syncing.

For each `main` update, add a new entry at the top with:

- Date
- Short title
- Summary of user-visible or architectural changes
- Database/schema or migration notes, if any
- Verification performed, including tests/build/lint status
- Any known follow-up or operational caveat

Use this format:

```markdown
## YYYY-MM-DD - Short Title

- Summary: What changed and why.
- Data/schema: Migration or data impact, or "None".
- Verification: Commands run and results.
- Notes: Follow-ups, caveats, or "None".
```

Do not use this file for every local experiment or unmerged branch commit. It is for changes that land on `main`.
