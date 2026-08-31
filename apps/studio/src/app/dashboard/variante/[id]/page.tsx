/**
 * /dashboard/variante/[id] — editarea unei variante de reel.
 *
 * Varianta e de sine stătătoare: cadrele ei și filmările lor de probă sunt
 * urcate aici, nu împrumutate dintr-un șablon. Se construiește întâi, se
 * aplică apoi pe ce filmează stilista.
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { ReelDesignRow } from "@/lib/db-types";
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

  const { data } = await supabase
    .from("reel_designs").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const design = data as ReelDesignRow;

  return (
    <main className="mx-auto max-w-[860px] px-5 py-8">
      <Link
        href="/dashboard/variante"
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

      <ReelDesignEditor design={design} />
    </main>
  );
}
