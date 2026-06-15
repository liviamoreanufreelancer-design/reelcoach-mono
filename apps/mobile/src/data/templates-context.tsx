/**
 * TemplatesContext — single source of truth for the catalog of templates.
 *
 * Mounted near the root of the app (in __root.tsx). At startup it:
 *   1. Synchronously seeds the context with bundled SEED_TEMPLATES so the
 *      UI is never empty.
 *   2. Loads any cached templates from IndexedDB (instant after first run).
 *   3. Kicks off a background fetch to Supabase for the latest published
 *      templates. When that returns, the context updates and consumers
 *      re-render automatically.
 *
 * Why a React Context (not a global module-level array):
 *   - Triggers re-renders when data arrives mid-session
 *   - Keeps the lifecycle inside React (Provider unmount cleans up)
 *   - Lets us add per-user state later (favorites, watched, etc.) without
 *     rewriting consumers.
 *
 * Consumers don't need to know any of this. They use:
 *   useTemplates()             → all available templates
 *   useTemplate(id)            → one template by id (or undefined)
 *   useTemplatesForCategory(c) → templates filtered by category id
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { get as idbGet, set as idbSet } from "idb-keyval";
import type { ReelTemplate } from "./shots";
import { SEED_TEMPLATES, setRuntimeTemplates } from "./catalog";
import { supabase, isSupabaseConfigured } from "./supabase-client";
import type { DbTemplateRow, DbShotRow } from "./supabase-client";
import { dbToReelTemplate } from "./db-to-template";

// ════════════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════════════

const CACHE_KEY = "reelcoach:templates:v1";

// ════════════════════════════════════════════════════════════════════
// Context shape
// ════════════════════════════════════════════════════════════════════

interface TemplatesContextValue {
  /** Current list of templates (seed + fetched, fetched takes priority by id). */
  templates: ReelTemplate[];
  /** True while the very first fetch is in flight (no cache yet). */
  isLoading: boolean;
  /** Last fetch error, if any. Non-null doesn't mean templates is empty — we fall back to cache/seed. */
  error: Error | null;
  /** Manually trigger a refetch (e.g. pull-to-refresh in the future). */
  refetch: () => Promise<void>;
}

const TemplatesContext = createContext<TemplatesContextValue | null>(null);

// ════════════════════════════════════════════════════════════════════
// Provider
// ════════════════════════════════════════════════════════════════════

export function TemplatesProvider({ children }: { children: ReactNode }) {
  // Start with seed. Cache from IndexedDB will be loaded in the effect below
  // and merged in. This way the first render is never empty.
  const [templates, setTemplates] = useState<ReelTemplate[]>(SEED_TEMPLATES);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<Error | null>(null);

  // Mirror the React state into the runtime template cache so sync consumers
  // (catalog.getTemplate, selected-idea.getSelectedScenario) see fresh data.
  useEffect(() => {
    setRuntimeTemplates(templates);
  }, [templates]);

  // Bootstrap: load cache, then fetch.
  useEffect(() => {
    let alive = true;

    async function bootstrap() {
      // 1. Try cache first — instant data from previous session.
      try {
        const cached = (await idbGet(CACHE_KEY)) as ReelTemplate[] | undefined;
        if (alive && cached && cached.length > 0) {
          setTemplates(mergeWithSeed(cached));
        }
      } catch (e) {
        // IndexedDB read failed (private mode, quota, etc.) — non-fatal.
        // eslint-disable-next-line no-console
        console.warn("[templates] Cache read failed:", e);
      }

      // 2. Background fetch from Supabase (if configured).
      if (!isSupabaseConfigured) {
        if (alive) setIsLoading(false);
        return;
      }
      try {
        const fetched = await fetchPublishedTemplates();
        if (!alive) return;
        setTemplates(mergeWithSeed(fetched));
        setError(null);
        // Persist for next launch.
        try {
          await idbSet(CACHE_KEY, fetched);
        } catch {
          // Cache write failures are non-fatal.
        }
      } catch (e) {
        if (!alive) return;
        // eslint-disable-next-line no-console
        console.warn("[templates] Fetch failed:", e);
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (alive) setIsLoading(false);
      }
    }

    bootstrap();
    return () => {
      alive = false;
    };
  }, []);

  // Manual refetch — same logic as bootstrap minus the cache read.
  const refetch = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const fetched = await fetchPublishedTemplates();
      setTemplates(mergeWithSeed(fetched));
      setError(null);
      await idbSet(CACHE_KEY, fetched).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  };

  return (
    <TemplatesContext.Provider value={{ templates, isLoading, error, refetch }}>
      {children}
    </TemplatesContext.Provider>
  );
}

