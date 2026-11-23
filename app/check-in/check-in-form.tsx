"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { saveCheckIn } from "@/app/check-in/actions";
import {
  EMOTION_OPTIONS,
  type CheckInFieldErrors,
  type SavedCheckIn,
} from "@/lib/check-ins/contracts";
import { validateCheckInInput } from "@/lib/check-ins/validation";

type CheckInFormProps = {
  initialLatest: SavedCheckIn | null;
  loadError: { code: string; message: string } | null;
};

function formatCheckInDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function CheckInForm({ initialLatest, loadError }: CheckInFormProps) {
  const router = useRouter();
  const [emotion, setEmotion] = useState("");
  const [note, setNote] = useState("");
  const [latest, setLatest] = useState(initialLatest);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<CheckInFieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    setSuccessMessage("");
    setErrorMessage("");
    setFieldErrors({});

    const validated = validateCheckInInput({
      emotion,
      note: note.trim() ? note : null,
    });
    if (!validated.ok) {
      setErrorMessage(validated.error.message);
      setFieldErrors(validated.error.fieldErrors ?? {});
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveCheckIn(validated.data);
      if (result.ok) {
        setLatest(result.checkIn);
        setEmotion("");
        setNote("");
        setSuccessMessage("Your check-in was saved.");
        router.refresh();
      } else {
        setFieldErrors(result.error.fieldErrors ?? {});
        setErrorMessage(
          result.error.code === "AUTH_REQUIRED"
            ? "Your session may have ended. Sign in again to save this check-in."
            : result.error.message,
        );
      }
    } catch {
      setErrorMessage(
        "We could not confirm the save. Check your latest check-in before retrying.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="check-in-layout">
      <section className="check-in-form-panel" aria-labelledby="check-in-form-title">
        <p className="eyebrow">A moment for yourself</p>
        <h2 id="check-in-form-title">How are you feeling?</h2>
        <form className="check-in-form" noValidate onSubmit={handleSubmit}>
          <fieldset
            aria-describedby={
              fieldErrors.emotion ? "emotion-error" : "emotion-help"
            }
            className="emotion-fieldset"
          >
            <legend>Choose an emotion <span aria-hidden="true">*</span></legend>
            <p className="check-in-field-help" id="emotion-help">
              Select the one that feels closest right now.
            </p>
            <div className="emotion-options">
              {EMOTION_OPTIONS.map((option) => (
                <label className="emotion-option" key={option}>
                  <input
                    checked={emotion === option}
                    name="emotion"
                    onChange={() => setEmotion(option)}
                    type="radio"
                    value={option}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {fieldErrors.emotion && (
              <p className="field-error" id="emotion-error" role="alert">
                {fieldErrors.emotion}
              </p>
            )}
          </fieldset>

          <label className="check-in-note-label" htmlFor="check-in-note">
            Add a note <span className="check-in-optional">(optional)</span>
          </label>
          <textarea
            aria-describedby={fieldErrors.note ? "note-error" : "note-help"}
            className="check-in-note"
            id="check-in-note"
            maxLength={undefined}
            name="note"
            onChange={(event) => setNote(event.target.value)}
            placeholder="What is present for you?"
            rows={5}
            value={note}
          />
          <p className="check-in-field-help" id="note-help">
            A few words are enough. This is private to your account.
          </p>
          {fieldErrors.note && (
            <p className="field-error" id="note-error" role="alert">
              {fieldErrors.note}
            </p>
          )}

          {errorMessage && (
            <div className="check-in-feedback check-in-feedback-error" role="alert">
              <p>{errorMessage}</p>
              {emotion && (
                <span aria-hidden="true">Your selections have been kept.</span>
              )}
            </div>
          )}
          {successMessage && (
            <p className="check-in-feedback" role="status" aria-live="polite">
              {successMessage}
            </p>
          )}

          {fieldErrors.emotion === undefined &&
            errorMessage.includes("Sign in") && (
              <Link className="text-link" href="/login?next=%2Fcheck-in">
                Go to sign in
              </Link>
            )}

          <button
            className="button button-primary check-in-submit"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Saving..." : "Save check-in"}
          </button>
        </form>
      </section>

      <aside className="latest-check-in" aria-labelledby="latest-check-in-title">
        <p className="eyebrow">Your latest</p>
        <h2 id="latest-check-in-title">Most recent check-in</h2>

        {loadError ? (
          <div className="latest-check-in-error" role="alert">
            {loadError.code === "AUTH_REQUIRED" ? (
              <>
                <p>Sign in again to view and save your latest check-in.</p>
                <Link className="text-link" href="/login?next=%2Fcheck-in">
                  Go to sign in
                </Link>
              </>
            ) : (
              <p>{loadError.message}</p>
            )}
          </div>
        ) : latest ? (
          <article className="latest-check-in-record">
            <span className="latest-emotion">{latest.emotion}</span>
            {latest.note && <p className="latest-note">“{latest.note}”</p>}
            <time dateTime={latest.created_at}>
              {formatCheckInDate(latest.created_at)}
            </time>
          </article>
        ) : (
          <div className="latest-check-in-empty">
            <p>No check-ins yet.</p>
            <span>Your first reflection will appear here.</span>
          </div>
        )}
      </aside>
    </div>
  );
}
