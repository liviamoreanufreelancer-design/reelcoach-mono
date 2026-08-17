/**
 * /dashboard/momente — catalogul de tipuri de cadru.
 *
 * Locul unde se scrie O SINGURĂ DATĂ ce vede și ce face stilista la fiecare
 * tip de moment. „Before" se filmează la fel la balayage și la tuns, deci se
 * descrie o dată și ajunge în orice șablon care îl cere.
 *
 * Costul devine fix: ~22 de tipuri acoperă cele 23 de servicii de la lansare,
 * fiindcă `before`, `dezvăluire`, `reacția` și `detaliu` apar în toate
 * familiile. Scrise pe fiecare variantă, ar fi crescut cu fiecare.
 */
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { ShotType } from "@/lib/db-types";
import PageHeader from "@/components/PageHeader";
import ShotTypeCatalog from "@/components/ShotTypeCatalog";

export const dynamic = "force-dynamic";

export default async function CadrePage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.from("shot_types").select("*").order("sort_order");
  const types = (data ?? []) as ShotType[];

  return (
    <main className="mx-auto max-w-[900px] px-5 py-8">
      <PageHeader
        eyebrow="Momente"
        title="Ce se filmează"
        description="Fiecare moment se descrie o singură dată, aici. Un reel îl folosește, iar la importul într-o sesiune vine cu instrucțiunile lui deja scrise. Ordinea de mai jos e ordinea în care filmează stilista."
      />

      <ShotTypeCatalog initial={types} />


    </main>
  );
}
