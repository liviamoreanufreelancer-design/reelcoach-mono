/**
 * /dashboard/media — toate filmările și imaginile partenerei.
 *
 * Locul unde materialul se urcă o dată și se vede pe tot. Alegerea propriu-zisă
 * se face din editor, prin dialogul MediaPicker; pagina asta e pentru
 * gospodărie: ce avem, ce e prea mare, ce nu mai trebuie.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { MediaAsset } from "@/lib/db-types";
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
      <p className="eyebrow">Materiale</p>
      <h1 className="text-[26px] font-semibold text-[#1F1F1F] leading-tight mt-1 mb-2">
        Filmări și imagini
      </h1>
      <p className="text-[13px] text-[#6B6B6B] leading-relaxed max-w-[620px] mb-7">
        Urcate o dată, folosite oriunde — în cadrele variantelor și în momentele
        șabloanelor. Alegerea se face din editor; aici le vezi pe toate.
      </p>

      <MediaLibrary initial={assets} />

      <Link
        href="/dashboard"
        className="inline-block mt-8 text-[13px] text-[#5B34FF] hover:underline"
      >
        ← Șabloane
      </Link>
    </main>
  );
}
