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
  LightSource,
  ShotType,
  CaptureKind,
  OutputRow,
  OutputKind,
  OutputSlot,
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
  if (!title) throw new Error("Titlul e obligatoriu");

  // Categoria nu se mai cere la creare — vezi NewTemplateButton. Punem prima
  // din catalog ca sa nu lasam coloana goala; se schimba din editor. Sablonul
  // e ciorna, deci categoria gresita nu se vede nicaieri pe telefon.
  let categoryId = String(formData.get("category_id") ?? "").trim();
  if (!categoryId) {
    const { data: firstCategory } = await supabase
      .from("categories").select("id").order("sort_order").limit(1).maybeSingle();
    categoryId = (firstCategory?.id as string | undefined) ?? "";
    if (!categoryId) throw new Error("Nu există nicio categorie în catalog");
  }

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

/**
 * Save the preview reel URL on the template. The MP4 itself is uploaded
 * directly from the browser to the `previews` bucket (videos are too big to
 * route through a server action body), so here we only persist the URL string.
 */
export async function setPreviewReelUrl(templateId: string, url: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("templates")
    .update({ preview_reel_url: url })
    .eq("id", templateId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/templates/${templateId}`);
  return url;
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

/* ═══════════════════════════════════════════════════════════════════════
 * Sistem de ciornă (draft-copy) pentru template-uri publicate.
 *
 * Fluxul (ca la WordPress):
 *   1. Template publicat → createDraftCopy() → copie draft cu parent_id
 *   2. Partenera editează copia (toate acțiunile normale funcționează)
 *   3. publishDraftChanges() → RPC atomic: copiază peste original, șterge draft
 *   4. discardDraftChanges() → șterge draft, originalul rămâne neatins
 *
 * App-ul mobile nu vede draft-copy-urile (status 'draft') și originalul
 * își păstrează ID-ul, deci favorite / preview_reel_url rămân valide.
 * ═══════════════════════════════════════════════════════════════════════ */

/** Găsește draft-copy-ul unui template publicat (sau null). */
export async function getDraftFor(templateId: string) {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("templates")
    .select("id")
    .eq("parent_id", templateId)
    .maybeSingle();
  return data?.id ?? null;
}

/** Creează o copie draft a unui template publicat (template + shots). */
export async function createDraftCopy(templateId: string) {
  const supabase = await getSupabaseServerClient();

  // Daca exista deja un draft, il returnam (nu duplicam)
  const existing = await getDraftFor(templateId);
  if (existing) return existing;

  const { data: orig, error: origErr } = await supabase
    .from("templates").select("*").eq("id", templateId).single();
  if (origErr || !orig) throw new Error(origErr?.message ?? "Template negăsit");

  const draftId = `${templateId}__draft`;

  const { error: insErr } = await supabase.from("templates").insert({
    id: draftId,
    parent_id: templateId,
    status: "draft",
    title: orig.title,
    promise: orig.promise,
    emotional_pitch: orig.emotional_pitch,
    category_id: orig.category_id,
    cover_url: orig.cover_url,
    preview_reel_url: orig.preview_reel_url,
    example_video_url: orig.example_video_url,
    concept_id: orig.concept_id,
    global_filter: orig.global_filter,
    is_recommended: orig.is_recommended,
    difficulty: orig.difficulty,
    created_by: orig.created_by,
  });
  if (insErr) throw new Error(insErr.message);

  // Copiaza shots-urile
  const { data: shots } = await supabase
    .from("shots").select("*").eq("template_id", templateId).order("sort_order");

  if (shots && shots.length > 0) {
    const copies = shots.map((s) => {
      const { id: _id, template_id: _tid, created_at: _c, updated_at: _u, ...rest } = s;
      return { ...rest, template_id: draftId };
    });
    const { error: shotsErr } = await supabase.from("shots").insert(copies);
    if (shotsErr) throw new Error(shotsErr.message);
  }

  // Copiaza si OUTPUTURILE (migratia 014). Fara asta, partenera ar deschide
  // ciorna si ar gasi lista de postari goala, desi pe publicat exista.
  const { data: outs } = await supabase
    .from("outputs").select("*").eq("template_id", templateId).order("sort_order");

  if (outs && outs.length > 0) {
    const outCopies = outs.map((o) => ({
      template_id: draftId,
      name: o.name,
      kind: o.kind,
      slots: o.slots,
      caption: o.caption,
      sort_order: o.sort_order,
    }));
    const { error: outErr } = await supabase.from("outputs").insert(outCopies);
    if (outErr) throw new Error(outErr.message);
  }

  revalidatePath("/dashboard");
  return draftId;
}

/** Publică modificările din draft peste originalul publicat (atomic, via RPC). */
export async function publishDraftChanges(draftId: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("publish_draft_changes", { draft_id: draftId });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

/** Renunță la modificări: șterge draft-copy-ul (originalul rămâne neatins). */
export async function discardDraftChanges(draftId: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("templates").delete().eq("id", draftId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

/* ═══════════════════════════════════════════════════════════════════════
 * OUTPUTURI (migratia 014) — ce POSTARI ies dintr-o sesiune.
 *
 * Un output cere un set ordonat de momente, prin `slot_key`. Regula de
 * potrivire e o linie: outputul e disponibil daca TOATE slot-urile lui au
 * captura. De aici rezulta automat "niciodata zero" — nu se programeaza
 * separat: cine a filmat 5 din 8 momente primeste outputurile complete.
 * ═══════════════════════════════════════════════════════════════════════ */

export async function listOutputs(templateId: string): Promise<OutputRow[]> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("outputs").select("*").eq("template_id", templateId).order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as OutputRow[];
}

export async function createOutput(templateId: string, name: string, kind: OutputKind = "reel") {
  const supabase = await getSupabaseServerClient();
  const { data: existing } = await supabase
    .from("outputs").select("sort_order").eq("template_id", templateId)
    .order("sort_order", { ascending: false }).limit(1);
  const nextOrder = ((existing?.[0]?.sort_order as number | undefined) ?? -1) + 1;

  const { error } = await supabase.from("outputs").insert({
    template_id: templateId, name, kind, slots: [], sort_order: nextOrder,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/templates/${templateId}`);
}

