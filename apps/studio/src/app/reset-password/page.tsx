"use client";

/**
 * Reset password page — landing for Supabase recovery emails.
 *
 * Flow: user clicks the link in the recovery email → Supabase sets a temporary
 * session from the URL fragment → this page lets them set a new password via
 * supabase.auth.updateUser({ password }).
 *
 * Requires in Supabase → Authentication → URL Configuration → Redirect URLs:
 *   https://reelcoach-studio.vercel.app/reset-password
 */
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Supabase stabileste sesiunea de recovery din fragmentul URL-ului.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setHasSession(true);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Parolele nu se potrivesc.");
      return;
    }
    if (password.length < 6) {
      setError("Parola trebuie să aibă minim 6 caractere.");
      return;
    }
    setSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }
    setDone(true);
    setSubmitting(false);
    setTimeout(() => { router.push("/dashboard"); router.refresh(); }, 1500);
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-10">
          <p className="eyebrow mb-3">ReelCoach</p>
          <h1 className="h-display text-[32px] text-[#1F1F1F]">Parolă nouă</h1>
          <p className="text-sm text-[#6B6B6B] mt-3">
            Alege o parolă nouă pentru contul tău.
          </p>
        </div>

        {!ready ? (
          <div className="card p-6 text-center">
            <p className="text-[13px] text-[#6B6B6B]">Se verifică linkul…</p>
          </div>
        ) : !hasSession ? (
          <div className="card p-6 text-center">
            <p className="text-[13px] text-[#1F1F1F] mb-3">
              Link invalid sau expirat.
            </p>
            <p className="text-[12px] text-[#6B6B6B] mb-4 leading-relaxed">
              Cere un nou email de resetare din pagina de login.
            </p>
            <button onClick={() => router.push("/login")} className="btn-glass">
              Înapoi la login
            </button>
          </div>
        ) : done ? (
          <div className="card p-6 text-center">
            <p className="text-[14px] font-medium text-[#5B34FF] mb-2">✓ Parolă schimbată</p>
            <p className="text-[12px] text-[#6B6B6B]">Te redirecționăm…</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="card p-6 flex flex-col gap-4">
            <div>
              <label htmlFor="password" className="label">Parolă nouă</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Minim 6 caractere"
              />
            </div>
            <div>
              <label htmlFor="confirm" className="label">Confirmă parola</label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="input"
                placeholder="Repetă parola"
              />
            </div>

            {error && <p className="text-[12px] text-rose-500 leading-relaxed">{error}</p>}

            <button type="submit" disabled={submitting} className="btn-champagne mt-2">
              {submitting ? "Se salvează…" : "Salvează parola"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