// ════════════════════════════════════════════════════════════════════
// Hooks for consumers
// ════════════════════════════════════════════════════════════════════

/** Return the full templates list + loading/error state. */
export function useTemplatesState(): TemplatesContextValue {
  const ctx = useContext(TemplatesContext);
  if (!ctx) {
    throw new Error("useTemplatesState must be used inside <TemplatesProvider>");
  }
  return ctx;
}

/** Return just the list of templates (most common use). */
export function useTemplates(): ReelTemplate[] {
  return useTemplatesState().templates;
}

/** Find one template by id, or undefined if not found. */
export function useTemplate(id: string | undefined): ReelTemplate | undefined {
  const list = useTemplates();
  if (!id) return undefined;
  return list.find((t) => t.id === id);
}

/** All templates whose subcategory matches. */
export function useTemplatesForCategory(subcategoryId: string): ReelTemplate[] {
  const list = useTemplates();
  return list.filter((t) => t.subcategoryId === subcategoryId);
}

// ════════════════════════════════════════════════════════════════════
// Internals
// ════════════════════════════════════════════════════════════════════

/**
 * Merge fetched templates with seed: fetched wins on id collision, seed
 * fills in any ids not present in fetched.
 */
function mergeWithSeed(fetched: ReelTemplate[]): ReelTemplate[] {
  const fetchedIds = new Set(fetched.map((t) => t.id));
  const seedExtras = SEED_TEMPLATES.filter((t) => !fetchedIds.has(t.id));
  return [...fetched, ...seedExtras];
}

/**
 * Fetch all published templates + their shots from Supabase and return them
 * as ReelTemplate objects. Templates with no shots are skipped (would crash
 * the filming flow).
 */
async function fetchPublishedTemplates(): Promise<ReelTemplate[]> {
  if (!supabase) return [];

  const [templatesRes, shotsRes] = await Promise.all([
    supabase
      .from("templates")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false }),
    supabase
      .from("shots")
      .select("*, diagram:diagrams(image_url)")
      .order("sort_order", { ascending: true }),
  ]);

  if (templatesRes.error) throw new Error(templatesRes.error.message);
  if (shotsRes.error) throw new Error(shotsRes.error.message);

  const templates = (templatesRes.data ?? []) as DbTemplateRow[];
  const allShots = (shotsRes.data ?? []) as DbShotRow[];
  // TEMP DEBUG: cate shot-uri au diagrama din join?
  const withDiag = allShots.filter((sh: any) => sh.diagram);
  console.log("[DIAG DEBUG] total shots:", allShots.length, "| cu diagram:", withDiag.length, "| sample:", JSON.stringify(withDiag[0]?.diagram ?? allShots[0]?.diagram_id ?? "niciun diagram_id"));

  // Group shots by template_id.
  const shotsByTemplate = new Map<string, DbShotRow[]>();
  for (const shot of allShots) {
    const list = shotsByTemplate.get(shot.template_id) ?? [];
    list.push(shot);
    shotsByTemplate.set(shot.template_id, list);
  }

  // Build ReelTemplate objects, skipping templates with no shots.
  const result: ReelTemplate[] = [];
  for (const t of templates) {
    const shots = shotsByTemplate.get(t.id) ?? [];
    if (shots.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(`[templates] Skipping "${t.id}" — published but no shots`);
      continue;
    }
    result.push(dbToReelTemplate(t, shots));
  }

  return result;
}
