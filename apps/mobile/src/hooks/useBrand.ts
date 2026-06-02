import { useEffect, useState, useCallback } from "react";
import { loadBrand, saveBrand, type BrandProfile, DEFAULT_BRAND } from "@/lib/brand-store";

export function useBrand() {
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let url: string | null = null;
    void (async () => {
      const b = await loadBrand();
      setBrand(b);
      if (b?.logoBlob) {
        url = URL.createObjectURL(b.logoBlob);
        setLogoUrl(url);
      }
      setLoading(false);
    })();
    return () => { if (url) URL.revokeObjectURL(url); };
  }, []);

  const update = useCallback(async (patch: Partial<BrandProfile>) => {
    const next: BrandProfile = { ...(brand ?? DEFAULT_BRAND), ...patch, updatedAt: Date.now() };
    await saveBrand(next);
    setBrand(next);
    if (patch.logoBlob) {
      if (logoUrl) URL.revokeObjectURL(logoUrl);
      setLogoUrl(URL.createObjectURL(patch.logoBlob));
    }
  }, [brand, logoUrl]);

  return { brand, logoUrl, loading, update };
}
