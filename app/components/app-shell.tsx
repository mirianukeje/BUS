import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/actions/auth";

type AppShellProps = {
  activePage: "home" | "check-in" | "journal" | "account";
  children: ReactNode;
  email?: string;
};

const navigation = [
  { href: "/", label: "Overview", key: "home" },
  { href: "/check-in", label: "Daily check-in", key: "check-in" },
  { href: "/journal", label: "Journal", key: "journal" },
] as const;

export function AppShell({ activePage, children, email }: AppShellProps) {
  const initials = email?.slice(0, 1).toUpperCase() ?? "B";

  return (
    <div className="workspace">
      <aside className="workspace-sidebar">
        <Link className="workspace-brand" href="/">
          <span className="brand-mark" aria-hidden="true">bu</span>
          <span>
            <strong>between us</strong>
            <small>YOUR PRIVATE SPACE</small>
          </span>
        </Link>

        <div className="workspace-nav-label">YOUR SPACE</div>
        <nav aria-label="Main navigation" className="workspace-nav">
          {navigation.map((item, index) => (
            <Link
              aria-current={activePage === item.key ? "page" : undefined}
              className={`workspace-nav-link${activePage === item.key ? " is-active" : ""}`}
              href={item.href}
              key={item.key}
            >
              <span className="nav-index">{String(index + 1).padStart(2, "0")}</span>
              {item.label}
              {item.key !== "home" && <span className="nav-soon">SOON</span>}
            </Link>
          ))}
        </nav>

        <div className="workspace-sidebar-bottom">
          {email ? (
            <>
              <Link
                aria-current={activePage === "account" ? "page" : undefined}
                className={`profile-link${activePage === "account" ? " is-active" : ""}`}
                href="/account"
              >
                <span aria-hidden="true" className="profile-avatar">{initials}</span>
                <span className="profile-details">
                  <strong>My account</strong>
                  <small>{email}</small>
                </span>
              </Link>
              <form action={signOut}>
                <button className="workspace-signout" type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <div className="workspace-guest">
              <p>Make this space yours.</p>
              <Link className="button button-primary" href="/signup">
                Create account
              </Link>
              <Link className="guest-login" href="/login">I have an account</Link>
            </div>
          )}
        </div>
      </aside>

      <div className="workspace-main">
        <header className="workspace-topbar">
          <span className="topbar-context">A little space for you</span>
          <span className="privacy-indicator">
            <span aria-hidden="true" />
            {email ? "Your private space" : "Preview mode"}
          </span>
        </header>
        <main className="workspace-content">{children}</main>
      </div>

      <nav aria-label="Mobile navigation" className="workspace-mobile-nav">
        {navigation.map((item, index) => (
          <Link
            aria-current={activePage === item.key ? "page" : undefined}
            className={`mobile-nav-link${activePage === item.key ? " is-active" : ""}`}
            href={item.href}
            key={item.key}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {item.label}
          </Link>
        ))}
        {email && (
          <Link
            aria-current={activePage === "account" ? "page" : undefined}
            className={`mobile-nav-link${activePage === "account" ? " is-active" : ""}`}
            href="/account"
          >
            <span>{initials}</span>
            Account
          </Link>
        )}
      </nav>
    </div>
  );
}
