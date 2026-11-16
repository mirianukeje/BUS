-- Manual development test, NOT a migration. All fixture changes are rolled back.
-- Run the entire file in one SQL Editor execution as the database administrator.
-- Replace the UUID below with a dedicated, existing development Auth user's ID.
-- This tests constraints independently of RLS; use the API runner for RLS tests.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
SET LOCAL bus_test.user_id = '0b927e7a-d44f-4c57-b16a-bea2e204ebd3';

CREATE FUNCTION pg_temp.bus_expect_sqlstate(statement text, expected text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE actual text;
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS actual = RETURNED_SQLSTATE;
    IF actual = expected THEN RETURN; END IF;
    RAISE EXCEPTION 'Expected SQLSTATE %, got %', expected, actual;
  END;
  RAISE EXCEPTION 'Statement unexpectedly succeeded; expected SQLSTATE %', expected;
END;
$$;

DO $$
DECLARE
  test_user uuid := current_setting('bus_test.user_id')::uuid;
  missing_user uuid := gen_random_uuid();
  check_in_id uuid;
  journal_id uuid;
  created_time timestamptz;
  updated_time timestamptz;
  invalid_text text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = test_user) THEN
    RAISE EXCEPTION 'Choose an existing dedicated development Auth user';
  END IF;
  WHILE EXISTS (SELECT 1 FROM auth.users WHERE id = missing_user) LOOP
    missing_user := gen_random_uuid();
  END LOOP;

  -- NOT NULL failures (23502), including omitted required fields.
  PERFORM pg_temp.bus_expect_sqlstate(format(
    'INSERT INTO public.check_ins (user_id) VALUES (%L)', test_user), '23502');
  PERFORM pg_temp.bus_expect_sqlstate(format(
    'INSERT INTO public.check_ins (user_id, emotion) VALUES (%L, NULL)', test_user), '23502');
  PERFORM pg_temp.bus_expect_sqlstate(format(
    'INSERT INTO public.journal_entries (user_id) VALUES (%L)', test_user), '23502');
  PERFORM pg_temp.bus_expect_sqlstate(format(
    'INSERT INTO public.journal_entries (user_id, content) VALUES (%L, NULL)', test_user), '23502');
  PERFORM pg_temp.bus_expect_sqlstate(
    'INSERT INTO public.profiles (id) VALUES (NULL)', '23502');
  PERFORM pg_temp.bus_expect_sqlstate(
    'INSERT INTO public.check_ins (user_id, emotion) VALUES (NULL, ''hopeful'')', '23502');
  PERFORM pg_temp.bus_expect_sqlstate(
    'INSERT INTO public.journal_entries (user_id, content) VALUES (NULL, ''Synthetic test'')', '23502');

  -- CHECK failures (23514) for empty text and ordinary-space-only text.
  FOREACH invalid_text IN ARRAY ARRAY['', '   '] LOOP
    PERFORM pg_temp.bus_expect_sqlstate(format(
      'INSERT INTO public.check_ins (user_id, emotion) VALUES (%L, %L)',
      test_user, invalid_text), '23514');
    PERFORM pg_temp.bus_expect_sqlstate(format(
      'INSERT INTO public.journal_entries (user_id, content) VALUES (%L, %L)',
      test_user, invalid_text), '23514');
  END LOOP;

  -- FK failures (23503), using a UUID known not to exist in auth.users.
  PERFORM pg_temp.bus_expect_sqlstate(format(
    'INSERT INTO public.profiles (id) VALUES (%L)', missing_user), '23503');
  PERFORM pg_temp.bus_expect_sqlstate(format(
    'INSERT INTO public.check_ins (user_id, emotion) VALUES (%L, ''hopeful'')', missing_user), '23503');
  PERFORM pg_temp.bus_expect_sqlstate(format(
    'INSERT INTO public.journal_entries (user_id, content) VALUES (%L, ''Synthetic test'')', missing_user), '23503');

  -- Valid defaults and optional NULL fields. No existing profiles are changed.
  INSERT INTO public.check_ins (user_id, emotion)
  VALUES (test_user, 'hopeful')
  RETURNING id, created_at INTO check_in_id, created_time;
  IF check_in_id IS NULL OR created_time IS DISTINCT FROM now() THEN
    RAISE EXCEPTION 'Check-in UUID/timestamp defaults failed';
  END IF;

  INSERT INTO public.journal_entries (user_id, content)
  VALUES (test_user, 'Synthetic constraint test')
  RETURNING id, created_at, updated_at INTO journal_id, created_time, updated_time;
  IF journal_id IS NULL OR created_time IS DISTINCT FROM now()
     OR updated_time IS DISTINCT FROM now() THEN
    RAISE EXCEPTION 'Journal UUID/timestamp defaults failed';
  END IF;

  -- Constraints also apply on UPDATE; exception subtransactions restore fixtures.
  PERFORM pg_temp.bus_expect_sqlstate(format(
    'UPDATE public.check_ins SET emotion = '''' WHERE id = %L', check_in_id), '23514');
  PERFORM pg_temp.bus_expect_sqlstate(format(
    'UPDATE public.journal_entries SET content = '''' WHERE id = %L', journal_id), '23514');
  PERFORM pg_temp.bus_expect_sqlstate(format(
    'UPDATE public.check_ins SET user_id = %L WHERE id = %L', missing_user, check_in_id), '23503');
  PERFORM pg_temp.bus_expect_sqlstate(format(
    'UPDATE public.journal_entries SET user_id = %L WHERE id = %L', missing_user, journal_id), '23503');

  -- Backdate a NEW fixture: now() is constant within this transaction, so sleep
  -- would not demonstrate advancement. Never backdate an existing application row.
  INSERT INTO public.journal_entries (user_id, content, created_at, updated_at)
  VALUES (test_user, 'Synthetic trigger test', '2000-01-01T00:00:00Z', '2000-01-01T00:00:00Z')
  RETURNING id INTO journal_id;
  UPDATE public.journal_entries
  SET content = 'Updated synthetic trigger test', updated_at = '1999-01-01T00:00:00Z'
  WHERE id = journal_id
  RETURNING created_at, updated_at INTO created_time, updated_time;
  IF created_time IS DISTINCT FROM '2000-01-01T00:00:00Z'::timestamptz
     OR updated_time IS DISTINCT FROM now()
     OR updated_time <= '2000-01-01T00:00:00Z'::timestamptz THEN
    RAISE EXCEPTION 'Journal timestamp trigger failed';
  END IF;

  RAISE NOTICE 'PASS: required fields, foreign keys, defaults, and journal update trigger';
END;
$$;

ROLLBACK;
-- Expected: PASS notice and a completed ROLLBACK; zero persistent fixture rows.
