import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import type { TextPreset, FilterPreset } from "@reelcoach/core";
import type { StoredClip } from "@/lib/clip-store";
import { layerCss } from "@/lib/layer-css";

/**
 * ════════════════════════════════════════════════════════════════════
 *  SCENE TEXT EDITOR — editare in-place, vedere per-scena statica (opt. B)
 * ════════════════════════════════════════════════════════════════════
 *
 *  Fiecare scena = un CADRU FIX din clipul stilistei (nu ruleaza) cu
 *  textele partenerei desenate peste, la pozitia lor. Stilista atinge un
 *  text -> apare un input exact peste el -> schimba DOAR cuvintele.
 *  Fontul / pozitia / culoarea raman ale partenerei (design fix).
 *
 *  Cadru static = zero race cu redarea video (cel mai stabil pt. lansare).
 *  Randare text prin CSS oglindind TextPreset-ul (acelasi ecou vizual ca
 *  LivePreview), nu pixel-identic cu canvas-ul de export, dar consistent.
 * ════════════════════════════════════════════════════════════════════
 */

/** Un text editabil pe scena (fie un strat al partenerei, fie captionul vechi). */
export interface EditableText {
  /** layerId pentru straturi; "caption" pentru sistemul vechi. */
  id: string;
  kind: "layer" | "caption";
  text: string;
  /** Placeholder cand textul e gol (ex. hook-ul scenei). */
  placeholder?: string;
  /** Pozitie libera 0..1, centrul textului. */
  x: number;
  y: number;
  preset: TextPreset;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  sizeScale?: number;
}

interface Props {
  clips: StoredClip[];
  /** Latimea cadrului preview in px (canvas de baza = 1080). */
  frameWidth: number;
  /** Textele editabile pentru un clip dat (calculat de parinte). */
  itemsFor: (clip: StoredClip) => EditableText[];
  /** Filtru de culoare per scena (aproximare CSS, fidelitate). */
  filterFor?: (clip: StoredClip) => FilterPreset | undefined;
  /** Commit editare: parintele decide unde salveaza (layer vs caption). */
  onCommit: (clip: StoredClip, item: EditableText, text: string) => void;
  /** Index scena controlat (sincron cu preview-ul de sus). */
  activeIdx: number;
  onSceneChange: (idx: number) => void;
}

/** Stilul CSS al unui text editabil = presetul lui + override-urile per strat. */
function textCss(item: EditableText, scale: number): React.CSSProperties {
  return layerCss(item.preset, item, scale);
}

