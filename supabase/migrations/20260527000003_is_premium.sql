-- Add is_premium flag to profiles for feature gating.
alter table public.profiles add column if not exists is_premium boolean default false;

-- Grant early access to @felix.
update public.profiles set is_premium = true where handle = 'felix';
