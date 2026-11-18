import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";

export default async function JournalPage() {
  await requireUser("/journal");

  return (
    <main className="simple-page">
      <Link className="wordmark" href="/">
        Between <span>Us</span>
      </Link>
      <section className="simple-content">
        <p className="eyebrow">A practice in reflection</p>
        <h1>Journal</h1>
        <p>
          A space for personal reflections. This feature is coming soon.
        </p>
        <span className="coming-soon">In development</span>
      </section>
    </main>
  );
}