export async function updateOutput(
  outputId: string,
  templateId: string,
  patch: {
    name?: string;
    kind?: OutputKind;
    slots?: OutputSlot[];
    caption?: string | null;
    /** Migrația 015: implicitele de stil ale postării. */
    filter?: string | null;
    transition?: string | null;
    /** Migrația 016: care moment dă cadrul de copertă. */
    cover_slot?: string | null;
  },
) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("outputs").update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", outputId);
  // Intoarcem eroarea in loc s-o aruncam: o exceptie dintr-o server action
  // ajunge in UI ca "An error occurred in the Server Components render", cu
  // mesajul ascuns in productie. Asa vede partenera ce s-a intamplat.
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/templates/${templateId}`);
  return { ok: true as const };
}

export async function deleteOutput(outputId: string, templateId: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("outputs").delete().eq("id", outputId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/templates/${templateId}`);
}

// ════════════════════════════════════════════════════════════════════
//  BIBLIOTECA DE REELURI (migrația 017)
//
//  Variante de reel, nu postări. Nu ating `outputs`, deci nu pot ajunge din
//  greșeală în pachetul stilistei. Fără ciornă/publicare: e unealta de lucru
//  a partenerei, nu conținut care ajunge la cineva.
// ════════════════════════════════════════════════════════════════════

export async function createReelDesign(formData: FormData) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const name = String(formData.get("name") ?? "").trim();
  const reelType = String(formData.get("reel_type") ?? "").trim();

  if (!name) throw new Error("Numele e obligatoriu");
  if (!reelType) throw new Error("Tipul e obligatoriu");

  const { data: last } = await supabase
    .from("reel_designs").select("sort_order").eq("reel_type", reelType)
    .order("sort_order", { ascending: false }).limit(1).maybeSingle();

  const { data, error } = await supabase.from("reel_designs").insert({
    name,
    reel_type: reelType,
    slots: [],
    sort_order: ((last?.sort_order as number | undefined) ?? -1) + 1,
    created_by: user.id,
  }).select("id").single();

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/biblioteca");
  redirect(`/dashboard/biblioteca/${data.id}`);
}

