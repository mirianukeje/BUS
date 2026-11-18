"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/supabase/profile";

type AuthFormProps = {
  mode: "login" | "signup";
  nextPath: string;
};

export function AuthForm({ mode, nextPath }: AuthFormProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignup = mode === "signup";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setStatusMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const supabase = createClient();

      if (isSignup) {
        const displayName = String(formData.get("displayName") ?? "").trim();
        const callbackUrl = new URL("/auth/confirm", window.location.origin);
        callbackUrl.searchParams.set("next", nextPath);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: callbackUrl.toString(),
          },
        });

        if (error) {
          throw error;
        }

        if (data.session && data.user) {
          await ensureProfile(supabase, data.user);
          router.replace(nextPath);
          router.refresh();
          return;
        }

        setStatusMessage(
          "Check your email for a confirmation link. Your account will be ready after you confirm your address.",
        );
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not complete that request. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-md rounded-3xl border border-[#e6e2d9] bg-white p-7 shadow-sm sm:p-10">
      <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#52766d]">
        Between Us
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-[#233b35]">
        {isSignup ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#58645f]">
        {isSignup
          ? "Create a private space for your reflections."
          : "Sign in to return to your private space."}
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        {isSignup && (
          <label className="block text-sm font-medium text-[#344a44]">
            Name <span className="font-normal text-[#79827e]">(optional)</span>
            <input
              autoComplete="name"
              className="mt-2 block w-full rounded-xl border border-[#d6dcd7] px-4 py-3 text-base outline-none focus:border-[#52766d] focus:ring-2 focus:ring-[#52766d]/20"
              name="displayName"
              type="text"
            />
          </label>
        )}
        <label className="block text-sm font-medium text-[#344a44]">
          Email
          <input
            autoComplete="email"
            className="mt-2 block w-full rounded-xl border border-[#d6dcd7] px-4 py-3 text-base outline-none focus:border-[#52766d] focus:ring-2 focus:ring-[#52766d]/20"
            name="email"
            required
            type="email"
          />
        </label>
        <label className="block text-sm font-medium text-[#344a44]">
          Password
          <input
            autoComplete={isSignup ? "new-password" : "current-password"}
            className="mt-2 block w-full rounded-xl border border-[#d6dcd7] px-4 py-3 text-base outline-none focus:border-[#52766d] focus:ring-2 focus:ring-[#52766d]/20"
            minLength={6}
            name="password"
            required
            type="password"
          />
        </label>

        {errorMessage && (
          <p
            aria-live="polite"
            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
        {statusMessage && (
          <p
            aria-live="polite"
            className="rounded-xl bg-[#eef5f0] px-4 py-3 text-sm text-[#36594e]"
            role="status"
          >
            {statusMessage}
          </p>
        )}

        <button
          className="w-full rounded-xl bg-[#31594e] px-5 py-3 font-semibold text-white transition hover:bg-[#24473d] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? "Please wait..."
            : isSignup
              ? "Create account"
              : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#58645f]">
        {isSignup ? "Already have an account?" : "New to Between Us?"}{" "}
        <Link
          className="font-semibold text-[#31594e] underline underline-offset-4"
          href={`${isSignup ? "/login" : "/signup"}?next=${encodeURIComponent(nextPath)}`}
        >
          {isSignup ? "Log in" : "Create an account"}
        </Link>
      </p>
      <p className="mt-6 text-center text-xs leading-5 text-[#78817d]">
        Your reflections are private to your account.
      </p>
    </section>
  );
}
