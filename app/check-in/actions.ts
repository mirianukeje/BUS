"use server";

import { revalidatePath } from "next/cache";
import { createCheckIn } from "@/lib/check-ins/server";
import { validateCheckInInput } from "@/lib/check-ins/validation";
import type { CheckInSubmissionResult } from "@/lib/check-ins/contracts";

export async function saveCheckIn(input: unknown): Promise<CheckInSubmissionResult> {
  const validated = validateCheckInInput(input);
  if (!validated.ok) return validated;

  // createCheckIn revalidates and authenticates using request cookies, regardless
  // of whether the caller visited the protected page first.
  const result = await createCheckIn(validated.data);
  if (result.ok) revalidatePath("/check-in");
  return result;
}
