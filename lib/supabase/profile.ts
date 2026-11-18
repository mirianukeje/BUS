import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function ensureProfile(client: SupabaseClient, user: User) {
  const displayName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : null;
  const { error } = await client
    .from("profiles")
    .upsert(
      { id: user.id, display_name: displayName },
      { onConflict: "id" },
    );

  if (error) {
    throw error;
  }
}
