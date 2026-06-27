import { useEffect, useState, useCallback } from "react";
import { loadBrand, saveBrand, type BrandProfile, DEFAULT_BRAND } from "@/lib/brand-store";

export function useBrand() {
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let logoU: string | null = null;
    let profU: string | null = null;
    void (async () => {
      const b = await loadBrand();
      setBrand(b);
      if (b?.logoBlob) {
        logoU = URL.createObjectURL(b.logoBlob);
        setLogoUrl(logoU);
      }
      // Poza de profil: profileBlob daca exista, altfel cade pe logo.
      const profSource = b?.profileBlob ?? b?.logoBlob;
      if (profSource) {
        profU = URL.createObjectURL(profSource);
        setProfileUrl(profU);
      }
      setLoading(false);
    })();
    return () => {
      if (logoU) URL.revokeObjectURL(logoU);
      if (profU) URL.revokeObjectURL(profU);
    };
  }, []);

  const update = useCallback(async (patch: Partial<BrandProfile>) => {
    const next: BrandProfile = { ...(brand ?? DEFAULT_BRAND), ...patch, updatedAt: Date.now() };
    await saveBrand(next);
    setBrand(next);
    if (patch.logoBlob) {
      if (logoUrl) URL.revokeObjectURL(logoUrl);
      setLogoUrl(URL.createObjectURL(patch.logoBlob));
    }
    // profileUrl se recalculeaza din profileBlob nou SAU din logoBlob nou (fallback)
    const profSource = patch.profileBlob ?? next.profileBlob ?? patch.logoBlob ?? next.logoBlob;
    if (patch.profileBlob || patch.logoBlob) {
      if (profileUrl) URL.revokeObjectURL(profileUrl);
      setProfileUrl(profSource ? URL.createObjectURL(profSource) : null);
    }
  }, [brand, logoUrl, profileUrl]);

  return { brand, logoUrl, profileUrl, loading, update };
}
