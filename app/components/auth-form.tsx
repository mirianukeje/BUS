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
    <section className="auth-form">
      <p className="eyebrow">{isSignup ? "Create an account" : "Sign in"}</p>
      <h2>{isSignup ? "Create your account" : "Welcome back"}</h2>
      <p className="auth-description">
        {isSignup
          ? "A few details, then your private space is ready."
          : "Sign in to return to your reflections."}
      </p>

      <form className="auth-fields" onSubmit={handleSubmit}>
        {isSignup && (
          <label className="auth-label">
            Name <span className="auth-optional">(optional)</span>
            <input
              autoComplete="name"
              className="auth-input"
              name="displayName"
              type="text"
            />
          </label>
        )}
        <label className="auth-label">
          Email
          <input
            autoComplete="email"
            className="auth-input"
            name="email"
            required
            type="email"
          />
        </label>
        <label className="auth-label">
          Password
          <input
            autoComplete={isSignup ? "new-password" : "current-password"}
            className="auth-input"
            minLength={6}
            name="password"
            required
            type="password"
          />
        </label>

        {errorMessage && (
          <p
            aria-live="polite"
            className="auth-message auth-message-error"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
        {statusMessage && (
          <p aria-live="polite" className="auth-message" role="status">
            {statusMessage}
          </p>
        )}

        <button
          className="button button-primary auth-submit"
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

      <p className="auth-switch">
        {isSignup ? "Already have an account?" : "New to Between Us?"}{" "}
        <Link
          className="text-link"
          href={`${isSignup ? "/login" : "/signup"}?next=${encodeURIComponent(nextPath)}`}
        >
          {isSignup ? "Log in" : "Create an account"}
        </Link>
      </p>
    </section>
  );
}
