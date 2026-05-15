-- Add pressure_direction to user_checkins.
-- Captures the user's perceived direction of pressure spillover at check-in
-- time. Used for personalization in selectTool and for weekly reflection
-- pattern surfacing. Nullable: the user may skip this step.
alter table public.user_checkins
  add column if not exists pressure_direction text;

alter table public.user_checkins
  drop constraint if exists user_checkins_pressure_direction_check;

alter table public.user_checkins
  add constraint user_checkins_pressure_direction_check
  check (
    pressure_direction is null
    or pressure_direction in ('work_to_home', 'home_to_work', 'both', 'none')
  );

-- Index supports the weekly reflection aggregation query.
create index if not exists user_checkins_user_id_created_at_idx
  on public.user_checkins (user_id, created_at desc);