export function SceneTextEditor({
  clips,
  frameWidth,
  itemsFor,
  filterFor,
  onCommit,
  activeIdx,
  onSceneChange,
}: Props) {
  const idx = Math.min(Math.max(0, activeIdx), Math.max(0, clips.length - 1));
  const clip = clips[idx];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const scale = frameWidth / 1080;
  const frameHeight = (frameWidth * 16) / 9;

  const url = useMemo(() => (clip ? URL.createObjectURL(clip.blob) : null), [clip]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  // Cadru STATIC: incarca clipul, sari la ~0.1s, ramai pe pauza. Fara redare
  // => fara race cu textul. Pe iOS frame-ul apare dupa `seeked`.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setEditing(null);
    const onLoaded = () => {
      try {
        v.currentTime = Math.min(0.1, (v.duration || 1) * 0.1);
      } catch {
        /* ignore */
      }
    };
    v.addEventListener("loadeddata", onLoaded);
    try {
      v.load();
    } catch {
      /* ignore */
    }
    return () => v.removeEventListener("loadeddata", onLoaded);
  }, [url]);

  if (!clip || !url) {
    return (
      <div className="w-full py-10 text-center text-[#6B6B6B] text-xs">
        Nu ai filmat nicio scenă încă.
      </div>
    );
  }

  const items = itemsFor(clip);
  const filter = filterFor?.(clip);
  const videoFilter = filter && filter.cssFilter !== "none" ? filter.cssFilter : undefined;

  const startEdit = (item: EditableText) => {
    setEditing(item.id);
    setDraft(item.text);
  };
  const commit = () => {
    if (editing === null) return;
    const item = items.find((it) => it.id === editing);
    if (item) onCommit(clip, item, draft);
    setEditing(null);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Cadru + texte */}
      <div
        className="relative rounded-2xl overflow-hidden bg-black shadow-[0_10px_30px_-12px_rgba(91,52,255,0.4)] border border-[#5B34FF]/20"
        style={{ width: frameWidth, height: frameHeight }}
      >
        <video
          ref={videoRef}
          src={url}
          muted
          playsInline
          preload="auto"
          {...({ "webkit-playsinline": "true" } as Record<string, string>)}
          controls={false}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          style={{ filter: videoFilter }}
        />
        {filter?.tint && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: filter.tint.color, opacity: filter.tint.alpha }}
          />
        )}

        {/* Texte editabile */}
        {items.map((item) => {
          const left = item.x * frameWidth;
          const top = item.y * frameHeight;
          const isEditing = editing === item.id;
          const show = item.text.trim() || item.placeholder || "Adaugă text";
          const isPlaceholder = !item.text.trim();

          if (isEditing) {
            return (
              <textarea
                key={item.id}
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    commit();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setEditing(null);
                  }
                }}
                rows={1}
                className="absolute bg-black/35 rounded-lg outline-none resize-none px-1"
                style={{
                  ...textCss(item, scale),
                  left,
                  top,
                  width: Math.min(frameWidth * 0.9, (item.preset.maxWidth ?? 880) * scale),
                  transform: "translate(-50%, -50%)",
                  caretColor: "#5B34FF",
                }}
              />
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => startEdit(item)}
              className="absolute active:scale-[0.98] transition"
              style={{
                left,
                top,
                transform: "translate(-50%, -50%)",
                ...textCss(item, scale),
                opacity: isPlaceholder ? 0.6 : 1,
                cursor: "text",
              }}
            >
              <span className="pointer-events-none">{show}</span>
              {/* Indiciu de editare — pastila mica sub text. whitespace-nowrap +
                  normal-case + tracking-normal ca sa NU mosteneasca pre-wrap/
                  break-word din textul-parinte (altfel "editează" se rupea). */}
              <span
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-0.5 whitespace-nowrap normal-case tracking-normal text-[8px] leading-none font-semibold text-white/90 bg-[#5B34FF]/85 rounded-full px-1.5 py-0.5 pointer-events-none"
                style={{ WebkitTextStroke: "0", textShadow: "none", wordBreak: "normal" }}
              >
                <Pencil className="w-2 h-2 shrink-0" /> Editează
              </span>
            </button>
          );
        })}

        {/* Puncte scene */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1">
          {clips.map((_, i) => (
            <button
              key={i}
              onClick={() => onSceneChange(i)}
              className={`h-[3px] rounded-full transition-all ${i === idx ? "w-5 bg-[#5B34FF]" : "w-2 bg-white/40"}`}
              aria-label={`Scena ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Navigare scene */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onSceneChange((idx - 1 + clips.length) % clips.length)}
          className="w-9 h-9 rounded-full bg-white border border-[#E6E6EA] flex items-center justify-center text-[#5B34FF] active:scale-95 transition"
          aria-label="Scena anterioară"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[11px] tracking-widest uppercase text-[#6B6B6B] font-semibold tabular-nums">
          Scena {idx + 1} / {clips.length}
        </span>
        <button
          onClick={() => onSceneChange((idx + 1) % clips.length)}
          className="w-9 h-9 rounded-full bg-white border border-[#E6E6EA] flex items-center justify-center text-[#5B34FF] active:scale-95 transition"
          aria-label="Scena următoare"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[11px] text-[#6B6B6B] text-center max-w-[240px]">
        Atinge un text ca să schimbi cuvintele. Stilul rămâne cel din exemplu.
      </p>
    </div>
  );
}
