/**
 * @reelcoach/core — the shared rendering engine.
 *
 * Framework-agnostic TypeScript (browser APIs only: canvas / <video> /
 * MediaRecorder; zero React). Consumed by both apps:
 *   - mobile  (Vite / Capacitor) via a source alias in vite.config
 *   - studio  (Next.js)          via tsconfig paths + transpilePackages
 *
 * One source of truth for filters, transitions, text presets, overlay
 * rendering, and the canvas reel renderer. The preview and the export are
 * now literally the same code in both apps.
 */
export * from "./filters";
export * from "./transitions";
export * from "./text-presets";
export * from "./render-progress";
export * from "./overlay-renderer";
export * from "./browser-renderer";
