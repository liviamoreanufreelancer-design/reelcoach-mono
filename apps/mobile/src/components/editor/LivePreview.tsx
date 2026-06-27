import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import type { CaptionState } from "@/hooks/useEditor";
import type { TextPreset, TransitionId, FilterPreset } from "@reelcoach/core";
import type { StoredClip } from "@/lib/clip-store";

interface Props {
  clips: StoredClip[];
  captions: CaptionState[];
  preset: TextPreset;
  transition: TransitionId;
  /** Per-clip premium effect ids matching the clips array. */
  effectIds?: (string | undefined)[];
  /** Master switch for all premium effects. */
  effectsEnabled?: boolean;
  /** Same colour filter the export will use, so the preview matches. */
  filter?: FilterPreset;
  /**
   * Per-scene transition ids (free-form strings from Studio). When provided,
   * the preview shows the transition for the CURRENT scene instead of the
   * single global one — matching how the export applies per-clip transitions.
   * Falls back to `transition` when absent.
   */
  transitionTypes?: (string | undefined)[];
  /** Per-scene playback speed (slow-mo / fast-mo), matching the export. */
  playbackSpeeds?: (number | undefined)[];
  /** Per-scene motion-blur flag, matching the export. */
  motionBlurs?: (boolean | undefined)[];
  handle?: string;
  logoUrl?: string | null;
  /** Controlled scene index (e.g. when user taps a scene in the list). */
  activeIdx?: number;
  onSceneChange?: (idx: number) => void;
}

/**
 * DOM-based live preview that mirrors what the final render will look like.
 * No re-encode — instant feedback while the user types. It is a visual echo
 * of the canvas export (browser-renderer.ts), not a pixel-identical copy:
 * effects/transitions are reproduced in CSS to stay smooth on-device.
 */
