import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { AuthForm } from "@/app/components/auth-form";
import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type SignupPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export const dynamic = "force-dynamic";

export default async function SignupPage({ searchParams }: SignupPageProps) {
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
          <h1>Begin with one honest moment.</h1>
          <p>
            Your account gives you a private place to check in and put your
            thoughts into words.
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
            Connect a Supabase project to enable account creation. See the setup
            steps in the README.
          </p>
        )}
        <AuthForm mode="signup" nextPath={nextPath} />
      </section>
    </main>
  );
}
