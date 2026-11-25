CREATE OR REPLACE FUNCTION prevent_staff_time_off_overlap() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  has_conflict boolean;
BEGIN
  IF TG_TABLE_NAME = 'appointments' THEN
    IF NEW.status = 'cancelled' THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Serialize writes for one professional so concurrent inserts cannot both
  -- pass their overlap checks.
  PERFORM staff.id
  FROM staff
  WHERE staff.id = NEW.staff_id
  FOR UPDATE;

  IF TG_TABLE_NAME = 'appointments' THEN
    SELECT EXISTS (
      SELECT 1
      FROM time_off AS absence
      WHERE absence.staff_id = NEW.staff_id
        AND absence.starts_at < NEW.ends_at
        AND absence.ends_at > NEW.starts_at
    ) INTO has_conflict;
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM appointments AS appointment
      WHERE appointment.staff_id = NEW.staff_id
        AND appointment.status <> 'cancelled'::appointment_status
        AND appointment.starts_at < NEW.ends_at
        AND appointment.ends_at > NEW.starts_at
    ) INTO has_conflict;
  END IF;

  IF has_conflict THEN
    RAISE EXCEPTION 'This time conflicts with an existing time off or appointment.'
      USING ERRCODE = '23P01',
            CONSTRAINT = 'staff_time_off_no_appointment_overlap';
  END IF;

  RETURN NEW;
END;
$$;
