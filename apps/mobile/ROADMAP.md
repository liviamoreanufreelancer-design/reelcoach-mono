# ReelCoach — Roadmap & Status

> Single source of truth for *what's done* and *what's next*. Version-controlled,
> edited as we go. Last updated: **1 June 2026**.

---

## Positioning

ReelCoach is a **long-term product**, not an MVP. Decisions favour durability over
shortcuts. Pitch to a professional stylist in **~2 months**, but the foundation is
built to outlive the pitch.

- **Team:** Liv (dev/owner) + partner (stylist, video expertise).
- **Verticals (5):** hair, makeup, unghii (nails), gene (lashes), sprâncene (brows).
- **Platform:** iOS-first. Android possible later — the shared-core architecture
  makes it cheap (no extra cost taken on now).

---

## Product model — "chef's choice" (retained)

- The **partner authors the recipe** per template: per-scene effect / filter /
  transition / speed / motion-blur — now inside a **Studio video editor** where she
  uploads her **own footage**, sets scene count + lengths, and plays with effects on
  the actual video (live preview).
- The **stylist** gets an **example reel** and films within the partner's template.
- The app generates **different captions per reel** (planned via AI) so reels from the
  same template stay structurally consistent but textually fresh.
- Stylist's hands-on editing stays minimal (AI-assisted captions she can tweak).

---

## Architecture direction

**One engine, one source of truth.** A shared rendering core — `reel-core` —
framework-agnostic TypeScript, browser APIs only (canvas / `<video>` / `MediaRecorder`),
**zero React**. Consumed by **both** apps:

- **Mobile** — TanStack Start + Capacitor iOS (filming + export).
- **Studio** — Next.js / Vercel (authoring editor). Core is **client-only** here
  (`"use client"`), never SSR.

**Principles**
- Preview must *be* the export code → kills the CSS-approximation drift.
- Typed contracts, not free-form strings (a typed effect/transition/filter catalog
  shared by both apps; validated at the Supabase boundary).
- Clean layers: **engine ← typed Supabase data ← per-app React UI**.
- Tests on what hurts silently: Studio→renderer mapping, contract validation,
  timeline math (auto-trim + playback speed).

**Core boundary (the key decoupling)**
```ts
// reel-core input contract — app-agnostic
interface RenderClipInput { blob: Blob; duration: number; finalUsageDuration?: number; }
```
The mobile `StoredClip` satisfies this structurally (no caller changes). Studio builds
it from uploaded `File`s + measured duration.

**Moves into `reel-core`:** browser-renderer, overlay-renderer, render-progress,
filters, transitions, text-presets, the new `RenderClipInput` type, a typed `EFFECTS`
catalog. **Stays app-side:** clip-store (IndexedDB, mobile), shots (domain), hooks,
`ffmpeg.ts` (legacy, mobile-only for now), React preview components.

---

## Phased roadmap

### ✅ Done (this session)
- [x] Per-clip **dedicated effects**: `glow` (bloom), `softLight` (Orton), `lensFlare`
      (anamorphic) — frame-derived, in Canvas (not FFmpeg).
- [x] Per-clip **transitions**: `whipPan`, `smoothZoom`, `motionBlur` + `cut` fix.
- [x] **playbackSpeed** + **motionBlur** wired into `browser-renderer.ts` (were dead options).
- [x] Bundle id `com.reelpilot.app` → `com.reelcoach.app`.
- [x] Display name → **Reel Coach**.
- [x] App **icon + splash** (midnight `#0F1419`, logo).
- [x] `_fallback.jpg` cover generated (9:16, on-brand).
- [x] Removed stray `edit 2.tsx` duplicate route.
- [x] `LivePreview.tsx` **parity** shipped (effects + transitions + speed + motion-blur
      hint; new props optional / backward-compatible).

### ⬜ Immediate (close these first)
- [ ] Add 3 props at **both** `<LivePreview>` calls in `edit.tsx`:
      `transitionTypes`, `playbackSpeeds`, `motionBlurs` (mirror the `renderReelInBrowser` mapping).
- [ ] Upload `_fallback.jpg` to Supabase `covers` bucket (kills the console 400).

### ⬜ Phase a0 — decouple renderer in-place
- [ ] Swap `browser-renderer.ts` input `StoredClip` → `RenderClipInput`.
- [ ] Group portable files under `src/core/` (still in mobile repo).
- [ ] Verify mobile still builds (`build:mobile`) + exports. Zero cross-repo risk.

### ⬜ Phase a1 — physical extraction
- [ ] pnpm/npm **workspace monorepo**: `apps/mobile`, `apps/studio`, `packages/reel-core`.
- [ ] Point both apps at `reel-core`.
- [ ] **Vercel migration**: set Root Directory → `apps/studio` (free, Hobby/personal,
      ~5 min, env vars intact). Set `packageManager` in root `package.json` if using pnpm.

### ⬜ Phase a2 — Studio consumes core
- [ ] Client-component proof: render a preview from an uploaded `File` in Next.js, on Vercel.

### ⬜ Phase 1 — Studio editor
- [ ] Upload footage, set scenes + lengths (timeline with trim).
- [ ] Per-scene effect/filter/transition/speed/motion-blur from the shared typed catalog,
      with **live preview on video**.
- [ ] Publish → recipe + sample clips (`samples` bucket) + rendered demo reel (`previews` bucket).

### ⬜ Phase 2 — AI captions
- [ ] Role-based caption **slots** per scene in the template (hook / reveal / CTA …).
- [ ] **Supabase Edge Function** holds the API key, calls Claude → **structured JSON**
      (array of captions, Romanian, luxury tone, length-validated). Mobile calls the
      function, never Anthropic directly.
- [ ] Stylist can edit generated captions.

### ⬜ Phase 3 — wow
- [ ] Captions from frames (vision: Claude reads a frame per scene, writes matching copy).
- [ ] **Ghost overlay** at filming (semi-transparent example clip over the camera).

---

## Tooling

**Take now (free, ~15 min):**
- [ ] Supabase **generated TS types** (`supabase gen types typescript`).
- [ ] **TS strict** mode on.

**Defer to post-pitch (also free, just timing):**
- [ ] GitHub Actions **CI** (typecheck + tests on push).
- [ ] **Sentry** error tracking (add when real users / stylist on-device).

---

## Reference

**Backend:** Supabase `qzbknlkxpteliocwjwvm` (eu-central-1). Tables: profiles, categories,
templates, shots. Buckets: covers, samples, previews. RLS configured.

**Brand tokens:** midnight `#0F1419` · champagne `#F4E4C1` · gold `#D4AF37`.

**Long-term cleanup on radar:** move the 7 hardcoded Hair categories (and the other
verticals) into Supabase, typed — schema as source of truth.
