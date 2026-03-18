
-- Drop the public_holidays table (and its foreign keys)
DROP TABLE IF EXISTS public_holidays CASCADE;

-- Change leave_type column to text, drop old enum, create new enum, convert back
ALTER TABLE leave_requests ALTER COLUMN leave_type TYPE text;
DROP TYPE IF EXISTS leave_type;
CREATE TYPE leave_type AS ENUM ('annual', 'administrative');

-- Delete any rows with types not in the new enum
DELETE FROM leave_requests WHERE leave_type NOT IN ('annual', 'administrative');

ALTER TABLE leave_requests ALTER COLUMN leave_type TYPE leave_type USING leave_type::leave_type;
