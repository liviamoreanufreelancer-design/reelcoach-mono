/**
 * /dashboard/biblioteca/[id] — editarea unei variante de reel.
 *
 * Momentele vin din șablonul de referință: materialul de probă peste care
 * partenera proiectează toate variantele acelui tip.
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { ReelDesignRow, ShotRow, TemplateRow } from "@/lib/db-types";
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

  const { data: designData } = await supabase
    .from("reel_designs").select("*").eq("id", id).maybeSingle();
  if (!designData) notFound();
  const design = designData as ReelDesignRow;

  const [shotsRes, templateRes] = await Promise.all([
    supabase
      .from("shots").select("*")
      .eq("template_id", design.reference_template_id ?? "")
      .order("sort_order"),
    supabase
      .from("templates").select("id, title")
      .eq("id", design.reference_template_id ?? "")
      .maybeSingle(),
  ]);

  const shots = (shotsRes.data ?? []) as ShotRow[];
  const reference = templateRes.data as Pick<TemplateRow, "id" | "title"> | null;

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
        <p className="text-[12.5px] text-[#9A9A9A] mt-1.5">
          Filmări de probă din{" "}
          {reference ? (
            <Link
              href={`/dashboard/templates/${reference.id}`}
              className="text-[#5B34FF] hover:underline"
            >
              {reference.title}
            </Link>
          ) : (
            <span className="text-rose-600">șablon șters</span>
          )}
        </p>
      </div>

      <ReelDesignEditor design={design} shots={shots} />
    </main>
  );
}
