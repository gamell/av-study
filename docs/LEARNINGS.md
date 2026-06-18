# Learnings

## `bun test` Hangs On The Sync Suite's Teardown (fake-indexeddb)

`src/lib/data/__tests__/sync.test.ts` passes every assertion, but the Bun
process does not advance past the first test's `afterEach`: reads succeed, yet
the next IndexedDB write transaction (the table `clear()` calls) never resolves
under `fake-indexeddb` in the Bun runner. This reproduces on a clean checkout
(it is not caused by the OpenRouter / sync-hardening changes) and only affects
the sync suite, which is the only one that drives the sync engine.

Workarounds while this is unresolved:

- Run the other suites normally; they pass and exit cleanly.
- Verify a single sync test in isolation with `-t`, e.g.
  `bun test src/lib/data/__tests__/sync.test.ts -t "init exposes"` — the test
  itself passes; only the cross-test teardown stalls.

Engine-side mitigations already applied: all background timers are `unref()`'d
and the `init()` bootstrap timeout is cleared, so a torn-down engine no longer
keeps the loop alive on its own.

## Snapshot Ships Every Infographic's Base64 On Every Pull

`GET /api/sync/snapshot` returns full table contents — including
`card_infographics.imageBase64` (full PNGs) — on every pull (boot, focus,
reconnect, and the 60 s timer). With several infographics this re-transfers
many MB repeatedly, which is wasteful on cellular and risks timeouts.

Recommended follow-up (kept out of the current change to avoid regressing the
offline-first guarantee): send only infographic *metadata* in the snapshot and
lazily fetch each image via a dedicated `GET /api/cards/:id/infographic`
endpoint, caching the bytes in IndexedDB / the service worker. Reconciliation
must then preserve any locally-cached `imageBase64` instead of overwriting it
with an empty value. Alternatively, move to incremental `?since=` snapshots
with delete tombstones.

## Drizzle Generation Can Fail Through System Node

During the card infographic work, `bun run db:generate` failed before Drizzle could inspect the schema:

```text
$ drizzle-kit generate
dyld: Library not loaded: /opt/homebrew/opt/simdutf/lib/libsimdutf.33.dylib
Referenced from: /opt/homebrew/Cellar/merve/1.2.2/lib/libmerve.1.2.2.dylib
error: script "db:generate" was terminated by signal SIGABRT (Abort)
```

The failure also happened outside the sandbox, so it was not a permissions issue. The root cause was the local system `node`/Homebrew dynamic library chain, not Drizzle schema content.

Use Bun directly to run the JS CLI:

```bash
bun --bun ./node_modules/.bin/drizzle-kit generate
```

That command successfully generated the migration and metadata snapshot, then reported no pending schema changes on a second run:

```text
No schema changes, nothing to migrate
```

When adding database tables, make sure both files are present:

- `drizzle/<migration>.sql`
- `drizzle/meta/<snapshot>.json`

Do not hand-write a fallback migration and leave it beside a generated migration for the same schema change. If you had to add a manual fallback while debugging, remove the duplicate once Bun-based generation succeeds.
