-- Manual test AFTER migration 3. Run this WHOLE file as administrator in one
-- execution, in an approved development database only. All changes roll back.
-- Use an existing dedicated Auth user with NO profile; no Auth rows are changed.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
SET LOCAL bus_test.user_id = 'REPLACE_WITH_DEDICATED_TEST_USER_UUID';

CREATE FUNCTION pg_temp.bus_expect_failure(
  statement text, expected_state text, expected_constraint text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  actual_state text;
  actual_constraint text;
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS
      actual_state = RETURNED_SQLSTATE, actual_constraint = CONSTRAINT_NAME;
    IF actual_state = expected_state
       AND (expected_constraint IS NULL OR actual_constraint = expected_constraint) THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'Expected SQLSTATE % / constraint %, got % / %',
      expected_state, expected_constraint, actual_state, actual_constraint;
  END;
  RAISE EXCEPTION 'Statement unexpectedly succeeded; expected SQLSTATE %', expected_state;
END;
$$;

DO $$
DECLARE
  test_user uuid := current_setting('bus_test.user_id')::uuid;
  invalid_text text;
  valid_text text;
  table_name text;
  record_id uuid;
  check_in_id uuid;
  journal_id uuid;
  created_time timestamptz;
  updated_time timestamptz;
  old_time CONSTANT timestamptz := '2000-01-01T00:00:00Z';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = test_user) THEN
    RAISE EXCEPTION 'Choose an existing dedicated development Auth user';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = test_user) THEN
    RAISE EXCEPTION 'Use a dedicated Auth user without a profile; no existing profile will be changed';
  END IF;

  PERFORM pg_temp.bus_expect_failure(format(
    'INSERT INTO public.check_ins (user_id, emotion) VALUES (%L, NULL)', test_user), '23502');
  PERFORM pg_temp.bus_expect_failure(format(
    'INSERT INTO public.journal_entries (user_id, content) VALUES (%L, NULL)', test_user), '23502');
  RAISE NOTICE 'PASS: required text rejects NULL';

  -- Octal \013 is vertical tab; PostgreSQL does not use a \v escape.
  FOREACH invalid_text IN ARRAY ARRAY['', '   ', E'\t', E'\n', E'\r', E'\f', E'\013', E' \t\n\r\f\013 '] LOOP
    PERFORM pg_temp.bus_expect_failure(format(
      'INSERT INTO public.check_ins (user_id, emotion) VALUES (%L, %L)',
      test_user, invalid_text), '23514', 'check_ins_emotion_nonblank_check');
    PERFORM pg_temp.bus_expect_failure(format(
      'INSERT INTO public.journal_entries (user_id, content) VALUES (%L, %L)',
      test_user, invalid_text), '23514', 'journal_entries_content_nonblank_check');
  END LOOP;
  RAISE NOTICE 'PASS: empty and standard-whitespace-only text is rejected';

  -- A fixture for each table; insert-time timestamps remain permitted.
  INSERT INTO public.profiles (id, created_at) VALUES (test_user, old_time);
  INSERT INTO public.check_ins (user_id, emotion, created_at)
  VALUES (test_user, E'Feeling hopeful\n today', old_time)
  RETURNING id INTO check_in_id;
  INSERT INTO public.journal_entries (user_id, content, created_at, updated_at)
  VALUES (test_user, E'First line\nSecond line with spaces\tand text', old_time, old_time)
  RETURNING id INTO journal_id;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = test_user AND display_name IS NOT NULL)
     OR EXISTS (SELECT 1 FROM public.check_ins WHERE id = check_in_id AND note IS NOT NULL)
     OR EXISTS (SELECT 1 FROM public.journal_entries WHERE id = journal_id AND title IS NOT NULL) THEN
    RAISE EXCEPTION 'Omitted optional fields did not remain NULL';
  END IF;
  RAISE NOTICE 'PASS: multiline text accepted; optional fields remain nullable';

  -- Every rejected update must be caught by the new named text CHECK.
  FOREACH invalid_text IN ARRAY ARRAY['', '   ', E'\t', E'\n', E'\r', E'\f', E'\013', E' \t\n\r\f\013 '] LOOP
    PERFORM pg_temp.bus_expect_failure(format(
      'UPDATE public.check_ins SET emotion = %L WHERE id = %L', invalid_text, check_in_id),
      '23514', 'check_ins_emotion_nonblank_check');
    PERFORM pg_temp.bus_expect_failure(format(
      'UPDATE public.journal_entries SET content = %L WHERE id = %L', invalid_text, journal_id),
      '23514', 'journal_entries_content_nonblank_check');
  END LOOP;
  RAISE NOTICE 'PASS: whitespace-only updates are rejected';

  FOREACH table_name IN ARRAY ARRAY['profiles', 'check_ins', 'journal_entries'] LOOP
    record_id := CASE table_name
      WHEN 'profiles' THEN test_user
      WHEN 'check_ins' THEN check_in_id
      ELSE journal_id END;
    PERFORM pg_temp.bus_expect_failure(format(
      'UPDATE public.%I SET created_at = %L::timestamptz WHERE id = %L',
      table_name, old_time + interval '1 day', record_id), '23514', 'bus_created_at_immutable');
    PERFORM pg_temp.bus_expect_failure(format(
      'UPDATE public.%I SET created_at = NULL WHERE id = %L', table_name, record_id),
      '23514', 'bus_created_at_immutable');
    -- Resending the same timestamp is allowed.
    EXECUTE format('UPDATE public.%I SET created_at = created_at WHERE id = %L', table_name, record_id);
    EXECUTE format('SELECT created_at FROM public.%I WHERE id = %L', table_name, record_id) INTO created_time;
    IF created_time IS DISTINCT FROM old_time THEN
      RAISE EXCEPTION 'Creation time changed on %', table_name;
    END IF;
    RAISE NOTICE 'PASS: %.created_at cannot change; unchanged value accepted', table_name;
  END LOOP;

  UPDATE public.profiles SET display_name = 'Synthetic validation test' WHERE id = test_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Normal profile update affected no rows'; END IF;
  UPDATE public.check_ins SET note = 'Synthetic validation test' WHERE id = check_in_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Normal check-in update affected no rows'; END IF;
  FOREACH valid_text IN ARRAY ARRAY['Normal text', E'First line\nSecond line', E' \tText\r\n '] LOOP
    UPDATE public.check_ins SET emotion = valid_text WHERE id = check_in_id;
    UPDATE public.journal_entries
    SET content = valid_text, title = NULL, updated_at = '1999-01-01T00:00:00Z'
    WHERE id = journal_id
    RETURNING created_at, updated_at INTO created_time, updated_time;
    IF created_time IS DISTINCT FROM old_time OR updated_time IS DISTINCT FROM now()
       OR updated_time <= old_time THEN
      RAISE EXCEPTION 'Journal trigger failed or creation time changed';
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS: normal updates succeed; journal updated_at is set automatically';
  RAISE NOTICE 'PASS: all migration 3 validation and timestamp assertions passed';
END;
$$;

ROLLBACK;
-- Fixtures, helper function, and local settings are discarded. No Auth changes.
-- now() is constant in this transaction: the API runner tests separate transactions.
