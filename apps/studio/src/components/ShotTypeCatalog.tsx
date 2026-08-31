"use client";
/**
 * ShotTypeCatalog — cele ~22 de tipuri de cadru, cu instrucțiunile lor.
 *
 * Fiecare tip se deschide și se completează pe loc. Câmpul care contează cel
 * mai mult e propoziția de acțiune: „Apropie-te de folii" bate „Prim-plan
 * folii, distanță mică", fiindcă prima e o acțiune, a doua cere traducere —
 * iar stilista o citește în trei secunde, cu clienta pe scaun.
 *
 * Tipurile fără propoziție sunt marcate. Nu blochează nimic — un tip
 * funcționează și gol — dar semnalul arată unde a rămas munca.
 */
import { useState, useTransition } from "react";
import { ChevronDown, Plus, Trash2, AlertCircle, Video, Images, Camera } from "lucide-react";
import { createShotType, updateShotType, deleteShotType } from "@/lib/template-actions";
import { VERTICALS, verticalOf, inVertical, type Vertical } from "@/lib/verticals";
import type { CaptureKind, ShotType } from "@/lib/db-types";

const HOLDS = [
  { id: "hand", label: "În mână" },
  { id: "tripod", label: "Pe stativ" },
];
const DISTANCES = [
  { id: "palm", label: "La o palmă" },
  { id: "arm", label: "Un braț" },
  { id: "step", label: "Un pas" },
  { id: "two_steps", label: "Doi pași" },
];
const MOVES = [
  { id: "fixed", label: "Fix" },
  { id: "follow", label: "Urmărire" },
  { id: "pan", label: "Panoramare" },
  { id: "zoom", label: "Zoom" },
];
const KINDS: { id: CaptureKind; label: string; Icon: typeof Video }[] = [
  { id: "video", label: "Filmare", Icon: Video },
  { id: "photo", label: "Poză", Icon: Images },
  { id: "both", label: "Amândouă", Icon: Camera },
];

