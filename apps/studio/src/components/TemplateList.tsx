"use client";

/**
 * TemplateList — client-side list with live search over title + category.
 * Receives already-fetched data from the dashboard server component.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, CheckCircle2, Search } from "lucide-react";

export type TemplateRow = {
  id: string;
  title: string;
  status: "draft" | "published";
  is_recommended: boolean;
  category_id: string;
  updated_at: string;
  cover_url: string | null;
  /** Migration 009: setat doar pe draft-copy-uri. */
  parent_id?: string | null;
};

export default function TemplateList({
  templates,
  categoryLabels,
  parentsWithDraft = [],
}: {
  templates: TemplateRow[];
  categoryLabels: Record<string, string>;
  parentsWithDraft?: string[];
}) {
  const draftSet = new Set(parentsWithDraft);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => {
      const cat = (categoryLabels[t.category_id] ?? "").toLowerCase();
      return t.title.toLowerCase().includes(q) || cat.includes(q);
    });
  }, [query, templates, categoryLabels]);

  const drafts = filtered.filter((t) => t.status === "draft");
  const published = filtered.filter((t) => t.status === "published");

  if (templates.length === 0) return <EmptyState />;

  return (
    <div>
      {/* Bara de căutare */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[#9A9A9A] pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Caută după titlu sau categorie…"
          className="input"
          style={{ paddingLeft: "40px" }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-[15px] text-[#1F1F1F] mb-1">Niciun șablon găsit.</p>
          <p className="text-[13px] text-[#6B6B6B]">Încearcă alt termen de căutare.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {drafts.length > 0 && (
            <Section title="Drafts" count={drafts.length} icon={<FileText className="w-4 h-4" />}>
              {drafts.map((t) => (
                <TemplateCard key={t.id} template={t} categoryLabel={categoryLabels[t.category_id] ?? t.category_id} hasDraft={draftSet.has(t.id)} />
              ))}
            </Section>
          )}
          {published.length > 0 && (
            <Section title="Publicate" count={published.length} icon={<CheckCircle2 className="w-4 h-4" />}>
              {published.map((t) => (
                <TemplateCard key={t.id} template={t} categoryLabel={categoryLabels[t.category_id] ?? t.category_id} hasDraft={draftSet.has(t.id)} />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, count, icon, children }: { title: string; count: number; icon: React.ReactNode; children: React.ReactNode; }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3 text-[#5B34FF]/85">
        {icon}
        <h2 className="text-[10px] tracking-[0.32em] uppercase font-bold">{title} · {count}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
    </section>
  );
}

function TemplateCard({ template, categoryLabel, hasDraft = false }: { template: TemplateRow; categoryLabel: string; hasDraft?: boolean; }) {
  return (
    <Link href={`/dashboard/templates/${template.id}`} className="card p-4 hover:border-[#5B34FF]/30 transition cursor-pointer block">
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <p className="text-[9px] tracking-[0.25em] uppercase text-[#5B34FF]/70 font-semibold truncate">{categoryLabel}</p>
        {template.is_recommended && (
          <span className="text-[9px] tracking-[0.2em] uppercase text-white bg-[#5B34FF] px-2 py-0.5 rounded-full font-bold shrink-0">Recomandat</span>
        )}
      </div>
      <h3 className="text-[15px] font-semibold text-[#1F1F1F] leading-tight mb-3 line-clamp-2">{template.title}</h3>
      {hasDraft && (
        <p className="text-[10px] font-semibold text-[#F5B228] mb-1.5">● Modificări nepublicate</p>
      )}
      <p className="text-[10px] text-[#9A9A9A] tabular-nums">Actualizat: {new Date(template.updated_at).toLocaleDateString("ro-RO")}</p>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="card p-10 text-center">
      <p className="h-display text-[22px] text-[#1F1F1F] mb-2">Niciun șablon încă.</p>
      <p className="text-sm text-[#6B6B6B] leading-relaxed max-w-[28rem] mx-auto">Creează primul șablon apăsând „Șablon nou" sus dreapta.</p>
    </div>
  );
}
