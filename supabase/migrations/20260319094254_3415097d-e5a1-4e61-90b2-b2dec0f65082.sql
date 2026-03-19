
-- Split MID shift into MID-AM (Ara Sabah) and MID-PM (Ara Akşam)
-- First update existing MID to MID-AM
UPDATE public.shift_types 
SET code = 'MID-AM', label = 'Ara Sabah', start_time = '09:00:00', end_time = '15:00:00', sort_order = 4
WHERE code = 'MID';

-- Insert MID-PM
INSERT INTO public.shift_types (code, label, start_time, end_time, color, is_off, is_editable_time, sort_order)
VALUES ('MID-PM', 'Ara Akşam', '15:00:00', '23:00:00', 'emerald', false, true, 5);

-- Update OFF sort_order
UPDATE public.shift_types SET sort_order = 6 WHERE code = 'OFF';

-- Update any existing roster_shifts that reference the old MID shift_type_id to MID-AM (they keep their current reference since the id didn't change)
