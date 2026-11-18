import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth/require-user";

export default async function AccountPage() {
  const user = await requireUser("/account");

  return (
    <main className="simple-page">
      <Link className="wordmark" href="/">
        Between <span>Us</span>
      </Link>
      <section className="simple-content">
        <p className="eyebrow">Your account</p>
        <h1>Your space is ready.</h1>
        <p className="account-email">Signed in as {user.email}</p>
        <div className="account-actions">
          <Link className="button button-outline" href="/check-in">
            Daily check-in
          </Link>
          <Link className="button button-outline" href="/journal">
            Journal
          </Link>
          <form action={signOut}>
            <button className="button button-primary" type="submit">
              Log out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
