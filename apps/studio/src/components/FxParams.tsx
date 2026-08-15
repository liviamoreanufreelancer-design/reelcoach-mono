"use client";
/**
 * FxParams — reglajele unui efect, generate din schema lui.
 *
 * Nu există cod de interfață per efect. Fiecare efect își declară parametrii
 * în `packages/reel-core/src/fx/`, iar componenta asta îi desenează. Altfel
 * fiecare efect nou ar fi cerut și un formular scris de mână, și la douăzeci
 * de efecte am fi reconstruit exact problema pe care registry-ul o rezolvă.
 *
 * Consecința practică pentru parteneră: un efect adăugat de Liv apare cu
 * reglajele lui complete, fără o versiune de Studio în plus.
 */
import type { ParamDef } from "@reelcoach/core";

export type FxValues = Record<string, number | string | boolean>;

export default function FxParams({
  schema,
  values,
  onChange,
  disabled,
}: {
  schema: Record<string, ParamDef>;
  values: FxValues;
  onChange: (next: FxValues) => void;
  disabled?: boolean;
}) {
  const keys = Object.keys(schema);
  if (keys.length === 0) return null;

  const set = (key: string, v: number | string | boolean) =>
    onChange({ ...values, [key]: v });

  return (
    <div className="mt-2 pl-3 border-l-2 border-[#EDE8FF] flex flex-col gap-2.5">
      {keys.map((key) => {
        const p = schema[key];

        if (p.kind === "number") {
          // Valoarea curentă sau implicitul efectului — niciodată gol, ca
          // glisorul să nu sară în stânga la prima atingere.
          const v = typeof values[key] === "number" ? (values[key] as number) : p.default;
          return (
            <label key={key} className="block">
              <span className="flex items-baseline justify-between text-[11px] text-[#6B6B6B]">
                {p.label}
                <span className="tabular-nums text-[#9A9A9A]">
                  {v}
                  {p.unit ?? ""}
                </span>
              </span>
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={v}
                disabled={disabled}
                onChange={(e) => set(key, Number(e.target.value))}
                className="w-full accent-[#5B34FF] mt-0.5"
              />
            </label>
          );
        }

        if (p.kind === "choice") {
          const v = typeof values[key] === "string" ? (values[key] as string) : p.default;
          return (
            <label key={key} className="block">
              <span className="block text-[11px] text-[#6B6B6B] mb-1">{p.label}</span>
              <div className="flex gap-1 flex-wrap">
                {p.options.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => set(key, o.value)}
                    className={`px-2.5 py-1 rounded-md text-[11.5px] border transition disabled:opacity-40 ${
                      v === o.value
                        ? "bg-[#5B34FF] border-[#5B34FF] text-white"
                        : "bg-white border-[#E7E3F5] text-[#1F1F1F] hover:border-[#D8D0F5]"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </label>
          );
        }

        const v = typeof values[key] === "boolean" ? (values[key] as boolean) : p.default;
        return (
          <label key={key} className="flex items-center gap-2 text-[11.5px] text-[#1F1F1F]">
            <input
              type="checkbox"
              checked={v}
              disabled={disabled}
              onChange={(e) => set(key, e.target.checked)}
              className="accent-[#5B34FF]"
            />
            {p.label}
          </label>
        );
      })}
    </div>
  );
}
