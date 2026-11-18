import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { AppShell } from "@/app/components/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getDisplayName(user: User) {
  const displayName = user.user_metadata?.display_name;
  if (typeof displayName === "string" && displayName.trim()) {
    return displayName.trim().split(/\s+/)[0];
  }
  return "there";
}

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

  const today = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <AppShell activePage="home" email={user?.email}>
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-date">{today}</p>
          <h1>{user ? `Welcome back, ${getDisplayName(user)}` : "Welcome to your space"}</h1>
          <p className="dashboard-intro">
            {user
              ? "Take a moment for yourself. There’s no right way to begin."
              : "A private place to check in with yourself and reflect on what matters."}
          </p>
        </div>
        {user && (
          <Link className="dashboard-account-chip" href="/account">
            <span aria-hidden="true">{user.email?.slice(0, 1).toUpperCase() ?? "B"}</span>
            <span>Account</span>
          </Link>
        )}
      </div>

      {user ? (
        <>
          <section aria-labelledby="daily-pause" className="dashboard-feature">
            <div className="feature-copy">
              <p className="eyebrow">A GENTLE PLACE TO START</p>
              <h2 id="daily-pause">What’s present for you today?</h2>
              <p>
                A check-in can help you notice what you’re carrying before you
                decide what to do with it.
              </p>
            </div>
            <Link className="feature-link" href="/check-in">
              Visit daily check-in <span aria-hidden="true">→</span>
            </Link>
            <span aria-hidden="true" className="feature-decoration">01</span>
          </section>

          <section aria-labelledby="your-practices" className="dashboard-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">YOUR PRACTICES</p>
                <h2 id="your-practices">A little space to reflect</h2>
              </div>
              <span className="section-caption">More tools are on the way</span>
            </div>
            <div className="dashboard-tools">
              <Link className="dashboard-tool" href="/check-in">
                <span aria-hidden="true" className="tool-number">01</span>
                <span className="tool-status">IN DEVELOPMENT</span>
                <h3>Daily check-in</h3>
                <p>Pause and put a name to what you’re feeling.</p>
                <span className="tool-arrow" aria-hidden="true">↗</span>
              </Link>
              <Link className="dashboard-tool" href="/journal">
                <span aria-hidden="true" className="tool-number">02</span>
                <span className="tool-status">IN DEVELOPMENT</span>
                <h3>Journal</h3>
                <p>Give your thoughts a little room on the page.</p>
                <span className="tool-arrow" aria-hidden="true">↗</span>
              </Link>
            </div>
          </section>

          <aside className="dashboard-footnote">
            <span aria-hidden="true" className="privacy-dot" />
            Your account is private. Your personal records are protected by
            your signed-in session.
          </aside>
        </>
      ) : (
        <section className="guest-welcome">
          <p className="eyebrow">YOUR SPACE, WHEN YOU’RE READY</p>
          <h2>Start with a moment for yourself.</h2>
          <p>
            Create an account to make this space yours. Your check-ins and
            journal will stay connected to your account.
          </p>
          <div className="guest-welcome-actions">
            <Link className="button button-primary" href="/signup">
              Create your account
            </Link>
            <Link className="guest-login" href="/login">
              I already have an account
            </Link>
          </div>
          <div className="guest-preview">
            <span>01</span>
            <div>
              <strong>Daily check-in</strong>
              <p>Notice what’s here, one day at a time.</p>
            </div>
            <span className="tool-status">IN DEVELOPMENT</span>
          </div>
          <div className="guest-preview">
            <span>02</span>
            <div>
              <strong>Journal</strong>
              <p>Write freely in your own private space.</p>
            </div>
            <span className="tool-status">IN DEVELOPMENT</span>
          </div>
        </section>
      )}
    </AppShell>
  );
}
