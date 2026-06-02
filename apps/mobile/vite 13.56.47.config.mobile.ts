/**
 * vite.config.mobile.ts — Vite config for the Capacitor (iOS/Android) build.
 * Builds a plain SPA (no SSR) that Capacitor bundles into a native app.
 *
 * Usage:
 *   npm run build:mobile    →   builds to dist-mobile/
 *   npx cap sync ios        →   copies dist-mobile/ into ios/App/public/
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      target: "react",
      ssr: false,
    }),
    react(),
    // NOTE: @tailwindcss/vite is NOT included here intentionally.
    // Instead, CSS is processed via the Vite build pipeline which picks up
    // postcss.config.js (or inline postcss config below) automatically.
    // This avoids the CachedInputFileSystem bug in @tailwindcss/node.
    tsconfigPaths(),
  ],

  root: ".",

  build: {
    outDir: "dist-mobile",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "index.html"),
    },
  },

  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },

  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
    include: ["react", "react-dom"],
  },

  server: {
    host: "0.0.0.0",
    port: 5173,
    open: false,
  },
});
