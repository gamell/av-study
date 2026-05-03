import { expect, test } from "bun:test";
import { shouldWaitForInitialStudyLoad } from "../study-readiness";

test("waits while the first snapshot pull is still booting", () => {
  expect(
    shouldWaitForInitialStudyLoad({
      loadedOnce: false,
      lastSyncAt: null,
      syncStatus: "pulling",
    })
  ).toBe(true);
});

test("loads immediately when a persisted snapshot is rehydrated during bootstrap", () => {
  expect(
    shouldWaitForInitialStudyLoad({
      loadedOnce: false,
      lastSyncAt: "2026-05-01T12:00:00.000Z",
      syncStatus: "initializing",
    })
  ).toBe(false);
});

test("loads after bootstrap ends even if no last sync metadata exists", () => {
  expect(
    shouldWaitForInitialStudyLoad({
      loadedOnce: false,
      lastSyncAt: null,
      syncStatus: "error",
    })
  ).toBe(false);
});

test("does not block manual reloads after cards have loaded once", () => {
  expect(
    shouldWaitForInitialStudyLoad({
      loadedOnce: true,
      lastSyncAt: null,
      syncStatus: "pulling",
    })
  ).toBe(false);
});
