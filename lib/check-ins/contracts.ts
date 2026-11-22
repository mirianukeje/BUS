// Client-safe contract: no server imports, credentials, or Supabase instances.
export const EMOTION_OPTIONS = [
  "Happy",
  "Calm",
  "Hopeful",
  "Sad",
  "Anxious",
  "Angry",
  "Overwhelmed",
  "Mixed",
] as const;

export type Emotion = (typeof EMOTION_OPTIONS)[number];

export type CheckInInput = {
  emotion: Emotion;
  note?: string | null;
};

export type ValidatedCheckInInput = {
  emotion: Emotion;
  note: string | null;
};

export type SavedCheckIn = {
  id: string;
  user_id: string;
  // Sprint 1 allowed free text, so previously stored labels may differ.
  emotion: string;
  note: string | null;
  created_at: string;
};

export type CheckInFieldErrors = Partial<Record<"emotion" | "note", string>>;

export type CheckInErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_REQUIRED"
  | "CONFIGURATION_ERROR"
  | "SAVE_FAILED"
  | "LOAD_FAILED";

export type CheckInFailure = {
  ok: false;
  error: {
    code: CheckInErrorCode;
    message: string;
    fieldErrors?: CheckInFieldErrors;
  };
};

export type CheckInSuccess = {
  ok: true;
  checkIn: SavedCheckIn;
};

export type CheckInSubmissionResult = CheckInSuccess | CheckInFailure;

export type CheckInValidationResult =
  | { ok: true; data: ValidatedCheckInInput }
  | CheckInFailure;
