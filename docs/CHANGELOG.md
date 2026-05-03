# Changelog

Agents MUST update this file whenever they push code to `main`.

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
