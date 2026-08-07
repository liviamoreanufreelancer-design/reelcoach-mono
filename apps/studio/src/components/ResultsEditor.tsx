"use client";
/**
 * ResultsEditor — pasul 2: rezultatele sesiunii.
 *
 * Sus, o grilă de cartonașe: fiecare rezultat are FORMA formatului său, cu un
 * cadru-copertă desenat din momentele lui. Se vede dintr-o privire ce iese din
 * șablon, fără să citești o listă de nume. Click pe cartonaș → editorul de
 * dedesubt. Un singur rezultat deschis odată: nouă editoare desfășurate ar
 * însemna nouă video-uri în memorie și un kilometru de derulat.
 *
 * Formele sunt distincte pentru că spun adevărul despre conținut:
 *    reel    un dreptunghi 9:16          o postare
 *    story   teanc de 9:16               mai multe, verticale
 *    carusel teanc de 4:5                mai multe, pătrate
 * Fără teanc, reel-ul și story-ul ar arăta identic — adică tot o listă de
 * nume, doar mai mare.
 *
 * NU e o grilă cu număr fix de locuri. Se afișează ce există, plus un cartonaș
 * de adăugare per tip. Un număr fix ar fi un numitor, iar un numitor spune că
 * ai eșuat când n-ai eșuat: o manichiură dă legitim 2 reeluri, nu 3, și
 * al treilea loc gol ar împinge-o pe parteneră să inventeze conținut ca să
 * umple grila. Aceeași regulă ca „niciodată zero, fără numitor" de la stilistă.
 *
 * Editorul propriu-zis funcționează ca cel de momente: adaugi momente,
 * editezi pe loc, la final randezi și vezi tot. Lista de momente e ȘI
 * selectorul editorului — un singur loc unde alegi la ce lucrezi.
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { Plus, X, Film, Images, Layers, Image as ImageIcon } from "lucide-react";
import {
  createOutput,
  updateOutput,
  deleteOutput,
} from "@/lib/template-actions";
import { FILTERS } from "@/lib/options";
import type { OutputRow, OutputKind, OutputSlot, ShotRow } from "@/lib/db-types";
import OutputSceneEditor from "./OutputSceneEditor";
import OutputReelPreview from "./OutputReelPreview";
import OutputCover from "./OutputCover";

type KindMeta = {
  id: OutputKind;
  label: string;
  hint: string;
  Icon: typeof Film;
  /** Forma cartonașului: raportul cadrului… */
  aspect: number;
  /** …și dacă e o postare sau mai multe. */
  stacked: boolean;
};

const KINDS: KindMeta[] = [
  { id: "reel", label: "Reel", hint: "Montaj video din mai multe momente", Icon: Film, aspect: 9 / 16, stacked: false },
  { id: "carousel", label: "Carusel", hint: "Set de imagini", Icon: Images, aspect: 4 / 5, stacked: true },
  { id: "stories", label: "Story-uri", hint: "Momentele brute, fără montaj", Icon: Layers, aspect: 9 / 16, stacked: true },
];

const metaOf = (kind: OutputKind) => KINDS.find((k) => k.id === kind) ?? KINDS[0];

/** Lățimea unui cartonaș. Înălțimea vine din raport, deci diferă între tipuri. */
const TILE = 132;

