import type { Category, Subcategory, ReelTemplate } from "./shots";

import coverBeforeAfter from "@/assets/par-cat/stock/before-after.jpg";
import coverHomeBg from "@/assets/home-bg.jpg";
import coverSalonIntro from "@/assets/salon-intro.jpg";
import coverLuxury from "@/assets/template-luxury.jpg";
import coverReaction from "@/assets/template-reaction.jpg";
import coverFear from "@/assets/template-fear.jpg";
import coverAfter from "@/assets/template-after.jpg";

/**
 * Hair categories — flat structure, one screen per category in the swipe
 * catalog. Each has its own hero image. The order here is the swipe order.
 *
 * To add more professions, add separate category entries with a different
 * `profession` field, and filter on the catalog screen.
 */
export const CATEGORIES: Category[] = [
  {
    id: "before-after",
    label: "Before & After",
    blurb: "Metamorfoza clasică, în câteva cadre.",
    icon: "Wand2",
    cover: coverBeforeAfter,
    profession: "par",
  },
  {
    id: "glow-up",
    label: "Glow Up",
    blurb: "Procesul premium, fără transformare dramatică.",
    icon: "Sparkles",
    cover: coverLuxury,
    profession: "par",
  },
  {
    id: "reveal",
    label: "Reveal",
    blurb: "Suspans și dezvăluire. Efectul WOW.",
    icon: "Wand2",
    cover: coverAfter,
    profession: "par",
  },
  {
    id: "hair-tips",
    label: "Hair Tips",
    blurb: "Sfaturi care construiesc autoritate.",
    icon: "Sparkles",
    cover: coverHomeBg,
    profession: "par",
  },
  {
    id: "salon-pov",
    label: "Salon POV",
    blurb: "Atmosfera salonului, behind the scenes.",
    icon: "Camera",
    cover: coverSalonIntro,
    profession: "par",
  },
  {
    id: "hair-mistakes",
    label: "Hair Mistakes",
    blurb: "Ce să nu faci. Educație clară.",
    icon: "Wand2",
    cover: coverFear,
    profession: "par",
  },
  {
    id: "bridal-hair",
    label: "Bridal Hair",
    blurb: "Coafuri de mireasă și ocazii speciale.",
    icon: "Sparkles",
    cover: coverReaction,
    profession: "par",
  },
];

/**
 * Subcategories are kept as a compatibility layer — each template still
 * has a `subcategoryId`, but now subcategories simply map 1:1 to categories.
 * This lets the swipe catalog stay flat while existing code that filters
 * by subcategoryId keeps working.
 */
export const SUBCATEGORIES: Subcategory[] = CATEGORIES.map((c) => ({
  id: c.id,
  categoryId: c.id,
  label: c.label,
  blurb: c.blurb,
}));

