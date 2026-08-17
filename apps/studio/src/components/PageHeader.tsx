/**
 * PageHeader — aceeași formă pe fiecare ecran de listă.
 *
 * Titlu în stânga, acțiunea principală lângă el, explicația dedesubt, lista
 * mai jos. Înveți o dată, merge peste tot.
 *
 * Înainte, fiecare ecran avea altă formă: la Sesiuni erau patru butoane
 * înghesuite (trei fiind de fapt navigație), la Materiale butonul era peste
 * filtre, la catalog câmpul de adăugare era jos de tot. Trei ecrane, trei
 * locuri unde cauți „cum adaug ceva".
 *
 * E regula pe care WordPress o ține de douăzeci de ani: „Add New" e mereu
 * lângă titlu, cu aceleași cuvinte. Consistența bate ingeniozitatea.
 */
import type { ReactNode } from "react";

export default function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  /** Acțiunea principală — una singură. Navigația stă în bara laterală. */
  action?: ReactNode;
}) {
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="text-[26px] font-semibold text-[#1F1F1F] leading-tight mt-1">
            {title}
          </h1>
        </div>
        {action}
      </div>
      <p className="text-[13px] text-[#6B6B6B] leading-relaxed max-w-[640px] mt-2.5">
        {description}
      </p>
    </header>
  );
}
