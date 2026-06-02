## Pachet "Cinematic Premium" pentru export reel

Adaug 4 efecte peste pipeline-ul actual de canvas/MediaRecorder, păstrând stilul soft/cinematic.

### 1. Tranziții cross-fade între scene (400ms)
- Pre-încarc clipul N+1 cât timp se desenează ultimele 400ms din clipul N.
- Pe canvas: desenez clipul curent cu `globalAlpha` în scădere (1 → 0) și clipul următor în creștere (0 → 1) peste el. Easing `easeInOutCubic`.
- Outro-ul intră tot cu cross-fade din ultimul clip.

### 2. Ken Burns lent pe fiecare clip
- Aleg automat per scenă unul din: zoom-in (1.0 → 1.08), zoom-out (1.08 → 1.0), pan-stânga, pan-dreapta.
- Implementat prin `ctx.translate` + `ctx.scale` în `drawContain`, cu factor interpolat liniar pe durata clipului.
- Suficient de subtil ca să nu taie din caption.

### 3. Intro + outro animate
- **Intro (1s)**: card cu logo/handle brand care apare cu fade + scale (0.92 → 1.0), apoi fade-out cross peste primul clip. Generat în canvas cu fundal degrade din `--primary`.
- **Outro**: păstrez PNG-ul brand existent dar îl aduc cu fade-in + scale subtil (0.96 → 1.0) pe 600ms, apoi hold 900ms.

### 4. Overlay cinematic (light leaks + grain)
- Generez o singură dată un layer procedural în canvas:
  - **Grain**: pattern fin de noise (alpha ~0.04) animat la 8fps printr-un offset random pre-computat pe frame index.
  - **Light leaks**: 2 gradient radiale calde (oranj/roșu translucid) care driftă lent stânga→dreapta cu `globalCompositeOperation = "screen"`.
- Aplicat ca ultim strat înainte de overlay-ul cu caption.

### Modificări în cod

**`src/lib/browser-renderer.ts`** (refactor principal):
- Schimb bucla secvențială într-un planner cu segmente: `[intro, clip1, transition, clip2, …, outro]` — fiecare segment cunoaște durata și funcția proprie de draw.
- Extrag un loop unic de `requestAnimationFrame` (fallback `setTimeout`) care drive-uiește toate segmentele, ca să asigure cross-fade neted (nu pot face cross-fade între două segmente independente cu loop-uri separate).
- Pre-load: încarc 2 clipuri în avans în loc de 1, pentru tranziții.
- Adaug helperi: `easeInOutCubic`, `drawWithKenBurns(ctx, source, t01, variant)`, `drawCinematicOverlay(ctx, frameIdx)`, `renderIntroFrame(ctx, brand, t01)`.

**`src/routes/edit.tsx`**:
- Adaug în UI o opțiune mică (toggle) "Efecte cinematice" implicit ON, ca user-ul să poată dezactiva dacă vrea export rapid.
- Pasez `effects: { transitions: true, kenBurns: true, intro: true, overlay: true }` către `renderReelInBrowser`.

**Date brand pentru intro**: refolosesc handle/numele brand deja prezent în state-ul editorului (același folosit la outro).

### Considerații
- Durată totală crește cu ~1s (intro) — actualizez calculul `totalDurationMs` și progress bar-ul.
- Light leaks + grain adaugă cost CPU; pe mobile keep grain la 8fps (refresh la fiecare a 3-a frame) ca să nu scad fps-ul exportului.
- Nimic nu schimbă codec-ul/MediaRecorder logic, deci compatibilitatea Safari/iOS rămâne intactă.

### Out of scope (pot adăuga ulterior)
- Caption-uri animate (typewriter / pop-in) — necesită re-render text frame-by-frame, nu doar overlay PNG.
- Sound design / music bed.