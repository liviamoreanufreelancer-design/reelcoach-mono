/**
 * PipelineStatus — unde ai rămas, dintr-o privire.
 *
 * Aici încercăm să fim mai buni decât WordPress, nu doar la fel de buni.
 * WordPress e excelent la navigație și groaznic la orientare: deschizi
 * administrarea și nimic nu-ți spune ce urmează. Pentru cineva care intră
 * prima oară — sau care se întoarce după două săptămâni — asta e tot ce
 * contează.
 *
 * Rândul ăsta arată lanțul în ordinea lui reală și, cel mai important, **ce
 * lipsește**. Nu ca reproș: ca următorul pas evident. Un moment fără
 * instrucțiuni e muncă neterminată care se vede pe telefonul stilistei; e
 * mai util să apară aici decât să fie descoperit acolo.
 *
 * E și plasa de siguranță pentru riscul de persoană-cheie din CLAUDE.md:
 * cineva nou citește rândul ăsta și înțelege modelul fără să i-l explice
 * partenera.
 */
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Stage = {
  href: string;
  label: string;
  count: number;
  /** Ce e neterminat la pasul ăsta. 0 = nimic de făcut aici. */
  todo?: number;
  todoLabel?: string;
};

export default function PipelineStatus({
  moments,
  momentsWithoutHook,
  media,
  reels,
  sessions,
}: {
  moments: number;
  momentsWithoutHook: number;
  media: number;
  reels: number;
  sessions: number;
}) {
  const stages: Stage[] = [
    {
      href: "/dashboard/momente",
      label: moments === 1 ? "moment" : "momente",
      count: moments,
      todo: momentsWithoutHook,
      todoLabel: "fără instrucțiuni",
    },
    { href: "/dashboard/media", label: media === 1 ? "material" : "materiale", count: media },
    { href: "/dashboard/variante", label: reels === 1 ? "variantă" : "variante", count: reels },
    { href: "/dashboard", label: sessions === 1 ? "sesiune" : "sesiuni", count: sessions },
  ];

  return (
    <div className="card px-5 py-4 mb-7">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-3">
        {stages.map((s, i) => (
          <div key={s.href} className="flex items-center gap-1.5">
            <Link
              href={s.href}
              className="group inline-flex items-baseline gap-1.5 rounded-lg px-2 py-1 -mx-1 hover:bg-[#F6F4FE] transition"
            >
              <span className="text-[19px] font-semibold text-[#1F1F1F] tabular-nums leading-none">
                {s.count}
              </span>
              <span className="text-[12.5px] text-[#6B6B6B] group-hover:text-[#5B34FF]">
                {s.label}
              </span>
              {s.todo ? (
                <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 leading-none">
                  {s.todo} {s.todoLabel}
                </span>
              ) : null}
            </Link>
            {i < stages.length - 1 && (
              <ArrowRight className="w-3.5 h-3.5 text-[#D8D0F5] shrink-0" strokeWidth={2} />
            )}
          </div>
        ))}
      </div>

      <p className="text-[11.5px] text-[#9A9A9A] mt-2.5 leading-relaxed">
        {nextStep({ moments, momentsWithoutHook, media, reels, sessions })}
      </p>
    </div>
  );
}

/**
 * O singură propoziție: ce urmează.
 *
 * Se citește lanțul de la stânga la dreapta și se oprește la primul lucru
 * care blochează pasul următor. Nu o listă de sarcini — următorul pas.
 */
function nextStep(s: {
  moments: number;
  momentsWithoutHook: number;
  media: number;
  reels: number;
  sessions: number;
}): string {
  if (s.moments === 0) return "Începe cu momentele: ce se filmează, descris o dată pentru toate serviciile.";
  if (s.media === 0) return "Urcă niște materiale — filmările și pozele peste care se construiesc variantele.";
  if (s.reels === 0) return "Construiește prima variantă din materialele urcate.";
  if (s.momentsWithoutHook > 0)
    return `${s.momentsWithoutHook} ${s.momentsWithoutHook === 1 ? "moment n-are" : "momente n-au"} instrucțiuni de filmare — stilista le va vedea goale pe telefon.`;
  if (s.sessions === 0) return "Creează prima sesiune și importă în ea variantele construite.";
  return "Totul e legat. Următoarea variantă adaugă varietate: aceleași momente, altă abordare.";
}
