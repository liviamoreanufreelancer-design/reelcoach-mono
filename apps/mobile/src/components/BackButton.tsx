/**
 * BackButton — small floating back button for screens inside a flow.
 *
 * Used on Catalog, Templates, Film, Edit, Overview, etc. Goes one step
 * back in router history. On screens where the user might lose work
 * (Film, Edit), pass `confirm` to show a "Sigur?" dialog first.
 *
 * Positioned top-left as a glass-blur circular button — matches the
 * Saved/Profile back button visual style.
 */

import { useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { playTap } from "@/lib/ui-sound";

interface BackButtonProps {
  /** Show a confirmation dialog before going back. */
  confirm?: boolean;
  /** Route to navigate to instead of router.history.back(). */
  to?: string;
  /** Custom aria-label. Default: "Înapoi". */
  label?: string;
}

export function BackButton({ confirm, to, label = "Înapoi" }: BackButtonProps) {
  const router = useRouter();
  const nav = useNavigate();

  const handleClick = () => {
    if (confirm) {
      const ok = window.confirm(
        "Mergi înapoi? Progresul a fost salvat automat.",
      );
      if (!ok) return;
      toast.success("Progres salvat", {
        description: "Setările și textele rămân pentru când revii.",
      });
    }
    playTap();
    if (to) {
      void nav({ to });
    } else {
      router.history.back();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className="w-10 h-10 rounded-full bg-[#0F1419]/55 backdrop-blur-md border border-[#E8D5B5]/25 flex items-center justify-center text-[#E8D5B5] active:scale-95 transition shadow-[0_4px_16px_-4px_rgba(0,0,0,0.5)]"
    >
      <ArrowLeft className="w-[18px] h-[18px]" />
    </button>
  );
}