export function LivePreview({
  clips, captions, preset, transition, filter, effectIds, effectsEnabled = true,
  transitionTypes, playbackSpeeds, motionBlurs,
  handle, logoUrl,
  activeIdx, onSceneChange,
}: Props) {
  const [idx, setIdx] = useState(activeIdx ?? 0);
  const [playing, setPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync external scene selection.
  useEffect(() => {
    if (activeIdx !== undefined && activeIdx !== idx) setIdx(activeIdx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  const clip = clips[idx];
  const url = useMemo(() => (clip ? URL.createObjectURL(clip.blob) : null), [clip]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  // Per-scene playback speed (slow-mo / fast-mo). Undefined or <=0 → 1×.
  const speed = (() => {
    const s = playbackSpeeds?.[idx];
    return typeof s === "number" && s > 0 ? Math.max(0.25, Math.min(4, s)) : 1;
  })();
  const motionBlurOn = !!motionBlurs?.[idx];

  // Auto-advance / loop.
  const handleEnded = () => {
    const next = (idx + 1) % Math.max(1, clips.length);
    setIdx(next);
    onSceneChange?.(next);
  };

  // Force the <video> to (re)load and play whenever the source URL changes.
  // Without an explicit load() the element can stay black on first render
  // (the src attribute is set after the element is created and `autoPlay`
  // doesn't always re-trigger on source swaps inside an SPA).
  //
  // iOS Safari blocks autoplay until the user has interacted with the page.
  // To handle that gracefully we retry once after a short delay (sometimes
  // the second attempt lands AFTER the page-level gesture has propagated),
  // and we also surface a "tap to play" affordance below via a click handler
  // on the wrapper.
  useEffect(() => {
    const v = videoRef.current; if (!v || !url) return;
    try { v.load(); } catch { /* ignore */ }
    if (!playing) return;
    const tryPlay = () => v.play().catch(() => { /* will retry on user tap */ });
    tryPlay();
    // Retry once after a short delay — first attempt often happens before
    // the DOM has fully settled after the URL change, second one tends to
    // succeed when autoplay policy allows it.
    const t = window.setTimeout(tryPlay, 120);
    return () => window.clearTimeout(t);
  }, [url, playing]);

  // Apply per-scene playback speed. load() resets playbackRate to 1, so this
  // must run after the source swap (hence the `url` dependency).
  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    try { v.playbackRate = speed; } catch { /* ignore */ }
  }, [speed, url]);

  // Pause when toggled off.
  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    if (!playing) v.pause();
  }, [playing]);

  // Any tap inside the preview area also resumes playback. This covers the
  // case where iOS blocked the initial autoplay — the first interaction
  // with our UI is enough to unlock subsequent play() calls.
  const handleWrapperTap = () => {
    const v = videoRef.current;
    if (v && v.paused && playing) {
      v.play().catch(() => { /* still blocked, nothing more we can do */ });
    }
  };



  const cap = captions[idx];
  const captionText = cap?.text?.trim();

  // Build CSS that mirrors the TextPreset (canvas-equivalent rendering).
  const captionStyle: React.CSSProperties = useMemo(() => {
    // Canvas is 1080w; preview is ~250w. Scale font down accordingly.
    const scale = 250 / 1080;
    const s: React.CSSProperties = {
      fontFamily: preset.font,
      fontWeight: preset.weight,
      fontStyle: preset.italic ? "italic" : "normal",
      fontSize: `${preset.size * scale}px`,
      lineHeight: 1.1,
      color: preset.color,
      letterSpacing: preset.letterSpacing ? `${preset.letterSpacing * scale}px` : undefined,
      textTransform: preset.uppercase ? "uppercase" : "none",
      textAlign: "center",
      maxWidth: `${(preset.maxWidth ?? 880) * scale}px`,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      pointerEvents: "none",
    };
    if (preset.bg) {
      s.background = preset.bg;
      s.padding = `${(preset.paddingY ?? 16) * scale}px ${(preset.paddingX ?? 28) * scale}px`;
      s.borderRadius = `${(preset.radius ?? 16) * scale}px`;
    }
    if (preset.shadow) {
      s.textShadow = "0 2px 6px rgba(0,0,0,0.55)";
    }
    if (preset.outline) {
      const w = preset.outline.width * scale;
      const c = preset.outline.color;
      s.WebkitTextStroke = `${w}px ${c}`;
      // -webkit-text-stroke renders the stroke through the fill, so paint the
      // fill on top using paint-order (supported in modern browsers).
      (s as React.CSSProperties & { paintOrder?: string }).paintOrder = "stroke fill";
    }
    return s;
  }, [preset]);

  const positionClass =
    cap?.position === "top"    ? "items-start pt-8"   :
    cap?.position === "center" ? "items-center"        :
                                 "items-end pb-12";

  // Per-scene transition: prefer the scene's own transition (Studio) over the
  // global one, so the preview matches the per-clip export. Re-mounts on idx
  // change so the animation re-fires. Durations match the canvas renderer.
  const activeTransition = (transitionTypes?.[idx] ?? transition) as string;
  const sceneAnimClass =
    activeTransition === "fade"   ? "animate-[fadeIn_300ms_ease-out]"   :
    activeTransition === "zoom"   ? "animate-[zoomIn_300ms_ease-out]"   :
    activeTransition === "flash"  ? "animate-[fadeIn_120ms_ease-out]"   :
    activeTransition === "glitch" ? "animate-[glitchIn_280ms_ease-out]" :
    activeTransition === "blur"   ? "animate-[blurIn_380ms_ease-out]"   :
    activeTransition === "slide"  ? "animate-[slideIn_340ms_cubic-bezier(0.22,1,0.36,1)]" :
    activeTransition === "spin"   ? "animate-[spinIn_380ms_cubic-bezier(0.22,1,0.36,1)]"  :
                                    "";
  // New transitions (whipPan / smoothZoom / motionBlur) use inline keyframes
  // defined in the <style> block below — keeps the whole change in one file.
  const sceneAnimStyle: React.CSSProperties =
    activeTransition === "whipPan"    ? { animation: "rdp-whippan 340ms cubic-bezier(0.5,0,0.2,1)" } :
    activeTransition === "smoothZoom" ? { animation: "rdp-smoothzoom 460ms ease-out" } :
    activeTransition === "motionBlur" ? { animation: "rdp-motionblur 360ms ease-out" } :
                                        {};
  // Flash transition uses an overlay sibling — see render below.
  const showFlash = activeTransition === "flash";

  // Video colour filter + optional motion-blur hint. The export's motion blur
  // is a per-frame temporal trail (impossible in DOM with a single <video>),
  // so here it's approximated as a faint blur to signal the treatment.
  const baseFilter = filter && filter.cssFilter !== "none" ? filter.cssFilter : "";
  const videoFilter = `${baseFilter}${motionBlurOn ? " blur(0.6px)" : ""}`.trim();

  if (!clip || !url) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white/40 text-[10px] tracking-widest uppercase">
        Fără clip
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden group" onPointerDown={handleWrapperTap}>
      {/* Inline keyframes for the newer transitions, mirroring the canvas
          renderer's whipPan / smoothZoom / motionBlur. */}
      <style>{`
        @keyframes rdp-whippan {
          0%   { transform: translateX(55%) scaleX(1.35); filter: blur(4px); opacity: 0; }
          55%  { filter: blur(2px); }
          100% { transform: translateX(0) scaleX(1); filter: blur(0); opacity: 1; }
        }
        @keyframes rdp-smoothzoom {
          0%   { transform: scale(1.16); filter: blur(3px); opacity: 0; }
          100% { transform: scale(1); filter: blur(0); opacity: 1; }
        }
        @keyframes rdp-motionblur {
          0%   { filter: blur(5px); opacity: 0.25; }
          100% { filter: blur(0); opacity: 1; }
        }
      `}</style>

      <div
        key={`scene-${idx}`}
        className={`absolute inset-0 ${sceneAnimClass}`}
        style={sceneAnimStyle}
      >
        <video
          ref={videoRef}
          src={url}
          autoPlay={playing}
          muted
          playsInline
          {...{ "webkit-playsinline": "true", "x5-playsinline": "true" } as Record<string, string>}
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
          onEnded={handleEnded}
          onClick={(e) => e.preventDefault()}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          style={{ filter: videoFilter || undefined, WebkitTouchCallout: "none" }}
        />
        {/* Vignette + tint, matching the canvas renderer. Pointer-events
            off so the side controls still work. */}
        {filter?.tint && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: filter.tint.color, opacity: filter.tint.alpha }}
          />
        )}
        {filter?.vignette && filter.vignette > 0 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${filter.vignette}) 100%)`,
            }}
          />
        )}
        {/* Highlight boost — "screen" blend mode brightens highlights
            (hair gloss, skin shine) without affecting shadows. */}
        {filter?.highlightBoost && filter.highlightBoost > 0 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "rgba(255, 250, 240, 1)",
              opacity: filter.highlightBoost,
              mixBlendMode: "screen",
            }}
          />
        )}
        {/* Premium per-shot effect. Echoes drawPremiumEffect in
            browser-renderer.ts (gold palette, timing, density). */}
        {effectsEnabled && effectIds && (
          <PremiumEffect kind={effectIds[idx]} />
        )}
      </div>
      {/* White flash overlay — fires per scene change. */}
      {showFlash && (
        <div
          key={`flash-${idx}`}
          className="absolute inset-0 bg-white pointer-events-none animate-[flashOverlay_180ms_ease-out]"
        />
      )}


      {/* Caption overlay */}
      {captionText && (
        <div className={`absolute inset-0 flex justify-center px-3 ${positionClass}`}>
          <span
            key={`c-${idx}-${captionText}`}
            style={captionStyle}
            className="animate-[fadeIn_280ms_ease-out]"
          >
            {captionText}
          </span>
        </div>
      )}

      {/* Watermark */}
      {(handle || logoUrl) && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-85">
          {handle && (
            <span
              className="text-white text-[10px] font-semibold drop-shadow"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}
            >
              {handle.startsWith("@") ? handle : `@${handle}`}
            </span>
          )}
          {logoUrl && <img src={logoUrl} alt="" className="w-4 h-4 object-contain" />}
        </div>
      )}

      {/* Scene dots */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1">
        {clips.map((_, i) => (
          <button
            key={i}
            onClick={() => { setIdx(i); onSceneChange?.(i); }}
            className={`h-[3px] rounded-full transition-all ${i === idx ? "w-5 bg-[#5B34FF]" : "w-2 bg-white/35"}`}
            aria-label={`Scena ${i + 1}`}
          />
        ))}
      </div>

      {/* Side controls */}
      <button
        onClick={() => { const n = (idx - 1 + clips.length) % clips.length; setIdx(n); onSceneChange?.(n); }}
        className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
        aria-label="Anterior"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={() => { const n = (idx + 1) % clips.length; setIdx(n); onSceneChange?.(n); }}
        className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
        aria-label="Următor"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Bottom controls */}
      <div className="absolute bottom-2 left-2 flex gap-1">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center"
          aria-label={playing ? "Pauză" : "Play"}
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * PREMIUM EFFECT OVERLAY — preview-side
 *
 * Echoes drawPremiumEffect in browser-renderer.ts (gold palette, timing,
 * density). DOM/CSS-based — performant, smooth, no canvas overhead in the
 * preview. Not pixel-identical to the frame-derived canvas effects, but
 * visually consistent so the preview never contradicts the export.
 * ════════════════════════════════════════════════════════════════════ */
function PremiumEffect({ kind }: { kind?: string }) {
  if (!kind || kind === "none") return null;
  switch (kind) {
    case "sparkle":   return <SparkleEffect />;
    case "leak":      return <LightLeakEffect />;
    case "bokeh":     return <BokehEffect />;
    case "dust":      return <GoldDustEffect />;
    case "glow":      return <GlowEffect />;
    case "softLight": return <SoftLightEffect />;
    case "lensFlare": return <LensFlareEffect />;
    default:          return null;
  }
}

function SparkleEffect() {
  // 3 very subtle sparkles — meant as a quiet detail, noticed only by
  // someone looking carefully. Small, slow, low opacity.
  const positions = [
    { top: "30%", left: "32%", size: 14, delay: 0 },
    { top: "50%", left: "62%", size: 11, delay: 700 },
    { top: "68%", left: "38%", size: 13, delay: 1400 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none">
      {positions.map((p, i) => (
        <svg
          key={i}
          width={p.size}
          height={p.size}
          viewBox="0 0 24 24"
          style={{
            position: "absolute",
            top: p.top,
            left: p.left,
            animation: "rdp-sparkle 2s ease-in-out infinite",
            animationDelay: `${p.delay}ms`,
            filter: "drop-shadow(0 0 3px rgba(244,228,193,0.5))",
          }}
        >
          <path
            d="M12 0 L13.5 10.5 L24 12 L13.5 13.5 L12 24 L10.5 13.5 L0 12 L10.5 10.5 Z"
            fill="rgba(244,228,193,0.7)"
          />
        </svg>
      ))}
      <style>{`
        @keyframes rdp-sparkle {
          0%, 100% { opacity: 0; transform: scale(0.4); }
          45%, 55% { opacity: 0.6; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function LightLeakEffect() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        style={{
          position: "absolute",
          top: "18%",
          left: "-15%",
          width: "45%",
          height: "55%",
          background: "radial-gradient(ellipse, rgba(244,220,170,0.55) 0%, rgba(232,180,110,0.25) 40%, transparent 70%)",
          animation: "rdp-leak 4s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "55%",
          left: "60%",
          width: "50%",
          height: "55%",
          background: "radial-gradient(ellipse, rgba(255,200,140,0.5) 0%, rgba(232,150,90,0.22) 50%, transparent 75%)",
          animation: "rdp-leak 4s ease-in-out infinite",
          animationDelay: "2s",
        }}
      />
      <style>{`
        @keyframes rdp-leak {
          0%, 100% { opacity: 0; transform: translateX(-10px); }
          25%, 75% { opacity: 1; transform: translateX(10px); }
        }
      `}</style>
    </div>
  );
}

