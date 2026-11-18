import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth/require-user";

export default async function AccountPage() {
  const user = await requireUser("/account");

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-12 sm:py-16">
      <Link className="text-sm font-semibold text-[#31594e]" href="/">
        ← Between Us
      </Link>
      <section className="mt-8 rounded-3xl border border-[#e6e2d9] bg-white p-7 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#52766d]">
          Your account
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#233b35]">
          You’re signed in
        </h1>
        <p className="mt-4 text-[#58645f]">Signed in as {user.email}</p>
        <form action={signOut} className="mt-8">
          <button
            className="rounded-xl border border-[#31594e] px-5 py-3 font-semibold text-[#31594e] transition hover:bg-[#eef5f0]"
            type="submit"
          >
            Log out
          </button>
        </form>
      </section>
    </main>
  );
}
