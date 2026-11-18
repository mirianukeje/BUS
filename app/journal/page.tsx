import { AppShell } from "@/app/components/app-shell";
import { requireUser } from "@/lib/auth/require-user";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const user = await requireUser("/journal");

  return (
    <AppShell activePage="journal" email={user.email}>
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-date">YOUR PRACTICES</p>
          <h1>Journal</h1>
          <p className="dashboard-intro">
            A quiet place to put your thoughts into words.
          </p>
        </div>
      </div>
      <section className="empty-feature">
        <p className="eyebrow">A practice in reflection</p>
        <h2>Your journal is still taking shape.</h2>
        <p>
          We’re building a private writing space for your reflections. Your
          entries will be tied to your account when this feature is ready.
        </p>
        <span className="coming-soon">In development</span>
      </section>
    </AppShell>
  );
}