function BokehEffect() {
  const circles = [
    { top: "8%",  left: "5%",  size: "26%", delay: 0 },
    { top: "60%", left: "75%", size: "32%", delay: 800 },
    { top: "18%", left: "82%", size: "18%", delay: 1600 },
    { top: "78%", left: "15%", size: "22%", delay: 2400 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none">
      {circles.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: c.top,
            left: c.left,
            width: c.size,
            aspectRatio: "1",
            background: "radial-gradient(circle, rgba(244,228,193,0.55) 0%, rgba(232,180,120,0.22) 55%, transparent 80%)",
            borderRadius: "50%",
            animation: "rdp-bokeh 3s ease-in-out infinite",
            animationDelay: `${c.delay}ms`,
          }}
        />
      ))}
      <style>{`
        @keyframes rdp-bokeh {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%      { opacity: 0.65; transform: scale(1.06); }
        }
      `}</style>
    </div>
  );
}

function GoldDustEffect() {
  // 9 particles falling slowly. Positions stable per index.
  const particles = Array.from({ length: 9 }, (_, i) => ({
    left: `${5 + ((i * 11.3) % 90)}%`,
    size: 1.5 + (i % 2) * 0.5,
    delay: i * 380,
    color: i % 2 === 0 ? "#5B34FF" : "#7C5CFF",
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: "-2%",
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: "50%",
            background: p.color,
            animation: "rdp-dust 3.5s linear infinite",
            animationDelay: `${p.delay}ms`,
          }}
        />
      ))}
      <style>{`
        @keyframes rdp-dust {
          0%   { transform: translateY(0); opacity: 0; }
          15%  { opacity: 0.7; }
          85%  { opacity: 0.7; }
          100% { transform: translateY(110%); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function GlowEffect() {
  // Echoes the canvas bloom: a warm, luminous wash that breathes, screen-blended
  // so it lifts highlights (hair gloss, skin shine) without muddying shadows.
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "screen" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 42%, rgba(255,240,215,0.5) 0%, rgba(255,225,180,0.18) 38%, transparent 68%)",
          animation: "rdp-glow 3s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes rdp-glow {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}

function SoftLightEffect() {
  // Echoes the canvas Orton diffusion: a soft cream wash, soft-light blended,
  // plus a faint screen lift — that dreamy "expensive skin" luminosity.
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 45%, rgba(255,248,235,0.6) 0%, rgba(244,228,193,0.28) 50%, rgba(244,228,193,0.12) 100%)",
          mixBlendMode: "soft-light",
          animation: "rdp-softlight 4s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(255,250,240,1)",
          opacity: 0.08,
          mixBlendMode: "screen",
        }}
      />
      <style>{`
        @keyframes rdp-softlight {
          0%, 100% { opacity: 0.8; }
          50%      { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function LensFlareEffect() {
  // Echoes the canvas anamorphic flare: a hot drifting core, a horizontal
  // blue-ish streak (the anamorphic signature), and a couple of coloured
  // ghosts toward centre — all screen-blended so they read as light.
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ mixBlendMode: "screen" }}
    >
      <div style={{ position: "absolute", inset: 0, animation: "rdp-flare-drift 6s ease-in-out infinite" }}>
        {/* hot core */}
        <div
          style={{
            position: "absolute",
            top: "26%",
            left: "30%",
            width: "34%",
            aspectRatio: "1",
            transform: "translate(-50%,-50%)",
            background:
              "radial-gradient(circle, rgba(255,250,235,0.9) 0%, rgba(255,225,180,0.35) 32%, transparent 70%)",
            animation: "rdp-flare-pulse 1.2s ease-in-out infinite",
          }}
        />
        {/* anamorphic horizontal streak */}
        <div
          style={{
            position: "absolute",
            top: "26%",
            left: 0,
            width: "100%",
            height: "2.5%",
            transform: "translateY(-50%)",
            background: "linear-gradient(90deg, transparent 0%, rgba(150,195,255,0.4) 50%, transparent 100%)",
          }}
        />
        {/* coloured ghosts toward centre */}
        <div
          style={{
            position: "absolute",
            top: "38%",
            left: "45%",
            width: "9%",
            aspectRatio: "1",
            transform: "translate(-50%,-50%)",
            background: "radial-gradient(circle, rgba(255,210,150,0.3) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "55%",
            width: "12%",
            aspectRatio: "1",
            transform: "translate(-50%,-50%)",
            background: "radial-gradient(circle, rgba(170,255,200,0.25) 0%, transparent 70%)",
          }}
        />
      </div>
      <style>{`
        @keyframes rdp-flare-drift {
          0%, 100% { transform: translateX(-12%); }
          50%      { transform: translateX(12%); }
        }
        @keyframes rdp-flare-pulse {
          0%, 100% { opacity: 0.7; }
          50%      { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
