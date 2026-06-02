import { useLocation, useNavigate } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { toast } from "sonner";

/** Persistent shortcut back to the landing page, available on every screen
 *  except the home page itself and the first-run onboarding.
 *  Editor & onboarding state is auto-saved continuously to IndexedDB, so we
 *  only confirm on routes where the user might lose unsaved input. */
const HIDE_ON = ["/", "/onboarding"];
const CONFIRM_ON = ["/film", "/edit", "/onboarding", "/settings/brand"];

export function HomeButton() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  if (HIDE_ON.includes(pathname)) return null;

  const handleClick = () => {
    const needsConfirm = CONFIRM_ON.includes(pathname);
    if (needsConfirm) {
      const ok = window.confirm(
        "Mergi la pagina de pornire? Progresul a fost salvat automat.",
      );
      if (!ok) return;
      toast.success("Progres salvat", {
        description: "Setările și textele rămân pentru când revii.",
      });
    }
    void nav({ to: "/" });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Acasă"
      className="fixed z-[60] bottom-4 left-4 w-11 h-11 rounded-full glass border border-[#E8D5B5]/25 flex items-center justify-center text-white/85 active:scale-95 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] backdrop-blur-md"
    >
      <Home className="w-4 h-4 text-[#E8D5B5]" />
    </button>
  );
}
