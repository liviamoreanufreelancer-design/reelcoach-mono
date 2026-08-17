/**
 * Dashboard layout — wraps all authenticated pages with a header
 * showing the user email + role and a logout button.
 */
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import LogoutButton from "@/components/LogoutButton";
import StudioNav from "@/components/StudioNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Look up the role from the profiles table.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name, email")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar — compact on mobile, full info on desktop */}
      <header className="border-b border-[#5B34FF]/10 px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-3">
        {/* Brand block — wordmark + Studio */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <p className="eyebrow text-[9px] sm:text-[10px] hidden sm:block">ReelCoach</p>
          <span className="text-[#B8B8B8] text-xs hidden sm:inline">·</span>
          <span className="h-display text-[16px] sm:text-[18px] text-[#1F1F1F]">Studio</span>
        </div>

        {/* Right side — role badge + logout. Email shown only on desktop. */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="text-right min-w-0">
            <p className="text-[12px] text-[#1F1F1F] leading-tight truncate hidden sm:block max-w-[200px]">
              {profile?.email ?? user.email}
            </p>
            <p className="text-[9px] tracking-[0.22em] sm:tracking-[0.25em] uppercase text-[#5B34FF]/75 font-semibold">
              {profile?.role ?? "editor"}
            </p>
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Bara laterală permanentă + conținut. Pe ecrane înguste bara urcă
          deasupra, ca să nu mănânce lățimea — dar rămâne vizibilă: navigația
          ascunsă în spatele unui buton e exact ce am reparat aici. */}
      <div className="flex-1 w-full max-w-[1280px] mx-auto flex flex-col md:flex-row gap-6 px-4 sm:px-5 py-6 sm:py-8">
        <aside className="md:w-[196px] shrink-0">
          <StudioNav />
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
