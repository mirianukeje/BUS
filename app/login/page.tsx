import { redirect } from "next/navigation";
import { AuthForm } from "@/app/components/auth-form";
import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; status?: string; error?: string }>;
};

const authErrors: Record<string, string> = {
  confirmation: "That confirmation link is invalid or expired. Please sign up again.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = getSafeRedirectPath(params.next);
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }
  if (user) {
    redirect(nextPath);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full">
        {params.status === "signed-out" && (
          <p className="mx-auto mb-4 max-w-md rounded-xl bg-[#eef5f0] px-4 py-3 text-center text-sm text-[#36594e]">
            You have been logged out.
          </p>
        )}
        {params.error && authErrors[params.error] && (
          <p className="mx-auto mb-4 max-w-md rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-800">
            {authErrors[params.error]}
          </p>
        )}
        <AuthForm mode="login" nextPath={nextPath} />
      </div>
    </main>
  );
}
