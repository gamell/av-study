import "fake-indexeddb/auto";
import { afterEach, expect, mock, test } from "bun:test";

function installBrowserGlobals() {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    },
  });

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      visibilityState: "visible",
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    },
  });
}

afterEach(async () => {
  const { getClientDb } = await import("../db");
  const { syncEngine } = await import("../sync");
  syncEngine.dispose();
  const db = getClientDb();
  await Promise.all([
    db.categories.clear(),
    db.cards.clear(),
    db.cardProgress.clear(),
    db.studySessions.clear(),
    db.studyTexts.clear(),
    db.cardNotes.clear(),
    db.cardInfographics.clear(),
    db.meta.clear(),
    db.pendingOps.clear(),
  ]);
});

test("init exposes the last persisted snapshot when booting offline", async () => {
  installBrowserGlobals();
  globalThis.fetch = mock(async () => {
    throw new TypeError("offline");
  }) as unknown as typeof fetch;

  const lastSnapshotAt = "2026-05-01T12:00:00.000Z";
  const { META_KEYS, writeMeta } = await import("../db");
  const { syncEngine } = await import("../sync");
  await writeMeta(META_KEYS.lastSnapshotAt, lastSnapshotAt);

  const seenLastSyncAt: Array<string | null> = [];
  const unsubscribe = syncEngine.subscribe((state) => {
    seenLastSyncAt.push(state.lastSyncAt);
  });

  try {
    await syncEngine.init();
    expect(syncEngine.current.lastSyncAt).toBe(lastSnapshotAt);
    expect(seenLastSyncAt).toContain(lastSnapshotAt);
  } finally {
    unsubscribe();
  }
});

test("pullSnapshot reconciles card infographics into IndexedDB", async () => {
  installBrowserGlobals();
  const serverTime = "2026-05-02T12:00:00.000Z";
  globalThis.fetch = mock(async () => {
    return Response.json({
      serverTime,
      categories: [],
      cards: [],
      cardProgress: [],
      studySessions: [],
      studyTexts: [],
      cardNotes: [],
      cardInfographics: [
        {
          id: 10,
          cardId: 42,
          prompt: "Create an infographic",
          imageBase64: "aW5mb2dyYXBoaWM=",
          mimeType: "image/png",
          provider: "openai",
          model: "gpt-image-2",
          createdAt: "2026-05-02T10:00:00.000Z",
          updatedAt: "2026-05-02T10:00:00.000Z",
        },
      ],
    });
  }) as unknown as typeof fetch;

  const { getClientDb, readMeta, META_KEYS } = await import("../db");
  const { syncEngine } = await import("../sync");

  await syncEngine.pullSnapshot();

  const db = getClientDb();
  expect(await db.cardInfographics.where("cardId").equals(42).first()).toMatchObject({
    id: 10,
    cardId: 42,
    prompt: "Create an infographic",
    model: "gpt-image-2",
  });
  expect(await readMeta(META_KEYS.lastSnapshotAt)).toBe(serverTime);
});
