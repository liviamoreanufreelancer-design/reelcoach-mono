"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      aria-label="Ieșire"
      className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-[#5B34FF] hover:bg-white/[0.1] active:scale-95 transition"
    >
      <LogOut className="w-4 h-4" />
    </button>
  );
}
