import { DEFAULT_SCENARIO_ID, getScenarioById, type Scenario } from "@/data/scenarios";
import { getTemplate } from "@/data/catalog";
import { templateToScenario } from "@/data/template-adapter";

const KEY = "reelcoach:selectedIdeaId";
const LAST_KEY = "reelcoach:lastOpenedIdeaId";

/**
 * Persist the selected idea across navigations.
 *
 * We write to BOTH sessionStorage and localStorage:
 *   - sessionStorage is the primary (cleared on tab close, fine)
 *   - localStorage is the safety net for incognito quirks, ITP, or any
 *     case where sessionStorage gets cleared mid-flow
 * Reads check both, sessionStorage first.
 *
 * Also tracks the LAST opened idea (separate key) so the Home screen
 * can show "Continuă" even if the user backed out before filming any
 * scene (i.e. before any clip was saved to IndexedDB).
 */

export function setSelectedIdeaId(id: string) {
  try { sessionStorage.setItem(KEY, id); } catch { /* ignore */ }
  try { localStorage.setItem(KEY, id); } catch { /* ignore */ }
  try { localStorage.setItem(LAST_KEY, id); } catch { /* ignore */ }
}

export function getSelectedIdeaId(): string {
  try {
    const fromSession = sessionStorage.getItem(KEY);
    if (fromSession) return fromSession;
  } catch { /* ignore */ }
  try {
    const fromLocal = localStorage.getItem(KEY);
    if (fromLocal) return fromLocal;
  } catch { /* ignore */ }
  return DEFAULT_SCENARIO_ID;
}

/**
 * The last template the user opened (selected from the catalog), regardless
 * of whether they finished it or even filmed a single scene. Used by Home
 * to show a "Continuă" card even when no clips have been saved yet.
 * Returns null if the user has never opened a template, or after a
 * successful reel completion (which clears it).
 */
export function getLastOpenedIdeaId(): string | null {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

/** Clear the last-opened pointer after a reel is fully completed. */
export function clearLastOpenedIdeaId(): void {
  try { localStorage.removeItem(LAST_KEY); } catch { /* ignore */ }
}

const SEEN_STORYBOARD_KEY = "reelcoach:seenStoryboards";
const SEEN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type SeenMap = Record<string, number>; // templateId -> timestamp

function readSeenMap(): SeenMap {
  try {
    const raw = localStorage.getItem(SEEN_STORYBOARD_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SeenMap;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Mark that the user has seen the storyboard for a given template. Called
 * when the user taps "Sunt pregătit" (i.e. they did go through the storyboard).
 * Used by hasSeenStoryboardRecently to decide whether to show a "Sari peste"
 * button on subsequent visits.
 */
export function markStoryboardSeen(templateId: string): void {
  try {
    const map = readSeenMap();
    map[templateId] = Date.now();
    localStorage.setItem(SEEN_STORYBOARD_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

/**
 * Returns true if the user has gone through the storyboard for this template
 * within the last 7 days. Used to surface a "Sari peste" affordance — repeat
 * users don't need to re-read the same storyboard every time.
 */
export function hasSeenStoryboardRecently(templateId: string): boolean {
  const map = readSeenMap();
  const ts = map[templateId];
  if (!ts) return false;
  return Date.now() - ts < SEEN_WINDOW_MS;
}

export function getSelectedScenario(): Scenario {
  const id = getSelectedIdeaId();
  const template = getTemplate(id);
  if (template) return templateToScenario(template);
  return getScenarioById(id) ?? getScenarioById(DEFAULT_SCENARIO_ID)!;
}
