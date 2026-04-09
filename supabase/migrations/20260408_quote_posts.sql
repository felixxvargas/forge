-- Add quote_post_id to posts table for quote-post feature
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS quote_post_id text;