export async function updateReelDesign(
  designId: string,
  patch: {
    name?: string;
    reel_type?: string;
    slots?: OutputSlot[];
    caption?: string | null;
    filter?: string | null;
    transition?: string | null;
    cover_slot?: string | null;
  },
) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("reel_designs").update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", designId);
  // Aceeasi regula ca la updateOutput: intoarcem eroarea in loc s-o aruncam.
  // O exceptie dintr-o server action ajunge in UI ca "An error occurred in the
  // Server Components render", cu mesajul ascuns in productie.
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/biblioteca/${designId}`);
  revalidatePath("/dashboard/biblioteca");
  return { ok: true as const };
}

/**
 * Duplicarea e cheia bibliotecii: nu faci 10 variante de la zero, faci una
 * bună și o ciupești. Fără ea, cele 10 sunt de zece ori munca.
 */
export async function duplicateReelDesign(designId: string) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: src, error: readErr } = await supabase
    .from("reel_designs").select("*").eq("id", designId).single();
  if (readErr || !src) throw new Error(readErr?.message ?? "Varianta nu există");

  const { data, error } = await supabase.from("reel_designs").insert({
    name: `${src.name} (copie)`,
    reel_type: src.reel_type,
    category_id: src.category_id,
    slots: src.slots,
    caption: src.caption,
    filter: src.filter,
    transition: src.transition,
    cover_slot: src.cover_slot,
    sort_order: (src.sort_order ?? 0) + 1,
    created_by: user.id,
  }).select("id").single();

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/biblioteca");
  redirect(`/dashboard/biblioteca/${data.id}`);
}

export async function deleteReelDesign(designId: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("reel_designs").delete().eq("id", designId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/biblioteca");
  redirect("/dashboard/biblioteca");
}

// ════════════════════════════════════════════════════════════════════
//  BIBLIOTECA DE MATERIALE (migrația 019)
//
//  Fișierul se urcă DIRECT din browser (footage de telefon depășește body-ul
//  unei server action → 413). Aici trece doar rândul de catalog.
// ════════════════════════════════════════════════════════════════════

export async function createMediaAsset(input: {
  name: string;
  kind: "video" | "image";
  url: string;
  storagePath: string;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
  sizeBytes?: number | null;
}) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Nu ești autentificat" };

  const { data, error } = await supabase.from("media_assets").insert({
    name: input.name,
    kind: input.kind,
    url: input.url,
    storage_path: input.storagePath,
    width: input.width ?? null,
    height: input.height ?? null,
    duration_sec: input.durationSec ?? null,
    size_bytes: input.sizeBytes ?? null,
    created_by: user.id,
  }).select("id").single();

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/media");
  return { ok: true as const, id: data.id as string };
}

export async function renameMediaAsset(assetId: string, name: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("media_assets")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", assetId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/media");
  return { ok: true as const };
}

/**
 * Șterge și rândul, și fișierul.
 *
 * Fișierul se șterge PRIMUL: dacă rândul ar pleca întâi și ștergerea din
 * bucket ar eșua, fișierul ar rămâne pe disc fără nimic care să-l mai
 * pomenească — un cost care crește tăcut. Invers, un fișier șters cu rândul
 * rămas se vede imediat (materialul nu se mai încarcă) și se poate curăța.
 */
export async function deleteMediaAsset(assetId: string, storagePath: string) {
  const supabase = await getSupabaseServerClient();
  const { error: rmErr } = await supabase.storage.from("samples").remove([storagePath]);
  if (rmErr) return { ok: false as const, error: rmErr.message };
  const { error } = await supabase.from("media_assets").delete().eq("id", assetId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/media");
  return { ok: true as const };
}

// ════════════════════════════════════════════════════════════════════
//  IMPORT DIN BIBLIOTECĂ + GENERAREA MOMENTELOR (migrația 020)
// ════════════════════════════════════════════════════════════════════

/**
 * Regenerează momentele șablonului din rezultatele lui.
 *
 * Momentele nu se mai scriu de mână: sunt reuniunea cadrelor cerute de
 * rezultatele importate. Se apelează după fiecare import sau scoatere.
 *
 * TREI REGULI CARE CONTEAZĂ:
 *
 *   1. Instrucțiunile se PĂSTREAZĂ. Potrivirea se face pe `slot_key`, deci un
 *      moment care există deja își ține tot ce a scris partenera — poziția
 *      telefonului, lumina, propoziția de acțiune. Se actualizează doar
 *      duratele. Fără asta, fiecare import ar șterge ore de muncă.
 *
 *   2. Durata e un MAXIM. Stilista filmează o dată; dacă un rezultat cere 2s
 *      și altul 3,5s, filmează 3,5 și fiecare taie din el. O sumă ar cere
 *      timp degeaba, un minim ar lăsa al doilea rezultat fără material.
 *
 *   3. Momentele rămase fără niciun rezultat se ȘTERG. Ăsta e chiar rostul
 *      inversării: nu se mai poate filma ceva ce nu folosește nimic.
 */
export async function syncShotsFromOutputs(templateId: string) {
  const supabase = await getSupabaseServerClient();

  const [{ data: outputsData }, { data: shotsData }] = await Promise.all([
    supabase.from("outputs").select("slots, kind").eq("template_id", templateId),
    supabase.from("shots").select("id, slot_key, sort_order").eq("template_id", templateId),
  ]);

  const outputs = (outputsData ?? []) as { slots: OutputSlot[]; kind: OutputKind }[];
  const existing = (shotsData ?? []) as { id: string; slot_key: string | null; sort_order: number }[];

  // Ce cere fiecare cadru, adunat peste toate rezultatele.
  //
  // CE SE CAPTUREAZĂ SE DEDUCE, nu se alege. Un moment e „și poză" nu fiindcă
  // așa e la balayage, ci fiindcă îl cer și un reel, și un carusel. Altfel
  // rămânea o mină: catalogul putea spune „video" în timp ce un carusel avea
  // nevoie de poză — stilista n-o făcea niciodată, iar caruselul nu se putea
  // construi. Tăcut, exact clasa de eroare pe care derivarea a eliminat-o.
  const needed = new Map<string, { label: string; sec: number; video: boolean; photo: boolean }>();
  for (const o of outputs) {
    // Reelurile și story-urile cer mișcare; caruselul cere imagine.
    const wantsPhoto = o.kind === "carousel";
    for (const slot of Array.isArray(o.slots) ? o.slots : []) {
      if (!slot?.slot) continue;
      const sec = slot.sec ?? 2;
      const cur = needed.get(slot.slot);
      if (!cur) {
        needed.set(slot.slot, {
          label: slot.label?.trim() || slot.slot,
          sec,
          video: !wantsPhoto,
          photo: wantsPhoto,
        });
      } else {
        cur.sec = Math.max(cur.sec, sec);
        cur.video = cur.video || !wantsPhoto;
        cur.photo = cur.photo || wantsPhoto;
        if (cur.label === slot.slot && slot.label?.trim()) cur.label = slot.label.trim();
      }
    }
  }

  const bySlot = new Map(existing.filter((s) => s.slot_key).map((s) => [s.slot_key as string, s]));
  const keys = Array.from(needed.keys());

  // Instrucțiunile vin din CATALOG, nu se scriu per șablon. Cadrul „before"
  // se filmează la fel la balayage și la tuns, deci se descrie o dată.
  const { data: typesData } = await supabase
    .from("shot_types").select("*").in("id", keys.length > 0 ? keys : ["-"]);
  const types = new Map(
    ((typesData ?? []) as ShotType[]).map((t) => [t.id, t]),
  );
  // Ordinea de filmare e a SERVICIULUI, deci a tipului — nu ordinea în care
  // le folosește o variantă anume. Cele fără tip în catalog rămân la coadă.
  keys.sort((a, b) => (types.get(a)?.sort_order ?? 9999) - (types.get(b)?.sort_order ?? 9999));

  // Ce nu mai cere nimeni pleacă — inclusiv momentele vechi fără etichetă,
  // rămase de pe vremea când se scriau de mână.
  const stale = existing.filter((s) => !s.slot_key || !needed.has(s.slot_key));
  if (stale.length > 0) {
    await supabase.from("shots").delete().in("id", stale.map((s) => s.id));
  }

  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const want = needed.get(key)!;
    // Rezervă de filmare peste ce se folosește: auto-trim-ul păstrează mijlocul
    // clipului, iar începutul și sfârșitul au mereu tremur și ezitare.
    const recording = Math.max(3, Math.ceil(want.sec + 2));
    const found = bySlot.get(key);

    const type = types.get(key);
    // Catalogul e MINIM, nu ultimul cuvânt: dacă tipul spune „ambele", rămâne
    // ambele chiar dacă rezultatele de aici cer doar filmare — poate fi o
    // cerință a momentului însuși (before/after se vor și ca poză).
    const fromType = type?.capture_kind ?? "video";
    const video = want.video || fromType === "video" || fromType === "both";
    const photo = want.photo || fromType === "photo" || fromType === "both";
    const captureKind: CaptureKind = video && photo ? "both" : photo ? "photo" : "video";

    if (found) {
      // Doar ce se deduce: ordinea și duratele. Instrucțiunile scrise de
      // parteneră PE ȘABLON rămân neatinse — un import n-are voie să șteargă
      // o excepție pe care a scris-o pentru serviciul ăsta.
      await supabase.from("shots").update({
        sort_order: i + 1,
        recording_duration: recording,
        final_usage_duration: want.sec,
        capture_kind: captureKind,
      }).eq("id", found.id);
      continue;
    }

    await supabase.from("shots").insert({
      template_id: templateId,
      slot_key: key,
      sort_order: i + 1,
      title: type?.name ?? want.label,
      pattern: null,
      recording_duration: recording,
      final_usage_duration: want.sec,
      countdown: 3,
      transition_type: "cut",
      filter_style: "none",
      effect: "none",
      hands_busy: false,
      // Din catalog, la prima creare. De aici încolo se pot suprascrie pe
      // șablon, unde chiar diferă.
      hook: type?.hook ?? null,
      instructions: type?.instructions ?? [],
      phone_hold: type?.phone_hold ?? null,
      shot_distance: type?.shot_distance ?? null,
      phone_movement: type?.phone_movement ?? null,
      light_sources: type?.light_sources ?? [],
      capture_kind: captureKind,
      example_image_url: type?.example_image_url ?? null,
    });
  }

  revalidatePath(`/dashboard/templates/${templateId}`);
}

/** Importă variante din bibliotecă în șablon, ca rezultate. */
export async function importDesigns(templateId: string, designIds: string[]) {
  const supabase = await getSupabaseServerClient();
  if (designIds.length === 0) return { ok: true as const };

  const { data: designs, error: readErr } = await supabase
    .from("reel_designs").select("*").in("id", designIds);
  if (readErr) return { ok: false as const, error: readErr.message };

  const { data: last } = await supabase
    .from("outputs").select("sort_order").eq("template_id", templateId)
    .order("sort_order", { ascending: false }).limit(1).maybeSingle();
  let order = ((last?.sort_order as number | undefined) ?? -1) + 1;

  const rows = (designs ?? []).map((d) => ({
    template_id: templateId,
    name: d.name,
    kind: d.kind ?? "reel",
    // Copie, nu referință: un șablon publicat n-are voie să se schimbe
    // fiindcă cineva a editat varianta în bibliotecă. Vezi migrația 020.
    slots: d.slots,
    caption: d.caption,
    filter: d.filter,
    transition: d.transition,
    cover_slot: d.cover_slot,
    from_design_id: d.id,
    sort_order: order++,
  }));

  const { error } = await supabase.from("outputs").insert(rows);
  if (error) return { ok: false as const, error: error.message };

  await syncShotsFromOutputs(templateId);
  return { ok: true as const };
}

/** Scoate un rezultat importat și regenerează momentele. */
export async function removeImportedOutput(outputId: string, templateId: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("outputs").delete().eq("id", outputId);
  if (error) return { ok: false as const, error: error.message };
  await syncShotsFromOutputs(templateId);
  return { ok: true as const };
}

// ════════════════════════════════════════════════════════════════════
//  CATALOGUL DE TIPURI DE CADRU (migrația 021)
// ════════════════════════════════════════════════════════════════════

/** Slug din nume: stabil, fără diacritice, folosibil ca cheie. */
function slugifyType(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "cadru";
}

export async function createShotType(name: string, family?: string) {
  const supabase = await getSupabaseServerClient();
  const clean = name.trim();
  if (!clean) return { ok: false as const, error: "Numele e obligatoriu" };

  // Slug-ul e CHEIA care leagă cadrele de momente, deci trebuie unic. La
  // coliziune adăugăm un sufix în loc să refuzăm: partenera poate avea două
  // tipuri cu nume asemănătoare, iar un refuz ar opri-o din lucru.
  const base = slugifyType(clean);
  let id = base;
  for (let i = 2; i < 40; i += 1) {
    const { data } = await supabase.from("shot_types").select("id").eq("id", id).maybeSingle();
    if (!data) break;
    id = `${base}-${i}`;
  }

  const { data: last } = await supabase
    .from("shot_types").select("sort_order")
    .order("sort_order", { ascending: false }).limit(1).maybeSingle();

  const { error } = await supabase.from("shot_types").insert({
    id,
    name: clean,
    family: family?.trim() || null,
    sort_order: ((last?.sort_order as number | undefined) ?? 0) + 10,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/cadre");
  return { ok: true as const, id };
}

export async function updateShotType(
  id: string,
  patch: {
    name?: string;
    family?: string | null;
    hook?: string | null;
    instructions?: string[];
    phone_hold?: string | null;
    shot_distance?: string | null;
    phone_movement?: string | null;
    light_sources?: LightSource[];
    capture_kind?: CaptureKind;
    example_image_url?: string | null;
    sort_order?: number;
  },
) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("shot_types")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/cadre");
  return { ok: true as const };
}

export async function deleteShotType(id: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("shot_types").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/cadre");
  return { ok: true as const };
}