export default function ResultsEditor({
  templateId,
  shots,
  outputs,
  disabled,
}: {
  templateId: string;
  shots: ShotRow[];
  outputs: OutputRow[];
  disabled: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(outputs[0]?.id ?? null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const withKey = shots.filter((s) => s.slot_key);
  const selected = outputs.find((o) => o.id === openId) ?? null;

  const add = (kind: OutputKind) => {
    setError(null);
    startTransition(async () => {
      try {
        await createOutput(templateId, `${metaOf(kind).label} nou`, kind);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <p className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {withKey.length === 0 && (
        <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-snug">
          Momentele n-au încă etichete. Completează „Eticheta momentului" la pasul
          <strong> Momente</strong> — cu ele se construiesc rezultatele.
        </p>
      )}

      {/* Grila — ce iese din sesiune, in forma in care iese */}
      <div className="flex flex-wrap items-start gap-x-4 gap-y-5 pt-2">
        {outputs.map((o) => (
          <ResultTile
            key={o.id}
            output={o}
            shots={shots}
            selected={o.id === openId}
            onClick={() => setOpenId(o.id)}
          />
        ))}

        {KINDS.map((k) => (
          <AddTile
            key={k.id}
            meta={k}
            disabled={disabled || pending}
            onClick={() => add(k.id)}
          />
        ))}
      </div>

      {selected && (
        <ResultCard
          key={selected.id}
          output={selected}
          shots={shots}
          templateId={templateId}
          disabled={disabled}
          onDeleted={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

/** Cartonașul unui rezultat: forma formatului + cadrul-copertă. */
function ResultTile({
  output,
  shots,
  selected,
  onClick,
}: {
  output: OutputRow;
  shots: ShotRow[];
  selected: boolean;
  onClick: () => void;
}) {
  const meta = metaOf(output.kind);
  const n = output.slots.length;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ width: TILE }}
      className="text-left group shrink-0"
      aria-pressed={selected}
    >
      {/* pr/pt lasa loc teancului sa iasa din spate fara sa fie taiat */}
      <div className="relative pr-2 pt-2">
        <div className="relative w-full" style={{ aspectRatio: `${meta.aspect}` }}>
          {meta.stacked && (
            <>
              <span
                aria-hidden
                className="absolute inset-0 rounded-[10px] bg-white border border-[#E7E3F5]"
                style={{ transform: "translate(8px, -8px)" }}
              />
              <span
                aria-hidden
                className="absolute inset-0 rounded-[10px] bg-white border border-[#E7E3F5]"
                style={{ transform: "translate(4px, -4px)" }}
              />
            </>
          )}
          <div
            className={`absolute inset-0 rounded-[10px] overflow-hidden border-2 transition ${
              selected
                ? "border-[#5B34FF] shadow-[0_2px_14px_rgba(91,52,255,0.22)]"
                : "border-transparent group-hover:border-[#D8D0F5]"
            }`}
          >
            <OutputCover output={output} shots={shots} aspect={meta.aspect} />
          </div>
        </div>
      </div>

      <div className="mt-2 px-0.5">
        <div
          className={`text-[12.5px] font-medium leading-tight truncate ${
            selected ? "text-[#5B34FF]" : "text-[#1F1F1F]"
          }`}
        >
          {output.name}
        </div>
        <div className="text-[10.5px] text-[#9A9A9A] mt-0.5 inline-flex items-center gap-1">
          <meta.Icon className="w-3 h-3" strokeWidth={1.8} />
          {n} {n === 1 ? "moment" : "momente"}
        </div>
      </div>
    </button>
  );
}

/** Cartonaș-fantomă: aceeași formă, dar gol. Invitație, nu restanță. */
function AddTile({
  meta,
  disabled,
  onClick,
}: {
  meta: KindMeta;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={meta.hint}
      style={{ width: TILE }}
      className="text-left group shrink-0 disabled:opacity-40"
    >
      <div className="relative pr-2 pt-2">
        <div
          className="relative w-full rounded-[10px] border-2 border-dashed border-[#D8D0F5] bg-[#FBFAFF] grid place-items-center group-hover:border-[#5B34FF] group-hover:bg-[#F6F4FE] transition"
          style={{ aspectRatio: `${meta.aspect}` }}
        >
          <Plus className="w-5 h-5 text-[#5B34FF]" strokeWidth={2} />
        </div>
      </div>
      <div className="mt-2 px-0.5 text-[12.5px] font-medium text-[#5B34FF] leading-tight">
        {meta.label}
      </div>
    </button>
  );
}

function ResultCard({
  output,
  shots,
  templateId,
  disabled,
  onDeleted,
}: {
  output: OutputRow;
  shots: ShotRow[];
  templateId: string;
  disabled: boolean;
  onDeleted: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(output.filter ?? "");
  const [slots, setSlots] = useState<OutputSlot[]>(output.slots);
  const [coverSlot, setCoverSlot] = useState<string | null>(output.cover_slot);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showRender, setShowRender] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setSlots(output.slots); }, [output.slots]);
  useEffect(() => { setCoverSlot(output.cover_slot); }, [output.cover_slot]);

  const meta = metaOf(output.kind);
  const isVideo = output.kind === "reel";
  const options = shots.filter((s) => s.slot_key);
  const titleOf = (key: string) => shots.find((s) => s.slot_key === key)?.title || key;

  const live: OutputRow = { ...output, filter: filter || null, slots, cover_slot: coverSlot };
  const used = new Set(slots.map((s) => s.slot));
  const available = options.filter((o) => !used.has(o.slot_key as string));
  const totalSec = slots.reduce((sum, s) => sum + (s.sec ?? 0), 0);
  /** Coperta efectivă: ce a ales ea, altfel primul moment. */
  const effectiveCover = slots.some((s) => s.slot === coverSlot) ? coverSlot : slots[0]?.slot ?? null;

  const save = (patch: Parameters<typeof updateOutput>[2]) => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await updateOutput(output.id, templateId, patch);
        if (res && !res.ok) setError(res.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  /** Scriere locală imediată + salvare amânată, ca editorul să nu se blocheze. */
  const writeSlots = (next: OutputSlot[]) => {
    setSlots(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save({ slots: next }), 600);
  };

  const addSlot = (key: string) => {
    writeSlots([...slots, { slot: key, sec: 2 }]);
    setActiveIdx(slots.length);
  };
  const removeSlot = (i: number) => {
    writeSlots(slots.filter((_, x) => x !== i));
    setActiveIdx((cur) => Math.max(0, Math.min(cur, slots.length - 2)));
  };
  const moveSlot = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= slots.length) return;
    const next = [...slots];
    [next[i], next[j]] = [next[j], next[i]];
    writeSlots(next);
    setActiveIdx(j);
  };
  const pickCover = (key: string) => {
    setCoverSlot(key);
    save({ cover_slot: key });
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E7E3F5]">
        <span className="w-9 h-9 shrink-0 grid place-items-center rounded-[11px] bg-[#EDE8FF] text-[#5B34FF]">
          <meta.Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[14.5px] font-semibold text-[#1F1F1F] truncate">
            {output.name}
          </span>
          <span className="block text-[11.5px] text-[#9A9A9A]">
            {meta.label} · {slots.length} {slots.length === 1 ? "moment" : "momente"}
            {isVideo && totalSec > 0 ? ` · ~${totalSec.toFixed(1)}s` : ""}
          </span>
        </span>
        {pending && (
          <span className="text-[9px] tracking-[0.2em] uppercase text-[#9A9A9A]">salvez…</span>
        )}
      </div>

      <div className="px-5 pb-5 pt-4 flex flex-col gap-4">
        {error && (
          <p className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Nume + stergere */}
        <div className="flex gap-2">
          <input
            type="text"
            defaultValue={output.name}
            onBlur={(e) => {
              if (e.target.value !== output.name) save({ name: e.target.value });
            }}
            className="input flex-1 !mb-0 font-medium"
            disabled={disabled}
          />
          <button
            type="button"
            onClick={() => {
              if (!confirm(`Ștergi „${output.name}"? Momentele filmate rămân neatinse.`)) return;
              startTransition(async () => {
                await deleteOutput(output.id, templateId);
                onDeleted();
              });
            }}
            disabled={disabled}
            aria-label="Șterge rezultatul"
            className="shrink-0 w-9 rounded-lg text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 disabled:opacity-40 text-[15px]"
          >
            ×
          </button>
        </div>

        {/* Momentele: lista E si selectorul pentru editorul de dedesubt */}
        <div>
          <div className="text-[10px] tracking-[0.18em] uppercase text-[#9A9A9A] mb-1.5">
            Momentele acestui rezultat
          </div>

          {slots.length === 0 ? (
            <p className="text-[11.5px] text-[#9A9A9A] py-1.5">
              Niciunul încă. Adaugă mai jos și îl vezi imediat.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {slots.map((s, i) => {
                const known = options.some((o) => o.slot_key === s.slot);
                const active = i === activeIdx;
                const isCover = s.slot === effectiveCover;
                return (
                  <div
                    key={`${s.slot}-${i}`}
                    onClick={() => setActiveIdx(i)}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 border cursor-pointer transition ${
                      active
                        ? "bg-[#EDE8FF] border-[#5B34FF]"
                        : "bg-white border-[#E7E3F5] hover:border-[#D8D0F5]"
                    }`}
                  >
                    <span className="text-[10px] text-[#9A9A9A] tabular-nums w-4">{i + 1}</span>
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveSlot(i, -1); }}
                        disabled={disabled || i === 0}
                        aria-label="Mai sus"
                        className="text-[#9A9A9A] hover:text-[#5B34FF] disabled:opacity-25 leading-none text-[10px]"
                      >▲</button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveSlot(i, 1); }}
                        disabled={disabled || i === slots.length - 1}
                        aria-label="Mai jos"
                        className="text-[#9A9A9A] hover:text-[#5B34FF] disabled:opacity-25 leading-none text-[10px]"
                      >▼</button>
                    </div>
                    <span className="flex-1 min-w-0 text-[12.5px] truncate">
                      {titleOf(s.slot)}
                      {!known && (
                        <span className="text-rose-600 ml-1.5 text-[11px]">(momentul nu mai există)</span>
                      )}
                    </span>
                    {isVideo && s.sec ? (
                      <span className="text-[11px] text-[#6B6B6B] tabular-nums">{s.sec}s</span>
                    ) : null}
                    {/* Coperta: o apasare, nu un fisier de urcat */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); pickCover(s.slot); }}
                      disabled={disabled}
                      title={isCover ? "Momentul care dă coperta" : "Folosește acest moment ca imagine de copertă"}
                      aria-label="Folosește ca imagine de copertă"
                      aria-pressed={isCover}
                      className={`shrink-0 transition disabled:opacity-40 ${
                        isCover ? "text-[#5B34FF]" : "text-[#C9C0E8] hover:text-[#5B34FF]"
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" strokeWidth={isCover ? 2.4 : 1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeSlot(i); }}
                      disabled={disabled}
                      aria-label="Scoate momentul"
                      className="shrink-0 text-[#C88] hover:text-[#A44] disabled:opacity-40"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {available.length > 0 && (
            <select
              value=""
              onChange={(e) => { if (e.target.value) addSlot(e.target.value); e.target.value = ""; }}
              disabled={disabled}
              className="input !mb-0 text-[12px] mt-2"
            >
              <option value="">+ Adaugă moment…</option>
              {available.map((o) => (
                <option key={o.slot_key} value={o.slot_key as string}>
                  {o.title}
                  {o.capture_kind === "photo" ? " (poză)" : o.capture_kind === "both" ? " (filmare + poză)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Editare moment / rezultat randat — in acelasi loc */}
        {slots.length > 0 && isVideo && (
          <>
            <div className="flex gap-1 p-0.5 bg-[#F6F4FE] rounded-lg self-start">
              <button
                type="button"
                onClick={() => setShowRender(false)}
                className={`px-4 py-1.5 rounded-md text-[12px] transition ${
                  !showRender ? "bg-white text-[#1F1F1F] font-medium shadow-sm" : "text-[#6B6B6B]"
                }`}
              >
                Editare
              </button>
              <button
                type="button"
                onClick={() => setShowRender(true)}
                className={`px-4 py-1.5 rounded-md text-[12px] transition ${
                  showRender ? "bg-white text-[#1F1F1F] font-medium shadow-sm" : "text-[#6B6B6B]"
                }`}
              >
                Vezi tot rezultatul
              </button>
            </div>

            {showRender ? (
              <div className="flex justify-center">
                <OutputReelPreview output={live} shots={shots} />
              </div>
            ) : (
              <OutputSceneEditor
                output={live}
                shots={shots}
                idx={Math.min(activeIdx, slots.length - 1)}
                onChangeSlots={writeSlots}
                disabled={disabled}
              />
            )}
          </>
        )}

        {slots.length > 0 && !isVideo && (
          <p className="text-[12px] text-[#9A9A9A] py-4 text-center leading-snug">
            Editorul pentru {meta.label.toLowerCase()} vine separat.
          </p>
        )}

        {/* Filtru pentru tot rezultatul + descrierea postarii */}
        <div className="pt-1 border-t border-[#E7E3F5] flex flex-col gap-4">
          <div>
            <label className="label">
              Filtru{" "}
              <span className="text-[#9A9A9A] normal-case tracking-normal">
                (pentru tot rezultatul)
              </span>
            </label>
            <select
              value={filter}
              onChange={(e) => { setFilter(e.target.value); save({ filter: e.target.value || null }); }}
              disabled={disabled}
              className="input sm:max-w-[280px]"
            >
              <option value="">Fără filtru</option>
              {FILTERS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">
              Descriere pentru Instagram / TikTok{" "}
              <span className="text-[#9A9A9A] normal-case tracking-normal">
                (textul de sub postare — NU apare pe video)
              </span>
            </label>
            <textarea
              defaultValue={output.caption ?? ""}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (output.caption ?? "")) save({ caption: v || null });
              }}
              rows={3}
              placeholder="Balayage cald pe bază naturală… #balayage #parfrumos"
              disabled={disabled}
              className="input resize-none leading-relaxed"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
