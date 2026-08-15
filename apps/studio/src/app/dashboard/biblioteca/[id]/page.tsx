/**
 * /dashboard/biblioteca/[id] — editarea unei variante de reel.
 *
 * Momentele nu vin dintr-un șablon anume: varianta e o compoziție peste NUME
 * de momente, iar filmarea de probă vine de la exemplarul cel mai util al
 * fiecărei etichete, din tot catalogul (vezi lib/slot-catalog.ts).
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { ReelDesignRow, ShotRow } from "@/lib/db-types";
import { oneShotPerSlot } from "@/lib/slot-catalog";
import ReelDesignEditor from "@/components/ReelDesignEditor";

export const dynamic = "force-dynamic";

export default async function ReelDesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [designRes, shotsRes] = await Promise.all([
    supabase.from("reel_designs").select("*").eq("id", id).maybeSingle(),
    supabase.from("shots").select("*").order("sort_order"),
  ]);

  if (!designRes.data) notFound();
  const design = designRes.data as ReelDesignRow;
  const shots = oneShotPerSlot((shotsRes.data ?? []) as ShotRow[]);

  return (
    <main className="mx-auto max-w-[860px] px-5 py-8">
      <Link
        href="/dashboard/biblioteca"
        className="text-[13px] text-[#5B34FF] hover:underline"
      >
        ← Bibliotecă
      </Link>

      <div className="mt-3 mb-6">
        <p className="eyebrow">{design.reel_type}</p>
        <h1 className="text-[24px] font-semibold text-[#1F1F1F] leading-tight mt-1">
          {design.name}
        </h1>
      </div>

      <ReelDesignEditor design={design} shots={shots} />
    </main>
  );
}
