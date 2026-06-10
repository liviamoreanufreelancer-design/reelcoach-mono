"use server";

/**
 * Server actions for template editing. All actions run on the server
 * with the user's session cookie, so Supabase RLS enforces who can do what.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "./supabase-server";
import type {
  TransitionId,
  EffectId,
  TemplateStatus,
  Difficulty,
  HowShootItem,
} from "./db-types";

/**
 * Create a brand-new draft template. Used by "+ Șablon nou" on the dashboard.
 * Generates an id based on a slug of the title; if the slug collides, appends
 * a short random suffix. Always created in "draft" status.
 */
export async function createTemplate(formData: FormData) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const title = String(formData.get("title") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "").trim();

  if (!title) throw new Error("Titlul e obligatoriu");
  if (!categoryId) throw new Error("Categoria e obligatorie");

  // Generate id from title slug.
  const base = slugify(title);
  let id = base;
  let attempt = 0;
  while (attempt < 5) {
    const { data: existing } = await supabase
      .from("templates")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (!existing) break;
    attempt += 1;
    id = `${base}-${randomSuffix()}`;
  }

  const { error } = await supabase.from("templates").insert({
    id,
    title,
    category_id: categoryId,
    status: "draft",
    is_recommended: false,
    difficulty: "easy",
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  redirect(`/dashboard/templates/${id}`);
}

/**
 * Update template-level fields. Editor can edit drafts; only admin
 * can edit published templates (enforced by RLS).
 */
export async function updateTemplate(id: string, formData: FormData) {
  const supabase = await getSupabaseServerClient();

  const patch: Record<string, unknown> = {
    title:           String(formData.get("title") ?? "").trim(),
    promise:         (formData.get("promise") as string)?.trim() || null,
    emotional_pitch: (formData.get("emotional_pitch") as string)?.trim() || null,
    category_id:     String(formData.get("category_id") ?? "").trim(),
    is_recommended:  formData.get("is_recommended") === "on",
    difficulty:      String(formData.get("difficulty") ?? "easy") as Difficulty,
  };

  const { error } = await supabase.from("templates").update(patch).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/templates/${id}`);
  revalidatePath("/dashboard");
}

/**
 * Publish a draft → "published". Admin only (enforced by RLS).
 */
export async function publishTemplate(id: string) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("templates")
    .update({
      status: "published" as TemplateStatus,
      published_at: new Date().toISOString(),
      published_by: user.id,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/templates/${id}`);
  revalidatePath("/dashboard");
}

/**
 * Move a template back to draft (admin only).
 */
export async function unpublishTemplate(id: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("templates")
    .update({ status: "draft" as TemplateStatus })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/templates/${id}`);
  revalidatePath("/dashboard");
}

/**
 * Delete a template completely (cascades to its shots). Admin only.
 */
export async function deleteTemplate(id: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("templates").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// ============================================================================
// Shots (scenes)
// ============================================================================

/**
 * Add a new shot to a template at the next available sort_order.
 */
export async function addShot(templateId: string) {
  const supabase = await getSupabaseServerClient();

  // Find next sort_order
  const { data: existing } = await supabase
    .from("shots")
    .select("sort_order")
    .eq("template_id", templateId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("shots").insert({
    template_id: templateId,
    sort_order: nextOrder,
    pattern: null,
    title: `Scena ${nextOrder}`,
    recording_duration: 4,
    final_usage_duration: 2,
    countdown: 3,
    transition_type: "cut",
    filter_style: "none",
    effect: "none",
    hands_busy: false,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/templates/${templateId}`);
}

/**
 * Update a shot with the given patch. Used by inline editing on the
 * template detail page.
 */
export async function updateShot(
  shotId: string,
  templateId: string,
  patch: {
    /** Free-form pattern label. Pass null to clear. */
    pattern?: string | null;
    title?: string;
    hook?: string | null;
    overlay_text?: string | null;
    recording_duration?: number;
    final_usage_duration?: number;
    countdown?: number;
    transition_type?: TransitionId;
    filter_style?: string;
    effect?: EffectId;
    hands_busy?: boolean;
    instructions?: string[];
    must_show?: string[];
    must_see?: string[];
    how_shoot?: HowShootItem[];
    playback_speed?: number;
    motion_blur?: boolean;
  },
) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("shots").update(patch).eq("id", shotId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/templates/${templateId}`);
}

export async function deleteShot(shotId: string, templateId: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("shots").delete().eq("id", shotId);
  if (error) throw new Error(error.message);

  // Resequence sort_order so there are no gaps.
  const { data: remaining } = await supabase
    .from("shots")
    .select("id")
    .eq("template_id", templateId)
    .order("sort_order", { ascending: true });

  if (remaining) {
    for (let i = 0; i < remaining.length; i += 1) {
      await supabase.from("shots").update({ sort_order: i + 1 }).eq("id", remaining[i].id);
    }
  }

  revalidatePath(`/dashboard/templates/${templateId}`);
}

/**
 * Reorder shots based on the provided ordered list of shot ids.
 * Caller passes ids in the desired final order; we just rewrite sort_order.
 */
export async function reorderShots(templateId: string, orderedIds: string[]) {
  const supabase = await getSupabaseServerClient();

  for (let i = 0; i < orderedIds.length; i += 1) {
    const { error } = await supabase
      .from("shots")
      .update({ sort_order: i + 1 })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/dashboard/templates/${templateId}`);
}

// ============================================================================
// Upload cover image
// ============================================================================

/**
 * Upload a cover image to Supabase Storage 'covers' bucket and link it
 * to the template. Returns the public URL.
 */
export async function uploadCover(templateId: string, formData: FormData) {
  const supabase = await getSupabaseServerClient();

  const file = formData.get("cover") as File | null;
  if (!file || file.size === 0) throw new Error("Niciun fișier selectat");
  if (file.size > 5 * 1024 * 1024) throw new Error("Fișierul depășește 5MB");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${templateId}/cover-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("covers")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data: publicData } = supabase.storage.from("covers").getPublicUrl(path);
  const publicUrl = publicData.publicUrl;

  const { error: updateError } = await supabase
    .from("templates")
    .update({ cover_url: publicUrl })
    .eq("id", templateId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/dashboard/templates/${templateId}`);
  return publicUrl;
}

// ============================================================================
// Helpers
// ============================================================================

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "template";
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

/**
 * Update the reel-wide global filter (templates.global_filter). One filter for
 * the whole reel — the partner's decision. Mirrors updateShot's pattern.
 */
export async function updateGlobalFilter(templateId: string, filterId: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("templates")
    .update({ global_filter: filterId })
    .eq("id", templateId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/templates/${templateId}`);
}

/**
 * Upload a scene's sample footage (the partner's own clip) to the `samples`
 * bucket and save its URL on the shot. Mirrors uploadCover, but for video.
 */
export async function uploadShotSample(shotId: string, templateId: string, formData: FormData) {
  const supabase = await getSupabaseServerClient();
  const file = formData.get("sample") as File | null;
  if (!file || file.size === 0) throw new Error("Niciun fișier selectat");
  if (file.size > 50 * 1024 * 1024) throw new Error("Fișierul depășește 50MB");
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
  const path = `${templateId}/${shotId}-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("samples")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);
  const { data: publicData } = supabase.storage.from("samples").getPublicUrl(path);
  const publicUrl = publicData.publicUrl;
  const { error: updateError } = await supabase
    .from("shots")
    .update({ sample_video_url: publicUrl })
    .eq("id", shotId);
  if (updateError) throw new Error(updateError.message);
  revalidatePath(`/dashboard/templates/${templateId}`);
  return publicUrl;
}
