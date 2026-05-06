alter table public.profiles
  add column if not exists pinned_post_id uuid references public.posts(id) on delete set null;
