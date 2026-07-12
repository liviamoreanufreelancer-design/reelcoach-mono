import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Share2,
  Loader2,
  AlertCircle,
  Film as FilmIcon,
  Check,
  Type,
  Sparkles,
  RefreshCw,
  Instagram,
  Facebook,
  Maximize2,
  Pencil,
} from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { BackButton } from "@/components/BackButton";
import { getSelectedScenario, getSelectedIdeaId, clearLastOpenedIdeaId } from "@/lib/selected-idea";
import { listClips, clearScenario, type StoredClip } from "@/lib/clip-store";
import { playSelect, playSuccess, playTap } from "@/lib/ui-sound";
import { light } from "@/lib/haptic";
import type { ConcatProgress } from "@reelcoach/core";
import { useBrand } from "@/hooks/useBrand";
import { useEditor, type CaptionState, type StyleId } from "@/hooks/useEditor";
import { STYLE_PACKS } from "@/data/style-packs";
import { TEXT_PRESETS } from "@reelcoach/core";
import type { Scenario } from "@/data/scenarios";
import { FILTER_GROUPS, FILTERS } from "@reelcoach/core";
import { TRANSITIONS, TRANSITION_LIST, type TransitionId } from "@reelcoach/core";
// music removed: users add audio when posting on TikTok / Instagram / Facebook
import type { Vibe } from "@/lib/brand-store";
import { renderOverlay, renderOutro, renderIntro, logoToBitmap } from "@reelcoach/core";
import { renderReelInBrowser } from "@reelcoach/core";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { LivePreview } from "@/components/editor/LivePreview";
import { SceneTextEditor, type EditableText } from "@/components/editor/SceneTextEditor";
import { effectiveLayers, sceneHasLayers } from "@/lib/scene-layers";
import { toast } from "sonner";

export const Route = createFileRoute("/edit")({
  component: Edit,
});

type Phase = "idle" | "processing" | "done" | "error" | "no-clips";
type Tab = "text" | "style";

