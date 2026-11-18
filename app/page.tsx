import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { signOut } from "@/app/actions/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let user: User | null = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user: authenticatedUser },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    user = authenticatedUser;
  }

  return (
    <>
      <header className="site-shell site-header">
        <Link className="wordmark" href="/">
          Between <span>Us</span>
        </Link>
        {user ? (
          <div className="header-actions">
            <span className="header-email">
              Signed in as {user.email}
            </span>
            <form action={signOut}>
              <button className="button button-outline" type="submit">
                Log out
              </button>
            </form>
          </div>
        ) : (
          <nav aria-label="Account" className="header-actions">
            <Link className="text-link" href="/login">
              Log in
            </Link>
            <Link className="button button-primary" href="/signup">
              Get started
            </Link>
          </nav>
        )}
      </header>

      <main className="site-shell home-main">
        <section className="hero">
          <div>
            <p className="eyebrow">Emotional wellbeing · Relationship reflection</p>
            <h1 className="hero-title">
              Understand what you feel. <em>Choose how you respond.</em>
            </h1>
            <p className="hero-copy">
              Between Us is a private place to notice your emotions, reflect on
              what matters, and find your own words for it.
            </p>
            <div className="hero-actions">
              {user ? (
                <Link className="button button-primary" href="/account">
                  Go to your account
                </Link>
              ) : (
                <Link className="button button-primary" href="/signup">
                  Create your account
                </Link>
              )}
              {user ? (
                <span className="text-link">Your space is private</span>
              ) : (
                <Link className="text-link" href="/login">
                  I already have an account
                </Link>
              )}
            </div>
          </div>
          <aside className="hero-aside">
            <span aria-hidden="true" className="aside-index">01</span>
            <h2 className="aside-title">Start with what’s here.</h2>
            <p className="aside-copy">
              You don’t need to have it all figured out. A little attention is
              a place to begin.
            </p>
          </aside>
        </section>

        <section aria-labelledby="practice-heading" className="practice-section">
          <div className="practice-heading">
            <h2 id="practice-heading">A practice, at your pace</h2>
            <p>Personal reflection, without the pressure to get it right.</p>
          </div>
          <nav aria-label="Personal spaces" className="practice-list">
            <Link className="practice-item" href="/check-in">
              <span aria-hidden="true" className="practice-number">01</span>
              <span>
                <h3>Check in</h3>
                <p>Pause and notice how you’re feeling today.</p>
              </span>
              <span className="coming-soon">Coming soon</span>
            </Link>
            <Link className="practice-item" href="/journal">
              <span aria-hidden="true" className="practice-number">02</span>
              <span>
                <h3>Write it down</h3>
                <p>Give your thoughts a little room on the page.</p>
              </span>
              <span className="coming-soon">Coming soon</span>
            </Link>
          </nav>
        </section>
      </main>

      <footer className="site-shell site-footer">
        <span>Between Us · A space to reflect</span>
        <span>{user ? `Signed in as ${user.email}` : "Your reflections belong to you."}</span>
      </footer>
    </>
  );
}
