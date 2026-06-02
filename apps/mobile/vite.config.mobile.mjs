import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/**
 * Replace the 567KB scenarios.ts with a tiny shim for the mobile build.
 * The Capacitor app only uses catalog.ts templates — the 200+ legacy
 * scenarios and their images are never needed. This cuts build time from
 * 41 minutes to under 3 minutes.
 */
function stubScenarios() {
  const SHIM = `
// Mobile shim — the full scenarios.ts is not needed in the Capacitor app.
// Only types, constants, and empty arrays are exported.

export type Format = "transformation" | "glow-up" | "process" | "reaction" | "tutorial" | "tips" | "product";
export type Profession = "par" | "machiaj" | "unghii" | "gene" | "sprancene";

export interface ProfessionMeta {
  id: Profession; label: string; tag: string; emoji: string; desc: string;
}
export const PROFESSIONS = [
  { id: "par",       label: "Păr",       tag: "Hairstyling", emoji: "💇‍♀️", desc: "Coafură, vopsit, balayage, tunsori." },
  { id: "machiaj",   label: "Machiaj",   tag: "Make-up",     emoji: "💄",  desc: "Make-up de zi, seară, mireasă." },
  { id: "unghii",    label: "Unghii",    tag: "Nail Art",     emoji: "💅",  desc: "Manichiură, gel, nail art." },
  { id: "gene",      label: "Gene",      tag: "Lash Artist",  emoji: "👁️",  desc: "Extensii, lifting, laminare." },
  { id: "sprancene", label: "Sprâncene", tag: "Brow Artist",  emoji: "✨",  desc: "Pensare, henna, microblading." },
];
export const getProfession = (id) => PROFESSIONS.find((p) => p.id === id);

export interface Scene {
  bg: string; hook: string; duration: number; what: string; how: string;
  section?: string; tag?: string; instructions?: string[]; overlayText?: string;
  finalUsageDuration?: number; effectId?: string; mustShow?: string[];
  handsBusy?: boolean; patternId?: string;
}

export type Difficulty = "easy" | "medium" | "hard";
export interface DifficultyMeta { id: Difficulty; label: string; short: string; desc: string; }
export const DIFFICULTIES = {
  easy:   { id: "easy",   label: "Ușor",  short: "Ușor",  desc: "Filmezi singură." },
  medium: { id: "medium", label: "Mediu", short: "Mediu", desc: "Ai nevoie de o clientă cooperantă." },
  hard:   { id: "hard",   label: "Greu",  short: "Greu",  desc: "Cere timing și o a doua persoană." },
};

export interface Scenario {
  id: string; format: Format; professions: Profession[]; title: string;
  hook: string; description?: string; image?: string; keywords?: string[];
  scenes: Scene[]; source?: string; difficulty?: Difficulty; goal?: string;
}

export const SCENARIOS = [];
export const DEFAULT_SCENARIO_ID = "wow-transformation";
export const getMaterials = (s) => [];
export const getDifficulty = (s) => s.difficulty ?? "easy";
export const getScenarioById = (id) => undefined;
export const getScenariosByFormat = (f, p) => [];
export const getFormat = (id) => undefined;
export const getFormatImage = (f, p) => "";
export const getFormatsForProfession = (p) => [];

export interface FormatMeta { id: Format; label: string; blurb: string; cover: string; }
export const FORMATS = [];
`;

  return {
    name: "stub-scenarios",
    resolveId(id, importer) {
      if (
        id.includes("scenarios") &&
        !id.includes("node_modules") &&
        (id.endsWith("scenarios.ts") || id.endsWith("scenarios"))
      ) {
        return "\0stub-scenarios";
      }
    },
    load(id) {
      if (id === "\0stub-scenarios") return SHIM;
    },
  };
}

export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: "react", ssr: false }),
    react(),
    tsconfigPaths(),
    stubScenarios(),
  ],

  root: ".",

  build: {
    outDir: "dist-mobile",
    emptyOutDir: true,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: resolve(__dirname, "index.html"),
    },
  },

  resolve: {
alias: {
      "@": resolve(__dirname, "src"),
      "@reelcoach/core": resolve(__dirname, "../../packages/reel-core/src/index.ts"),
    },
    dedupe: ["react", "react-dom"],
  },

  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
    force: true,
  },

  server: { host: "0.0.0.0", port: 5173, open: false },
});
