import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-12 sm:py-16">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link className="text-lg font-semibold tracking-tight text-[#233b35]" href="/">
          Between Us
        </Link>
        {user ? (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-[#58645f]">
              Signed in as <span className="font-medium">{user.email}</span>
            </span>
            <form action={signOut}>
              <button
                className="rounded-lg border border-[#31594e] px-4 py-2 font-semibold text-[#31594e] hover:bg-[#eef5f0]"
                type="submit"
              >
                Log out
              </button>
            </form>
          </div>
        ) : (
          <nav aria-label="Account" className="flex items-center gap-4 text-sm">
            <Link className="font-semibold text-[#31594e]" href="/login">
              Log in
            </Link>
            <Link
              className="rounded-lg bg-[#31594e] px-4 py-2 font-semibold text-white hover:bg-[#24473d]"
              href="/signup"
            >
              Create account
            </Link>
          </nav>
        )}
      </header>

      <section className="mt-16 max-w-2xl sm:mt-24">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#52766d]">
          A moment for yourself
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-[#233b35] sm:text-6xl">
          Make room for what you’re feeling.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-[#58645f]">
          A private space to check in with your emotions and reflect on your
          experiences, one step at a time.
        </p>
        {user && (
          <p className="mt-5 text-sm text-[#36594e]">
            Your account is secure and your personal records remain private.
          </p>
        )}
      </section>

      <nav aria-label="Personal spaces" className="mt-12 grid gap-4 sm:grid-cols-2">
        <Link
          className="rounded-2xl border border-[#e6e2d9] bg-white p-6 transition hover:border-[#9ab1a6]"
          href="/check-in"
        >
          <h2 className="text-lg font-semibold text-[#233b35]">Daily check-in</h2>
          <p className="mt-2 text-sm leading-6 text-[#58645f]">
            Take a moment to acknowledge how you’re feeling.
          </p>
        </Link>
        <Link
          className="rounded-2xl border border-[#e6e2d9] bg-white p-6 transition hover:border-[#9ab1a6]"
          href="/journal"
        >
          <h2 className="text-lg font-semibold text-[#233b35]">Journal</h2>
          <p className="mt-2 text-sm leading-6 text-[#58645f]">
            Make space for your personal reflections.
          </p>
        </Link>
      </nav>
    </main>
  );
}
