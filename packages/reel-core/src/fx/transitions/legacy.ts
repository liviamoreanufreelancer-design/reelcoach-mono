/**
 * Cele 11 tranziții istorice, mutate ca atare din bucla de randare.
 *
 * Codul de desen e NESCHIMBAT — mutarea a fost mecanică, tocmai ca reelurile
 * deja publicate să arate identic. Ce s-a schimbat e doar unde stă: erau un
 * lanț `if/else` de ~200 de linii în mijlocul buclei, unde nu puteau fi nici
 * parametrizate, nici refolosite, nici citite.
 *
 * N-au parametri: au fost scrise cu valori fixate în cod. Se pot parametriza
 * una câte una, când o cere un caz real — nu preventiv.
 */
import type { TransitionDef } from "../types";
import { easeInOut } from "../easing";

export const flashTransition: TransitionDef = {
  id: "flash",
  kind: "transition",
  label: "Flash",
  desc: "Flash alb la mijloc.",
  durationMs: 200,
  draw({ ctx, from: snap, to: incoming, t, width, height }) {
    // White-flash transition. First half: outgoing clip blown out to
    // white. Second half: incoming clip emerging from white. The eye
    // reads it as a snap, not a fade.
    const halfway = t < 0.5;
    ctx.drawImage(halfway ? snap : incoming, 0, 0);
    const flashAlpha = halfway ? t * 2 : (1 - t) * 2; // 0→1→0
    ctx.save();
    ctx.globalAlpha = Math.min(1, flashAlpha);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
};

export const zoomTransition: TransitionDef = {
  id: "zoom",
  kind: "transition",
  label: "Zoom",
  desc: "Punch-out cu scale.",
  durationMs: 300,
  draw({ ctx, from: snap, to: incoming, t, width, height }) {
    // Zoom-punch: outgoing clip scales up while fading; incoming clip
    // scales DOWN from oversize into place. Gives a snappy, punchy feel.
    const eT = easeInOut(t);
    // Outgoing — scale up + fade out
    ctx.save();
    ctx.globalAlpha = 1 - eT;
    const outScale = 1 + eT * 0.18;
    ctx.translate(width / 2, height / 2);
    ctx.scale(outScale, outScale);
    ctx.drawImage(snap, -width / 2, -height / 2);
    ctx.restore();
    // Incoming — scale from oversize down to natural, fade in
    ctx.save();
    ctx.globalAlpha = eT;
    const inScale = 1.18 - eT * 0.18;
    ctx.translate(width / 2, height / 2);
    ctx.scale(inScale, inScale);
    ctx.drawImage(incoming, -width / 2, -height / 2);
    ctx.restore();
  },
};

export const glitchTransition: TransitionDef = {
  id: "glitch",
  kind: "transition",
  label: "Glitch",
  desc: "Distorsiune RGB + scanlines.",
  durationMs: 280,
  draw({ ctx, from: snap, to: incoming, t, width, height }) {
    // RGB-split + scanline glitch. The eye reads chaos, then resolves.
    const eT = t;
    ctx.drawImage(eT < 0.5 ? snap : incoming, 0, 0);
    // RGB channel splits at peak in the middle, ease out toward ends
    const peak = Math.sin(eT * Math.PI); // 0 → 1 → 0
    const offset = Math.round(peak * 22);
    if (offset > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "rgba(255,0,80,1)";
      ctx.fillRect(offset, 0, width - offset, height);
      ctx.fillStyle = "rgba(0,200,255,1)";
      ctx.fillRect(0, 0, width - offset, height);
      ctx.restore();
      // Scanline jitter — 4-6 horizontal slices shifted
      ctx.save();
      const slices = 5;
      const sliceH = height / slices;
      for (let i = 0; i < slices; i++) {
        const sx = (Math.sin((eT * 12) + i * 1.7) * peak * 18) | 0;
        ctx.drawImage(eT < 0.5 ? snap : incoming,
          0, i * sliceH, width, sliceH,
          sx, i * sliceH, width, sliceH);
      }
      ctx.restore();
    }
  },
};

export const blurTransition: TransitionDef = {
  id: "blur",
  kind: "transition",
  label: "Blur",
  desc: "Defocus → focus, dreamy.",
  durationMs: 380,
  draw({ ctx, from: snap, to: incoming, t, width, height }) {
    // Defocus the outgoing, focus the incoming. Dreamy & soft.
    const eT = easeInOut(t);
    // Outgoing: increasing blur, fading out
    ctx.save();
    ctx.filter = `blur(${eT * 20}px)`;
    ctx.globalAlpha = 1 - eT;
    ctx.drawImage(snap, 0, 0);
    ctx.restore();
    // Incoming: decreasing blur, fading in
    ctx.save();
    ctx.filter = `blur(${(1 - eT) * 20}px)`;
    ctx.globalAlpha = eT;
    ctx.drawImage(incoming, 0, 0);
    ctx.restore();
  },
};

export const slideTransition: TransitionDef = {
  id: "slide",
  kind: "transition",
  label: "Slide",
  desc: "Clipul nou intră lateral.",
  durationMs: 340,
  draw({ ctx, from: snap, to: incoming, t, width, height }) {
    // Incoming slides in from the right; outgoing pushes off to left.
    const eT = easeInOut(t);
    const shift = eT * width;
    ctx.drawImage(snap, -shift, 0);
    ctx.drawImage(incoming, width - shift, 0);
  },
};

export const spinTransition: TransitionDef = {
  id: "spin",
  kind: "transition",
  label: "Spin",
  desc: "Rotație rapidă între clipuri.",
  durationMs: 380,
  draw({ ctx, from: snap, to: incoming, t, width, height }) {
    // Both clips rotate around the centre; outgoing zooms out while
    // incoming zooms in. A 180° swap reads as a fast spin transition.
    const eT = easeInOut(t);
    const angle = eT * Math.PI; // 0 → π (180°)
    // Outgoing — rotate + scale down + fade
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(angle);
    const outScale = 1 - eT * 0.6;
    ctx.scale(outScale, outScale);
    ctx.globalAlpha = 1 - eT;
    ctx.drawImage(snap, -width / 2, -height / 2);
    ctx.restore();
    // Incoming — rotate from -π → 0, scale up + fade in
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(angle - Math.PI);
    const inScale = 0.4 + eT * 0.6;
    ctx.scale(inScale, inScale);
    ctx.globalAlpha = eT;
    ctx.drawImage(incoming, -width / 2, -height / 2);
    ctx.restore();
  },
};

export const cutTransition: TransitionDef = {
  id: "cut",
  kind: "transition",
  label: "Cut sec",
  desc: "Fără tranziție.",
  durationMs: 0,
  draw({ ctx, from: snap, to: incoming, t, width, height }) {
    // Hard cut — no blend. The timeline still overlaps the two clips by
    // transMs, so we snap from outgoing to incoming at the midpoint of
    // that window. Reads as an instant cut, not a fade.
    ctx.drawImage(t < 0.5 ? snap : incoming, 0, 0);
  },
};

export const whipPanTransition: TransitionDef = {
  id: "whipPan",
  kind: "transition",
  label: "Whip Pan",
  desc: "Swipe orizontal rapid, motion blur.",
  durationMs: 340,
  draw({ ctx, from: snap, to: incoming, t, width, height }) {
    // Whip-pan: fast horizontal swipe with directional motion smear.
    // Outgoing flies off to the left while incoming rushes in from the
    // right, both streaked. Canvas blur() is isotropic, so the smear is
    // built by stacking horizontally-offset copies with falloff alpha.
    const eT = easeInOut(t);
    const smear = Math.sin(t * Math.PI); // 0 → 1 → 0 motion intensity
    const trail = Math.round(width * 0.18 * smear);
    const steps = 5;
    // Outgoing — slides left, faint trailing ghosts behind it.
    for (let k = steps - 1; k >= 0; k--) {
      const f = k / steps;
      ctx.save();
      ctx.globalAlpha = (1 - eT) * (1 - f * 0.7);
      ctx.drawImage(snap, -eT * width - f * trail, 0);
      ctx.restore();
    }
    // Incoming — slides in from the right, trailing ghosts behind it.
    for (let k = steps - 1; k >= 0; k--) {
      const f = k / steps;
      ctx.save();
      ctx.globalAlpha = eT * (1 - f * 0.7);
      ctx.drawImage(incoming, (1 - eT) * width + f * trail, 0);
      ctx.restore();
    }
  },
};

export const smoothZoomTransition: TransitionDef = {
  id: "smoothZoom",
  kind: "transition",
  label: "Smooth Zoom",
  desc: "Zoom continuu, blând, seamless.",
  durationMs: 460,
  draw({ ctx, from: snap, to: incoming, t, width, height }) {
    // Smooth zoom-through: a gentle, continuous push (unlike the snappy
    // "zoom" punch). Outgoing keeps zooming in and softly defocuses as it
    // fades; incoming settles from a slight over-zoom into place. Dreamy
    // and seamless rather than abrupt.
    const eT = easeInOut(t);
    ctx.save();
    ctx.globalAlpha = 1 - eT;
    ctx.filter = `blur(${eT * 6}px)`;
    const outS = 1 + eT * 0.35;
    ctx.translate(width / 2, height / 2);
    ctx.scale(outS, outS);
    ctx.drawImage(snap, -width / 2, -height / 2);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = eT;
    const inS = 1.15 - eT * 0.15;
    ctx.translate(width / 2, height / 2);
    ctx.scale(inS, inS);
    ctx.drawImage(incoming, -width / 2, -height / 2);
    ctx.restore();
  },
};

export const motionBlurTransition: TransitionDef = {
  id: "motionBlur",
  kind: "transition",
  label: "Motion Blur",
  desc: "Dissolve cu smear de mișcare.",
  durationMs: 360,
  draw({ ctx, from: snap, to: incoming, t, width, height }) {
    // Motion-blurred dissolve: a cross-fade where both frames carry a
    // small opposing horizontal smear that peaks mid-transition. Distinct
    // from "blur" (defocus) and "whipPan" (full swipe) — this is a soft
    // moving blend, the two clips brushing past each other.
    const eT = easeInOut(t);
    const smear = Math.sin(t * Math.PI);
    const trail = Math.round(width * 0.05 * smear);
    const steps = 4;
    for (let k = steps - 1; k >= 0; k--) {
      const f = k / steps;
      ctx.save();
      ctx.globalAlpha = (1 - eT) * (1 - f * 0.6);
      ctx.drawImage(snap, f * trail, 0);
      ctx.restore();
    }
    for (let k = steps - 1; k >= 0; k--) {
      const f = k / steps;
      ctx.save();
      ctx.globalAlpha = eT * (1 - f * 0.6);
      ctx.drawImage(incoming, -f * trail, 0);
      ctx.restore();
    }
  },
};

export const fadeTransition: TransitionDef = {
  id: "fade",
  kind: "transition",
  label: "Fade",
  desc: "Cross-fade clasic.",
  durationMs: 300,
  draw({ ctx, from: snap, to: incoming, t, width, height }) {
    // Default: classic cross-fade.
    ctx.drawImage(snap, 0, 0);
    ctx.save();
    ctx.globalAlpha = easeInOut(t);
    ctx.drawImage(incoming, 0, 0);
    ctx.restore();
  },
};
