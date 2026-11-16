BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.profiles, public.check_ins, public.journal_entries
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.profiles, public.check_ins, public.journal_entries
  TO authenticated;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY profiles_delete_own ON public.profiles
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = id);

CREATE POLICY check_ins_select_own ON public.check_ins
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY check_ins_insert_own ON public.check_ins
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY check_ins_update_own ON public.check_ins
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY check_ins_delete_own ON public.check_ins
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY journal_entries_select_own ON public.journal_entries
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY journal_entries_insert_own ON public.journal_entries
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY journal_entries_update_own ON public.journal_entries
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY journal_entries_delete_own ON public.journal_entries
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

COMMIT;
