/**
 * Sesiuni — ecranul de pornire al Studio.
 *
 * O sesiune e un serviciu din app: Balayage, Tuns, Machiaj mireasă. Se numea
 * „șablon", dar viziunea din CLAUDE.md o numește sesiune de la început:
 * partenera vede servicii, nu template-uri.
 *
 * Sus stă starea lanțului (PipelineStatus), fiindcă ecranul de pornire trebuie
 * să răspundă la „unde am rămas", nu doar să înșire ce există.
 */
import { getSupabaseServerClient } from "@/lib/supabase-server";
import NewTemplateButton from "@/components/NewTemplateButton";
import PageHeader from "@/components/PageHeader";
import PipelineStatus from "@/components/PipelineStatus";
import TemplateList, { type TemplateRow } from "@/components/TemplateList";

type CategoryRow = {
  id: string;
  label: string;
};

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient();

  const [templatesRes, categoriesRes, typesRes, mediaRes, designsRes] = await Promise.all([
    supabase
      .from("templates")
      .select("id, title, status, is_recommended, category_id, updated_at, cover_url, parent_id")
      .order("updated_at", { ascending: false }),
    supabase.from("categories").select("id, label").order("sort_order"),
    supabase.from("shot_types").select("id, hook"),
    supabase.from("media_assets").select("id"),
    supabase.from("reel_designs").select("id"),
  ]);

  const all = (templatesRes.data ?? []) as TemplateRow[];
  const categories = (categoriesRes.data ?? []) as CategoryRow[];
  // Tabelele noi pot lipsi până se rulează migrațiile — atunci arătăm 0, nu
  // o pagină căzută. Ecranul de pornire n-are voie să pice pentru un contor.
  const types = (typesRes.data ?? []) as { id: string; hook: string | null }[];
  const mediaCount = (mediaRes.data ?? []).length;
  const reelCount = (designsRes.data ?? []).length;

  // Draft-copy-urile (parent_id setat) nu apar separat in lista;
  // marcheaza doar originalul ca avand modificari nepublicate.
  const draftCopies = all.filter((t) => t.parent_id);
  const parentsWithDraft = new Set(draftCopies.map((t) => t.parent_id as string));
  const templates = all.filter((t) => !t.parent_id);

  // Map -> obiect simplu (serializabil catre client component)
  const categoryLabels: Record<string, string> = {};
  for (const c of categories) categoryLabels[c.id] = c.label;

  return (
    <div>
      <PageHeader
        eyebrow="Sesiuni"
        title="Serviciile din app"
        description="Fiecare sesiune e un serviciu pe care îl alege stilista. Rezultatele se importă din reelurile construite, iar lista de filmat se generează din ele."
        action={<NewTemplateButton />}
      />

      <PipelineStatus
        moments={types.length}
        momentsWithoutHook={types.filter((t) => !t.hook).length}
        media={mediaCount}
        reels={reelCount}
        sessions={templates.length}
      />

      <TemplateList templates={templates} categoryLabels={categoryLabels} parentsWithDraft={Array.from(parentsWithDraft)} />
    </div>
  );
}
