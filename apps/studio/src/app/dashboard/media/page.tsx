/**
 * /dashboard/media — toate filmările și imaginile partenerei.
 *
 * Locul unde materialul se urcă o dată și se vede pe tot. Alegerea propriu-zisă
 * se face din editor, prin dialogul MediaPicker; pagina asta e pentru
 * gospodărie: ce avem, ce e prea mare, ce nu mai trebuie.
 */
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { MediaAsset } from "@/lib/db-types";
import PageHeader from "@/components/PageHeader";
import MediaLibrary from "@/components/MediaLibrary";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("media_assets").select("*").order("created_at", { ascending: false });
  const assets = (data ?? []) as MediaAsset[];

  return (
    <main className="mx-auto max-w-[1100px] px-5 py-8">
      <PageHeader
        eyebrow="Materiale"
        title="Filmări și poze"
        description="Urcate o dată, folosite oriunde. Un material ales într-un reel nu se mai urcă a doua oară."
      />

      <MediaLibrary initial={assets} />


    </main>
  );
}
