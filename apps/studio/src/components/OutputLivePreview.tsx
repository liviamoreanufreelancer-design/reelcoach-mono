"use client";
/**
 * OutputLivePreview — postarea, în timp real.
 *
 * Rulează momentele postării în ordinea și cu duratele ei, desenând fiecare
 * cadru prin `renderPreviewFrame` din reel-core — ACEEAȘI funcție folosită la
 * export. Filtrul se schimbă instant: nu se randează nimic, doar se desenează
 * altfel cadrul următor.
 *
 * De ce nu randare: randarea merge în TIMP REAL (14s de reel = 14s de așteptat).
 * Pentru a regla un filtru ai nevoie de răspuns imediat, nu de un ciclu complet.
 *
 * Câte un <video> per moment, ținut încărcat — nu schimbăm `src` la fiecare
 * tranziție, fiindcă asta produce exact blocajele și cadrele negre pe care
 * le-am vânat în renderer. Elementele stau în layout, în afara ecranului:
 * WebKit nu decodează cadre pentru un video `display:none`.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { renderPreviewFrame, FILTERS } from "@reelcoach/core";
import type { FilterPreset, TextLayer } from "@reelcoach/core";
import type { OutputRow, ShotRow } from "@/lib/db-types";

const W = 405;
const H = 720;

type Piece = {
  url: string;
  /** Câte secunde stă pe ecran în ACEASTĂ postare. */
  sec: number;
  filter: FilterPreset;
  effectId?: string;
  speed: number;
  title: string;
  textLayers?: TextLayer[];
};

