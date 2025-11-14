DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT
            'DROP POLICY "' || polname || '" ON "' || n.nspname || '"."' || c.relname || '";' as drop_command
        FROM
            pg_policy p
        JOIN
            pg_class c ON c.oid = p.polrelid
        JOIN
            pg_namespace n ON n.oid = c.relnamespace
    LOOP
        RAISE NOTICE '%', policy_record.drop_command;
    END LOOP;
END;
$$;
