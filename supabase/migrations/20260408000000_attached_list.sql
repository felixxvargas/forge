-- Add attached_list column to posts for sharing game lists
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS attached_list jsonb;