export default function OutputLivePreview({
  output,
  shots,
  pinnedIdx = null,
  onUnpin,
  onMoveLayer,
}: {
  output: OutputRow;
  shots: ShotRow[];
  /** Când e setat, previzualizarea îngheață pe acest moment (editare text). */
  pinnedIdx?: number | null;
  onUnpin?: () => void;
  onMoveLayer?: (slotIdx: number, layerId: string, x: number, y: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);

  // Momentele postării care au footage, cu stilul deja rezolvat.
  // Excepția slotului bate implicitul postării, care bate lipsa lui.
  const pieces: Piece[] = useMemo(() => {
    return output.slots
      .map((slot): Piece | null => {
        const shot = shots.find((s) => s.slot_key === slot.slot);
        if (!shot?.sample_video_url) return null;
        const fId = slot.filter ?? output.filter ?? "none";
        return {
          url: shot.sample_video_url,
          sec: slot.sec ?? shot.final_usage_duration ?? 2,
          filter: (FILTERS[fId as keyof typeof FILTERS] ?? FILTERS.none) as FilterPreset,
          effectId: shot.effect && shot.effect !== "none" ? shot.effect : undefined,
          speed: slot.speed ?? shot.playback_speed ?? 1,
          title: shot.title || slot.slot,
          textLayers: slot.textLayers as TextLayer[] | undefined,
        };
      })
      .filter((p): p is Piece => p !== null);
  }, [output.slots, output.filter, shots]);

  const missing = output.slots.length - pieces.length;
  const totalSec = pieces.reduce((s, p) => s + p.sec, 0);

  // Bucla de desenare. Ruleaza continuu si citeste `pieces` prin ref, ca
  // schimbarea filtrului sa se vada la urmatorul cadru, fara reprornire.
  const piecesRef = useRef(pieces);
  useEffect(() => { piecesRef.current = pieces; }, [pieces]);
  const pinnedRef = useRef(pinnedIdx);
  useEffect(() => { pinnedRef.current = pinnedIdx; }, [pinnedIdx]);
  // Cand se editeaza textul, previzualizarea sta pe loc: nu poti pozitiona un
  // text pe o imagine care se misca.
  const isPinned = pinnedIdx !== null && pinnedIdx !== undefined;
  const playingRef = useRef(playing && !isPinned);
  useEffect(() => { playingRef.current = playing && !isPinned; }, [playing, isPinned]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let running = true;
    let idx = 0;
    let sliceStart = performance.now();

    const loop = () => {
      if (!running) return;
      const list = piecesRef.current;
      if (list.length === 0) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const pin = pinnedRef.current;
      if (pin !== null && pin !== undefined && pin >= 0 && pin < list.length) idx = pin;
      if (idx >= list.length) idx = 0;

      const piece = list[idx];
      const video = videoRefs.current[idx];
      const now = performance.now();
      const elapsed = playingRef.current ? (now - sliceStart) / 1000 : 0;

      if (video && video.readyState >= 2) {
        if (playingRef.current && video.paused) {
          try { video.playbackRate = piece.speed; } catch { /* ignore */ }
          video.play().catch(() => { /* ignore */ });
        }
        if (!playingRef.current && !video.paused) video.pause();

        renderPreviewFrame(canvas, video, {
          filter: piece.filter,
          effectId: piece.effectId,
          tNorm: Math.min(1, elapsed / Math.max(0.1, piece.sec)),
          localMs: elapsed * 1000,
          clipMs: piece.sec * 1000,
          // Aceeasi functie deseneaza textul la export — preview = export.
          textLayers: piece.textLayers?.length ? piece.textLayers : undefined,
        });
      }

      // Trecem la momentul urmator cand s-a consumat durata lui din postare.
      if (playingRef.current && elapsed >= piece.sec) {
        if (video) { try { video.pause(); video.currentTime = 0; } catch { /* ignore */ } }
        idx = (idx + 1) % list.length;
        sliceStart = now;
        setActiveIdx(idx);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Tragerea textului — activa doar cand previzualizarea e inghetata pe un
  // moment. Fara hit-test vizibil: apuci textul cel mai apropiat de deget.
  const dragRef = useRef<string | null>(null);
  const activePiece = pieces[isPinned ? (pinnedIdx as number) : activeIdx];

  const pointToFraction = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPinned || !onMoveLayer) return;
    const list = activePiece?.textLayers ?? [];
    if (list.length === 0) return;
    const { x, y } = pointToFraction(e);
    let best: TextLayer | null = null;
    let bestD = Infinity;
    for (const l of list) {
      const d = (l.x - x) ** 2 + (l.y - y) ** 2;
      if (d < bestD) { bestD = d; best = l; }
    }
    if (best && bestD < 0.2 * 0.2) {
      dragRef.current = best.id;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current || !onMoveLayer || pinnedIdx == null) return;
    const { x, y } = pointToFraction(e);
    onMoveLayer(pinnedIdx, dragRef.current, x, y);
  };

  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    dragRef.current = null;
  };

  if (output.slots.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative rounded-2xl overflow-hidden bg-black border border-[#5B34FF]/15">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          style={{
            width: "220px",
            aspectRatio: "9 / 16",
            touchAction: "none",
            cursor: isPinned && (activePiece?.textLayers?.length ?? 0) > 0 ? "move" : "default",
          }}
        />
        {pieces.length === 0 && (
          <div className="absolute inset-0 grid place-items-center text-white/50 text-[11px] px-4 text-center">
            Niciun moment cu clip exemplu
          </div>
        )}
      </div>

      {/* Elementele video: in layout, dar in afara ecranului. NU display:none —
          WebKit nu decodeaza cadre pentru un video ascuns, iar canvasul ar
          ramane negru. */}
      {pieces.map((p, i) => (
        <video
          key={`${p.url}-${i}`}
          ref={(el) => { videoRefs.current[i] = el; }}
          src={p.url}
          crossOrigin="anonymous"
          muted
          playsInline
          preload="auto"
          style={{
            position: "fixed", left: "-9999px", top: 0,
            width: "1px", height: "1px", opacity: 0.001, pointerEvents: "none",
          }}
        />
      ))}

      {isPinned ? (
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-[11px] text-[#5B34FF] text-center leading-snug max-w-[220px]">
            Oprit pe momentul editat — trage textul ca să-l poziționezi
          </p>
          {onUnpin && (
            <button
              type="button"
              onClick={onUnpin}
              className="text-[11.5px] text-[#5B34FF] hover:text-[#4826CC] inline-flex items-center gap-1"
            >
              <Play className="w-3 h-3" /> Redă toată postarea
            </button>
          )}
        </div>
      ) : null}

      <div className={`flex items-center gap-2.5 ${isPinned ? "opacity-40 pointer-events-none" : ""}`}>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="w-8 h-8 rounded-full bg-[#EDE8FF] text-[#5B34FF] grid place-items-center hover:bg-[#E0D8FF] transition"
          aria-label={playing ? "Pauză" : "Redă"}
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <span className="text-[11.5px] text-[#6B6B6B] tabular-nums">
          {pieces.length > 0 && `${activeIdx + 1}/${pieces.length} · `}
          ~{totalSec.toFixed(1)}s
        </span>
      </div>

      {pieces[activeIdx] && (
        <p className="text-[11px] text-[#9A9A9A] text-center leading-snug max-w-[220px] truncate">
          {pieces[activeIdx].title}
        </p>
      )}

      {missing > 0 && (
        <p className="text-[11px] text-amber-700 text-center leading-snug max-w-[220px]">
          {missing} {missing === 1 ? "moment n-are" : "momente n-au"} clip exemplu
        </p>
      )}
    </div>
  );
}
