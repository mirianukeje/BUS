import {
  EMOTION_OPTIONS,
  type CheckInFieldErrors,
  type CheckInValidationResult,
  type Emotion,
} from "@/lib/check-ins/contracts";

// Safe to reuse for immediate client feedback, but the server always runs it too.
export function validateCheckInInput(input: unknown): CheckInValidationResult {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    (Object.getPrototypeOf(input) !== Object.prototype &&
      Object.getPrototypeOf(input) !== null)
  ) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Submit an emotion and an optional note." },
    };
  }

  // Do not allow ownership, timestamps, or other hidden fields to be submitted.
  if (Reflect.ownKeys(input).some((key) => key !== "emotion" && key !== "note")) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "The check-in contains unexpected fields." },
    };
  }

  const values = input as Record<string, unknown>;
  const emotion = typeof values.emotion === "string" ? values.emotion.trim() : "";
  const fieldErrors: CheckInFieldErrors = {};

  if (!EMOTION_OPTIONS.some((option) => option === emotion)) {
    fieldErrors.emotion = "Choose an emotion from the available options.";
  }
  if (values.note !== undefined && values.note !== null && typeof values.note !== "string") {
    fieldErrors.note = "The optional note must be text.";
  }
  if (Object.keys(fieldErrors).length) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Check the highlighted fields.", fieldErrors },
    };
  }

  // Preserve meaningful note formatting; trim only to detect a blank value.
  const note = typeof values.note === "string" && values.note.trim() ? values.note : null;
  return { ok: true, data: { emotion: emotion as Emotion, note } };
}
