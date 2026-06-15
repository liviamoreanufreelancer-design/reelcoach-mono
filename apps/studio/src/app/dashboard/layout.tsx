/**
 * Dashboard layout — wraps all authenticated pages with a header
 * showing the user email + role and a logout button.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import LogoutButton from "@/components/LogoutButton";

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
      <header className="border-b border-[#E8D5B5]/10 px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-3">
        {/* Brand block — wordmark + Studio */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <p className="eyebrow text-[9px] sm:text-[10px] hidden sm:block">ReelCoach</p>
          <span className="text-white/30 text-xs hidden sm:inline">·</span>
          <span className="h-display text-[16px] sm:text-[18px] text-white">Studio</span>
          <nav className="flex items-center gap-1 ml-2 sm:ml-4">
            <Link href="/dashboard" className="text-[12px] text-white/70 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
              Șabloane
            </Link>
            <Link href="/dashboard/diagrams" className="text-[12px] text-white/70 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
              Diagrame
            </Link>
          </nav>
        </div>

        {/* Right side — role badge + logout. Email shown only on desktop. */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="text-right min-w-0">
            <p className="text-[12px] text-white/85 leading-tight truncate hidden sm:block max-w-[200px]">
              {profile?.email ?? user.email}
            </p>
            <p className="text-[9px] tracking-[0.22em] sm:tracking-[0.25em] uppercase text-[#E8D5B5]/75 font-semibold">
              {profile?.role ?? "editor"}
            </p>
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Page content — tighter padding on mobile */}
      <main className="flex-1 px-4 sm:px-5 py-6 sm:py-8 max-w-[1200px] mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