export default function ShotTypeCatalog({ initial }: { initial: ShotType[] }) {
  const [types, setTypes] = useState(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const missing = types.filter((t) => !t.hook).length;

  // Două foldere. Momentele partajate apar în amândouă — e același rând
  // afișat de două ori, nu două copii, deci o modificare se vede în ambele.
  const folders: { id: Vertical; label: string; list: ShotType[] }[] = [
    { id: "par", label: "Păr", list: inVertical(types, "par") },
    { id: "machiaj", label: "Machiaj", list: inVertical(types, "machiaj") },
  ];

  const patch = (id: string, p: Partial<ShotType>) => {
    setTypes((cur) => cur.map((t) => (t.id === id ? { ...t, ...p } : t)));
    setError(null);
    startTransition(async () => {
      const res = await updateShotType(id, p as Parameters<typeof updateShotType>[1]);
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <div>
      {error && (
        <p className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      {missing > 0 && (
        <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {missing} {missing === 1 ? "tip n-are" : "tipuri n-au"} încă propoziția de
          acțiune — stilista le va vedea fără instrucțiuni.
        </p>
      )}

      <div className="flex flex-col gap-8">
        {folders.map((folder) => (
          <section key={folder.id}>
            <div className="flex items-baseline gap-2.5 mb-3">
              <h2 className="text-[10px] tracking-[0.22em] uppercase text-[#5B34FF]/85 font-bold">
                {folder.label}
              </h2>
              <span className="text-[11.5px] text-[#9A9A9A]">
                {folder.list.length} {folder.list.length === 1 ? "moment" : "momente"}
              </span>
            </div>

            {folder.list.length === 0 ? (
              <p className="text-[12.5px] text-[#6B6B6B] py-2">
                Niciun moment aici încă.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {folder.list.map((t) => (
                  <TypeRow
                    // Cheia poartă folderul: același moment apare în amândouă.
                    key={`${folder.id}:${t.id}`}
                    type={t}
                    shared={verticalOf(t) === "ambele"}
                    open={openId === `${folder.id}:${t.id}`}
                    onToggle={() =>
                      setOpenId(openId === `${folder.id}:${t.id}` ? null : `${folder.id}:${t.id}`)
                    }
                    onPatch={(p) => patch(t.id, p)}
                    onDelete={() => {
                      if (!confirm(`Ștergi „${t.name}"? Reelurile care îl folosesc rămân fără instrucțiuni.`)) return;
                      startTransition(async () => {
                        const res = await deleteShotType(t.id);
                        if (!res.ok) { setError(res.error); return; }
                        setTypes((cur) => cur.filter((x) => x.id !== t.id));
                      });
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Moment nou…"
          className="input !mb-0 flex-1"
        />
        <button
          type="button"
          disabled={!newName.trim() || pending}
          onClick={() => {
            const name = newName.trim();
            setNewName("");
            startTransition(async () => {
              // Fără verticală aleasă, momentul nou intră în „ambele": se
              // vede în ambele foldere, deci nu se poate pierde.
              const res = await createShotType(name, "ambele");
              if (!res.ok) { setError(res.error); return; }
              setTypes((cur) => [
                ...cur,
                {
                  id: res.id, name, family: "ambele", hook: null, instructions: [],
                  phone_hold: null, shot_distance: null, phone_movement: null,
                  light_sources: [], capture_kind: "video", example_image_url: null,
                  sort_order: (cur[cur.length - 1]?.sort_order ?? 0) + 10,
                },
              ]);
              setOpenId(`par:${res.id}`);
            });
          }}
          className="btn-champagne shrink-0 inline-flex items-center gap-1.5 disabled:opacity-40"
        >
          <Plus className="w-4 h-4" /> Adaugă
        </button>
      </div>
    </div>
  );
}

/**
 * Un moment din catalog, cu editorul lui.
 *
 * `shared` marchează momentele care apar în ambele foldere. E același rând de
 * date afișat de două ori, nu două copii — de asta eticheta: ca să se vadă că
 * modificarea le atinge pe amândouă.
 */
function TypeRow({
  type: t, shared, open, onToggle, onPatch, onDelete,
}: {
  type: ShotType;
  shared: boolean;
  open: boolean;
  onToggle: () => void;
  onPatch: (p: Partial<ShotType>) => void;
  onDelete: () => void;
}) {
  const Icon = KINDS.find((k) => k.id === t.capture_kind)?.Icon ?? Video;

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F8F8FA] transition"
      >
        <Icon className="w-4 h-4 text-[#9A9A9A] shrink-0" strokeWidth={1.8} />
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className="text-[13.5px] font-medium text-[#1F1F1F] truncate">{t.name}</span>
            {shared && (
              <span
                title="Apare și la păr, și la machiaj — o modificare le atinge pe amândouă"
                className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-[#EDE8FF] text-[#5B34FF]"
              >
                partajat
              </span>
            )}
          </span>
          <span className="block text-[11.5px] text-[#9A9A9A] truncate mt-0.5">
            {t.hook || "fără propoziție de acțiune"}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-[#9A9A9A] shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 border-t border-[#E7E3F5] flex flex-col gap-3.5">
          <div className="flex gap-2">
            <input
              defaultValue={t.name}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== t.name) onPatch({ name: v });
              }}
              className="input flex-1 !mb-0 font-medium"
              aria-label="Numele momentului"
            />
            <button
              type="button"
              onClick={onDelete}
              aria-label="Șterge momentul"
              className="shrink-0 w-9 rounded-lg text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100"
            >
              <Trash2 className="w-4 h-4 mx-auto" />
            </button>
          </div>

          <div>
            <label className="label">Unde apare</label>
            <div className="flex gap-1.5">
              {VERTICALS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onPatch({ family: v.id })}
                  title={v.hint}
                  className={`px-3 py-1.5 rounded-md text-[12px] border transition ${
                    verticalOf(t) === v.id
                      ? "bg-[#5B34FF] border-[#5B34FF] text-white"
                      : "bg-white border-[#E7E3F5] text-[#1F1F1F] hover:border-[#D8D0F5]"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">
              Propoziția de acțiune{" "}
              <span className="text-[#9A9A9A] normal-case tracking-normal">
                (verbul întâi: „Apropie-te de folii")
              </span>
            </label>
            <input
              defaultValue={t.hook ?? ""}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (t.hook ?? "")) onPatch({ hook: v || null });
              }}
              placeholder="Apropie-te de folii"
              className="input"
            />
          </div>

          <div>
            <label className="label">Ce se capturează</label>
            <div className="flex gap-1.5">
              {KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => onPatch({ capture_kind: k.id })}
                  className={`px-3 py-1.5 rounded-md text-[12px] border transition inline-flex items-center gap-1.5 ${
                    t.capture_kind === k.id
                      ? "bg-[#5B34FF] border-[#5B34FF] text-white"
                      : "bg-white border-[#E7E3F5] text-[#1F1F1F] hover:border-[#D8D0F5]"
                  }`}
                >
                  <k.Icon className="w-3.5 h-3.5" strokeWidth={1.8} /> {k.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#9A9A9A] mt-1.5 leading-snug">
              E un minim: dacă un carusel cere momentul, poza se adaugă singură.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Choice label="Telefonul" options={HOLDS} value={t.phone_hold}
              onPick={(v) => onPatch({ phone_hold: v })} />
            <Choice label="Distanța" options={DISTANCES} value={t.shot_distance}
              onPick={(v) => onPatch({ shot_distance: v })} />
            <Choice label="Mișcarea" options={MOVES} value={t.phone_movement}
              onPick={(v) => onPatch({ phone_movement: v })} />
          </div>

          <div>
            <label className="label">
              Detalii{" "}
              <span className="text-[#9A9A9A] normal-case tracking-normal">
                (câte unul pe linie — apar înainte de filmare)
              </span>
            </label>
            <textarea
              defaultValue={t.instructions.join("\n")}
              onBlur={(e) => {
                const next = e.target.value.split("\n").map((x) => x.trim()).filter(Boolean);
                if (next.join("\n") !== t.instructions.join("\n")) onPatch({ instructions: next });
              }}
              rows={3}
              className="input resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="label">
              Ordinea la filmare{" "}
              <span className="text-[#9A9A9A] normal-case tracking-normal">
                (mai mic = mai devreme în serviciu)
              </span>
            </label>
            <input
              type="number"
              defaultValue={t.sort_order}
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v !== t.sort_order) onPatch({ sort_order: v });
              }}
              className="input sm:max-w-[140px]"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Choice({
  label, options, value, onPick,
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string | null;
  onPick: (v: string | null) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select
        value={value ?? ""}
        onChange={(e) => onPick(e.target.value || null)}
        className="input !mb-0 text-[12.5px]"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
