/**
 * Dashboard — lists all templates with status (draft/published), category,
 * recommended flag, and last updated date.
 *
 * Click a card → opens the template edit page.
 * Click "+ Șablon nou" → opens dialog → creates draft → redirects to edit.
 */
import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { FileText, CheckCircle2 } from "lucide-react";
import NewTemplateButton from "@/components/NewTemplateButton";

type TemplateRow = {
  id: string;
  title: string;
  status: "draft" | "published";
  is_recommended: boolean;
  category_id: string;
  updated_at: string;
  cover_url: string | null;
};

type CategoryRow = {
  id: string;
  label: string;
};

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient();

  const [templatesRes, categoriesRes] = await Promise.all([
    supabase
      .from("templates")
      .select("id, title, status, is_recommended, category_id, updated_at, cover_url")
      .order("updated_at", { ascending: false }),
    supabase.from("categories").select("id, label").order("sort_order"),
  ]);

  const templates = (templatesRes.data ?? []) as TemplateRow[];
  const categories = (categoriesRes.data ?? []) as CategoryRow[];
  const categoryById = new Map(categories.map((c) => [c.id, c.label]));

  const drafts = templates.filter((t) => t.status === "draft");
  const published = templates.filter((t) => t.status === "published");

  return (
    <div>
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div>
          <p className="eyebrow mb-2">Șabloane</p>
          <h1 className="h-display text-[26px] sm:text-[32px] text-white leading-tight">Toate șabloanele</h1>
          <p className="text-sm text-white/55 mt-2">
            {templates.length === 0
              ? "Niciun șablon încă. Creează primul șablon."
              : `${templates.length} șabloane în total · ${drafts.length} drafts · ${published.length} publicate`}
          </p>
        </div>
        <NewTemplateButton categories={categories} />
      </div>

      {templates.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-6">
          {drafts.length > 0 && (
            <Section
              title="Drafts"
              count={drafts.length}
              icon={<FileText className="w-4 h-4" />}
            >
              {drafts.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  categoryLabel={categoryById.get(t.category_id) ?? t.category_id}
                />
              ))}
            </Section>
          )}

          {published.length > 0 && (
            <Section
              title="Publicate"
              count={published.length}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              {published.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  categoryLabel={categoryById.get(t.category_id) ?? t.category_id}
                />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3 text-[#E8D5B5]/85">
        {icon}
        <h2 className="text-[10px] tracking-[0.32em] uppercase font-bold">
          {title} · {count}
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {children}
      </div>
    </section>
  );
}

function TemplateCard({
  template,
  categoryLabel,
}: {
  template: TemplateRow;
  categoryLabel: string;
}) {
  return (
    <Link
      href={`/dashboard/templates/${template.id}`}
      className="card p-4 hover:border-[#E8D5B5]/30 transition cursor-pointer block"
    >
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <p className="text-[9px] tracking-[0.25em] uppercase text-[#E8D5B5]/70 font-semibold truncate">
          {categoryLabel}
        </p>
        {template.is_recommended && (
          <span className="text-[9px] tracking-[0.2em] uppercase text-[#0F1419] bg-[#E8D5B5] px-2 py-0.5 rounded-full font-bold shrink-0">
            Recomandat
          </span>
        )}
      </div>
      <h3 className="text-[15px] font-semibold text-white leading-tight mb-3 line-clamp-2">
        {template.title}
      </h3>
      <p className="text-[10px] text-white/40 tabular-nums">
        Actualizat: {new Date(template.updated_at).toLocaleDateString("ro-RO")}
      </p>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="card p-10 text-center">
      <p className="h-display text-[22px] text-white mb-2">Niciun șablon încă.</p>
      <p className="text-sm text-white/55 leading-relaxed max-w-[28rem] mx-auto">
        Creează primul șablon apăsând „Șablon nou" sus dreapta.
      </p>
    </div>
  );
}
