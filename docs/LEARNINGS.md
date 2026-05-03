# Learnings

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
