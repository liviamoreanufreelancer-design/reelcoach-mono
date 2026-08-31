import { MEDIA_MAX_WIDTH, type MediaAsset } from "./db-types";

/**
 * Formatul postării-imagine: 4:5, portretul de Instagram și Facebook
 * (1080×1350). E cel mai înalt format pe care ambele îl acceptă fără să taie —
 * la 9:16 rețeaua decupează, la 1:1 pierzi înălțime degeaba.
 *
 * Stă aici ca să fie o singură sursă: cartonașele, editorul și exportul
 * folosesc același raport. Dacă se schimbă vreodată, se schimbă într-un loc.
 */
export const PHOTO_ASPECT = 4 / 5;

/** Formatul vertical: reeluri și povești. */
export const VIDEO_ASPECT = 9 / 16;

/**
 * Materialul unui moment e imagine sau filmare?
 *
 * Se salvează amândouă în același câmp — e „materialul momentului", nu
 * neapărat un video. Diferența se citește din extensie, și contează în trei
 * locuri: ce element îl încarcă (`<img>` vs `<video>`), ce controale au sens
 * (durata și viteza n-au ce descrie pe o imagine) și cum se desenează.
 *
 * La POVEȘTI decizia e per moment, nu per variantă: aceeași poveste poate
 * avea o imagine 9:16 și o filmare, una după alta.
 */
export function isImageUrl(url: string | null | undefined): boolean {
  return !!url && /\.(jpe?g|png|webp|gif|avif|heic)(\?|$)/i.test(url);
}

/**
 * Avertismentul de mărime e DOAR pentru filmări.
 *
 * Costul rezoluției vine din randarea în timp real: fiecare cadru de sursă
 * trebuie decodat în bugetul de ~33ms, iar un 4K îl depășește singur (măsurat:
 * 9fps din 24). Pozele nu trec pe acolo — devin postări-imagine separate, nu
 * intră în montaj. O poză mare nu încetinește nimic, iar rezoluția în plus e
 * chiar utilă: Instagram o scalează el, gratis pentru noi.
 *
 * Un avertisment pus și pe poze ar fi fost zgomot — iar un avertisment care
 * apare unde nu trebuie e primul pas spre a fi ignorat și acolo unde trebuie.
 */
export function isOversized(asset: MediaAsset): boolean {
  if (asset.kind !== "video") return false;
  return (asset.width ?? 0) > MEDIA_MAX_WIDTH;
}

/**
 * Ce formă are cartonașul materialului.
 *
 * Filmările sunt 9:16 — se fac pentru reeluri, atât. Pozele își păstrează
 * forma lor reală: o poză de rezultat e 4:5 sau pătrată, iar afișată ca 9:16 ar
 * fi tăiată exact acolo unde e subiectul. În plus, forma reală arată dintr-o
 * privire dacă cineva a urcat din greșeală o poză orizontală.
 */
export function tileAspect(asset: MediaAsset): number {
  if (asset.kind === "video") return 9 / 16;
  if (asset.width && asset.height) return asset.width / asset.height;
  return 4 / 5; // formatul obișnuit de postare-imagine
}

/**
 * Cum se așază materialul în cartonașul lui.
 *
 * `cover` umple și taie ce iese. E corect când cartonașul are exact forma
 * materialului — la o poză cu dimensiuni cunoscute, „taie" zero.
 *
 * Când dimensiunile n-au putut fi citite (codec pe care browserul nu-l
 * deschide), forma cartonașului e o presupunere, iar `cover` ar tăia după ea.
 * Acolo trecem pe `contain`: mai bine niște margini goale decât o poză
 * ciuntită fără ca cineva să știe.
 */
export function tileFit(asset: MediaAsset): "cover" | "contain" {
  if (asset.kind === "video") return "cover";
  return asset.width && asset.height ? "cover" : "contain";
}
