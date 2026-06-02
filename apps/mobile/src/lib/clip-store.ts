import { get, set, del, keys } from "idb-keyval";

export type StoredClip = {
  scenarioId: string;
  sceneIdx: number;
  blob: Blob;
  mimeType: string;
  /** Recorded length of the clip, in seconds. */
  duration: number;
  /**
   * Auto-trim target: how many seconds of this clip the renderer keeps in
   * the final reel. The renderer extracts these from the MIDDLE of the
   * recording (start has setup wobble, end has stop-anxiety). If absent,
   * the whole clip is used (legacy behaviour, zero regression).
   */
  finalUsageDuration?: number;
  createdAt: number;
};

const k = (scenarioId: string, sceneIdx: number) =>
  `clip:${scenarioId}:${sceneIdx}`;

export async function saveClip(c: StoredClip): Promise<void> {
  await set(k(c.scenarioId, c.sceneIdx), c);
  // Best-effort persistence request (so the browser doesn't evict our data).
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch {
    // ignore
  }
}

export async function getClip(
  scenarioId: string,
  sceneIdx: number,
): Promise<StoredClip | undefined> {
  return (await get(k(scenarioId, sceneIdx))) as StoredClip | undefined;
}

export async function listClips(scenarioId: string): Promise<StoredClip[]> {
  const allKeys = await keys();
  const prefix = `clip:${scenarioId}:`;
  const matching = allKeys.filter(
    (key) => typeof key === "string" && key.startsWith(prefix),
  );
  const clips = await Promise.all(
    matching.map((key) => get(key) as Promise<StoredClip | undefined>),
  );
  return clips
    .filter((c): c is StoredClip => !!c)
    .sort((a, b) => a.sceneIdx - b.sceneIdx);
}

export async function clearScenario(scenarioId: string): Promise<void> {
  const allKeys = await keys();
  const prefix = `clip:${scenarioId}:`;
  await Promise.all(
    allKeys
      .filter((key) => typeof key === "string" && key.startsWith(prefix))
      .map((key) => del(key)),
  );
}

/**
 * Find an in-progress reel for the Home screen "Continuă" card.
 *
 * Scans all saved clips, groups them by scenarioId, and returns the most
 * recently worked-on scenario along with how many scenes have clips.
 * Returns null if there are no saved clips at all.
 */
export async function findInProgressReel(): Promise<{
  scenarioId: string;
  sceneCount: number;
  lastUpdated: number;
} | null> {
  const allKeys = await keys();
  const clipKeys = allKeys.filter(
    (key) => typeof key === "string" && key.startsWith("clip:"),
  );
  if (clipKeys.length === 0) return null;

  const clips = await Promise.all(
    clipKeys.map((key) => get(key) as Promise<StoredClip | undefined>),
  );

  // Group by scenarioId and track the most recent createdAt per scenario.
  const byScenario = new Map<string, { count: number; lastUpdated: number }>();
  for (const clip of clips) {
    if (!clip) continue;
    const cur = byScenario.get(clip.scenarioId) ?? { count: 0, lastUpdated: 0 };
    cur.count += 1;
    if (clip.createdAt > cur.lastUpdated) cur.lastUpdated = clip.createdAt;
    byScenario.set(clip.scenarioId, cur);
  }

  if (byScenario.size === 0) return null;

  // Return the scenario most recently touched.
  let winner: { scenarioId: string; sceneCount: number; lastUpdated: number } | null = null;
  for (const [scenarioId, info] of byScenario.entries()) {
    if (!winner || info.lastUpdated > winner.lastUpdated) {
      winner = { scenarioId, sceneCount: info.count, lastUpdated: info.lastUpdated };
    }
  }
  return winner;
}

export async function getStorageEstimate(): Promise<{
  usageMB: number;
  quotaMB: number;
} | null> {
  try {
    if (!navigator.storage?.estimate) return null;
    const e = await navigator.storage.estimate();
    return {
      usageMB: Math.round(((e.usage ?? 0) / 1024 / 1024) * 10) / 10,
      quotaMB: Math.round((e.quota ?? 0) / 1024 / 1024),
    };
  } catch {
    return null;
  }
}
