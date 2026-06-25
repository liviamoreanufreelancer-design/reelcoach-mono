import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Plus, Check, Play, Image as ImageIcon, Film, Send, Undo2, Trash2 } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { TabBar } from "@/components/TabBar";
import { listMyReels, type MyReel, type ReelStatus } from "@/lib/my-reels";
import { markPosted, unmarkPosted } from "@/lib/reel-status";
import { setSelectedIdeaId } from "@/lib/selected-idea";
import { clearScenario } from "@/lib/clip-store";
import { playTap } from "@/lib/ui-sound";
import { light } from "@/lib/haptic";

export const Route = createFileRoute("/my-reels")({
  component: MyReels,
});

const SEGMENTS: { id: ReelStatus; label: string }[] = [
  { id: "draft", label: "Ciorne" },
  { id: "completed", label: "Terminate" },
  { id: "posted", label: "Postate" },
];

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "acum câteva secunde";
  if (min < 60) return `acum ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `acum ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `acum ${d} ${d === 1 ? "zi" : "zile"}`;
  const w = Math.floor(d / 7);
  return `acum ${w} ${w === 1 ? "săpt." : "săpt."}`;
}

function MyReels() {
  const nav = useNavigate();
  const [seg, setSeg] = useState<ReelStatus>("draft");
  const [reels, setReels] = useState<MyReel[] | null>(null);

  const reload = useCallback(() => {
    listMyReels().then(setReels);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const visible = (reels ?? []).filter((r) => r.status === seg);

  const openReel = (r: MyReel) => {
    light();
    playTap();
    setSelectedIdeaId(r.scenarioId);
    // draft -> editare normala (idle, la scene).
    // completed -> editare cu auto-generare (vezi reel-ul final direct).
    // posted -> detalii (reel inchis, deja publicat).
    if (r.status === "completed") {
      try { sessionStorage.setItem("reelcoach:autoGenerate", r.scenarioId); } catch { /* ignore */ }
      nav({ to: "/edit" });
    } else if (r.status === "draft") {
      nav({ to: "/edit" });
    } else {
      nav({ to: "/reel/$id", params: { id: r.scenarioId } });
    }
  };

  const onMarkPosted = async (r: MyReel) => {
    light();
    playTap();
    await markPosted(r.scenarioId);
    reload();
  };

  const onUnmarkPosted = async (r: MyReel) => {
    light();
    playTap();
    await unmarkPosted(r.scenarioId);
    reload();
  };

  const onDelete = async (r: MyReel) => {
    const ok = window.confirm(
      "Ștergi acest reel? Clipurile filmate se pierd definitiv.",
    );
    if (!ok) return;
    light();
    playTap();
    await clearScenario(r.scenarioId);
    unmarkPosted(r.scenarioId);
    reload();
  };

  return (
    <PhoneShell>
      <div className="flex flex-col h-full bg-[#F8F8FA]">
        {/* Safe-area sus */}
        <div
          className="shrink-0"
          style={{ height: "max(env(safe-area-inset-top, 56px), 56px)" }}
        />

        {/* Header + tab-uri segmentate */}
        <header className="shrink-0 px-[22px] pt-1">
          <h1 className="font-display font-bold text-[26px] leading-none tracking-[0.2px] text-[#1F1F1F]">
            Reelurile mele
          </h1>
          <div className="flex items-center gap-[26px] mt-[18px] border-b border-[#E6E6EA]">
            {SEGMENTS.map(({ id, label }) => {
              const on = seg === id;
              const count = (reels ?? []).filter((r) => r.status === id).length;
              return (
                <button
                  key={id}
                  onClick={() => {
                    playTap();
                    setSeg(id);
                  }}
                  className={`relative pb-[11px] -mb-px text-[14.5px] tracking-[0.1px] transition ${
                    on ? "text-[#5B34FF] font-bold" : "text-[#6B6B6B] font-semibold"
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span className="ml-1.5 text-[11px] tabular-nums opacity-70">
                      {count}
                    </span>
                  )}
                  {on && (
                    <span className="absolute left-0 right-0 -bottom-px h-[2.5px] rounded-full bg-[#5B34FF]" />
                  )}
                </button>
              );
            })}
          </div>
        </header>

        {/* Continut scrollabil */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-[22px] pt-[18px] pb-[180px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {reels === null ? (
            <div className="flex flex-col gap-3.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[120px] rounded-[18px] bg-white border border-[#E6E6EA] animate-pulse"
                />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState seg={seg} />
          ) : (
            <div className="flex flex-col gap-3.5">
              {visible.map((r) => (
                <ReelCard
                  key={r.scenarioId}
                  reel={r}
                  onOpen={() => openReel(r)}
                  onMarkPosted={() => onMarkPosted(r)}
                  onUnmarkPosted={() => onUnmarkPosted(r)}
                  onDelete={() => onDelete(r)}
                />
              ))}
            </div>
          )}
        </div>

        {/* CTA "Reel nou" — flotant deasupra tab bar */}
        <div className="absolute bottom-[92px] inset-x-0 px-[22px] z-20 bg-gradient-to-t from-[#F8F8FA] via-[#F8F8FA] to-transparent pt-7 pb-3">
          <button
            onClick={() => {
              playTap();
              nav({ to: "/explore" });
            }}
            className="w-full h-[54px] flex items-center justify-center gap-2.5 rounded-[16px] bg-[#5B34FF] text-white shadow-[0_14px_30px_-10px_rgba(91,52,255,0.7)] active:scale-[0.98] transition"
          >
            <Plus className="w-5 h-5" strokeWidth={2.4} />
            <span className="font-bold text-[16px] tracking-[0.2px]">Reel nou</span>
          </button>
        </div>

        <TabBar active="reels" />
      </div>
    </PhoneShell>
  );
}

function ReelCard({
  reel,
  onOpen,
  onMarkPosted,
  onUnmarkPosted,
  onDelete,
}: {
  reel: MyReel;
  onOpen: () => void;
  onMarkPosted: () => void;
  onUnmarkPosted: () => void;
  onDelete: () => void;
}) {
  const pct = reel.total > 0 ? Math.round((reel.done / reel.total) * 100) : 0;

  return (
    <article
      onClick={onOpen}
      className="flex gap-3.5 bg-white border border-[#E6E6EA] rounded-[18px] p-2.5 shadow-[0_10px_26px_-16px_rgba(40,24,110,0.24)] active:scale-[0.992] transition cursor-pointer"
    >
      {/* Poster 9:16 */}
      <div className="self-stretch w-[74px] shrink-0 rounded-[13px] overflow-hidden">
        {reel.cover ? (
          <img src={reel.cover} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full min-h-[112px] flex flex-col items-center justify-center gap-1.5 bg-black/[0.04] border border-dashed border-black/15 text-black/40">
            <ImageIcon className="w-5 h-5 opacity-55" />
            <span className="text-[10.5px] font-medium">Reel</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col py-1 pr-1">
        <div className="flex items-start gap-2">
          <h3
            className="flex-1 font-display font-bold text-[16.5px] leading-[1.12] tracking-[0.1px] text-[#1F1F1F]"
            style={{ textWrap: "balance" }}
          >
            {reel.title}
          </h3>
          {reel.status === "completed" && (
            <span className="shrink-0 mt-[1px] w-5 h-5 grid place-items-center rounded-full bg-[#5B34FF] text-white" aria-label="Terminat">
              <Check className="w-3 h-3" strokeWidth={3} />
            </span>
          )}
          {reel.status === "posted" && (
            <span className="shrink-0 mt-[1px] w-5 h-5 grid place-items-center rounded-full bg-[#F5B228] text-white" aria-label="Postat">
              <Play className="w-3 h-3 fill-current" />
            </span>
          )}
        </div>

        <span className="text-[12.5px] text-[#6B6B6B] font-medium mt-1.5">
          {reel.status === "posted" && reel.postedAt
            ? `Postat ${relTime(reel.postedAt)}`
            : `Actualizat ${relTime(reel.lastUpdated)}`}
        </span>

        <div className="mt-auto pt-2.5">
          {reel.status !== "posted" && (
            <>
              <div className="flex items-center justify-between mb-[7px]">
                <span className="text-[12px] font-semibold text-[#6B6B6B] tracking-[0.2px]">
                  {reel.done} / {reel.total} scene
                </span>
                <span
                  className={`text-[11.5px] font-bold ${pct === 100 ? "text-[#5B34FF]" : "text-[#6B6B6B]/80"}`}
                >
                  {pct}%
                </span>
              </div>
              <div className="h-[5px] rounded-full bg-[#EDE8FF] overflow-hidden">
                <div className="h-full rounded-full bg-[#5B34FF]" style={{ width: `${pct}%` }} />
              </div>
            </>
          )}

          {/* Actiune status */}
          {reel.status === "completed" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkPosted();
              }}
              className="mt-2.5 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#EDE8FF] text-[#5B34FF] text-[12px] font-bold active:scale-95 transition"
            >
              <Send className="w-3.5 h-3.5" strokeWidth={2} />
              Marchează postat
            </button>
          )}
          {reel.status === "posted" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUnmarkPosted();
              }}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-black/[0.04] text-[#6B6B6B] text-[12px] font-semibold active:scale-95 transition"
            >
              <Undo2 className="w-3.5 h-3.5" strokeWidth={2} />
              Anulează postare
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="mt-2.5 ml-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#FDECEC] text-[#E5484D] text-[12px] font-semibold active:scale-95 transition"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
            Șterge
          </button>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ seg }: { seg: ReelStatus }) {
  const copy: Record<ReelStatus, string> = {
    draft: "Reel-urile pe care le începi vor apărea aici.",
    completed: "Reel-urile cu toate scenele filmate apar aici.",
    posted: "Marchează un reel terminat ca postat și apare aici.",
  };
  return (
    <div className="flex flex-col items-center justify-center text-center pt-[70px] px-8">
      <span className="w-[58px] h-[58px] grid place-items-center rounded-[18px] bg-[#EDE8FF] text-[#5B34FF]">
        <Film className="w-7 h-7" strokeWidth={1.6} />
      </span>
      <p className="font-display font-bold text-[17px] text-[#1F1F1F] mt-4">
        Niciun reel încă
      </p>
      <p className="text-[13px] text-[#6B6B6B] mt-1.5 leading-[1.45]">{copy[seg]}</p>
    </div>
  );
}
