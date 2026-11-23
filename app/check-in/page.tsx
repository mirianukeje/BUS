import { AppShell } from "@/app/components/app-shell";
import { requireUser } from "@/lib/auth/require-user";
import { CheckInReadError, getLatestCheckIn } from "@/lib/check-ins/server";
import type { SavedCheckIn } from "@/lib/check-ins/contracts";
import { CheckInForm } from "@/app/check-in/check-in-form";

export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  const user = await requireUser("/check-in");
  let latest: SavedCheckIn | null = null;
  let loadError: { code: string; message: string } | null = null;

  try {
    latest = await getLatestCheckIn();
  } catch (error) {
    if (error instanceof CheckInReadError) {
      loadError = { code: error.code, message: error.message };
    } else {
      throw error;
    }
  }

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
      <CheckInForm initialLatest={latest} loadError={loadError} />
    </AppShell>
  );
}
