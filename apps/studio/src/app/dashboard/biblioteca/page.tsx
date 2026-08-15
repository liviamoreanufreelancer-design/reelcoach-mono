/**
 * /dashboard/biblioteca — variantele de reel, grupate pe tip.
 *
 * Nu sunt postări. Appul nu le citește. E locul unde partenera construiește
 * mai multe abordări ale aceluiași tip de reel, ca stilista să nu posteze
 * săptămâna 4 la fel ca săptămâna 1 — și ca două stiliste diferite să nu
 * arate identic.
 *
 * Gruparea pe tip e ce contează vizual: variantele aceluiași tip stau una
 * lângă alta, cu coperțile desenate, exact ca să răspundă la întrebarea care
 * decide totul — „chiar arată diferit?".
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { ReelDesignRow } from "@/lib/db-types";
import NewReelDesignButton from "@/components/NewReelDesignButton";
import ReelDesignGrid from "@/components/ReelDesignGrid";

export const dynamic = "force-dynamic";

export default async function BibliotecaPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: designsData } = await supabase
    .from("reel_designs").select("*").order("reel_type").order("sort_order");
  const designs = (designsData ?? []) as ReelDesignRow[];

  // Tipurile deja folosite — sugestii în dialogul de creare, ca partenera să
  // nu scrie „glow up" o dată și „glowup" a doua oară.
  const knownTypes = Array.from(new Set(designs.map((d) => d.reel_type))).sort();

  const byType = new Map<string, ReelDesignRow[]>();
  for (const d of designs) {
    const list = byType.get(d.reel_type) ?? [];
    list.push(d);
    byType.set(d.reel_type, list);
  }

  return (
    <main className="mx-auto max-w-[1100px] px-5 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
        <div>
          <p className="eyebrow">Bibliotecă</p>
          <h1 className="text-[26px] font-semibold text-[#1F1F1F] leading-tight mt-1">
            Variante de reel
          </h1>
        </div>
        <NewReelDesignButton knownTypes={knownTypes} />
      </div>

      <p className="text-[13px] text-[#6B6B6B] leading-relaxed max-w-[620px] mb-7">
        Mai multe abordări ale aceluiași tip de reel, construite pe filmări de
        probă urcate de voi. Se fac întâi, se aplică apoi pe ce filmează
        stilista. Testul care contează: pune trei una lângă alta — dacă cineva
        din afară nu poate spune imediat că sunt diferite, schimbă abordarea în
        loc s-o adaugi pe a patra.
      </p>

      {designs.length === 0 ? (
        <div className="card px-6 py-10 text-center">
          <p className="text-[14px] text-[#1F1F1F] font-medium">
            Biblioteca e goală.
          </p>
          <p className="text-[13px] text-[#6B6B6B] mt-1.5 leading-relaxed max-w-[420px] mx-auto">
            Prima variantă se construiește de la zero: adaugi cadre, le dai
            nume și urci câte o filmare de probă. Următoarele se duplică din ea
            și se schimbă doar ce diferă.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-9">
          {Array.from(byType.entries()).map(([type, list]) => (
            <section key={type}>
              <div className="flex items-baseline gap-2.5 mb-3.5">
                <h2 className="text-[15px] font-semibold text-[#1F1F1F]">{type}</h2>
                <span className="text-[12px] text-[#9A9A9A]">
                  {list.length} {list.length === 1 ? "variantă" : "variante"}
                </span>
              </div>
              <ReelDesignGrid designs={list} />
            </section>
          ))}
        </div>
      )}

      <p className="text-[12px] text-[#9A9A9A] mt-10 leading-relaxed max-w-[620px]">
        Variantele nu ajung încă pe telefon. Se construiesc și se privesc —
        alegerea lor la fiecare programare vine după ce se vede că ideea merge.
      </p>

      <Link
        href="/dashboard"
        className="inline-block mt-6 text-[13px] text-[#5B34FF] hover:underline"
      >
        ← Șabloane
      </Link>
    </main>
  );
}
