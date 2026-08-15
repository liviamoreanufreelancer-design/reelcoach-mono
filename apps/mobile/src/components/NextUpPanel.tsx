/**
 * NextUpPanel — ce urmează, imediat după ce un moment a fost salvat.
 *
 * Sesiunea e răspândită pe trei ore, nu pe trei minute: filmează un moment, se
 * întoarce la lucru, revine peste douăzeci de minute. Între cele două, singurul
 * lucru care contează e să știe LA CE se întoarce — altfel deschide appul și
 * trebuie să-și amintească singură unde rămăsese.
 *
 * De asta panoul are două ieșiri egale, nu una:
 *   „Filmez acum"      — momentele lipite (before → aplicare)
 *   „Revin mai târziu" — cazul obișnuit, când urmează 20 de minute de lucru
 *
 * Un singur buton „continuă" ar presupune că filmează în șir, ceea ce nu se
 * întâmplă. Ieșirea spre casă nu e abandon, e felul normal de a lucra.
 *
 * Momentul următor se arată cu propoziția partenerei și cu imaginea lui —
 * atenția de aici e „după (2s)" din CLAUDE.md: destul cât să citească o linie
 * și să vadă o poză, nu o listă.
 */
import { Check, ArrowRight, Clock } from "lucide-react";
import type { Scene } from "@/data/scenarios";

export function NextUpPanel({
  next,
  remaining,
  onContinue,
  onLater,
}: {
  /** Momentul următor. */
  next: Scene;
  /** Câte momente mai sunt după cel curent, inclusiv el. */
  remaining: number;
  onContinue: () => void;
  onLater: () => void;
}) {
  return (
    <div className="mt-3 rounded-2xl bg-white/[0.07] border border-white/12 overflow-hidden">
      <div className="px-4 pt-3 pb-2.5 flex items-center gap-2 border-b border-white/8">
        <Check className="w-4 h-4 text-emerald-300" strokeWidth={2.4} />
        <span className="text-[12.5px] text-emerald-300/90 font-medium">Moment salvat</span>
        <span className="ml-auto text-[11.5px] text-white/40">
          mai sunt {remaining}
        </span>
      </div>

      <div className="px-4 py-3.5 flex gap-3 items-start">
        {next.bg && (
          <img
            src={next.bg}
            alt=""
            aria-hidden
            className="w-14 h-[74px] rounded-lg object-cover shrink-0 bg-white/5"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] tracking-[0.22em] uppercase text-white/40">Urmează</p>
          <p className="text-[14px] font-medium leading-snug mt-1">{next.hook}</p>
          {next.tag && (
            <span className="inline-block mt-1.5 text-[11px] text-white/45">{next.tag}</span>
          )}
        </div>
      </div>

      <div className="px-3 pb-3 flex gap-2">
        <button
          type="button"
          onClick={onLater}
          className="flex-1 h-11 rounded-full text-[13.5px] font-medium text-white/80 bg-white/[0.06] border border-white/10 active:scale-[0.98] transition inline-flex items-center justify-center gap-1.5"
        >
          <Clock className="w-4 h-4" strokeWidth={1.8} />
          Revin mai târziu
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="flex-1 h-11 rounded-full text-[13.5px] font-semibold text-neutral-950 bg-white active:scale-[0.98] transition inline-flex items-center justify-center gap-1.5"
        >
          Filmez acum
          <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
