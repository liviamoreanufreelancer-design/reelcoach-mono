import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Upload, Check, Sparkles } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { useBrand } from "@/hooks/useBrand";
import { rasterizeLogo, PROFESSION_PALETTE, type Vibe } from "@/lib/brand-store";
import { getProfessionId } from "@/lib/profession";
import { STYLE_PACKS } from "@/data/style-packs";
import { light, success } from "@/lib/haptic";

export const Route = createFileRoute("/settings-brand-edit")({
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
  const [primary, setPrimary] = useState("#5B34FF");
  const [accent, setAccent] = useState("#F5B228");
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
    nav({ to: "/settings" });
  };

  const skip = () => {
    light();
    nav({ to: "/settings" });
  };

  const next = () => {
    light();
    if (step >= TOTAL - 1) void finish();
    else setStep((s) => s + 1);
  };

  const prev = () => {
    light();
    if (step === 0) nav({ to: "/settings" });
    else setStep((s) => s - 1);
  };

  if (loading) return <PhoneShell><div /></PhoneShell>;

  return (
    <PhoneShell>
      <div className="flex flex-col h-full bg-[#F8F8FA] text-[#1F1F1F]">
        <div className="shrink-0" style={{ height: "max(env(safe-area-inset-top, 56px), 56px)" }} />
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-[22px] pb-1">
          <button onClick={prev} className="w-10 h-10 rounded-full bg-white border border-[#E6E6EA] shadow-[0_4px_14px_-10px_rgba(40,24,110,0.3)] grid place-items-center active:scale-95 transition" aria-label="Înapoi">
            <ChevronLeft className="w-[22px] h-[22px]" strokeWidth={2} />
          </button>
          {step < TOTAL - 1 ? (
            <button onClick={skip} className="font-semibold text-[14px] text-[#6B6B6B] active:opacity-60 transition">Sari peste</button>
          ) : <span className="w-10" />}
        </div>

        {/* Progress bar */}
        <div className="shrink-0 flex items-center gap-1.5 mt-3.5 px-[22px]">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <span key={i} className={`h-[5px] rounded-full transition-all duration-300 ${i <= step ? "bg-[#5B34FF] flex-[1.4]" : "bg-[#E6E6EA] flex-1"}`} />
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col mt-6 px-[22px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {step === 0 && <StepLogo logoUrl={localLogoUrl} onPick={onPickLogo} onRemove={onRemoveLogo} fileRef={fileRef} />}
          {step === 1 && <StepIdentity name={name} handle={handle} setName={setName} setHandle={setHandle} />}
          {step === 2 && <StepColors primary={primary} accent={accent} setPrimary={setPrimary} setAccent={setAccent} onSuggest={profId ? suggestPalette : undefined} />}
          {step === 3 && <StepVibe vibe={vibe} setVibe={setVibe} phone={phone} setPhone={setPhone} location={location} setLocation={setLocation} />}
        </div>

        {/* CTA */}
        <div className="shrink-0 px-[22px] pt-3" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 28px), 28px)" }}>
          <button
            onClick={next}
            disabled={saving}
            className="w-full h-[58px] rounded-[16px] bg-[#5B34FF] text-white font-bold text-[16px] shadow-[0_12px_26px_-12px_rgba(91,52,255,0.8)] flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
          >
            {step === TOTAL - 1 ? <>Salvează <Check className="w-4 h-4" /></> : <>Continuă <ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>
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
      <h2 className="font-display font-bold text-[28px] leading-[1.05] text-[#1F1F1F]">Logo-ul tău</h2>
      <p className="text-[15px] text-[#6B6B6B] mt-1">Apare discret pe fiecare reel. PNG sau SVG, ideal transparent.</p>
      <div className="grid grid-cols-2 gap-3.5 mt-5">
        <LogoPreview url={logoUrl} bg="#FFFFFF" label="pe fundal alb" />
        <LogoPreview url={logoUrl} bg="#1F1F1F" label="pe fundal negru" />
      </div>
      <button
        onClick={() => fileRef.current?.click()}
        className="flex items-center justify-center gap-2 w-full h-[52px] rounded-[14px] mt-4 bg-[#EDE8FF] text-[#5B34FF] font-bold text-[15px] border-[1.5px] border-dashed border-[#5B34FF]/40 active:scale-[0.98] transition"
      >
        <Upload className="w-[18px] h-[18px]" />
        {logoUrl ? "Schimbă logo-ul" : "Încarcă logo (PNG/SVG)"}
      </button>
      {logoUrl && (
        <button
          onClick={onRemove}
          className="mt-2 w-full h-12 rounded-[14px] border border-[#E6E6EA] bg-white flex items-center justify-center text-[#6B6B6B] text-sm font-medium active:scale-[0.99] transition"
        >
          Renunță la logo
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
    <div className="flex flex-col items-center gap-2">
      <div className="w-full aspect-square rounded-[18px] border border-[#E6E6EA] flex items-center justify-center overflow-hidden" style={{ background: bg }}>
        {url ? (
          <img src={url} alt="" className="max-w-[80%] max-h-[80%] object-contain" />
        ) : (
          <span className="text-[11px]" style={{ color: bg === "#FFFFFF" ? "#9999aa" : "#888" }}>fără logo</span>
        )}
      </div>
      <span className="text-[11px] text-[#6B6B6B]">{label}</span>
    </div>
  );
}

function StepIdentity({ name, handle, setName, setHandle }: { name: string; handle: string; setName: (s: string) => void; setHandle: (s: string) => void }) {
  return (
    <div>
      <h2 className="font-display font-bold text-[28px] leading-[1.05] text-[#1F1F1F]">Cum te cheamă?</h2>
      <p className="text-[15px] text-[#6B6B6B] mt-1">Numele tău public pe reeluri.</p>
      <div className="flex flex-col gap-3.5 mt-5">
        <Field label="Nume brand sau salon">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 40))}
            placeholder="ex. Salon Elena"
            className="w-full bg-transparent outline-none text-[16px] text-[#1F1F1F] placeholder:text-[#6B6B6B]/60"
          />
        </Field>
        <Field label="Handle Instagram / TikTok">
          <div className="flex items-center gap-1">
            <span className="text-[16px] text-[#6B6B6B]">@</span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/^@/, "").replace(/\s+/g, "").slice(0, 30))}
              placeholder="salonelena"
              autoCapitalize="none"
              className="w-full bg-transparent outline-none text-[16px] text-[#1F1F1F] placeholder:text-[#6B6B6B]/60"
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
      <h2 className="font-display font-bold text-[28px] leading-[1.05] text-[#1F1F1F]">Culorile brandului</h2>
      <p className="text-[15px] text-[#6B6B6B] mt-1">Folosite pe titluri și accente.</p>
      <div className="grid grid-cols-2 gap-3.5 mt-5">
        <ColorField label="Primary" value={primary} onChange={setPrimary} />
        <ColorField label="Accent" value={accent} onChange={setAccent} />
      </div>
      {onSuggest && (
        <button onClick={onSuggest} className="flex items-center justify-center gap-2 w-full h-[48px] rounded-[14px] mt-4 bg-white text-[#5B34FF] font-bold text-[14px] border-[1.5px] border-[#5B34FF] active:scale-[0.98] transition">
          <Sparkles className="w-[17px] h-[17px]" />
          Sugerează după meserie
        </button>
      )}
      <div className="mt-5">
        <span className="block font-bold text-[11px] tracking-[1px] uppercase text-[#6B6B6B] mb-2">Previzualizare</span>
        <div className="h-[88px] rounded-[18px] border border-[#E6E6EA] flex items-center px-5" style={{ background: `linear-gradient(120deg, ${primary}, ${accent})` }}>
          <span className="font-display font-bold text-[22px] text-white drop-shadow-sm">Salonul tău</span>
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  return (
    <label className="block bg-white rounded-[16px] border border-[#E6E6EA] px-4 py-3 shadow-[0_4px_16px_-14px_rgba(40,24,110,0.2)]">
      <span className="block font-bold text-[11px] tracking-[1px] uppercase text-[#6B6B6B] mb-2">{label}</span>
      <div className="flex items-center gap-2.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-[10px] border-0 bg-transparent cursor-pointer shrink-0"
          style={{ padding: 0 }}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent outline-none text-[14px] text-[#1F1F1F] uppercase tracking-wider"
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
      <h2 className="font-display font-bold text-[28px] leading-[1.05] text-[#1F1F1F]">Stil + contact</h2>
      <p className="text-[15px] text-[#6B6B6B] mt-1">Cum arată și unde te găsesc.</p>

      <div className="flex flex-col gap-2.5 mt-5">
        {(["luxury", "soft", "bold"] as Vibe[]).map((v) => {
          const sp = STYLE_PACKS[v];
          const active = vibe === v;
          return (
            <button
              key={v}
              onClick={() => setVibe(v)}
              className={`flex items-center justify-between text-left rounded-[16px] px-4 py-3.5 transition active:scale-[0.99] ${active ? "bg-[#EDE8FF] border-2 border-[#5B34FF]" : "bg-white border border-[#E6E6EA]"}`}
            >
              <span>
                <span className="block font-display font-bold text-[16px] text-[#1F1F1F]">{sp.label}</span>
                <span className="block text-[12.5px] text-[#6B6B6B] mt-0.5">{sp.desc}</span>
              </span>
              <span className={`w-[22px] h-[22px] rounded-full shrink-0 grid place-items-center border-2 ${active ? "border-[#5B34FF] bg-[#5B34FF]" : "border-[#E6E6EA] bg-white"}`}>
                {active && <span className="w-2 h-2 rounded-full bg-white" />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3.5 mt-5">
        <Field label="Telefon (opțional)">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.slice(0, 24))}
            placeholder="0722 000 000"
            inputMode="tel"
            className="w-full bg-transparent outline-none text-[16px] text-[#1F1F1F] placeholder:text-[#6B6B6B]/60"
          />
        </Field>
        <Field label="Locație (opțional)">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value.slice(0, 60))}
            placeholder="București, Sector 1"
            className="w-full bg-transparent outline-none text-[16px] text-[#1F1F1F] placeholder:text-[#6B6B6B]/60"
          />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block bg-white rounded-[16px] border border-[#E6E6EA] px-4 py-3 shadow-[0_4px_16px_-14px_rgba(40,24,110,0.2)]">
      <span className="block font-bold text-[11px] tracking-[1px] uppercase text-[#6B6B6B] mb-1.5">{label}</span>
      {children}
    </label>
  );
}
