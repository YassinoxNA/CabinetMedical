DO $$
DECLARE
    check_name text;
BEGIN
    FOR check_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'appointments'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%ends_at > starts_at%'
    LOOP
        EXECUTE format('ALTER TABLE appointments DROP CONSTRAINT %I', check_name);
    END LOOP;
END $$;

ALTER TABLE appointments
    DROP CONSTRAINT IF EXISTS appointments_times_valid;

ALTER TABLE appointments
    ADD CONSTRAINT appointments_times_valid CHECK (ends_at >= starts_at);
