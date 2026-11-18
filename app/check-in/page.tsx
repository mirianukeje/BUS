import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";

export default async function CheckInPage() {
  await requireUser("/check-in");

  return (
    <main className="simple-page">
      <Link className="wordmark" href="/">
        Between <span>Us</span>
      </Link>
      <section className="simple-content">
        <p className="eyebrow">A practice in noticing</p>
        <h1>Daily check-in</h1>
        <p>
          A space to acknowledge how you’re feeling. This feature is coming
          soon.
        </p>
        <span className="coming-soon">In development</span>
      </section>
    </main>
  );
}
