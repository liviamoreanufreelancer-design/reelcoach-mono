import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Upload, Check, Sparkles, X } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { CinematicBg } from "@/components/CinematicBg";
import { useBrand } from "@/hooks/useBrand";
import { rasterizeLogo, PROFESSION_PALETTE, type Vibe } from "@/lib/brand-store";
import { getProfessionId } from "@/lib/profession";
import { STYLE_PACKS } from "@/data/style-packs";
import { light, success } from "@/lib/haptic";
import intro from "@/assets/salon-intro.jpg";

export const Route = createFileRoute("/settings/brand-edit")({
  component: Onboarding,
});

const TOTAL = 4;

function Onboarding() {
  const nav = useNavigate();
  const { brand, logoUrl, loading, update } = useBrand();
  const [step, setStep] = useState(0);
  const [logoBlob, setLogoBlob] = useState<Blob | undefined>(undefined);
  const [localLogoUrl, setLocalLogoUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [primary, setPrimary] = useState("#D4AF37");
  const [accent, setAccent] = useState("#F4E2B8");
  const [vibe, setVibe] = useState<Vibe>("luxury");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Hydrate from existing brand on first mount.
  useEffect(() => {
    if (!brand) return;
    setName(brand.name);
    setHandle(brand.handle);
    setPrimary(brand.primary);
    setAccent(brand.accent);
    setVibe(brand.vibe);
    setPhone(brand.phone ?? "");
    setLocation(brand.location ?? "");
    if (logoUrl) setLocalLogoUrl(logoUrl);
  }, [brand, logoUrl]);

  const profId = useMemo(() => getProfessionId(), []);

  const onPickLogo = async (f?: File | null) => {
    if (!f) return;
    light();
    try {
      const blob = await rasterizeLogo(f, 512);
      setLogoBlob(blob);
      if (localLogoUrl?.startsWith("blob:") && localLogoUrl !== logoUrl) URL.revokeObjectURL(localLogoUrl);
      setLocalLogoUrl(URL.createObjectURL(blob));
    } catch {
      // ignore
    }
  };

  const onRemoveLogo = () => {
    light();
    // Revoke the blob URL if we created one in this session
    if (localLogoUrl?.startsWith("blob:")) URL.revokeObjectURL(localLogoUrl);
    setLogoBlob(undefined);
    setLocalLogoUrl(null);
    // Reset the file input so the user can pick the same file again later
    if (fileRef.current) fileRef.current.value = "";
  };

  const suggestPalette = () => {
    const p = profId ? PROFESSION_PALETTE[profId] : null;
    if (!p) return;
    light();
    setPrimary(p.primary);
    setAccent(p.accent);
  };

  const finish = async () => {
    setSaving(true);
    success();
    await update({
      name: name.trim(),
      handle: handle.replace(/^@/, "").trim(),
      primary,
      accent,
      vibe,
      phone: phone.trim() || undefined,
      location: location.trim() || undefined,
      logoBlob,
    });
    setSaving(false);
    nav({ to: "/settings/brand" });
  };

  const skip = () => {
    light();
    nav({ to: "/settings/brand" });
  };

  const next = () => {
    light();
    if (step >= TOTAL - 1) void finish();
    else setStep((s) => s + 1);
  };

  const prev = () => {
    light();
    if (step === 0) nav({ to: "/settings/brand" });
    else setStep((s) => s - 1);
  };

  if (loading) return <PhoneShell><div /></PhoneShell>;

  return (
    <PhoneShell>
      <CinematicBg src={intro} blur overlay={0.85} kenBurns={false} />
      <div className="relative z-10 flex flex-col h-full px-6 pt-4 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={prev} className="w-10 h-10 rounded-full glass flex items-center justify-center" aria-label="Înapoi">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-[10px] tracking-[0.4em] uppercase text-[#E8D5B5] font-semibold">
            Brand · {step + 1} / {TOTAL}
          </span>
          <button onClick={skip} className="w-10 h-10 rounded-full flex items-center justify-center text-white/55" aria-label="Sari peste">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 mt-4 px-1">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <span key={i} className={`h-[3px] flex-1 rounded-full transition-all ${i <= step ? "bg-gradient-to-r from-[#F4E4C1] via-[#E8D5B5] to-[#D4AF37]" : "bg-white/10"}`} />
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col mt-6 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {step === 0 && <StepLogo logoUrl={localLogoUrl} onPick={onPickLogo} onRemove={onRemoveLogo} fileRef={fileRef} />}
          {step === 1 && <StepIdentity name={name} handle={handle} setName={setName} setHandle={setHandle} />}
          {step === 2 && <StepColors primary={primary} accent={accent} setPrimary={setPrimary} setAccent={setAccent} onSuggest={profId ? suggestPalette : undefined} />}
          {step === 3 && <StepVibe vibe={vibe} setVibe={setVibe} phone={phone} setPhone={setPhone} location={location} setLocation={setLocation} />}
        </div>

        {/* CTA */}
        <button
          onClick={next}
          disabled={saving}
          className="mt-4 h-14 rounded-full bg-gradient-to-r from-[#F4E4C1] via-[#E8D5B5] to-[#D4AF37] text-black font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(244,228,193,0.4)] active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {step === TOTAL - 1 ? <>Salvează brand-ul <Check className="w-4 h-4" /></> : <>Continuă <ChevronRight className="w-4 h-4" /></>}
        </button>
        {step < TOTAL - 1 && (
          <button onClick={skip} className="mt-2 h-10 text-[11px] tracking-widest uppercase text-white/45">
            Sari peste — completez mai târziu
          </button>
        )}
      </div>
    </PhoneShell>
  );
}

function StepLogo({
  logoUrl,
  onPick,
  onRemove,
  fileRef,
}: {
  logoUrl: string | null;
  onPick: (f?: File | null) => void;
  onRemove: () => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div>
      <h1 className="font-display text-[36px] leading-tight text-white">
        Logo-ul tău <em className="italic text-[#E8D5B5]">·</em>
      </h1>
      <p className="text-white/60 text-sm mt-2 max-w-[22rem]">
        Apare discret în colț pe fiecare reel + pe ecranul final. PNG sau SVG, ideal cu fundal transparent.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-3">
        <LogoPreview url={logoUrl} bg="#FFFFFF" label="Pe fundal alb" />
        <LogoPreview url={logoUrl} bg="#0a0a0a" label="Pe fundal negru" />
      </div>
      <button
        onClick={() => fileRef.current?.click()}
        className="mt-6 w-full h-14 rounded-2xl glass-lux flex items-center justify-center gap-2 text-white"
      >
        <Upload className="w-4 h-4 text-[#E8D5B5]" />
        <span className="text-sm font-medium">{logoUrl ? "Schimbă logo-ul" : "Încarcă logo (PNG/SVG)"}</span>
      </button>
      {logoUrl && (
        <button
          onClick={onRemove}
          className="mt-2 w-full h-12 rounded-2xl border border-white/10 flex items-center justify-center gap-2 text-white/70 active:scale-[0.99] transition"
        >
          <span className="text-sm font-medium">Renunță la logo</span>
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
    </div>
  );
}

function LogoPreview({ url, bg, label }: { url: string | null; bg: string; label: string }) {
  return (
    <div>
      <div className="aspect-square rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden" style={{ background: bg }}>
        {url ? (
          <img src={url} alt="" className="max-w-[80%] max-h-[80%] object-contain" />
        ) : (
          <span className="text-xs" style={{ color: bg === "#FFFFFF" ? "#9999aa" : "#555" }}>fără logo</span>
        )}
      </div>
      <p className="mt-1.5 text-center text-[10px] tracking-widest uppercase text-white/40">{label}</p>
    </div>
  );
}

function StepIdentity({ name, handle, setName, setHandle }: { name: string; handle: string; setName: (s: string) => void; setHandle: (s: string) => void }) {
  return (
    <div>
      <h1 className="font-display text-[36px] leading-tight text-white">
        Cum te <em className="italic text-[#E8D5B5]">cheamă</em>?
      </h1>
      <p className="text-white/60 text-sm mt-2">Numele apare pe outro și sub video.</p>
      <div className="mt-8 space-y-4">
        <Field label="Nume brand sau salon">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 40))}
            placeholder="Salon Elena"
            className="w-full bg-transparent outline-none text-white text-[18px] placeholder:text-white/30"
          />
        </Field>
        <Field label="Handle Instagram / TikTok">
          <div className="flex items-center gap-2">
            <span className="text-[#E8D5B5] text-[18px]">@</span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/^@/, "").replace(/\s+/g, "").slice(0, 30))}
              placeholder="salonelena"
              autoCapitalize="none"
              className="w-full bg-transparent outline-none text-white text-[18px] placeholder:text-white/30"
            />
          </div>
        </Field>
      </div>
    </div>
  );
}

