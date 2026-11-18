import { AppShell } from "@/app/components/app-shell";
import { requireUser } from "@/lib/auth/require-user";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser("/account");

  return (
    <AppShell activePage="account" email={user.email}>
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-date">ACCOUNT</p>
          <h1>Your account</h1>
          <p className="dashboard-intro">The details connected to your private space.</p>
        </div>
      </div>
      <section className="account-panel">
        <div className="account-panel-avatar" aria-hidden="true">
          {user.email?.slice(0, 1).toUpperCase() ?? "B"}
        </div>
        <div>
          <p className="eyebrow">SIGNED-IN EMAIL</p>
          <h2>{user.email}</h2>
          <p>This email is used to sign in to your Between Us account.</p>
        </div>
      </section>
      <p className="dashboard-footnote">
        Your personal records are protected by your account and the database’s
        ownership policies.
      </p>
    </AppShell>
  );
}
