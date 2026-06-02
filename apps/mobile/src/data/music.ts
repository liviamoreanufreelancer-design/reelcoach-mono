import type { Vibe } from "@/lib/brand-store";

export interface Track {
  id: string;
  vibe: Vibe;
  label: string;
  bpm: number;
  /** True if the track is generated procedurally on demand. */
  procedural: true;
}

/**
 * MVP music library: every track is synthesized in-browser via
 * `src/lib/music-gen.ts` (OfflineAudioContext). No external assets, no CORS.
 */
export const TRACKS: Track[] = [
  { id: "lux-1",  vibe: "luxury", label: "Velvet Hour",  bpm: 70,  procedural: true },
  { id: "lux-2",  vibe: "luxury", label: "Champagne",    bpm: 64,  procedural: true },
  { id: "soft-1", vibe: "soft",   label: "Petale",       bpm: 80,  procedural: true },
  { id: "soft-2", vibe: "soft",   label: "Lumière",      bpm: 76,  procedural: true },
  { id: "bold-1", vibe: "bold",   label: "Pulse 120",    bpm: 120, procedural: true },
  { id: "bold-2", vibe: "bold",   label: "Neon Beat",    bpm: 128, procedural: true },
];

export const tracksForVibe = (v: Vibe) => TRACKS.filter((t) => t.vibe === v);
export const getTrack = (id: string) => TRACKS.find((t) => t.id === id);
