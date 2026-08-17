/**
 * /dashboard/cadre — catalogul de tipuri de cadru.
 *
 * Locul unde se scrie O SINGURĂ DATĂ ce vede și ce face stilista la fiecare
 * tip de moment. „Before" se filmează la fel la balayage și la tuns, deci se
 * descrie o dată și ajunge în orice șablon care îl cere.
 *
 * Costul devine fix: ~22 de tipuri acoperă cele 23 de servicii de la lansare,
 * fiindcă `before`, `dezvăluire`, `reacția` și `detaliu` apar în toate
 * familiile. Scrise pe fiecare variantă, ar fi crescut cu fiecare.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { ShotType } from "@/lib/db-types";
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
      <p className="eyebrow">Catalog</p>
      <h1 className="text-[26px] font-semibold text-[#1F1F1F] leading-tight mt-1 mb-2">
        Tipuri de cadru
      </h1>
      <p className="text-[13px] text-[#6B6B6B] leading-relaxed max-w-[640px] mb-7">
        Instrucțiunile se scriu aici, o singură dată. Un cadru din bibliotecă
        alege un tip, iar la importul în șablon momentul vine cu descrierea lui
        deja scrisă. Ordinea de mai jos e ordinea în care filmează stilista.
      </p>

      <ShotTypeCatalog initial={types} />

      <Link href="/dashboard" className="inline-block mt-8 text-[13px] text-[#5B34FF] hover:underline">
        ← Șabloane
      </Link>
    </main>
  );
}
