/**
 * Dashboard — lists all templates with status (draft/published), category,
 * recommended flag, and last updated date. Rendering + live search live in
 * the TemplateList client component.
 *
 * Click a card → opens the template edit page.
 * Click "+ Șablon nou" → opens dialog → creates draft → redirects to edit.
 */
import { getSupabaseServerClient } from "@/lib/supabase-server";
import NewTemplateButton from "@/components/NewTemplateButton";
import TemplateList, { type TemplateRow } from "@/components/TemplateList";

type CategoryRow = {
  id: string;
  label: string;
};

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient();

  const [templatesRes, categoriesRes] = await Promise.all([
    supabase
      .from("templates")
      .select("id, title, status, is_recommended, category_id, updated_at, cover_url, parent_id")
      .order("updated_at", { ascending: false }),
    supabase.from("categories").select("id, label").order("sort_order"),
  ]);

  const all = (templatesRes.data ?? []) as TemplateRow[];
  const categories = (categoriesRes.data ?? []) as CategoryRow[];

  // Draft-copy-urile (parent_id setat) nu apar separat in lista;
  // marcheaza doar originalul ca avand modificari nepublicate.
  const draftCopies = all.filter((t) => t.parent_id);
  const parentsWithDraft = new Set(draftCopies.map((t) => t.parent_id as string));
  const templates = all.filter((t) => !t.parent_id);

  // Map -> obiect simplu (serializabil catre client component)
  const categoryLabels: Record<string, string> = {};
  for (const c of categories) categoryLabels[c.id] = c.label;

  const drafts = templates.filter((t) => t.status === "draft");
  const published = templates.filter((t) => t.status === "published");

  return (
    <div>
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div>
          <p className="eyebrow mb-2">Șabloane</p>
          <h1 className="h-display text-[26px] sm:text-[32px] text-[#1F1F1F] leading-tight">Toate șabloanele</h1>
          <p className="text-sm text-[#6B6B6B] mt-2">
            {templates.length === 0
              ? "Niciun șablon încă. Creează primul șablon."
              : `${templates.length} șabloane în total · ${drafts.length} drafts · ${published.length} publicate`}
          </p>
        </div>
        <NewTemplateButton categories={categories} />
      </div>

      <TemplateList templates={templates} categoryLabels={categoryLabels} parentsWithDraft={Array.from(parentsWithDraft)} />
    </div>
  );
}
