"use client";

/**
 * Login page — handles both sign-up and sign-in via email + password.
 *
 * First-time users: enter email + password → Supabase creates auth.users row
 * → trigger creates a public.profiles row with default role 'editor'.
 *
 * For the first admin, after signing up: open Supabase SQL editor and run:
 *   UPDATE profiles SET role='admin' WHERE email='livia.moreanu.freelancer@gmail.com';
 */
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onForgotPassword = async () => {
    setError(null);
    setInfo(null);
    if (!email) {
      setError("Introdu emailul, apoi apasă din nou.");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { setError(error.message); return; }
    setInfo("Ți-am trimis un email cu link de resetare.");
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    const supabase = getSupabaseBrowserClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setSubmitting(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } else {
      // Sign up. Supabase by default sends a confirmation email; for studio
      // we want immediate access — depends on Supabase project settings.
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setSubmitting(false);
        return;
      }
      if (data.user && !data.session) {
        // Email confirmation required (Supabase default). Tell the user.
        setInfo("Cont creat. Verifică emailul pentru confirmare, apoi loghează-te.");
        setSubmitting(false);
        setMode("signin");
        return;
      }
      // Auto-confirmed (e.g. email confirmation disabled in Supabase settings).
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-[380px]">
        {/* Brand block */}
        <div className="text-center mb-10">
          <p className="eyebrow mb-3">ReelCoach</p>
          <h1 className="h-display text-[36px] text-[#1F1F1F]">Studio</h1>
          <p className="text-sm text-[#6B6B6B] mt-3">
            Editor de șabloane pentru ReelCoach.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="card p-6 flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="email@exemplu.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="label">Parolă</label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="Minim 6 caractere"
            />
          </div>

          {error && (
            <p className="text-[12px] text-rose-600 leading-relaxed">{error}</p>
          )}
          {info && (
            <p className="text-[12px] text-emerald-700 leading-relaxed">{info}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-champagne mt-2"
          >
            {submitting
              ? "Se procesează…"
              : mode === "signin" ? "Intră în studio" : "Creează cont"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setInfo(null);
            }}
            className="text-[11px] tracking-[0.18em] uppercase text-[#5B34FF]/65 hover:text-[#5B34FF] transition mt-1"
          >
            {mode === "signin" ? "Cont nou? Înregistrează-te" : "Ai cont? Intră în studio"}
          </button>

          {mode === "signin" && (
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-[11px] text-[#6B6B6B] hover:text-[#5B34FF] transition"
            >
              Ai uitat parola?
            </button>
          )}
        </form>
      </div>
    </main>
  );
}
