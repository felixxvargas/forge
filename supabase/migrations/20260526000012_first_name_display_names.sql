-- Trim display_name to first name only for users with auto-generated gaming handles.
-- Auto-generated handles match the pattern: adjective_noun1234 (e.g., swift_wolf4821)
-- Only updates users who have a multi-word display_name (i.e., still have a last name).
UPDATE profiles
SET display_name = split_part(display_name, ' ', 1)
WHERE
  handle ~ '^[a-z]+_[a-z]+[0-9]{4}$'
  AND display_name LIKE '% %'
  AND display_name IS NOT NULL
  AND trim(display_name) != '';
