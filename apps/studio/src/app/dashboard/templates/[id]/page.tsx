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
import TemplateActionsCard from "@/components/TemplateActionsCard";
import PreviewPanel from "@/components/PreviewPanel";

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
  const canEdit = !isPublished || isAdmin;

  return (
    <div className="flex flex-col gap-6">
      {/* Back + status row */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.16em] uppercase text-white/55 hover:text-white transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Toate șabloanele
        </Link>

        <span
          className={`text-[9px] tracking-[0.25em] uppercase font-semibold px-2.5 py-1 rounded-full ${
            isPublished
              ? "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30"
              : "bg-amber-400/15 text-amber-300 border border-amber-400/30"
          }`}
        >
          {isPublished ? "Publicat" : "Draft"}
        </span>
      </div>

      {/* Title block */}
      <div>
        <p className="eyebrow mb-2">Șablon</p>
        <h1 className="h-display text-[28px] sm:text-[32px] text-white leading-tight">
          {template.title || "Fără titlu"}
        </h1>
        <p className="text-[11px] text-white/40 mt-2 tabular-nums">
          ID: <code className="text-white/60">{template.id}</code>
        </p>
      </div>

      {!canEdit && (
        <div className="card p-4 border-amber-400/30 bg-amber-400/5">
          <p className="text-[12px] text-amber-200 leading-relaxed">
            Acest șablon este publicat. Doar adminii pot edita un șablon publicat.
            Cere unui admin să-l treacă pe draft pentru a-l modifica.
          </p>
        </div>
      )}

      {/* Two-column layout: left scrolls, right (preview) stays fixed on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="flex flex-col gap-6 min-w-0">
          {/* Template metadata form */}
          <TemplateFormCard
            template={template}
            categories={categories}
            disabled={!canEdit}
          />

          {/* Scenes editor */}
          <ScenesEditor
            templateId={template.id}
            shots={shots}
            disabled={!canEdit}
          />
        </div>

        {/*
          Right side panel — sticky on desktop so the preview stays visible
          while the editor scrolls through scene fields on the left. Top
          offset matches header height + a comfortable gap.
        */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-1 lg:[scrollbar-width:thin]">
          <PreviewPanel
            templateId={template.id}
            shots={shots}
            disabled={!canEdit}
          />

          <CoverUploadCard
            templateId={template.id}
            coverUrl={template.cover_url}
            disabled={!canEdit}
          />

          <TemplateActionsCard
            templateId={template.id}
            status={template.status}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </div>
  );
}
