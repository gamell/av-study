export function shouldWaitForInitialStudyLoad({
  loadedOnce,
  lastSyncAt,
  syncStatus,
}: {
  loadedOnce: boolean;
  lastSyncAt: string | null;
  syncStatus: string;
}): boolean {
  if (loadedOnce) return false;
  if (lastSyncAt !== null) return false;
  return syncStatus === "initializing" || syncStatus === "pulling";
}
