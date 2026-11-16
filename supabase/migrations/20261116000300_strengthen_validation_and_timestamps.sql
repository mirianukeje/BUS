BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Hold writes between the data preflight and constraint replacement.
-- A busy development database times out rather than waiting indefinitely.
LOCK TABLE public.profiles, public.check_ins, public.journal_entries
  IN ACCESS EXCLUSIVE MODE;

-- Abort without revealing content or modifying invalid existing records.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.check_ins
    WHERE emotion IS NULL OR emotion !~ '[^[:space:]]'
  ) THEN
    RAISE EXCEPTION
      'Migration stopped: check_ins contains NULL or whitespace-only emotions'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.journal_entries
    WHERE content IS NULL OR content !~ '[^[:space:]]'
  ) THEN
    RAISE EXCEPTION
      'Migration stopped: journal_entries contains NULL or whitespace-only content'
      USING ERRCODE = '23514';
  END IF;
END;
$$;

-- Migration 1's unnamed column CHECKs get these PostgreSQL-generated names.
-- A missing/renamed constraint fails the transaction rather than being ignored.
-- NOT NULL constraints and optional fields remain unchanged.
ALTER TABLE public.check_ins
  DROP CONSTRAINT check_ins_emotion_check,
  ADD CONSTRAINT check_ins_emotion_nonblank_check
    CHECK (emotion ~ '[^[:space:]]');

ALTER TABLE public.journal_entries
  DROP CONSTRAINT journal_entries_content_check,
  ADD CONSTRAINT journal_entries_content_nonblank_check
    CHECK (content ~ '[^[:space:]]');

CREATE FUNCTION public.prevent_bus_created_at_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'created_at cannot be changed after insertion'
      USING ERRCODE = '23514',
            CONSTRAINT = 'bus_created_at_immutable';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_bus_created_at_change() FROM PUBLIC;

CREATE TRIGGER profiles_protect_created_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_bus_created_at_change();

CREATE TRIGGER check_ins_protect_created_at
  BEFORE UPDATE ON public.check_ins
  FOR EACH ROW EXECUTE FUNCTION public.prevent_bus_created_at_change();

-- Runs before journal_entries_set_updated_at alphabetically. Neither trigger
-- changes created_at; the existing updated_at function/trigger is left intact.
CREATE TRIGGER journal_entries_protect_created_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_bus_created_at_change();

COMMIT;
