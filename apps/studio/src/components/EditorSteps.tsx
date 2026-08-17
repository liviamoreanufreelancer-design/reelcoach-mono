"use client";
/**
 * EditorSteps — cei doi pași ai editorului de sesiune.
 *
 *   1. Rezultate   ce postări ies din serviciu (importate din bibliotecă)
 *   2. Momente     ce trebuie filmat — GENERAT din cadrele rezultatelor
 *
 * Ordinea s-a inversat odată cu modelul: momentele nu se mai scriu, se deduc.
 * Cu „Momente" pe primul loc, primul lucru pe care îl vedea partenera era o
 * listă goală pe care nu putea s-o completeze — nimic nu poate apărea acolo
 * până nu importă un rezultat.
 *
 * Ordinea sugerează fluxul, dar NU blochează: orice pas e accesibil oricând.
 * Partenera se întoarce des la un detaliu fără să vrea să reia tot, iar un
 * wizard care o obligă să completeze în ordine ar fi enervant exact în cazul
 * cel mai frecvent.
 */
import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";

type Step = {
  id: number;
  label: string;
  hint: string;
  /** Ce s-a completat deja la pasul ăsta — arătat ca număr, nu ca bifă de „gata". */
  count: number;
  content: ReactNode;
};

export default function EditorSteps({
  momente,
  rezultate,
  momenteCount,
  outputsCount,
}: {
  momente: ReactNode;
  rezultate: ReactNode;
  momenteCount: number;
  outputsCount: number;
}) {
  const [active, setActive] = useState(1);

  const steps: Step[] = [
    {
      id: 1,
      label: "Rezultate",
      hint: "Ce postări ies din serviciu",
      count: outputsCount,
      content: rezultate,
    },
    {
      id: 2,
      label: "Momente",
      hint: "Ce se filmează — generat din rezultate",
      count: momenteCount,
      content: momente,
    },
  ];

  const current = steps.find((s) => s.id === active) ?? steps[0];

  return (
    <div className="flex flex-col gap-5">
      {/* Bara de pași — toate sunt clicabile, mereu */}
      <nav aria-label="Pașii editorului" className="flex gap-2">
        {steps.map((s) => {
          const isActive = s.id === active;
          const done = s.count > 0;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(s.id)}
              aria-current={isActive ? "step" : undefined}
              className={`flex-1 text-left rounded-xl border px-3.5 py-2.5 transition ${
                isActive
                  ? "bg-[#5B34FF] border-[#5B34FF] text-white"
                  : "bg-white border-[#E7E3F5] text-[#1F1F1F] hover:border-[#D8D0F5]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 shrink-0 grid place-items-center rounded-full text-[11px] font-semibold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : done
                        ? "bg-[#5B34FF] text-white"
                        : "bg-[#EDE8FF] text-[#5B34FF]"
                  }`}
                >
                  {done && !isActive ? <Check className="w-3 h-3" strokeWidth={3} /> : s.id}
                </span>
                <span className="text-[13.5px] font-semibold truncate">{s.label}</span>
                {s.count > 0 && (
                  <span
                    className={`ml-auto text-[11px] tabular-nums ${
                      isActive ? "text-white/75" : "text-[#9A9A9A]"
                    }`}
                  >
                    {s.count}
                  </span>
                )}
              </div>
              <p
                className={`text-[11px] mt-1 leading-snug ${
                  isActive ? "text-white/75" : "text-[#9A9A9A]"
                }`}
              >
                {s.hint}
              </p>
            </button>
          );
        })}
      </nav>

      <div>{current.content}</div>

      {/* Navigare înainte/înapoi — comodă, dar nu obligatorie */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActive((s) => Math.max(1, s - 1))}
          disabled={active === 1}
          className="btn-glass text-[12.5px] px-4 py-2 disabled:opacity-0"
        >
          ← {steps[active - 2]?.label ?? ""}
        </button>
        <button
          type="button"
          onClick={() => setActive((s) => Math.min(2, s + 1))}
          disabled={active === 2}
          className="btn-glass text-[12.5px] px-4 py-2 disabled:opacity-0"
        >
          {steps[active]?.label ?? ""} →
        </button>
      </div>
    </div>
  );
}
