import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Smartphone, ChevronLeft, ChevronRight, ArrowRight, Check, RefreshCw, Square, Upload, AlertCircle, Sparkles, Package, Play, ListChecks, Sun, MoveRight, Clock, Info, Ruler } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { BackButton } from "@/components/BackButton";
import { CinematicBg } from "@/components/CinematicBg";
import { ShotIcon } from "@/components/ShotIcon";
import {
  getSelectedScenario,
  getSelectedIdeaId,
  hasSeenStoryboardRecently,
  markStoryboardSeen,
} from "@/lib/selected-idea";
import { getDifficulty, DIFFICULTIES, getMaterials, type Scenario, type Scene } from "@/data/scenarios";
import { useTemplate } from "@/data/templates-context";
import type { ShotPatternId } from "@/data/shots";
import { useCamera } from "@/hooks/useCamera";
import { useRecorder } from "@/hooks/useRecorder";
import { saveClip, listClips } from "@/lib/clip-store";
import { playCountdown, playRecordStart, playRecordStop, playSuccess, playNavForward, playTap } from "@/lib/ui-sound";
import { light } from "@/lib/haptic";

export const Route = createFileRoute("/film")({
  component: Film,
});

function Film() {
  const scenario = useMemo(() => getSelectedScenario(), []);
  const scenarioId = useMemo(() => getSelectedIdeaId(), []);
  const scenes = scenario.scenes;
  const materials = useMemo(() => getMaterials(scenario), [scenario]);
  const filmingTools = scenario.tools ?? [];
  const totalDuration = useMemo(
    () => scenes.reduce((sum, s) => sum + s.duration, 0),
    [scenes],
  );
  const diff = useMemo(() => getDifficulty(scenario), [scenario]);
  const diffMeta = DIFFICULTIES[diff];
  const diffDots = diff === "easy" ? 1 : diff === "medium" ? 2 : 3;
  const diffTone =
    diff === "easy" ? "text-emerald-300/90"
    : diff === "medium" ? "text-[#E8D5B5]"
    : "text-rose-300/90";

  /** materials (storyboard, legacy) → preshot (shot-first card) → film */
  const totalSteps = 1;
  // The reel preview screen (/reel/$id) sets the storyboard as "seen",
  // so when user comes from there, we skip storyboard and go straight
  // to the shot-first preshot screen.
  const [phase, setPhase] = useState<"overview" | "materials" | "preshot" | "film">(() => {
    const templateId = getSelectedIdeaId();
    if (templateId && hasSeenStoryboardRecently(templateId)) {
      return "preshot";
    }
    return "materials";
  });
  const [idx, setIdx] = useState(0);
  const [t, setT] = useState(0);
  const [captured, setCaptured] = useState<Set<number>>(new Set());
  const [showGuide, setShowGuide] = useState(true);
  /** 3-2-1 countdown before recording. null = inactive. */
  const [countdown, setCountdown] = useState<number | null>(null);
  /**
   * When set to true, the next time the camera becomes ready (after the
   * user taps "Sunt gata" on the preshot screen), we auto-trigger the
   * countdown without requiring a record-button tap.
   */
  const pendingAutoStartRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nav = useNavigate();
  const scene = scenes[idx];

  const cam = useCamera("environment");
  const rec = useRecorder();
  const tickRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  // Initial load: which scenes already have clips?
  useEffect(() => {
    listClips(scenarioId).then((cs) => {
      const done = new Set(cs.map((c) => c.sceneIdx));
      setCaptured(done);
      // Reia de la prima scena nefilmata, nu mereu de la scena 1.
      // Daca toate au clip, ramane pe ultima (refilmare/editare).
      if (done.size > 0) {
        let first = scenes.findIndex((_, i) => !done.has(i));
        if (first < 0) first = scenes.length - 1;
        setIdx(first);
      }
    });
  }, [scenarioId]);

  // Stop camera on unmount. We do NOT auto-start: getUserMedia must be
  // triggered by a real user gesture, otherwise the browser (especially
  // inside iframes / previews) silently blocks the request.
  useEffect(() => {
    return () => cam.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When phase becomes "film", make sure the camera is running AND its
  // stream is attached to the (potentially re-mounted) video element.
  // The video element unmounts during "preshot" phase, so when it comes
  // back, we need to re-bind streamRef.current → videoRef.current.srcObject.
  useEffect(() => {
    if (phase !== "film") return;
    if (cam.state === "idle") {
      // First entry — request camera.
      void cam.start("environment");
    } else if (cam.state === "ready" && cam.streamRef.current && cam.videoRef.current) {
      // Re-entry after preshot — stream is alive, video element re-mounted,
      // re-bind them so the live preview shows up again.
      cam.videoRef.current.srcObject = cam.streamRef.current;
      cam.videoRef.current.muted = true;
      void cam.videoRef.current.play().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Auto-start countdown when camera becomes ready after "Sunt gata".
  // pendingAutoStartRef is set in the PreShot onReady handler — the user
  // expects the 3-2-1 to begin immediately, without an extra record tap.
  useEffect(() => {
    if (phase !== "film") return;
    if (cam.state !== "ready") return;
    if (!pendingAutoStartRef.current) return;
    if (rec.state === "recording") return;
    if (countdown !== null) return;
    pendingAutoStartRef.current = false;
    setShowGuide(false);
    setCountdown(3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, cam.state, rec.state, countdown]);

  // Timer driven by recorder state
  useEffect(() => {
    if (rec.state !== "recording") {
      if (tickRef.current) cancelAnimationFrame(tickRef.current);
      return;
    }
    const start = performance.now();
    setT(0);
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      if (elapsed >= scene.duration) {
        setT(scene.duration);
        void handleStop();
        return;
      }
      setT(elapsed);
      tickRef.current = requestAnimationFrame(tick);
    };
    tickRef.current = requestAnimationFrame(tick);
    return () => {
      if (tickRef.current) cancelAnimationFrame(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.state, scene.duration]);

  // Pressing record starts a calm 3-2-1 countdown, THEN recording.
  // A countdown removes the "did it start? am I being filmed yet?"
  // anxiety — the pro knows exactly when to begin.
  const beginRecording = () => {
    if (cam.state !== "ready" || !cam.streamRef.current) return;
    setCountdown(null);
    playRecordStart();
    rec.start(cam.streamRef.current);
  };

  const handleStart = () => {
    if (cam.state !== "ready" || !cam.streamRef.current) return;
    setShowGuide(false);
    setCountdown(3);
  };

  const cancelCountdown = () => {
    if (countdownRef.current) clearTimeout(countdownRef.current);
    countdownRef.current = null;
    setCountdown(null);
    setShowGuide(true);
  };

  // Drive the 3-2-1 countdown.
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      beginRecording();
      return;
    }
    playCountdown();
    countdownRef.current = window.setTimeout(
      () => setCountdown((c) => (c === null ? null : c - 1)),
      1000,
    );
    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const handleStop = async () => {
    console.log("[film] handleStop: scenarioId=", scenarioId, "sceneIdx=", idx);
    const result = await rec.stop();
    console.log("[film] rec.stop result:", result ? `blob ${result.blob.size}B` : "null");
    if (result) {
      try {
        await saveClip({
          scenarioId,
          sceneIdx: idx,
          blob: result.blob,
          mimeType: result.mimeType,
          duration: t || scene.duration,
          finalUsageDuration: scene.finalUsageDuration,
          createdAt: Date.now(),
        });
        console.log("[film] saveClip OK for", scenarioId, idx);
      } catch (err) {
        console.error("[film] saveClip FAILED:", err);
      }
    }
    playRecordStop();
    setCaptured((s) => new Set(s).add(idx));
    playSuccess();
    setT(0);
    setShowGuide(true);
  };

  const handleFallbackUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await saveClip({
      scenarioId,
      sceneIdx: idx,
      blob: file,
      mimeType: file.type || "video/mp4",
      duration: scene.duration,
      finalUsageDuration: scene.finalUsageDuration,
      createdAt: Date.now(),
    });
    setCaptured((s) => new Set(s).add(idx));
    e.target.value = "";
  };

  const prev = () => {
    if (rec.state === "recording") rec.cancel();
    setT(0); setShowGuide(true);
    setIdx((p) => Math.max(0, p - 1));
  };
  const next = () => {
    if (rec.state === "recording") rec.cancel();
    playNavForward();
    setT(0); setShowGuide(true);
    if (idx === scenes.length - 1) {
      nav({ to: "/edit" });
    } else {
      setIdx((p) => p + 1);
      // Show the shot-first preshot screen before the next scene films.
      setPhase("preshot");
    }
  };

  const isRecording = rec.state === "recording";
  const sceneCaptured = captured.has(idx);
  const allDone = scenes.every((_, i) => captured.has(i));

  // ---------- Pre-shot: shot-first card (what to see + how to film + example) ----------
  if (phase === "preshot") {
    return <PreShotScreen
      scenario={scenario}
      sceneIdx={idx}
      onBack={() => {
        // If first scene → back to reel preview. Otherwise → previous scene.
        if (idx === 0) {
          // Replace /film in history with /reel/$id, so when the user
          // taps back on /reel/$id they go to Home (not back into /film,
          // which would re-enter preshot and create a loop).
          nav({ to: "/reel/$id", params: { id: scenarioId }, replace: true });
        } else {
          setIdx((p) => p - 1);
        }
      }}
      onReady={() => {
        light();
        playTap();
        // Tell the camera-ready watcher to auto-trigger the 3-2-1
        // countdown as soon as the camera is live, without requiring
        // an extra tap on the record button.
        pendingAutoStartRef.current = true;
        setPhase("film");
      }}
    />;
  }

  // ---------- Storyboard: scene preview + checklist (legacy) ----------
  if (phase === "materials") {
    return <StoryboardScreen
      scenario={scenario}
      onBack={() => nav({ to: "/" })}
      onStart={() => {
        // Storyboard -> preshot (shot-first card), not directly to filming.
        light();
        playTap();
        setPhase("preshot");
      }}
    />;
  }

  // ---------- Intro: Pregătește filmarea (checklist + tip) ----------


  // ---------- Film: scene-by-scene ----------
  return (
    <PhoneShell>
      {/* Live camera background */}
      <video
        ref={cam.videoRef}
        playsInline
        autoPlay
        muted
        className={`absolute inset-0 w-full h-full object-cover ${cam.facing === "user" ? "scale-x-[-1]" : ""}`}
      />
      {/* Dim overlay so UI is readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

      {/* 3-2-1 countdown — calm, full-screen, impossible to miss */}
      {countdown !== null && countdown > 0 && (
        <button
          onClick={cancelCountdown}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0F1419]/80 backdrop-blur-lg"
          aria-label="Anulează countdown"
        >
          <span className="text-[10px] tracking-[0.5em] uppercase text-[#E8D5B5]/90 font-semibold">
            Pregătește-te
          </span>
          <span
            key={countdown}
            className="text-9xl font-bold text-[#E8D5B5] animate-fade-in mt-2"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {countdown}
          </span>
          <span className="mt-4 text-[11px] tracking-widest uppercase text-white/55">
            Atinge ca să anulezi
          </span>
        </button>
      )}
      {showGuide && !isRecording && (
        <div className="absolute inset-0 opacity-25 pointer-events-none">
          <CinematicBg src={scene.bg} blur overlay={0.0} kenBurns={false} />
        </div>
      )}

      {/* Framing guide — rule-of-thirds + corner brackets, only while camera is live */}
      {cam.state === "ready" && (
        <div className="absolute inset-0 pointer-events-none z-[5]">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* rule of thirds */}
            <g stroke="white" strokeOpacity={isRecording ? 0.18 : 0.28} strokeWidth="0.15" vectorEffect="non-scaling-stroke">
              <line x1="33.33" y1="0" x2="33.33" y2="100" />
              <line x1="66.66" y1="0" x2="66.66" y2="100" />
              <line x1="0" y1="33.33" x2="100" y2="33.33" />
              <line x1="0" y1="66.66" x2="100" y2="66.66" />
            </g>
          </svg>
          {/* corner brackets */}
          <div className="absolute top-20 left-4 w-6 h-6 border-l-2 border-t-2 border-[#E8D5B5]/70 rounded-tl" />
          <div className="absolute top-20 right-4 w-6 h-6 border-r-2 border-t-2 border-[#E8D5B5]/70 rounded-tr" />
          <div className="absolute bottom-44 left-4 w-6 h-6 border-l-2 border-b-2 border-[#E8D5B5]/70 rounded-bl" />
          <div className="absolute bottom-44 right-4 w-6 h-6 border-r-2 border-b-2 border-[#E8D5B5]/70 rounded-br" />
          {/* persistent scene badge */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm flex items-center gap-1.5">
            {isRecording && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
            <span className="text-white/90 text-xs uppercase tracking-wider">
              Scena {idx + 1} din {scenes.length}
            </span>
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full px-5 pt-12 pb-6">
        {/* Exit button — top-left, confirmed to avoid losing scene */}
        <div className="absolute top-12 left-5 z-30">
          <BackButton confirm to="/" label="Ieșire din filmare" />
        </div>
        {/* Switch camera button — top-right, mirrors BackButton style.
            Same size, same glass-blur treatment, same vertical level. */}
        <div className="absolute top-12 right-5 z-30">
          <button
            type="button"
            onClick={cam.switchCamera}
            disabled={cam.state !== "ready" || isRecording}
            aria-label="Schimbă camera"
            title="Schimbă camera (față ↔ spate)"
            className="w-10 h-10 rounded-full bg-[#0F1419]/55 backdrop-blur-md border border-[#E8D5B5]/25 flex items-center justify-center text-[#E8D5B5] active:scale-95 transition shadow-[0_4px_16px_-4px_rgba(0,0,0,0.5)] disabled:opacity-30"
          >
            <RefreshCw className="w-[18px] h-[18px]" />
          </button>
        </div>
        {/* Top: progress + scene counter */}
        <div className="px-2">
          <div className="flex gap-1.5">
            {scenes.map((_, i) => (
              <div key={i} className="relative flex-1 h-[3px] rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    i === idx && isRecording ? "shimmer-gold" : captured.has(i) ? "bg-gradient-to-r from-[#F4E4C1] via-[#E8D5B5] to-[#D4AF37]" : i < idx ? "bg-gradient-to-r from-[#F4E4C1] via-[#E8D5B5] to-[#D4AF37]" : ""
                  }`}
                  style={{
                    width:
                      captured.has(i) ? "100%"
                      : i === idx && isRecording ? `${(t / scene.duration) * 100}%`
                      : i < idx ? "100%"
                      : "0%",
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            {/* Spacer left — keeps the center block actually centered */}
            <span className="w-9 h-9 shrink-0" />
            <div className="flex flex-col items-center gap-1 max-w-[60%]">
              <span className="text-[11px] tracking-[0.3em] uppercase text-[#E8D5B5]/90">
                Scena {idx + 1} din {scenes.length}
              </span>
              <span className="text-[10px] text-white/55 truncate w-full text-center">
                {scenario.title}
              </span>
              <span
                className={`mt-0.5 inline-flex items-center gap-1 text-[9px] tracking-[0.3em] uppercase font-semibold ${diffTone}`}
                title={diffMeta.desc}
              >
                <span className="flex gap-[2px]">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className={`w-[4px] h-[4px] rounded-full ${i < diffDots ? "bg-current" : "bg-current/25"}`} />
                  ))}
                </span>
                {diffMeta.short}
              </span>
            </div>
            {/* Spacer right — matches the left spacer so the center
                block (scene counter + title + difficulty) stays centered.
                The switch-camera button now lives at top-right. */}
            <span className="w-9 h-9 shrink-0" />
          </div>
        </div>

        {/* Camera permission flow.
            - idle: shouldn't normally happen — camera was started from the
              "Sunt pregătit" button. Fallback retry button just in case.
            - requesting: subtle loading state. iOS Safari shows its own
              permission dialog on top, so we just wait quietly underneath.
            - denied/error/etc: handled separately below with full messaging. */}
        {cam.state === "requesting" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0F1419]/70 backdrop-blur-md">
            <div className="text-center px-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full border border-[#E8D5B5]/25 border-t-[#E8D5B5] animate-spin" />
              <p className="text-white/70 text-xs tracking-[0.3em] uppercase">
                Se cere accesul la cameră
              </p>
            </div>
          </div>
        )}
        {cam.state === "idle" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0F1419]/70 backdrop-blur-md">
            <button
              onClick={() => void cam.start("environment")}
              className="inline-flex items-center gap-2 px-5 h-11 rounded-full bg-gradient-to-r from-[#F4E4C1] via-[#E8D5B5] to-[#D4AF37] text-black text-[11px] tracking-widest uppercase font-semibold shadow-[0_4px_24px_rgba(244,228,193,0.4)] active:scale-[0.98]"
            >
              <Camera className="w-3.5 h-3.5" />
              Activează camera
            </button>
          </div>
        )}
        {(cam.state === "denied" || cam.state === "unsupported" || cam.state === "error" || cam.state === "disconnected") && (
          <div className="mt-8 mx-auto glass-lux rounded-2xl px-5 py-4 max-w-[90%]">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#E8D5B5] mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">
                  {cam.state === "denied" ? "Acces refuzat la cameră"
                  : cam.state === "unsupported" ? "Browserul nu suportă filmare"
                  : cam.state === "disconnected" ? "Camera a fost deconectată"
                  : "Eroare la cameră"}
                </p>
                <p className="text-white/65 text-xs mt-1">
                  {cam.state === "denied"
                    ? "Permite accesul la cameră din bara browserului, apoi reîncearcă. Sau filmează cu camera nativă și încarcă mai jos."
                    : cam.state === "disconnected"
                      ? "Apasă mai jos ca să reconectezi camera și să continui filmarea."
                      : cam.error || "Poți filma cu camera nativă a telefonului și încărca clipul mai jos."}
                </p>
                <button
                  onClick={() => void cam.start()}
                  className="mt-3 inline-flex items-center gap-2 px-4 h-9 rounded-full bg-gradient-to-r from-[#F4E4C1] via-[#E8D5B5] to-[#D4AF37] text-black text-[11px] tracking-widest uppercase font-semibold shadow-[0_4px_24px_rgba(244,228,193,0.4)] active:scale-[0.98] transition-transform"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {cam.state === "disconnected" ? "Reconectează camera" : "Reîncearcă"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable middle — kept as a spacer between top bar and the
            bottom controls. Instructional overlays have been removed:
            the preshot screen (with example video) already showed the
            user what to film. Camera live shouldn't compete for attention. */}
        <div className="flex-1 min-h-0" />

        {/* Bottom: timer + record + next — always visible, never scrolled */}
        <div className="shrink-0 pt-2">
          <div className="flex items-baseline justify-center gap-2">
            <span
              className={`font-display text-[48px] leading-none tracking-[-0.04em] ${isRecording ? "text-[#E8D5B5]" : "text-white"}`}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {(scene.duration - t).toFixed(1)}
            </span>
            <span className="text-white/55 text-sm tracking-[0.35em] uppercase">sec</span>
          </div>

          {sceneCaptured && !isRecording && (
            <p className="mt-2 text-center text-[11px] tracking-widest uppercase text-emerald-300/90 flex items-center justify-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Scenă salvată
            </p>
          )}

          <button
            onClick={isRecording ? handleStop : handleStart}
            disabled={cam.state !== "ready" || countdown !== null}
            className={`mt-4 w-full h-16 rounded-full font-semibold text-base flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-40 ${
              isRecording ? "glass-lux text-white" : "bg-gradient-to-r from-[#F4E4C1] via-[#E8D5B5] to-[#D4AF37] text-[#0F1419] shadow-[0_4px_24px_rgba(244,228,193,0.4)]"
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-5 h-5 fill-current" />
                Oprește filmarea
              </>
            ) : countdown !== null ? (
              <>Se pregătește…</>
            ) : (
              <>
                <span className="relative flex items-center justify-center w-7 h-7">
                  <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40" />
                  <span className="relative w-3.5 h-3.5 rounded-full bg-red-500" />
                </span>
                {sceneCaptured ? "Refilmează shot" : "Start Filmare"}
              </>
            )}
          </button>

          {/* Fallback upload (visible if camera not ready) */}
          {(cam.state === "denied" || cam.state === "unsupported" || cam.state === "error" || cam.state === "disconnected") && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                capture="user"
                hidden
                onChange={handleFallbackUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 w-full h-12 rounded-full text-sm font-medium flex items-center justify-center gap-2 text-white bg-white/10 border border-white/15"
              >
                <Upload className="w-4 h-4" /> Încarcă filmare nativă
              </button>
            </>
          )}

          <button
            onClick={next}
            disabled={false}
            className="mt-3 w-full h-12 rounded-full text-sm font-medium flex items-center justify-center gap-2 text-white/85 bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-[0.98] disabled:opacity-40"
          >
            {idx === scenes.length - 1 ? (
              <>
                <Check className="w-4 h-4" />
                Mergi la editare
              </>
            ) : (
              <>
                Următoarea scenă
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>


        </div>
      </div>
    </PhoneShell>
  );
}

function InstructionCard({
  icon, label, text, delay,
}: { icon: React.ReactNode; label: string; text: string; delay: number; }) {
  return (
    <div
      className="glass-lux rounded-2xl px-4 py-3 flex gap-3 items-start animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <div className="mt-0.5 w-8 h-8 rounded-full bg-[#E8D5B5]/15 text-[#E8D5B5] flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] tracking-[0.35em] uppercase text-[#E8D5B5] font-semibold">{label}</p>
        <p className="text-white text-[13px] leading-snug mt-0.5">{text}</p>
      </div>
    </div>
  );
}


/** Pattern badge colors - matches SHOT_PATTERNS accent in shots.ts. */
/**
 * Pattern badge color class. Returns a single neutral champagne style for
 * all patterns — patterns are now free-form labels (Before, Tip 1, Demo,
 * etc.) so we no longer try to color-code by id.
 */
function patternBadge(_patternId?: string): string {
  return "bg-[#E8D5B5]/15 text-[#E8D5B5]";
}

/**
 * Pick an anchor icon for an instruction line by keyword. The icon is a
 * visual anchor so the pro scans rather than reads - it never replaces
 * the text, so an imperfect guess is harmless.
 */
function instructionNumber(n: number): React.ReactNode {
  return <span className="text-[#E8D5B5] text-xs font-medium">{n}</span>;
}

/**
 * Storyboard pre-filming screen — shows the creator the emotional pitch
 * of the reel, then a swipeable carousel of all scenes with line-art
 * icons. Includes a minimal checklist at the bottom (battery + light).
 *
 * Auto-advances through scenes every 4s. Any manual swipe or strip tap
 * stops the auto-advance so the user controls the pace.
 */
function StoryboardScreen({
  scenario,
  onBack,
  onStart,
}: {
  scenario: Scenario;
  onBack: () => void;
  onStart: () => void;
}) {
  const scenes = scenario.scenes;
  const totalScenes = scenes.length;

  const [activeIdx, setActiveIdx] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const startX = useRef<number | null>(null);

  // Try to find the matching ReelTemplate so we can read the emotional
  // pitch. Some scenarios come from the legacy system and won't have one
  // — that's fine, we just hide the pitch block.
  const template = useTemplate(scenario.id);
  const pitch = template?.emotionalPitch ?? null;

  // Compute totals once.
  const totalRecording = useMemo(() => {
    return scenes.reduce((sum, s) => sum + (s.duration ?? 0), 0);
  }, [scenes]);
  const totalFinal = useMemo(() => {
    return scenes.reduce(
      (sum, s) => sum + (s.finalUsageDuration ?? s.duration ?? 0),
      0,
    );
  }, [scenes]);

  // Auto-advance: every 4s, move to the next scene. Stops on manual
  // interaction (swipe, strip tap).
  useEffect(() => {
    if (!autoAdvance) return;
    const t = setInterval(() => {
      setActiveIdx((i) => (i + 1) % totalScenes);
    }, 4000);
    return () => clearInterval(t);
  }, [autoAdvance, totalScenes]);

  const goTo = (i: number) => {
    setAutoAdvance(false);
    light();
    playTap();
    setActiveIdx(((i % totalScenes) + totalScenes) % totalScenes);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) < 40) return;
    setAutoAdvance(false);
    if (dx < 0) setActiveIdx((i) => (i + 1) % totalScenes);
    else setActiveIdx((i) => (i - 1 + totalScenes) % totalScenes);
  };

  const active = scenes[activeIdx];
  const pattern = (active.patternId ?? "before") as ShotPatternId;

  // Show "Sari peste" if the user has seen this storyboard within the last
  // 7 days. Repeat users don't need to re-read the same prep every time.
  const canSkip = template ? hasSeenStoryboardRecently(template.id) : false;

  const handleStart = () => {
    if (template) markStoryboardSeen(template.id);
    onStart();
  };

  return (
    <PhoneShell>
      <CinematicBg src={scenario.image ?? scenes[0].bg} blur overlay={0.85} kenBurns={false} />
      <div className="absolute top-12 left-5 z-30">
        <button
          onClick={onBack}
          aria-label="Înapoi"
          className="w-10 h-10 rounded-full bg-[#0F1419]/55 backdrop-blur-md border border-[#E8D5B5]/25 flex items-center justify-center text-[#E8D5B5] active:scale-95 transition"
        >
          <ChevronLeft className="w-[18px] h-[18px]" />
        </button>
      </div>

      {/* Sari peste — only appears for users who have gone through this
          storyboard within the last 7 days. They've seen the prep, no
          point repeating it. */}
      {canSkip && (
        <div className="absolute top-12 right-5 z-30">
          <button
            onClick={handleStart}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-[#0F1419]/55 backdrop-blur-md border border-[#E8D5B5]/25 text-[#E8D5B5] text-[11px] font-semibold uppercase tracking-[0.14em] active:scale-95 transition"
          >
            Sari peste
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full px-6 pt-12 pb-12">
        {/* Step indicator centered above content */}
        <div className="text-center mb-4">
          <span className="text-[9px] tracking-[0.4em] uppercase text-[#E8D5B5]/70 font-medium">
            Pregătire
          </span>
        </div>

        {/* Natural flow — content stacks, button sits right after */}
        <div className="flex flex-col gap-4">
          {/* Title + summary */}
          <div>
            <p className="text-[9px] tracking-[0.32em] uppercase text-[#E8D5B5]/65 font-medium mb-2">
              Storyboard
            </p>
            <h1 className="font-editorial text-[26px] leading-[1.05] tracking-[-0.01em] text-white">
              Așa va arăta <em className="italic text-[#E8D5B5]">reel-ul.</em>
            </h1>
            <div className="flex items-center gap-3 mt-3 text-[10px] tracking-[0.18em] uppercase text-white/50">
              <span><b className="text-[#E8D5B5] font-medium mr-1 tabular-nums">{totalScenes}</b>cadre</span>
              <span className="text-[#E8D5B5]/40">·</span>
              <span><b className="text-[#E8D5B5] font-medium mr-1 tabular-nums">{Math.round(totalRecording)}s</b>filmare</span>
              <span className="text-[#E8D5B5]/40">·</span>
              <span><b className="text-[#E8D5B5] font-medium mr-1 tabular-nums">~{Math.round(totalFinal)}s</b>reel</span>
            </div>
          </div>

          {/* Editorial pitch — only shown if the template has one */}
          {pitch && (
            <div>
              <p className="text-[9px] tracking-[0.4em] uppercase text-[#E8D5B5]/55 mb-2">
                Senzația
              </p>
              <p className="font-editorial italic font-light text-[15px] leading-[1.45] text-white/82">
                {pitch}
              </p>
            </div>
          )}

          {/* Storyboard carousel + strip */}
          <div>
            <p className="text-[9px] tracking-[0.32em] uppercase text-[#E8D5B5]/55 font-medium mb-2">
              Cadre · {activeIdx + 1} din {totalScenes}
            </p>
            <div
              className="bg-white/[0.025] border border-[#E8D5B5]/15 rounded-2xl px-4 pt-4 pb-3"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-editorial italic text-[22px] text-[#E8D5B5] leading-none">
                  {String(activeIdx + 1).padStart(2, "0")}
                </span>
                <span className="text-[9px] tracking-[0.32em] uppercase text-[#E8D5B5]/60">
                  {prettyPattern(pattern)}
                </span>
              </div>
              <div className="flex justify-center py-1 text-[#E8D5B5]">
                <ShotIcon pattern={pattern} size={64} />
              </div>
              <p className="text-[13px] text-white font-medium text-center leading-tight mb-1">
                {active.hook || active.what || "Filmează scena"}
              </p>
              <p className="text-center text-[9px] tracking-[0.25em] uppercase text-white/40 tabular-nums">
                {Math.round(active.duration ?? 0)} secunde
              </p>
            </div>

            {/* Strip with all scenes */}
            <div className="flex justify-between gap-1.5 mt-2 px-1">
              {scenes.map((_, i) => {
                const isActive = i === activeIdx;
                return (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`flex-1 aspect-square rounded-lg flex items-center justify-center transition ${
                      isActive
                        ? "bg-[#E8D5B5]/[0.06] border border-[#E8D5B5]/45"
                        : "bg-white/[0.025] border border-[#E8D5B5]/10"
                    }`}
                    aria-label={`Sari la cadrul ${i + 1}`}
                  >
                    <span
                      className={`font-editorial italic text-[13px] ${
                        isActive ? "text-[#E8D5B5]" : "text-[#E8D5B5]/45"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Checklist */}
          <div className="pt-3 border-t border-[#E8D5B5]/10">
            <div className="flex justify-between items-center mb-2.5">
              <p className="text-[9px] tracking-[0.32em] uppercase text-[#E8D5B5]/55">
                Înainte să începi
              </p>
              <p className="text-[9px] tracking-[0.18em] uppercase text-white/40 tabular-nums">
                <b className="text-[#E8D5B5] font-medium">~2 min</b> cu clienta
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5 text-[11.5px] text-white/70">
                <span className="text-[#E8D5B5] text-[14px] w-4 text-center">⚡</span>
                <span>Telefon încărcat</span>
              </div>
              <div className="flex items-center gap-2.5 text-[11.5px] text-white/70">
                <span className="text-[#E8D5B5] text-[14px] w-4 text-center">☀</span>
                <span>Lumină bună spre clientă</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleStart}
          className="mt-6 w-full h-12 rounded-full bg-gradient-to-r from-[#F4E4C1] via-[#E8D5B5] to-[#D4AF37] text-[#0F1419] font-semibold uppercase tracking-[0.16em] text-[12px] shadow-[0_6px_24px_rgba(232,213,181,0.3)] active:scale-[0.98] transition flex items-center justify-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Sunt pregătit, începem
        </button>
      </div>
    </PhoneShell>
  );
}

function prettyPattern(p?: string): string {
  if (!p) return "";
  const map: Record<string, string> = {
    before: "Before",
    process: "Process",
    suspense: "Suspense",
    reveal: "Reveal",
    reaction: "Reaction",
    confidence: "Confidence",
  };
  // Known id → mapped label. Custom string → return as-is (uppercase will
  // be applied by the badge's text-transform).
  return map[p] ?? p;
}

/* ============================================================================
 * PreShotScreen — Card purple-light "cum filmezi scena" (model 5).
 *
 * Aratat INAINTE de filmarea fiecarei scene. Layout:
 *   - Safe-area sus + header (inapoi · "Scena N din M" · Info)
 *   - Bara de progres pe pasi
 *   - Titlu scena + durata de filmare
 *   - DIAGRAMA mare de filmare (scene.diagramUrl) — piesa centrala
 *   - Lista de instructiuni din scene.howShoot ({icon,label,detail})
 *   - CTA sticky "Incepe filmarea" (acelasi ecran cu diagrama)
 *
 * Tap "Incepe filmarea" -> onReady() -> faza "film" (camera live + auto 3-2-1).
 * Butonul Info deschide un sheet cu "Ce trebuie sa se vada" (scene.mustSee)
 * + un preview al shot-ului urmator. Logica de inregistrare ramane in <Film>.
 * ========================================================================== */
function PreShotScreen({
  scenario,
  sceneIdx,
  onBack,
  onReady,
}: {
  scenario: Scenario;
  sceneIdx: number;
  onBack: () => void;
  onReady: () => void;
}) {
  const scenes = scenario.scenes;
  const scene = scenes[sceneIdx];
  const total = scenes.length;
  const isLast = sceneIdx === total - 1;
  const [showInfo, setShowInfo] = useState(false);

  const rawPattern = scene.tag ?? scene.patternId;
  const patternLabel = rawPattern ? prettyPattern(rawPattern) : "";
  const sceneTitle =
    scene.what?.trim() || scene.hook?.trim() || `Scena ${sceneIdx + 1}`;

  const hasInfo = (scene.mustSee && scene.mustSee.length > 0) || !isLast;

  return (
    <PhoneShell>
      <div className="flex flex-col h-full bg-[#F8F8FA]">
        {/* Safe-area sus — bara de status iOS (lectie: min 56px sau headerul se suprapune) */}
        <div
          className="shrink-0"
          style={{ height: "max(env(safe-area-inset-top, 56px), 56px)" }}
        />

        {/* Header */}
        <header className="shrink-0 px-5 pb-3.5">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              aria-label="Inapoi"
              className="w-[38px] h-[38px] grid place-items-center rounded-full bg-white border border-[#E6E6EA] text-[#1F1F1F] shadow-[0_2px_8px_-4px_rgba(40,24,110,0.25)] active:scale-90 transition"
            >
              <ChevronLeft className="w-[22px] h-[22px]" strokeWidth={2} />
            </button>

            <span className="font-display font-bold text-[15.5px] tracking-[0.2px] text-[#1F1F1F] leading-none whitespace-nowrap">
              Scena {sceneIdx + 1} din {total}
            </span>

            {hasInfo ? (
              <button
                onClick={() => setShowInfo(true)}
                aria-label="Detalii scena"
                className="w-[38px] h-[38px] grid place-items-center rounded-full bg-white border border-[#E6E6EA] text-[#6B6B6B] shadow-[0_2px_8px_-4px_rgba(40,24,110,0.25)] active:scale-90 transition"
              >
                <Info className="w-[20px] h-[20px]" strokeWidth={2} />
              </button>
            ) : (
              <span className="w-[38px] h-[38px] shrink-0" />
            )}
          </div>

          {/* Progres pe pasi */}
          <div className="flex items-center gap-1.5 mt-3.5">
            {scenes.map((_, i) => (
              <span
                key={i}
                className={`flex-1 h-[5px] rounded-full ${
                  i <= sceneIdx ? "bg-[#5B34FF]" : "bg-[#EDE8FF]"
                }`}
              />
            ))}
          </div>
        </header>

        {/* Continut scrollabil */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 pt-1 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {patternLabel && (
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#5B34FF] font-bold mb-1.5">
              {patternLabel}
            </p>
          )}
          <h1 className="font-display font-bold text-[24px] leading-[1.08] tracking-[0.2px] text-[#1F1F1F]">
            {sceneTitle}
          </h1>
          <div className="flex items-center gap-1.5 mt-[7px] text-[13px] font-medium text-[#6B6B6B]">
            <Clock className="w-[15px] h-[15px]" strokeWidth={2} />
            <span>Durata: ~{Math.round(scene.duration)} sec</span>
          </div>

          {/* Diagrama — piesa centrala */}
          <div className="mt-3 w-full aspect-[3/2] rounded-[18px] overflow-hidden border border-[#E6E6EA] bg-white shadow-[0_10px_30px_-16px_rgba(40,24,110,0.32)]">
            {scene.diagramUrl ? (
              <img
                src={scene.diagramUrl}
                alt="Diagrama de filmare"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full grid place-items-center text-[#6B6B6B]">
                <span className="text-[12.5px] font-semibold tracking-[0.3px]">
                  Diagrama filmare
                </span>
              </div>
            )}
          </div>

          {/* Caption exemplu */}
          <div className="flex items-center justify-center gap-[7px] mt-2.5">
            <span className="w-[5px] h-[5px] rounded-full bg-[#6B6B6B]/40" />
            <span className="text-[12.5px] font-semibold tracking-[0.3px] text-[#6B6B6B]">
              Exemplu
            </span>
          </div>

          {/* Instructiuni — scene.howShoot */}
          {scene.howShoot && scene.howShoot.length > 0 && (
            <div className="mt-3.5 bg-white border border-[#E6E6EA] rounded-[18px] overflow-hidden shadow-[0_8px_22px_-14px_rgba(40,24,110,0.28)] divide-y divide-[#E6E6EA]">
              {scene.howShoot.map((item, i) => (
                <div key={i} className="flex items-center gap-3.5 px-4 py-[11px]">
                  <span className="shrink-0 w-[40px] h-[40px] grid place-items-center rounded-full bg-[#EDE8FF] text-[#5B34FF]">
                    <HowShootIcon icon={item.icon} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-medium leading-[1.3] text-[#1F1F1F]">
                      {item.label}
                    </p>
                    {item.detail && (
                      <p className="text-[12.5px] text-[#6B6B6B] mt-0.5 leading-snug">
                        {item.detail}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA sticky de filmare */}
        <div
          className="shrink-0 px-5 pt-3 bg-gradient-to-t from-[#F8F8FA] via-[#F8F8FA] to-[#F8F8FA]/85 backdrop-blur border-t border-[#E6E6EA]"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 24px), 24px)" }}
        >
          <button
            onClick={onReady}
            className="w-full h-[58px] flex items-center justify-center gap-3 rounded-[18px] bg-[#5B34FF] text-white shadow-[0_14px_30px_-10px_rgba(91,52,255,0.75)] active:scale-[0.98] transition"
          >
            <span className="w-[26px] h-[26px] grid place-items-center rounded-full bg-white/95">
              <span className="w-[13px] h-[13px] rounded-full bg-[#FF3B30]" />
            </span>
            <span className="font-bold text-[16.5px] tracking-[0.2px]">
              Incepe filmarea
            </span>
          </button>
        </div>
      </div>

      {/* Info sheet — mustSee + preview shot urmator */}
      {showInfo && (
        <InfoSheet
          scene={scene}
          nextScene={isLast ? null : scenes[sceneIdx + 1]}
          nextSceneNum={sceneIdx + 2}
          total={total}
          onClose={() => setShowInfo(false)}
        />
      )}
    </PhoneShell>
  );
}

/**
 * Iconita pentru un item "Cum filmezi" — mapeaza id-uri cunoscute la Lucide.
 * Cade pe un punct generic pentru id-uri necunoscute.
 */
function HowShootIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "light":
    case "sun":
      return <Sun className="w-[21px] h-[21px]" strokeWidth={1.9} />;
    // "eye" = "Pozitionare telefon" in Studio -> simbol de telefon
    case "eye":
    case "phone-vertical":
    case "phone":
      return <Smartphone className="w-[21px] h-[21px]" strokeWidth={1.9} />;
    case "distance":
      return <Ruler className="w-[21px] h-[21px]" strokeWidth={1.9} />;
    case "movement":
    case "move":
    case "pan":
      return <MoveRight className="w-[21px] h-[21px]" strokeWidth={1.9} />;
    default:
      return <span className="w-1.5 h-1.5 rounded-full bg-current" />;
  }
}

/**
 * InfoSheet — bottom sheet purple-light deschis din butonul ⓘ.
 * Arata "Ce trebuie sa se vada" (mustSee) pentru scena curenta + un preview
 * al shot-ului urmator (pattern + titlu + mustSee). Inlocuieste vechiul
 * NextShotPreviewSheet, pastrand datele mustSee in afara ecranului principal.
 */
function InfoSheet({
  scene,
  nextScene,
  nextSceneNum,
  total,
  onClose,
}: {
  scene: Scene;
  nextScene: Scene | null;
  nextSceneNum: number;
  total: number;
  onClose: () => void;
}) {
  const nextPattern = nextScene
    ? prettyPattern(nextScene.tag ?? nextScene.patternId)
    : "";

  return (
    <div className="absolute inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full bg-white rounded-t-[28px] px-6 pt-6 max-h-[80%] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 28px), 28px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[#E6E6EA]" />

        {scene.mustSee && scene.mustSee.length > 0 && (
          <div className="mt-3">
            <p className="font-display font-bold text-[16px] text-[#1F1F1F] mb-3">
              Ce trebuie sa se vada
            </p>
            <div className="bg-[#F8F8FA] border border-[#E6E6EA] rounded-[16px] divide-y divide-[#E6E6EA]">
              {scene.mustSee.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-6 h-6 rounded-full bg-[#EDE8FF] grid place-items-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-[#5B34FF]" strokeWidth={3} />
                  </span>
                  <span className="flex-1 text-[14px] text-[#1F1F1F] font-medium">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {nextScene && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2.5">
              <p className="font-display font-bold text-[16px] text-[#1F1F1F]">
                Urmatorul shot
              </p>
              <span className="text-[10px] tracking-[0.18em] uppercase text-[#6B6B6B] font-semibold tabular-nums">
                Shot {nextSceneNum} din {total}
              </span>
            </div>
            <div className="bg-[#F8F8FA] border border-[#E6E6EA] rounded-[16px] px-4 py-3.5">
              {nextPattern && (
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#5B34FF] font-bold mb-1">
                  {nextPattern}
                </p>
              )}
              <p className="text-[14px] font-semibold text-[#1F1F1F]">
                {nextScene.what?.trim() || nextScene.hook?.trim() || `Scena ${nextSceneNum}`}
              </p>
              {nextScene.mustSee && nextScene.mustSee.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {nextScene.mustSee.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-[13px] text-[#6B6B6B]">
                      <Check className="w-3.5 h-3.5 text-[#5B34FF] shrink-0" strokeWidth={3} />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full h-12 rounded-[16px] bg-[#EDE8FF] text-[#5B34FF] font-bold text-[14px] active:scale-[0.98] transition"
        >
          Inchide
        </button>
      </div>
    </div>
  );
}
