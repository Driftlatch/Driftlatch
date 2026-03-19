alter table public.user_profile
  add column if not exists username text,
  add column if not exists display_name text;

create unique index if not exists user_profile_username_lower_idx
  on public.user_profile (lower(username))
  where username is not null and btrim(username) <> '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_profile_username_format_check'
  ) then
    alter table public.user_profile
      add constraint user_profile_username_format_check
      check (
        username is null
        or (
          char_length(username) between 3 and 30
          and username ~ '^[a-z0-9_]+$'
          and username !~ '^_'
          and username !~ '_$'
        )
      );
  end if;
end $$;
