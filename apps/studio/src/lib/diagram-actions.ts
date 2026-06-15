"use server";
/**
 * Server actions pentru biblioteca GLOBALA de diagrame (migration 007).
 * Diagrama = imagine generata + etichete (category/position/lighting/distance).
 * Refolosibila cross-reel: o diagrama o folosesti in orice reel/scena.
 */
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "./supabase-server";
import type { DiagramRow } from "./db-types";

export interface DiagramFilters {
  category?: string;
  position?: string;
  distance?: string;
  lighting?: string; // un singur tag de lumina (filtru: diagrame care contin acest tag)
}

/** Listeaza biblioteca, optional filtrata pe etichete. */
export async function listDiagrams(filters: DiagramFilters = {}): Promise<DiagramRow[]> {
  const supabase = await getSupabaseServerClient();
  let q = supabase.from("diagrams").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  if (filters.category) q = q.eq("category", filters.category);
  if (filters.position) q = q.eq("position", filters.position);
  if (filters.distance) q = q.eq("distance", filters.distance);
  if (filters.lighting) q = q.contains("lighting", [filters.lighting]);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as DiagramRow[];
}

/** Creeaza o diagrama: urca imaginea in bucket 'diagrams' + insert rand cu etichete. */
export async function createDiagram(formData: FormData) {
  const supabase = await getSupabaseServerClient();
  const file = formData.get("image") as File | null;
  const name = (formData.get("name") as string)?.trim();
  const category = (formData.get("category") as string) || "general";
  const position = (formData.get("position") as string) || null;
  const distance = (formData.get("distance") as string) || null;
  const lighting = formData.getAll("lighting").map((v) => String(v)).filter(Boolean);

  if (!file || file.size === 0) throw new Error("Niciun fisier selectat");
  if (file.size > 5 * 1024 * 1024) throw new Error("Imaginea depaseste 5MB");
  if (!name) throw new Error("Numele diagramei e obligatoriu");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${category}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("diagrams").upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) throw new Error(upErr.message);
  const { data: pub } = supabase.storage.from("diagrams").getPublicUrl(path);

  const { error: insErr } = await supabase.from("diagrams").insert({
    name, image_url: pub.publicUrl, category, position, distance, lighting,
  });
  if (insErr) throw new Error(insErr.message);
  revalidatePath("/dashboard/diagrams");
}

/** Sterge o diagrama din biblioteca (scenele care o foloseau raman cu diagram_id null prin ON DELETE SET NULL). */
export async function deleteDiagram(id: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("diagrams").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/diagrams");
}

/** Asociaza (sau scoate) o diagrama la o scena. */
export async function setDiagramOnShot(shotId: string, templateId: string, diagramId: string | null) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("shots").update({ diagram_id: diagramId }).eq("id", shotId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/templates/${templateId}`);
}
