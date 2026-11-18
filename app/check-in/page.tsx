import { AppShell } from "@/app/components/app-shell";
import { requireUser } from "@/lib/auth/require-user";

export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  const user = await requireUser("/check-in");

  return (
    <AppShell activePage="check-in" email={user.email}>
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-date">YOUR PRACTICES</p>
          <h1>Daily check-in</h1>
          <p className="dashboard-intro">
            A moment to notice what you’re feeling, without needing to change it.
          </p>
        </div>
      </div>
      <section className="empty-feature">
        <p className="eyebrow">A practice in noticing</p>
        <h2>This check-in is still taking shape.</h2>
        <p>
          We’re making room for a thoughtful check-in experience. Your private
          space is ready; this activity is still in development.
        </p>
        <span className="coming-soon">In development</span>
      </section>
    </AppShell>
  );
}
