-- Add insight linking columns to posts and game_insights tables
ALTER TABLE posts ADD COLUMN IF NOT EXISTS insight_id uuid;
ALTER TABLE game_insights ADD COLUMN IF NOT EXISTS linked_post_id uuid;
ALTER TABLE game_insights ADD COLUMN IF NOT EXISTS re_review_requested_at timestamptz;
