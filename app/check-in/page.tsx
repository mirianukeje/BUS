import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";

export default async function CheckInPage() {
  await requireUser("/check-in");

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-12 sm:py-16">
      <Link className="text-sm font-semibold text-[#31594e]" href="/">
        ← Between Us
      </Link>
      <h1 className="mt-8 text-3xl font-semibold text-[#233b35]">
        Daily check-in
      </h1>
      <p className="mt-3 leading-7 text-[#58645f]">
        A space to acknowledge how you’re feeling. This feature is coming soon.
      </p>
    </main>
  );
}
