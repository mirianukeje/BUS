import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { AuthForm } from "@/app/components/auth-form";
import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; status?: string; error?: string }>;
};

const authErrors: Record<string, string> = {
  confirmation: "That confirmation link is invalid or expired. Please sign up again.",
};

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = getSafeRedirectPath(params.next);
  const supabaseConfigured = isSupabaseConfigured();

  if (supabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error && !isAuthSessionMissingError(error)) {
      throw error;
    }
    if (user) {
      redirect(nextPath);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <Link className="wordmark" href="/">
          Between <span>Us</span>
        </Link>
        <div className="auth-intro-copy">
          <p className="eyebrow">A space to reflect</p>
          <h1>Come back to what matters.</h1>
          <p>
            Make a little room for your feelings, your thoughts, and the way
            forward that feels right to you.
          </p>
        </div>
        <div className="privacy-note">
          <span aria-hidden="true" className="privacy-mark" />
          Only you can access your account and the personal reflections it holds.
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-top">
          <Link className="text-link" href="/">
            Back to home
          </Link>
        </div>
        {!supabaseConfigured && (
          <p className="auth-status" role="status">
            Connect a Supabase project to enable sign-in. See the setup steps in
            the README.
          </p>
        )}
        {params.status === "signed-out" && (
          <p className="auth-status" role="status">
            You’ve signed out. Your account is safe.
          </p>
        )}
        {params.error && authErrors[params.error] && (
          <p className="auth-status auth-status-error" role="alert">
            {authErrors[params.error]}
          </p>
        )}
        <AuthForm mode="login" nextPath={nextPath} />
      </section>
    </main>
  );
}
