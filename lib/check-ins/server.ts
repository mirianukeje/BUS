import "server-only";

import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { validateCheckInInput } from "@/lib/check-ins/validation";
import type {
  CheckInErrorCode,
  CheckInFailure,
  CheckInSubmissionResult,
  SavedCheckIn,
} from "@/lib/check-ins/contracts";

const CHECK_IN_COLUMNS = "id,user_id,emotion,note,created_at";

function failure(code: CheckInErrorCode): CheckInFailure {
  const messages: Record<CheckInErrorCode, string> = {
    VALIDATION_ERROR: "Check the submitted fields.",
    AUTH_REQUIRED: "Sign in to continue with your check-in.",
    CONFIGURATION_ERROR: "Check-ins are not configured. Please try again later.",
    SAVE_FAILED: "We could not confirm your check-in was saved. Check your latest check-in before retrying.",
    LOAD_FAILED: "We could not load your latest check-in. Please try again.",
  };
  return { ok: false, error: { code, message: messages[code] } };
}

async function authenticate(operation: "SAVE_FAILED" | "LOAD_FAILED") {
  if (!isSupabaseConfigured()) return failure("CONFIGURATION_ERROR");

  try {
    const client = await createClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error) return failure(isAuthSessionMissingError(error) ? "AUTH_REQUIRED" : operation);
    if (!user) return failure("AUTH_REQUIRED");
    return { ok: true as const, client, user };
  } catch {
    return failure(operation);
  }
}

export class CheckInReadError extends Error {
  readonly code: CheckInErrorCode;

  constructor(error: CheckInFailure["error"]) {
    super(error.message);
    this.name = "CheckInReadError";
    this.code = error.code;
  }
}

export async function createCheckIn(input: unknown): Promise<CheckInSubmissionResult> {
  const validated = validateCheckInInput(input);
  if (!validated.ok) return validated;

  const auth = await authenticate("SAVE_FAILED");
  if (!auth.ok) return auth;

  try {
    // Only these three columns are written. PostgreSQL owns id and created_at.
    const { data, error } = await auth.client
      .from("check_ins")
      .insert({ user_id: auth.user.id, ...validated.data })
      .select(CHECK_IN_COLUMNS)
      .single<SavedCheckIn>();

    if (error || !data || data.user_id !== auth.user.id) return failure("SAVE_FAILED");
    return { ok: true, checkIn: data };
  } catch {
    // Do not expose database messages, user content, or infrastructure details.
    return failure("SAVE_FAILED");
  }
}

export async function getLatestCheckIn(): Promise<SavedCheckIn | null> {
  const auth = await authenticate("LOAD_FAILED");
  if (!auth.ok) throw new CheckInReadError(auth.error);

  try {
    const { data, error } = await auth.client
      .from("check_ins")
      .select(CHECK_IN_COLUMNS)
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle<SavedCheckIn>();

    if (error || (data && data.user_id !== auth.user.id)) {
      throw new CheckInReadError(failure("LOAD_FAILED").error);
    }
    return data;
  } catch {
    throw new CheckInReadError(failure("LOAD_FAILED").error);
  }
}
