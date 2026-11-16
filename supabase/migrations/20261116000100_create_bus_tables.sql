BEGIN;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emotion text NOT NULL CHECK (length(btrim(emotion)) > 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  content text NOT NULL CHECK (length(btrim(content)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX check_ins_user_created_at_idx
  ON public.check_ins (user_id, created_at DESC);
CREATE INDEX journal_entries_user_created_at_idx
  ON public.journal_entries (user_id, created_at DESC);

-- Runs with the caller's privileges; does not bypass RLS.
CREATE FUNCTION public.set_bus_journal_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_bus_journal_updated_at() FROM PUBLIC;

CREATE TRIGGER journal_entries_set_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_bus_journal_updated_at();

-- Protect records immediately, including between migration applications.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profiles, public.check_ins, public.journal_entries
  FROM PUBLIC, anon, authenticated;

COMMIT;
