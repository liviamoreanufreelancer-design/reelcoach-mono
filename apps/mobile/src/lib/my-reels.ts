/**
 * my-reels — agregator pentru ecranul "Reelurile mele".
 * Deriva lista de reel-uri din clip-store (ce s-a filmat) + reel-status
 * (ce s-a postat), incrucisat cu template-ul (titlu/cover/nr scene).
 *
 * Status:
 *   posted    -> are flag in reel-status
 *   completed -> toate scenele filmate (done === total)
 *   draft     -> mai are scene de filmat
 */
import { get, keys } from "idb-keyval";
import type { StoredClip } from "./clip-store";
import { getScenarioById } from "@/data/scenarios";
import { getTemplate } from "@/data/catalog";
import { templateToScenario } from "@/data/template-adapter";
import { getPostedMap } from "./reel-status";

export type ReelStatus = "draft" | "completed" | "posted";

export interface MyReel {
  scenarioId: string;
  title: string;
  cover?: string;
  done: number;
  total: number;
  lastUpdated: number;
  postedAt?: number;
  status: ReelStatus;
}

const CLIP_PREFIX = "clip:";

function parseClipKey(key: string): { scenarioId: string; sceneIdx: number } | null {
  if (!key.startsWith(CLIP_PREFIX)) return null;
  const raw = key.slice(CLIP_PREFIX.length); // scenarioId:sceneIdx
  const lastColon = raw.lastIndexOf(":");
  if (lastColon < 0) return null;
  const scenarioId = raw.slice(0, lastColon);
  const sceneIdx = Number(raw.slice(lastColon + 1));
  if (!scenarioId || Number.isNaN(sceneIdx)) return null;
  return { scenarioId, sceneIdx };
}

export async function listMyReels(): Promise<MyReel[]> {
  const allKeys = await keys();
  const clipKeys = allKeys.filter(
    (k): k is string => typeof k === "string" && k.startsWith(CLIP_PREFIX),
  );

  // Grupeaza pe scenariu: scene distincte + cel mai recent createdAt.
  const groups = new Map<string, { scenes: Set<number>; lastUpdated: number }>();
  await Promise.all(
    clipKeys.map(async (key) => {
      const parsed = parseClipKey(key);
      if (!parsed) return;
      const clip = (await get(key)) as StoredClip | undefined;
      if (!clip) return;
      let g = groups.get(parsed.scenarioId);
      if (!g) {
        g = { scenes: new Set(), lastUpdated: 0 };
        groups.set(parsed.scenarioId, g);
      }
      g.scenes.add(parsed.sceneIdx);
      if (clip.createdAt > g.lastUpdated) g.lastUpdated = clip.createdAt;
    }),
  );

  const postedMap = await getPostedMap();

  const reels: MyReel[] = [];
  for (const [scenarioId, g] of groups) {
    // Rezolva la fel ca getSelectedScenario: intai template (Supabase
    // cache), apoi scenariu hardcodat. Asa reel-urile filmate din
    // template-uri reale nu sunt sarite.
    const template = getTemplate(scenarioId);
    const scenario = template
      ? templateToScenario(template)
      : getScenarioById(scenarioId);
    if (!scenario) continue; // clipuri orfane pt un template disparut — sari
    const total = scenario.scenes.length;
    const done = g.scenes.size;
    const postedAt = postedMap.get(scenarioId);
    const status: ReelStatus = postedAt
      ? "posted"
      : done >= total && total > 0
        ? "completed"
        : "draft";
    reels.push({
      scenarioId,
      title: scenario.title,
      cover: scenario.image,
      done,
      total,
      lastUpdated: g.lastUpdated,
      postedAt,
      status,
    });
  }

  reels.sort((a, b) => (b.postedAt ?? b.lastUpdated) - (a.postedAt ?? a.lastUpdated));
  return reels;
}