function Edit() {
  // Read directly from sessionStorage (sync) — no hydration race.
  const [scenario] = useState(() => getSelectedScenario());
  const [scenarioId] = useState(() => getSelectedIdeaId());
  const { brand, logoUrl } = useBrand();

  const defaultCaptions: CaptionState[] = useMemo(
    () =>
      scenario.scenes.map((s) => ({
        text: (s.overlayText ?? s.hook).replace(/\n/g, " "),
        position: "bottom" as const,
      })),
    [scenario],
  );
  const {
    state,
    updateCaption,
    updateLayerText,
    setStyle,
    setFilter,
    setTransition,
    setEffectsEnabled,
  } = useEditor(scenarioId, {
    captions: defaultCaptions,
    vibe: brand?.vibe ?? "luxury",
  });

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<ConcatProgress>({ phase: "loading", pct: 0 });
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const doneVideoRef = useRef<HTMLVideoElement | null>(null);

  // Enter fullscreen on the finished reel. Re-enables controls inside
  // fullscreen so the user can scrub, mute, etc. while watching. Outside
  // fullscreen we keep the video clean (no native chrome).
  const enterFullscreen = () => {
    const v = doneVideoRef.current;
    if (!v) return;
    // Re-enable controls for the fullscreen experience.
    v.controls = true;
    const req =
      v.requestFullscreen?.bind(v) ??
      // @ts-expect-error — Safari iOS-specific API
      v.webkitEnterFullscreen?.bind(v);
    if (req) {
      Promise.resolve(req()).catch(() => {
        /* user cancelled / not supported */
      });
    }
    // Strip controls again once the user exits fullscreen.
    const onExit = () => {
      if (!document.fullscreenElement) {
        v.controls = false;
        document.removeEventListener("fullscreenchange", onExit);
      }
    };
    document.addEventListener("fullscreenchange", onExit);
  };
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("text");
  const [clips, setClips] = useState<StoredClip[] | null>(null);
  const [activeScene, setActiveScene] = useState(0);
  // Index-ul de CLIP pentru editorul in-place (vederea per-scena statica).
  const [editClipIdx, setEditClipIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const renderStartRef = useRef<number>(0);
  const blobRef = useRef<Blob | null>(null);
  const overlayCacheRef = useRef<Map<string, Blob>>(new Map());
  const nav = useNavigate();
  useEffect(() => {
    void (async () => {
      if (!scenarioId) return;
      const list = await listClips(scenarioId);
      console.log("[edit] listClips for", scenarioId, "→", list.length, "clips");
      setClips(list);
      setPhase((current) => {
        if (list.length === 0) return "no-clips";
        return current === "no-clips" ? "idle" : current;
      });
    })();
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId]);

  // Music removed — users add audio from TikTok / Instagram / Facebook when posting.

  // Precedenta font: "original" = fontul setat in Studio per scena (scene.captionPreset);
  // altfel suprascrie cu fontul stilului (vibe) ales de stilista pentru tot reel-ul.
  function resolvePreset(styleId: StyleId, sceneCaptionPreset?: string) {
    if (styleId === "original") {
      return TEXT_PRESETS[sceneCaptionPreset ?? "hookBold"] ?? TEXT_PRESETS.hookBold;
    }
    return TEXT_PRESETS[STYLE_PACKS[styleId].textPresetId] ?? TEXT_PRESETS.hookBold;
  }
  // Pentru fallback-ul de tranzitie avem nevoie de un stylePack; "original" nu e
  // in STYLE_PACKS, asa ca folosim luxury doar ca sursa de default (tranzitia e
  // oricum suprascrisa per scena mai jos).
  const stylePack =
    state && state.styleId !== "original" ? STYLE_PACKS[state.styleId] : STYLE_PACKS.luxury;
  const effectiveTransitionId = (state?.transitionId ?? stylePack.transitionId) as TransitionId;
  // Preset per scena pentru preview (preview = export). Cand e "original", fiecare
  // scena foloseste fontul ei din Studio; altfel toate folosesc fontul stilului.
  const livePresets = state
    ? scenario.scenes.map((sc) => resolvePreset(state.styleId, sc.captionPreset))
    : [];
  const livePreset = livePresets[0] ?? TEXT_PRESETS.hookBold;

  // ─── Editor in-place (SceneTextEditor) ────────────────────────────────
  // Textele editabile pentru o scena filmata. Scenele cu straturi (Studio)
  // => cate un text per strat (editeaza .text). Scenele vechi (caption)
  // => un singur text din sistemul caption. Randare/pozitie = ale partenerei.
  function editableItemsFor(clip: StoredClip): EditableText[] {
    if (!state) return [];
    const scene = scenario.scenes[clip.sceneIdx];
    if (scene && sceneHasLayers(scene)) {
      const layers = effectiveLayers(scene, state.layerTextEdits?.[clip.sceneIdx]);
      return layers.map((l) => ({
        id: l.id,
        kind: "layer" as const,
        text: l.text,
        x: l.x,
        y: l.y,
        preset: TEXT_PRESETS[l.presetId] ?? TEXT_PRESETS.hookBold,
        color: l.color,
        bold: l.bold,
        italic: l.italic,
        underline: l.underline,
        sizeScale: l.sizeScale,
      }));
    }
    // Scena veche pe caption — un singur text editabil.
    const cap = state.captions[clip.sceneIdx];
    const preset = resolvePreset(state.styleId, scene?.captionPreset);
    const y = cap?.position === "top" ? 0.18 : cap?.position === "center" ? 0.5 : 0.82;
    return [
      {
        id: "caption",
        kind: "caption" as const,
        text: cap?.text ?? "",
        placeholder: (scene?.overlayText ?? scene?.hook ?? "").replace(/\n/g, " "),
        x: 0.5,
        y,
        preset,
        color: cap?.color ?? brand?.primary,
      },
    ];
  }

  // Commit editare in-place: straturile -> updateLayerText (doar .text);
  // captionul vechi -> updateCaption. Salvat LOCAL (nu atinge Studio).
  function commitEditableText(clip: StoredClip, item: EditableText, text: string) {
    if (item.kind === "layer") updateLayerText(clip.sceneIdx, item.id, text);
    else updateCaption(clip.sceneIdx, { text });
  }

  function editorFilterFor(clip: StoredClip) {
    const fid = scenario.scenes[clip.sceneIdx]?.filterId ?? state?.filterId;
    return fid ? (FILTERS[fid as keyof typeof FILTERS] ?? undefined) : undefined;
  }

  // Selectorul global de font e relevant doar pentru scenele vechi (caption);
  // scenele cu straturi isi pastreaza fontul partenerei.
  const hasLegacyCaptionScene = !!clips?.some(
    (c) => !sceneHasLayers(scenario.scenes[c.sceneIdx] ?? ({} as never)),
  );

  async function generate() {
    if (!state) return;
    setPhase("processing");
    setErrorMsg(null);
    setProgress({ phase: "loading", pct: 1, message: "Pornesc exportul video…" });
    setVideoUrl(null);
    blobRef.current = null;
    renderStartRef.current = performance.now();
    setElapsed(0);
    const tickId = window.setInterval(
      () => setElapsed((performance.now() - renderStartRef.current) / 1000),
      250,
    );
    try {
      const clips = await listClips(scenarioId);
      if (clips.length === 0) {
        setPhase("no-clips");
        return;
      }

      // Ținem live preview-ul existent pe ecran și generăm doar versiunea finală.
      setProgress({ phase: "writing", pct: 8, message: "Pregătesc textele și brandul…" });
      // Presetul se rezolva PER SCENA in bucla (vezi mai jos), nu global —
      // ca "original" sa pastreze fontul fiecarei scene din Studio.
      const logoBmp = await logoToBitmap(brand?.logoBlob);

      const overlays: (Blob | undefined)[] = [];
      for (let i = 0; i < clips.length; i++) {
        const c = clips[i];
        const cap = state.captions[c.sceneIdx];
        // Straturi de text libere (Studio) — au prioritate peste caption vechi,
        // aceeasi regula ca in renderPreviewFrame (preview = export). Aplic
        // editarile in-place ale stilistei (doar .text) prin effectiveLayers.
        const _scene = scenario.scenes[c.sceneIdx];
        const textLayers =
          _scene && sceneHasLayers(_scene)
            ? effectiveLayers(_scene, state.layerTextEdits?.[c.sceneIdx])
            : undefined;
        // Preset per scena: "original" => fontul scenei din Studio; vibe => fontul stilului.
        const preset = resolvePreset(state.styleId, scenario.scenes[c.sceneIdx]?.captionPreset);
        const overlayKey = JSON.stringify({
          sceneIdx: c.sceneIdx,
          text: cap?.text?.trim() ?? "",
          position: cap?.position ?? "bottom",
          presetId: preset.id,
          textLayers: textLayers ?? null,
          handle: brand?.handle ?? "",
          logoUpdatedAt: brand?.updatedAt ?? 0,
        });
        setProgress({
          phase: "writing",
          pct: 8 + ((i + 1) / clips.length) * 12,
          message: `Pregătesc overlay scena ${i + 1}/${clips.length}…`,
        });
        const cached = overlayCacheRef.current.get(overlayKey);
        if (cached) {
          overlays.push(cached);
          continue;
        }
        let overlayBlob: Blob;
        if (textLayers && textLayers.length > 0) {
          overlayBlob = await renderOverlay({
            textLayers,
            preset,
            handle: brand?.handle,
            logoBitmap: logoBmp,
            width: 1080,
            height: 1920,
          });
          overlayCacheRef.current.set(overlayKey, overlayBlob);
          overlays.push(overlayBlob);
          continue;
        }
        if (!cap || !cap.text.trim()) {
          overlayBlob = await renderOverlay({
            preset,
            handle: brand?.handle,
            logoBitmap: logoBmp,
            width: 1080,
            height: 1920,
          });
          overlayCacheRef.current.set(overlayKey, overlayBlob);
          overlays.push(overlayBlob);
          continue;
        }
        overlayBlob = await renderOverlay({
          caption: {
            text: cap.text,
            position: cap.position,
            presetId: preset.id,
            color: cap.color ?? brand?.primary,
          },
          preset,
          handle: brand?.handle,
          logoBitmap: logoBmp,
          width: 1080,
          height: 1920,
        });
        overlayCacheRef.current.set(overlayKey, overlayBlob);
        overlays.push(overlayBlob);
      }

      const hasBrandInfo = !!(brand?.name || brand?.handle || brand?.phone || brand?.logoBlob);
      setProgress({
        phase: "writing",
        pct: 22,
        message: hasBrandInfo ? "Pregătesc outro-ul…" : "Sar peste outro…",
      });
      const outroPng = hasBrandInfo
        ? await renderOutro({
            brandName: brand?.name,
            handle: brand?.handle,
            phone: brand?.phone,
            location: brand?.location,
            logoBitmap: logoBmp,
            primary: brand?.primary,
            accent: brand?.accent,
            width: 1080,
            height: 1920,
          })
        : undefined;

      const introPng = hasBrandInfo
        ? await renderIntro({
            brandName: brand?.name,
            handle: brand?.handle,
            logoBitmap: logoBmp,
            primary: brand?.primary,
            accent: brand?.accent,
            width: 1080,
            height: 1920,
          })
        : undefined;

      const blob = await renderReelInBrowser(
        clips,
        {
          overlays,
          introPng,
          outroPng,
          width: 1080,
          height: 1920,
          fps: 30,
          effects: {
            // "cut" is the no-transition option — disable transitions entirely
            // so the renderer doesn't blend frames at all.
            transitions: effectiveTransitionId !== "cut",
            kenBurns: true,
            intro: true,
          },
          transitionDuration: (TRANSITIONS[effectiveTransitionId]?.durationMs ?? 250) / 1000,
          transitionType: effectiveTransitionId,
          filter: FILTERS[state.filterId] ?? FILTERS.none,
          // Per-clip dimensions — each scene carries its own filter, effect,
          // transition, playback speed, and motion blur from Studio. The
          // renderer applies them per-clip (champagne on scene 1, cinema on
          // scene 2, etc.) rather than one global setting for the whole reel.
          // Falls back to the global value (above) when a clip leaves a slot empty.
          filters: clips.map((c) => {
            const fid = scenario.scenes[c.sceneIdx]?.filterId;
            return fid ? (FILTERS[fid as keyof typeof FILTERS] ?? undefined) : undefined;
          }),
          transitionTypes: clips.map(
            (c) => scenario.scenes[c.sceneIdx]?.transitionType as TransitionId | undefined,
          ),
          playbackSpeeds: clips.map((c) => scenario.scenes[c.sceneIdx]?.playbackSpeed),
          motionBlurs: clips.map((c) => scenario.scenes[c.sceneIdx]?.motionBlur),
          // Premium per-shot effects (sparkle/leak/bokeh/dust). Each clip
          // carries the effect chosen by its shot pattern; the master
          // toggle in state lets the user kill them all.
          effectsEnabled: state.effectsEnabled,
          effectIds: clips.map((c) => scenario.scenes[c.sceneIdx]?.effectId),
        },
        (p) =>
          setProgress({
            ...p,
            pct: 24 + p.pct * 0.76,
            message: `Calitate finală · ${p.message ?? "Procesez…"}`,
          }),
      );
      blobRef.current = blob;
      setVideoUrl(URL.createObjectURL(blob));
      setPhase("done");
      playSuccess();
    } catch (err) {
      setErrorMsg((err as Error)?.message ?? "Eroare la editare.");
      setPhase("error");
    } finally {
      window.clearInterval(tickId);
    }
  }

  // Converteste blob -> base64 (fara prefixul data:) pentru Filesystem.
  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve((r.result as string).split(",")[1] ?? "");
      r.onerror = reject;
      r.readAsDataURL(blob);
    });

  const download = async () => {
    if (!blobRef.current) return;
    const fileName = `${scenario.title.replace(/\s+/g, "-").toLowerCase()}.mp4`;

    // iOS/Android nativ: scrie pe disc -> share sheet nativ (Save Video / TikTok / IG).
    if (Capacitor.isNativePlatform()) {
      try {
        const base64 = await blobToBase64(blobRef.current);
        const written = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
        });
        await Share.share({
          title: scenario.title,
          text: "Salvează în Galerie sau trimite pe TikTok/Instagram.",
          url: written.uri,
        });
        return;
      } catch (err) {
        console.error("[edit] export nativ esuat:", err);
        // cade pe varianta web mai jos
      }
    }

    // Web (browser desktop): download clasic.
    const url = URL.createObjectURL(blobRef.current);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /**
   * Platform destinations. We use **universal links** (https://...) instead
   * of custom URL schemes (snssdk1233://, instagram://, fb://). Universal
   * links are Apple's official mechanism for opening a native app from a
   * web page — on iOS the app opens automatically if installed, otherwise
   * the website opens as fallback. Custom schemes are increasingly blocked
   * by Safari and modern Android browsers as a security measure.
   */
  const APP_LINKS: Record<
    "tiktok" | "instagram" | "facebook",
    { url: string; label: string; hint: string }
  > = {
    tiktok: {
      url: "https://www.tiktok.com/upload",
      label: "TikTok",
      hint: "Apasă + în TikTok, alege videoul descărcat.",
    },
    instagram: {
      url: "https://www.instagram.com/",
      label: "Instagram",
      hint: "Deschide Instagram → + → Reel, alege videoul descărcat.",
    },
    facebook: {
      url: "https://www.facebook.com/reels/create",
      label: "Facebook",
      hint: "Deschide Facebook → Reels → Creează, alege videoul descărcat.",
    },
  };

  const openApp = (platform: "tiktok" | "instagram" | "facebook") => {
    const { url } = APP_LINKS[platform];
    // Universal link via window.open in a new tab — on iOS this hands off
    // to the installed app, on web it just opens the site.
    window.open(url, "_blank");
  };

  const share = async (platform?: "tiktok" | "instagram" | "facebook") => {
    if (!blobRef.current) return;
    const file = new File([blobRef.current], `${scenario.title}.mp4`, { type: "video/mp4" });
    const platformLabel = platform ? APP_LINKS[platform].label : "";
    const title = platformLabel ? `${scenario.title} · pentru ${platformLabel}` : scenario.title;

    // Pe nativ (iOS/Android) folosim direct exportul Capacitor (Filesystem +
    // Share sheet nativ). navigator.share din WebView e nesigur.
    if (Capacitor.isNativePlatform()) {
      await download();
      return;
    }
    // 1. Web: incearca Web Share API (cand exista).
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title,
          text: platform
            ? `Postează pe ${platformLabel} și adaugă muzica din librăria oficială.`
            : undefined,
        });
        return; // Share succeeded.
      } catch (err) {
        // User cancelled or share failed — fall through to download flow.
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    // 2. Fallback: download the file. Then guide the user with a clear
    //    two-step toast instead of pretending we can open the app directly.
    download();

    if (platform) {
      const { label, hint } = APP_LINKS[platform];
      toast.success(`Video salvat pentru ${label}`, {
        description: hint,
        duration: 8000,
        action: {
          label: `Deschide ${label}`,
          onClick: () => openApp(platform),
        },
      });
    } else {
      toast.success("Video salvat", {
        description: "Găsește-l în Descărcări și încarcă-l pe rețeaua dorită.",
        duration: 6000,
      });
    }
  };

  const restart = async () => {
    await clearScenario(scenarioId);
    nav({ to: "/film" });
  };

  if (phase === "no-clips") return <NoClips />;

  return (
    <PhoneShell>
      <div className="relative z-10 flex flex-col h-full bg-[#F8F8FA] text-[#1F1F1F] px-5 pt-12 pb-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <BackButton confirm to="/" />
          <div className="text-center">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#5B34FF] font-semibold">
              Pasul 02 · Editare
            </p>
            <p className="text-[#1F1F1F] text-xs mt-0.5 truncate max-w-[200px]">{scenario.title}</p>
          </div>
          <Link
            to="/settings-brand-edit"
            className="w-10 h-10 rounded-full bg-white border border-[#E6E6EA] shadow-[0_4px_14px_-10px_rgba(40,24,110,0.3)] flex items-center justify-center active:scale-95 transition"
            aria-label="Brand"
          >
            <Sparkles className="w-4 h-4 text-[#5B34FF]" />
          </Link>
        </div>

        {/* Preview — doar la randare/rezultat. In editare (idle) hero-ul e
            editorul in-place per-scena (SceneTextEditor) de mai jos. */}
        {phase !== "idle" && (
          <div
            className="mt-3 mx-auto rounded-xl overflow-hidden border border-[#5B34FF]/20 shadow-[0_8px_24px_-8px_rgba(91,52,255,0.3)] bg-black shrink-0 relative"
            style={{ aspectRatio: "9/16", width: "min(42vw, 165px)" }}
          >
            {phase === "done" && videoUrl ? (
              <>
                <video
                  ref={doneVideoRef}
                  src={videoUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  disablePictureInPicture
                  disableRemotePlayback
                  controlsList="nodownload nofullscreen noremoteplayback"
                  className="w-full h-full object-cover"
                />
                {/* Fullscreen icon overlay — top right corner of the video */}
                <button
                  onClick={enterFullscreen}
                  aria-label="Vezi pe tot ecranul"
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/55 backdrop-blur-md border border-white/15 flex items-center justify-center text-white active:scale-95 transition"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </>
            ) : phase === "processing" ? (
              <div className="relative w-full h-full bg-black">
                {clips && clips.length > 0 && state ? (
                  <div className="absolute inset-0">
                    <LivePreview
                      clips={clips}
                      captions={clips.map((c) => {
                        const _cap = state.captions[c.sceneIdx] ?? {
                          text: "",
                          position: "bottom" as const,
                        };
                        return { ..._cap, color: _cap.color ?? brand?.primary };
                      })}
                      preset={livePreset}
                      presets={livePresets}
                      transition={effectiveTransitionId}
                      filter={FILTERS[state.filterId] ?? FILTERS.none}
                      effectIds={clips.map((c) => scenario.scenes[c.sceneIdx]?.effectId)}
                      transitionTypes={clips.map(
                        (c) => scenario.scenes[c.sceneIdx]?.transitionType,
                      )}
                      playbackSpeeds={clips.map((c) => scenario.scenes[c.sceneIdx]?.playbackSpeed)}
                      motionBlurs={clips.map((c) => scenario.scenes[c.sceneIdx]?.motionBlur)}
                      effectsEnabled={state.effectsEnabled}
                      handle={brand?.handle}
                      logoUrl={logoUrl}
                      activeIdx={Math.min(activeScene, clips.length - 1)}
                      onSceneChange={(i) => setActiveScene(clips[i]?.sceneIdx ?? i)}
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FilmIcon className="w-8 h-8 text-[#EDE8FF] animate-pulse" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/85 via-black/55 to-transparent">
                  <p className="text-[9px] tracking-[0.25em] uppercase text-[#EDE8FF]/90 text-center mb-1.5">
                    Preview live · randez calitate finală
                  </p>
                  <div className="h-[3px] bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#5B34FF] transition-all duration-200"
                      style={{ width: `${Math.min(100, Math.max(2, Math.round(progress.pct)))}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-center text-white/85 text-[10px]">
                    {progress.message ?? "Procesez…"}
                  </p>
                  <p className="mt-0.5 text-center text-[9px] tracking-widest uppercase text-white/45 tabular-nums">
                    {Math.round(progress.pct)}% · {elapsed.toFixed(0)}s
                  </p>
                </div>
              </div>
            ) : phase === "error" ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-rose-300 text-xs gap-2 p-3 text-center">
                <AlertCircle className="w-6 h-6" />
                <p>{errorMsg}</p>
              </div>
            ) : clips && clips.length > 0 && state ? (
              <LivePreview
                clips={clips}
                captions={clips.map((c) => {
                  const _cap = state.captions[c.sceneIdx] ?? {
                    text: "",
                    position: "bottom" as const,
                  };
                  return { ..._cap, color: _cap.color ?? brand?.primary };
                })}
                preset={livePreset}
                presets={livePresets}
                transition={effectiveTransitionId}
                filter={FILTERS[state.filterId] ?? FILTERS.none}
                effectIds={clips?.map((c) => scenario.scenes[c.sceneIdx]?.effectId)}
                transitionTypes={clips.map((c) => scenario.scenes[c.sceneIdx]?.transitionType)}
                playbackSpeeds={clips.map((c) => scenario.scenes[c.sceneIdx]?.playbackSpeed)}
                motionBlurs={clips.map((c) => scenario.scenes[c.sceneIdx]?.motionBlur)}
                effectsEnabled={state.effectsEnabled}
                handle={brand?.handle}
                logoUrl={logoUrl}
                activeIdx={Math.min(activeScene, clips.length - 1)}
                onSceneChange={(i) => setActiveScene(clips[i]?.sceneIdx ?? i)}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white/45 text-[11px] tracking-widest uppercase gap-2 p-3 text-center">
                <FilmIcon className="w-7 h-7 text-[#EDE8FF]/70" />
                <span>Se încarcă…</span>
              </div>
            )}
          </div>
        )}

        {/* Tabs — only shown in editing mode (not when phase is "done").
            Only the "Texte" tab is available now; filters/effects/transitions
            are set by the template author in Studio, not editable here. */}
        {phase !== "done" && (
          <div className="mt-3 flex gap-2 p-1 bg-[#EDE8FF] rounded-full shrink-0">
            <TabBtn
              active={tab === "text"}
              onClick={() => setTab("text")}
              icon={<Type className="w-3.5 h-3.5" />}
              label="Texte"
            />
          </div>
        )}

        {/* Tab content — only shown in editing mode */}
        {phase !== "done" && (
          <div className="flex-1 min-h-0 overflow-y-auto mt-2.5 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {state && tab === "text" && clips && clips.length > 0 && (
              <div className="space-y-3 pt-1">
                {/* Editor in-place per-scena (vedere statica). Stilista atinge
                  textul direct pe cadru si schimba doar cuvintele. */}
                <SceneTextEditor
                  clips={clips}
                  frameWidth={Math.min(
                    typeof window !== "undefined" ? window.innerWidth * 0.66 : 260,
                    260,
                  )}
                  itemsFor={editableItemsFor}
                  filterFor={editorFilterFor}
                  onCommit={commitEditableText}
                  activeIdx={Math.min(editClipIdx, clips.length - 1)}
                  onSceneChange={(i) => {
                    setEditClipIdx(i);
                    setActiveScene(clips[i]?.sceneIdx ?? i);
                  }}
                />

                {/* Refilmare scena curenta */}
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      light();
                      playTap();
                      const sceneIdx =
                        clips[Math.min(editClipIdx, clips.length - 1)]?.sceneIdx ?? 0;
                      nav({ to: "/film", search: { scene: sceneIdx, single: true } });
                    }}
                    className="flex items-center gap-1.5 text-[11px] text-[#5B34FF] font-medium px-3 py-1.5 rounded-full bg-[#EDE8FF] active:scale-95 transition"
                  >
                    <RefreshCw className="w-3 h-3" /> Refilmează scena
                  </button>
                </div>

                {/* Selector global de font — relevant doar pentru scenele vechi
                  pe caption; scenele cu straturi isi pastreaza fontul partenerei. */}
                {hasLegacyCaptionScene && (
                  <div className="bg-white rounded-2xl border border-[#E6E6EA] p-3 shadow-[0_4px_16px_-14px_rgba(40,24,110,0.2)]">
                    <p className="text-[10px] tracking-widest uppercase text-[#5B34FF]/80 font-semibold mb-2 px-1">
                      Stilul textului
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(["original", "luxury", "soft", "bold"] as StyleId[]).map((v) => {
                        const sp = v === "original" ? null : STYLE_PACKS[v];
                        const active = state.styleId === v;
                        return (
                          <button
                            key={v}
                            onClick={() => setStyle(v)}
                            className={`rounded-xl p-3 border text-center transition active:scale-[0.98] ${active ? "border-[#5B34FF] bg-[#EDE8FF]" : "border-[#E6E6EA] bg-white"}`}
                          >
                            <span
                              className={`block font-display text-lg leading-none ${active ? "text-[#5B34FF]" : "text-[#1F1F1F]"}`}
                            >
                              {v === "original" ? "Original" : sp!.label}
                            </span>
                            <span className="block text-[10px] text-[#6B6B6B] mt-1 leading-tight">
                              {v === "original" ? "Fontul din exemplu" : sp!.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {state && tab === "style" && (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] tracking-widest uppercase text-[#EDE8FF]/80 mb-2 px-1">
                    Pachet stil
                  </p>
                  <div className="space-y-2">
                    {(["luxury", "soft", "bold"] as Vibe[]).map((v) => {
                      const sp = STYLE_PACKS[v];
                      const active = state.styleId === v;
                      return (
                        <button
                          key={v}
                          onClick={() => setStyle(v)}
                          className={`w-full text-left rounded-2xl p-4 border transition ${active ? "border-[#5B34FF] bg-white/[0.06]" : "border-white/10 bg-white/[0.02]"}`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`font-display text-2xl ${active ? "text-purple-gradient" : "text-white"}`}
                            >
                              {sp.label}
                            </span>
                            {active && <Check className="w-4 h-4 text-[#EDE8FF]" />}
                          </div>
                          <p className="text-white/55 text-xs mt-1">{sp.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => {
                      playSelect();
                      setEffectsEnabled(!state.effectsEnabled);
                    }}
                    className="w-full flex items-center justify-between gap-3 rounded-2xl p-3 border border-white/10 bg-white/[0.02] active:scale-[0.99] transition"
                  >
                    <div className="text-left">
                      <p className="text-white text-sm font-medium flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#EDE8FF]" />
                        Efecte premium
                      </p>
                      <p className="text-white/55 text-[11px] mt-0.5 leading-snug">
                        Sclipiri, lumini și bokeh aplicate automat pe scenele potrivite.
                      </p>
                    </div>
                    <span
                      className={`relative w-10 h-6 rounded-full transition shrink-0 ${state.effectsEnabled ? "bg-[#5B34FF]" : "bg-white/15"}`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${state.effectsEnabled ? "left-[18px]" : "left-0.5"}`}
                      />
                    </span>
                  </button>
                </div>

                <div>
                  <p className="text-[10px] tracking-widest uppercase text-[#EDE8FF]/80 mb-2 px-1">
                    Tranziție între scene
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {TRANSITION_LIST.map((tr) => {
                      const active = effectiveTransitionId === tr.id;
                      const isOverride = state.transitionId === tr.id;
                      return (
                        <button
                          key={tr.id}
                          onClick={() => {
                            playSelect();
                            setTransition(isOverride ? null : tr.id);
                          }}
                          className={`flex-shrink-0 rounded-xl px-3 py-2 border transition text-left min-w-[88px] ${active ? "border-[#5B34FF] bg-white/[0.07]" : "border-white/10 bg-white/[0.02]"}`}
                        >
                          <div className="w-full h-12 rounded-md mb-1.5 border border-white/10 overflow-hidden relative flex items-center justify-center bg-[linear-gradient(135deg,#3a2a1c_0%,#7a5638_50%,#2a1f12_100%)]">
                            <TransitionGlyph id={tr.id} />
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-xs font-medium ${active ? "text-[#EDE8FF]" : "text-white/85"}`}
                            >
                              {tr.label}
                            </span>
                            {active && <Check className="w-3 h-3 text-[#EDE8FF]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-white/45 text-[10px] mt-2 px-1 leading-relaxed">
                    {TRANSITIONS[effectiveTransitionId]?.desc}
                  </p>
                </div>

                <div className="space-y-4">
                  {FILTER_GROUPS.map((group) => (
                    <div key={group.id}>
                      <p className="text-[10px] tracking-widest uppercase text-[#EDE8FF]/80 mb-2 px-1">
                        {group.label}
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {group.filters.map((f) => {
                          const active = state.filterId === f.id;
                          return (
                            <button
                              key={f.id}
                              onClick={() => {
                                playSelect();
                                setFilter(f.id);
                              }}
                              className={`flex-shrink-0 rounded-xl px-3 py-2 border transition text-left min-w-[88px] ${active ? "border-[#5B34FF] bg-white/[0.07]" : "border-white/10 bg-white/[0.02]"}`}
                            >
                              <div className="relative w-full h-12 rounded-md mb-1.5 border border-white/10 overflow-hidden">
                                <div
                                  className="absolute inset-0"
                                  style={{
                                    background:
                                      "linear-gradient(135deg, #d4a87a 0%, #7a5638 45%, #2a1f12 100%)",
                                    filter: f.cssFilter,
                                  }}
                                />
                                {f.tint && (
                                  <div
                                    className="absolute inset-0"
                                    style={{ background: f.tint.color, opacity: f.tint.alpha }}
                                  />
                                )}
                                {f.highlightBoost && f.highlightBoost > 0 && (
                                  <div
                                    className="absolute inset-0"
                                    style={{
                                      background: "rgba(255, 250, 240, 1)",
                                      opacity: f.highlightBoost,
                                      mixBlendMode: "screen",
                                    }}
                                  />
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className={`text-xs font-medium ${active ? "text-[#EDE8FF]" : "text-white/85"}`}
                                >
                                  {f.label}
                                </span>
                                {active && <Check className="w-3 h-3 text-[#EDE8FF]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <p className="text-white/45 text-[10px] mt-2 px-1 leading-relaxed">
                    {FILTERS[state.filterId]?.desc ?? "Fără filtru."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom actions */}
        <div className="mt-3 shrink-0">
          {phase === "done" ? (
            <div className="space-y-2">
              <button
                onClick={() => setPhase("idle")}
                className="w-full h-11 rounded-full text-[#5B34FF] text-sm font-medium bg-[#EDE8FF] border border-[#5B34FF]/20 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Pencil className="w-4 h-4" /> Editează
              </button>
              <div className="rounded-2xl border border-[#E6E6EA] bg-white p-3 shadow-[0_4px_16px_-14px_rgba(40,24,110,0.2)]">
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#5B34FF]/80 font-semibold text-center mb-2">
                  Postează cu muzică oficială
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => share("tiktok")}
                    className="h-11 rounded-xl bg-black border border-white/15 text-white text-xs font-medium flex flex-col items-center justify-center gap-0.5 active:scale-[0.98]"
                  >
                    <span className="text-[13px] leading-none">🎵</span>
                    <span className="text-[10px] tracking-wide">TikTok</span>
                  </button>
                  <button
                    onClick={() => share("instagram")}
                    className="h-11 rounded-xl text-white text-xs font-medium flex flex-col items-center justify-center gap-0.5 active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)" }}
                  >
                    <Instagram className="w-3.5 h-3.5" />
                    <span className="text-[10px] tracking-wide">Reels</span>
                  </button>
                  <button
                    onClick={() => share("facebook")}
                    className="h-11 rounded-xl bg-[#1877f2] text-white text-xs font-medium flex flex-col items-center justify-center gap-0.5 active:scale-[0.98]"
                  >
                    <Facebook className="w-3.5 h-3.5" />
                    <span className="text-[10px] tracking-wide">Facebook</span>
                  </button>
                </div>
                <p className="text-[#6B6B6B] text-[10px] mt-2 text-center leading-relaxed">
                  Se deschide aplicația cu clipul atașat — alegi piesa din librăria lor și postezi.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => share()}
                  className="flex-1 h-11 rounded-full bg-[#5B34FF] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_12px_26px_-12px_rgba(91,52,255,0.8)] active:scale-[0.98]"
                >
                  <Share2 className="w-4 h-4" /> Altă aplicație
                </button>
                <button
                  onClick={download}
                  className="flex-1 h-11 rounded-full text-[#5B34FF] text-sm font-medium bg-[#EDE8FF] border border-[#5B34FF]/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" /> MP4
                </button>
              </div>
              <button
                onClick={generate}
                className="w-full h-9 text-[11px] tracking-widest uppercase text-[#6B6B6B] flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" /> Re-generează
              </button>
              <button
                onClick={() => {
                  light();
                  playTap();
                  // Pastram clipurile (stilista poate reedita / refilma o
                  // scena ulterior). Doar curatam pointerul last-opened ca
                  // Home sa nu mai arate "Continua" pentru un reel terminat.
                  clearLastOpenedIdeaId();
                  nav({ to: "/" });
                }}
                className="w-full h-12 rounded-full bg-[#EDE8FF] border border-[#5B34FF]/20 text-[#5B34FF] text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                Înapoi acasă
              </button>
            </div>
          ) : phase === "processing" ? (
            <div className="h-12 flex items-center justify-center gap-2 text-white/45 text-[11px] tracking-widest uppercase">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Nu închide tab-ul ·{" "}
              {Math.round(progress.pct)}%
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={generate}
                className="w-full h-14 rounded-full bg-[#5B34FF] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_12px_26px_-12px_rgba(91,52,255,0.8)] active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4" /> Generează Reel
              </button>
              <button
                onClick={restart}
                className="w-full h-9 text-[11px] tracking-widest uppercase text-[#6B6B6B]"
              >
                Reia filmările
              </button>
            </div>
          )}
        </div>
      </div>
    </PhoneShell>
  );
}

/**
 * Tiny visual glyph per transition type. Shown inside the swatch so the
 * user can recognize the effect by eye, not just by name.
 */
function TransitionGlyph({ id }: { id: string }) {
  const base = "absolute inset-0 flex items-center justify-center";
  switch (id) {
    case "cut":
      return (
        <div className={base}>
          <div className="w-full h-px bg-white/60" />
        </div>
      );
    case "fade":
      return (
        <div className={`${base} bg-gradient-to-r from-transparent via-white/40 to-transparent`} />
      );
    case "flash":
      return <div className={`${base} bg-white/70`} />;
    case "zoom":
      return (
        <div className={base}>
          <div className="w-7 h-7 rounded-full border-2 border-white/70" />
        </div>
      );
    case "glitch":
      return (
        <div className={base}>
          <div className="w-6 h-3 bg-pink-400/70 -translate-x-1" />
          <div className="w-6 h-3 bg-cyan-300/70 -translate-x-3 absolute" />
        </div>
      );
    case "blur":
      return (
        <div className={`${base} backdrop-blur-md bg-white/10`}>
          <div className="w-6 h-6 rounded-full bg-white/40 blur-sm" />
        </div>
      );
    case "slide":
      return (
        <div className={base}>
          <div className="w-3 h-6 bg-white/30 mr-0.5" />
          <div className="w-6 h-6 bg-white/70" />
        </div>
      );
    case "spin":
      return (
        <div className={base}>
          <div className="w-6 h-6 border-2 border-white/70 border-t-transparent rounded-full" />
        </div>
      );
    default:
      return null;
  }
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 rounded-full text-xs uppercase tracking-wider font-medium flex items-center justify-center gap-2 transition-all ${active ? "bg-[#5B34FF] text-white" : "text-[#5B34FF]/60"}`}
    >
      {icon} {label}
    </button>
  );
}

function NoClips() {
  return (
    <PhoneShell>
      <div className="relative z-10 flex flex-col h-full items-center justify-center px-6 text-center bg-[#F8F8FA]">
        <AlertCircle className="w-8 h-8 text-[#5B34FF]" />
        <p className="text-[#1F1F1F] text-sm mt-4">
          Nu există clipuri salvate pentru acest scenariu.
        </p>
        <Link
          to="/film"
          className="mt-5 inline-flex h-12 px-6 rounded-full bg-[#5B34FF] text-white text-sm font-semibold items-center shadow-[0_12px_26px_-12px_rgba(91,52,255,0.8)]"
        >
          Începe filmarea
        </Link>
      </div>
    </PhoneShell>
  );
}