function StepColors({ primary, accent, setPrimary, setAccent, onSuggest }: { primary: string; accent: string; setPrimary: (s: string) => void; setAccent: (s: string) => void; onSuggest?: () => void }) {
  return (
    <div>
      <h1 className="font-display text-[36px] leading-tight text-white">
        Culorile <em className="italic text-[#E8D5B5]">brandului</em>
      </h1>
      <p className="text-white/60 text-sm mt-2">Folosite la text și outro. Sari peste = champagne gold default.</p>
      <div className="mt-8 grid grid-cols-2 gap-4">
        <ColorField label="Primary" value={primary} onChange={setPrimary} />
        <ColorField label="Accent" value={accent} onChange={setAccent} />
      </div>
      {onSuggest && (
        <button onClick={onSuggest} className="mt-5 w-full h-12 rounded-2xl glass flex items-center justify-center gap-2 text-white text-sm">
          <Sparkles className="w-4 h-4 text-[#E8D5B5]" />
          Sugerează după meserie
        </button>
      )}
      {/* Preview swatch */}
      <div className="mt-6 rounded-2xl p-5 border border-white/10" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
        <p className="text-[10px] tracking-[0.4em] uppercase text-black/70 font-semibold">Preview</p>
        <p className="font-display italic text-3xl text-black mt-2">Salonul tău</p>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  return (
    <label className="block">
      <span className="block text-[10px] tracking-widest uppercase text-white/45 mb-2">{label}</span>
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 p-2 bg-white/[0.03]">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-12 rounded-xl border-0 bg-transparent cursor-pointer"
          style={{ padding: 0 }}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent outline-none text-white text-sm uppercase tracking-wider"
        />
      </div>
    </label>
  );
}

function StepVibe({ vibe, setVibe, phone, setPhone, location, setLocation }: {
  vibe: Vibe; setVibe: (v: Vibe) => void;
  phone: string; setPhone: (s: string) => void;
  location: string; setLocation: (s: string) => void;
}) {
  return (
    <div>
      <h1 className="font-display text-[36px] leading-tight text-white">
        Stil + <em className="italic text-[#E8D5B5]">contact</em>
      </h1>
      <p className="text-white/60 text-sm mt-2">Stilul setează default-ul pentru text și tranziții. Contactul apare la final.</p>

      <div className="mt-6 space-y-2">
        {(["luxury", "soft", "bold"] as Vibe[]).map((v) => {
          const sp = STYLE_PACKS[v];
          const active = vibe === v;
          return (
            <button
              key={v}
              onClick={() => setVibe(v)}
              className={`w-full text-left rounded-2xl p-4 border transition ${active ? "border-[#E8D5B5] bg-white/[0.06]" : "border-white/10 bg-white/[0.02]"}`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-display text-2xl ${active ? "text-[#E8D5B5]" : "text-white"}`}>{sp.label}</span>
                {active && <Check className="w-4 h-4 text-[#E8D5B5]" />}
              </div>
              <p className="text-white/55 text-xs mt-1">{sp.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-3">
        <Field label="Telefon (opțional)">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.slice(0, 24))}
            placeholder="0722 000 000"
            inputMode="tel"
            className="w-full bg-transparent outline-none text-white text-[16px] placeholder:text-white/30"
          />
        </Field>
        <Field label="Locație (opțional)">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value.slice(0, 60))}
            placeholder="București, Sector 1"
            className="w-full bg-transparent outline-none text-white text-[16px] placeholder:text-white/30"
          />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <span className="block text-[10px] tracking-widest uppercase text-white/45 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
