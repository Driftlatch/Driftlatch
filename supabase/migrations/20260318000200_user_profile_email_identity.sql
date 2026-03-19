alter table public.user_profile
  drop constraint if exists user_profile_username_format_check;

update public.user_profile as profile
set
  username = lower(users.email),
  updated_at = now()
from auth.users as users
where profile.user_id = users.id
  and users.email is not null
  and profile.username is distinct from lower(users.email);
