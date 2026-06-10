-- Add work_pattern to user_eq_profile.
-- Captures how the user's work is structured (fixed hours / always on /
-- shift or on-call / no clear boundary). Used at quiz render time to swap
-- question and option framing. Does NOT affect scoring math or any default
-- mapping. Nullable: legacy rows and users who skip the EQ context capture
-- stay null.
alter table public.user_eq_profile
  add column if not exists work_pattern text;

alter table public.user_eq_profile
  drop constraint if exists user_eq_profile_work_pattern_check;

alter table public.user_eq_profile
  add constraint user_eq_profile_work_pattern_check
  check (
    work_pattern is null
    or work_pattern in ('fixed_hours', 'always_on', 'shift_or_on_call', 'no_clear_boundary')
  );