export const REEL_TEMPLATES: ReelTemplate[] = [
  {
    id: "wow-transformation",
    subcategoryId: "before-after",
    title: "Nu o să crezi transformarea asta",
    promise: "Un reel cu efect WOW prin contrast puternic before/after. Filmezi relaxat, appul taie și montează singur.",
    emotionalPitch: "Construit pentru efectul WOW. Începi calm, creezi tensiune, ajungi la un reveal care oprește scroll-ul. La final, clienta zâmbește — momentul care vinde programări.",
    cover: coverBeforeAfter,
    professions: ["par"],
    sections: [
      {
        id: "sec-before",
        title: "Punctul de plecare",
        shots: [
          {
            id: "shot-before",
            pattern: "before",
            title: "Filmează BEFORE-ul",
            instructions: [
              "Așază clienta cu fața spre telefon",
              "Încadrează de la piept în sus, cu tot părul vizibil",
              "Sprijină telefonul vertical și nu-l mișca",
              "Cere-i clientei să stea serioasă o secundă",
            ],
            mustShow: ["Tot părul", "Expresia clientei", "Aspectul „înainte”"],
            overlayText: "Nu o să crezi transformarea asta.",
            recordingDuration: 4,
            finalUsageDuration: 2,
            mustSee: ["Fața clientei", "Tot părul", "Expresie serioasă"],
            howShoot: [
              { icon: "phone-vertical", label: "Telefon vertical", detail: "Sprijinit sau pe trepied" },
              { icon: "distance", label: "1.5 m distanță", detail: "Încadrare piept-sus" },
              { icon: "duration", label: "Durată", detail: "4 secunde" },
            ],
          },
        ],
      },
      {
        id: "sec-process",
        title: "Transformarea",
        shots: [
          {
            id: "shot-process",
            pattern: "process",
            title: "Filmează transformarea",
            handsBusy: true,
            instructions: [
              "Sprijină telefonul aproape de zona de lucru — sau roagă o colegă să-l țină",
              "Verifică să se vadă bine mâinile și părul",
              "Lucrează normal până se oprește filmarea",
            ],
            mustShow: ["Procesul", "Mișcarea părului", "Detalii lucioase"],
            overlayText: "Wait for the reveal…",
            recordingDuration: 5,
            finalUsageDuration: 2,
            mustSee: ["Mâinile clar", "Zona la care lucrezi", "Mișcarea părului"],
            howShoot: [
              { icon: "phone-vertical", label: "Telefon aproape", detail: "Sau ținut de o colegă" },
              { icon: "duration", label: "Durată", detail: "5 secunde" },
            ],
          },
        ],
      },
      {
        id: "sec-reveal",
        title: "Marele reveal",
        shots: [
          {
            id: "shot-suspense",
            pattern: "suspense",
            title: "Creează suspans",
            instructions: [
              "Filmează clienta din spate, fără să-i arăți fața",
              "Ține telefonul stabil în mână",
              "Cere-i să întoarcă puțin capul",
            ],
            mustShow: ["Părul final", "Mișcarea lui", "Doar puțin din transformare"],
            overlayText: "Wait for the reveal…",
            recordingDuration: 4,
            finalUsageDuration: 2,
            mustSee: ["Clienta din spate", "Părul nou", "Doar o frântură de față"],
            howShoot: [
              { icon: "phone-vertical", label: "Telefon în mână", detail: "Stabil, fără tremurat" },
              { icon: "duration", label: "Durată", detail: "4 secunde" },
            ],
          },
          {
            id: "shot-reveal",
            pattern: "reveal",
            title: "Filmează reveal-ul",
            instructions: [
              "Cere-i clientei să se întoarcă încet spre telefon",
              "La final, cere-i un hair flip ușor",
              "Ține telefonul stabil, în lumină bună",
            ],
            mustShow: ["Culoarea completă", "Luciul", "Volumul", "Expresia clientei"],
            overlayText: "Luxury hair energy.",
            recordingDuration: 6,
            finalUsageDuration: 4,
            mustSee: ["Părul complet", "Luciul și volumul", "Fața clientei"],
            howShoot: [
              { icon: "phone-vertical", label: "Telefon stabil", detail: "În mână, fără tremurat" },
              { icon: "movement", label: "Clienta se întoarce", detail: "Încet, cu hair flip final" },
              { icon: "duration", label: "Durată", detail: "6 secunde" },
            ],
          },
          {
            id: "shot-confidence",
            pattern: "confidence",
            title: "Filmează energia finală",
            instructions: [
              "Cere-i clientei să zâmbească discret",
              "Cere-i să-și atingă ușor părul",
              "Cere-i să facă doi pași spre telefon",
              "Ține telefonul stabil și filmează natural",
            ],
            mustShow: ["Încrederea", "Transformarea", "Energia feminină"],
            overlayText: "Luxury hair energy.",
            recordingDuration: 5,
            finalUsageDuration: 3,
            mustSee: ["Zâmbet discret", "Atingerea părului", "Energia clientei"],
            howShoot: [
              { icon: "phone-vertical", label: "Telefon stabil", detail: "În mână" },
              { icon: "movement", label: "Clienta vine spre tine", detail: "Doi pași, natural" },
              { icon: "duration", label: "Durată", detail: "5 secunde" },
            ],
          },
        ],
      },
    ],
  },
];

/**
 * Seed templates — bundled with the app. Available offline and used as
 * fallback when Supabase is unreachable or returns 0 templates.
 *
 * Currently a single template (`wow-transformation`) so the app always has
 * something to show on first launch. Published templates from Supabase
 * supersede these on a per-id basis.
 */
export const SEED_TEMPLATES = REEL_TEMPLATES;

/**
 * Runtime template cache, populated by TemplatesProvider when it boots up
 * (reads IndexedDB + fetches Supabase). Sync consumers — places that
 * can't use React hooks like getSelectedScenario() — read from here.
 *
 * Falls back to SEED_TEMPLATES on cold start before the provider mounts.
 */
let runtimeTemplates: ReelTemplate[] = SEED_TEMPLATES;

/** Called by TemplatesProvider whenever the active template list changes. */
export function setRuntimeTemplates(list: ReelTemplate[]) {
  runtimeTemplates = list;
}

export const getCategory = (id: string) => CATEGORIES.find((c) => c.id === id);
export const getCategoriesForProfession = (profession: string) =>
  CATEGORIES.filter((c) => c.profession === profession);
export const getTemplatesForCategory = (categoryId: string) =>
  runtimeTemplates.filter((t) => t.subcategoryId === categoryId);
export const getSubcategory = (id: string) => SUBCATEGORIES.find((s) => s.id === id);
export const getSubcategoriesForCategory = (categoryId: string) =>
  SUBCATEGORIES.filter((s) => s.categoryId === categoryId);
export const getTemplate = (id: string) => runtimeTemplates.find((t) => t.id === id);
export const getTemplatesForSubcategory = (subcategoryId: string) =>
  runtimeTemplates.filter((t) => t.subcategoryId === subcategoryId);
export const DEFAULT_TEMPLATE_ID = REEL_TEMPLATES[0].id;
