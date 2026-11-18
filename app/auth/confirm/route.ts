import { NextResponse } from "next/server";
import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { ensureProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeRedirectPath(requestUrl.searchParams.get("next"));

  if (!code) {
    const loginUrl = new URL("/login?error=confirmation", requestUrl);
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    const loginUrl = new URL("/login?error=confirmation", requestUrl);
    return NextResponse.redirect(loginUrl);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }
  if (!user) {
    throw new Error("Email confirmation succeeded without an authenticated user.");
  }

  await ensureProfile(supabase, user);
  return NextResponse.redirect(new URL(nextPath, requestUrl));
}
