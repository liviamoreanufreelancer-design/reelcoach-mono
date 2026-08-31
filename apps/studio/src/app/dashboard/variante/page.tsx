/**
 * /dashboard/variante — reelurile, caruselele și poveștile construite.
 *
 * Nu sunt postări: appul nu le citește de aici. E locul unde partenera face
 * mai multe abordări ale aceluiași tip de rezultat, ca stilista să nu posteze
 * săptămâna 4 la fel ca săptămâna 1 — și ca două stiliste diferite să nu arate
 * identic.
 *
 * Se numea „Reeluri", ceea ce a devenit greșit din momentul în care a primit
 * și carusele și povești.
 *
 * TREI FOLDERE, unul odată (vezi DesignFolders), iar în fiecare gruparea
 * rămâne pe tip: „before/after", „glow up". Alea sunt bazinele reale din care
 * alege telefonul. Coperțile desenate stau una lângă alta exact ca să răspundă
 * la întrebarea care decide totul — „chiar arată diferit?".
 */
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { ReelDesignRow } from "@/lib/db-types";
import PageHeader from "@/components/PageHeader";
import NewReelDesignButton from "@/components/NewReelDesignButton";
import DesignFolders from "@/components/DesignFolders";
import DerivedShotList from "@/components/DerivedShotList";

export const dynamic = "force-dynamic";

export default async function VariantePage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: designsData } = await supabase
    .from("reel_designs").select("*").order("reel_type").order("sort_order");
  const designs = (designsData ?? []) as ReelDesignRow[];

  // Tipurile deja folosite — sugestii în dialogul de creare, ca partenera să
  // nu scrie „glow up" o dată și „glowup" a doua oară.
  const knownTypes = Array.from(new Set(designs.map((d) => d.reel_type))).sort();

  return (
    <main className="mx-auto max-w-[1100px] px-5 py-8">
      <PageHeader
        eyebrow="Variante"
        title="Reeluri, carusele, povești"
        description="Mai multe abordări ale aceluiași tip de rezultat, construite pe materiale de probă. Se fac întâi, se importă apoi în sesiuni. Testul care contează: pune trei una lângă alta — dacă cineva din afară nu poate spune imediat că sunt diferite, schimbă abordarea în loc s-o adaugi pe a patra."
        action={<NewReelDesignButton knownTypes={knownTypes} />}
      />

      {designs.length === 0 ? (
        <div className="card px-6 py-10 text-center">
          <p className="text-[14px] text-[#1F1F1F] font-medium">
            Nicio variantă încă.
          </p>
          <p className="text-[13px] text-[#6B6B6B] mt-1.5 leading-relaxed max-w-[440px] mx-auto">
            Prima se construiește de la zero: adaugi momente, alegi ce e
            fiecare, și pui câte un material de probă. Următoarele se duplică
            din ea și se schimbă doar ce diferă.
          </p>
        </div>
      ) : (
        <DesignFolders designs={designs} />
      )}

      {designs.length > 0 && (
        <div className="mt-10">
          <DerivedShotList designs={designs} />
        </div>
      )}

      <p className="text-[12px] text-[#9A9A9A] mt-8 leading-relaxed max-w-[620px]">
        Variantele nu ajung încă pe telefon. Se construiesc și se privesc —
        alegerea lor la fiecare programare vine după ce se vede că ideea merge.
      </p>


    </main>
  );
}
