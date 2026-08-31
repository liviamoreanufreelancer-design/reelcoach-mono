"use client";
/**
 * StudioNav — bara laterală permanentă.
 *
 * Înainte: bara de sus avea două intrări, iar celelalte trei secțiuni erau
 * butoane pe pagina de șabloane. Din Materiale nu puteai ajunge la catalog
 * fără să te întorci. Cinci camere, o singură ușă.
 *
 * Regula pe care o urmăm (și pe care WordPress o respectă de douăzeci de ani):
 * fiecare secțiune e la UN click, de oriunde. O bară laterală care nu dispare
 * costă 200 de pixeli și scutește toate drumurile înapoi.
 *
 * ORDINEA NU E ALFABETICĂ, e a lucrului: întâi ce livrezi (sesiuni, reeluri),
 * apoi din ce e făcut (momente, materiale). Aceeași logică pentru care
 * WordPress pune Posts înaintea lui Media — deliverable-ul primul, ingredientele
 * după. Iar cine deschide Studio prima oară citește ordinea și înțelege modelul
 * fără să i-l explice cineva.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Layers, Camera, Image as ImageIcon } from "lucide-react";

type Item = { href: string; label: string; hint: string; Icon: typeof Film };

const DELIVERABILE: Item[] = [
  { href: "/dashboard", label: "Sesiuni", hint: "Serviciile din app", Icon: Layers },
  { href: "/dashboard/variante", label: "Variante", hint: "Reeluri, carusele, povești", Icon: Film },
];

const RESURSE: Item[] = [
  { href: "/dashboard/momente", label: "Momente", hint: "Ce se filmează, descris o dată", Icon: Camera },
  { href: "/dashboard/media", label: "Materiale", hint: "Filmări și poze", Icon: ImageIcon },
];

export default function StudioNav() {
  const pathname = usePathname();

  const isOn = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" || pathname.startsWith("/dashboard/templates")
                          : pathname.startsWith(href);

  const renderItem = (it: Item) => {
    const on = isOn(it.href);
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={on ? "page" : undefined}
        className={`flex items-start gap-2.5 rounded-lg px-3 py-2 transition ${
          on ? "bg-[#EDE8FF] text-[#5B34FF]" : "text-[#4B4B4B] hover:bg-[#F6F4FE]"
        }`}
      >
        <it.Icon className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.9} />
        <span className="min-w-0">
          <span className="block text-[13.5px] font-medium leading-tight">{it.label}</span>
          <span className={`block text-[11px] leading-tight mt-0.5 ${on ? "text-[#5B34FF]/70" : "text-[#9A9A9A]"}`}>
            {it.hint}
          </span>
        </span>
      </Link>
    );
  };

  return (
    <nav aria-label="Secțiunile Studio" className="flex flex-col gap-1">
      {DELIVERABILE.map(renderItem)}
      <div className="h-px bg-[#E7E3F5] my-2.5 mx-3" />
      {RESURSE.map(renderItem)}
    </nav>
  );
}
