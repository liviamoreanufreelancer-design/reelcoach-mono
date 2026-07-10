/**
 * Template detail/edit page.
 *
 * Shows:
 *   - Template metadata form (title, promise, category, etc.)
 *   - Cover image with upload
 *   - List of scenes (shots) with edit forms
 *   - Add scene / delete scene / reorder scenes
 *   - Publish / Unpublish (admin only) / Delete buttons
 *
 * Path: /dashboard/templates/[id]
 */
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { TemplateRow, ShotRow, Category } from "@/lib/db-types";
import TemplateFormCard from "@/components/TemplateFormCard";
import CoverUploadCard from "@/components/CoverUploadCard";
import ScenesEditor from "@/components/ScenesEditor";
import LiveScenePreview from "@/components/LiveScenePreview";
import TemplateSidebar from "@/components/TemplateSidebar";
import { getDraftFor } from "@/lib/template-actions";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  // Check current user role for admin-only actions.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";

  // Fetch template + shots + categories in parallel.
  const [templateRes, shotsRes, categoriesRes] = await Promise.all([
    supabase.from("templates").select("*").eq("id", id).maybeSingle(),
    supabase.from("shots").select("*").eq("template_id", id).order("sort_order"),
    supabase.from("categories").select("id, label").order("sort_order"),
  ]);

  const template = templateRes.data as TemplateRow | null;
  if (!template) notFound();

  const shots = (shotsRes.data ?? []) as ShotRow[];
  const categories = (categoriesRes.data ?? []) as Pick<Category, "id" | "label">[];

  const isPublished = template.status === "published";
  const isDraftCopy = Boolean(template.parent_id);
  // Publicatele NU se editeaza direct (nici de admin). Se creeaza o ciorna.
  const canEdit = !isPublished;
  // Are acest template publicat o ciorna in lucru?
  const draftId = isDraftCopy ? null : await getDraftFor(template.id);

  return (
    <div className="flex flex-col gap-6">
      {/* Back + status row */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.16em] uppercase text-[#6B6B6B] hover:text-[#1F1F1F] transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Toate șabloanele
        </Link>

        <span
          className={`text-[9px] tracking-[0.25em] uppercase font-semibold px-2.5 py-1 rounded-full ${
            isPublished
              ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
              : "bg-amber-50 text-amber-700 border border-amber-300"
          }`}
        >
          {isPublished ? "Publicat" : "Draft"}
        </span>
      </div>

      {/* Title block */}
      <div>
        <p className="eyebrow mb-2">Șablon</p>
        <h1 className="h-display text-[28px] sm:text-[32px] text-[#1F1F1F] leading-tight">
          {template.title || "Fără titlu"}
        </h1>
        <p className="text-[11px] text-[#9A9A9A] mt-2 tabular-nums">
          ID: <code className="text-[#6B6B6B]">{template.id}</code>
        </p>
      </div>

      {!canEdit && (
        <div className="rounded-xl border border-[#F5B228]/40 bg-[#FFF6E5] p-4">
          <p className="text-[12px] text-[#7A5A10] leading-relaxed">
            <span className="font-semibold">Șablon publicat — live în app.</span>{" "}
            Ca să-l modifici fără să afectezi versiunea live, apasă „{draftId ? "Continuă ciorna" : "Editează (ciornă)"}" din dreapta.
          </p>
        </div>
      )}

      {/* Two zones: main column (scene editor + form) and a per-reel sidebar
          (cover + status + publish actions). On narrow screens the sidebar
          stacks below. */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6 items-start">

        {/* ── MAIN: scene editor + form ── */}
        <div className="flex flex-col gap-6 min-w-0">
          <LiveScenePreview templateId={template.id} shots={shots} globalFilter={template.global_filter} disabled={!canEdit} />
          <TemplateFormCard
            template={template}
            categories={categories}
            disabled={!canEdit}
          />
          <ScenesEditor
            templateId={template.id}
            shots={shots}
            disabled={!canEdit}
          />
        </div>

        {/* ── SIDEBAR: cover + actions (per-reel) ── */}
        <TemplateSidebar
          templateId={template.id}
          coverUrl={template.cover_url}
          status={template.status}
          isAdmin={isAdmin}
          canEdit={canEdit}
          parentId={template.parent_id}
          hasDraft={Boolean(draftId)}
        />
      </div>
    </div>
  );
}
