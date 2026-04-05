with ranked as (
  select
    ctid,
    user_id,
    row_number() over (
      partition by user_id
      order by updated_at desc nulls last, created_at desc nulls last, ctid desc
    ) as rn
  from public.user_profile
),
canonical as (
  select ctid, user_id
  from ranked
  where rn = 1
),
merged as (
  select
    profile.user_id,
    (array_agg(profile.username order by (profile.username is null), profile.updated_at desc nulls last, profile.created_at desc nulls last, profile.ctid desc))[1] as username,
    (array_agg(profile.display_name order by (profile.display_name is null), profile.updated_at desc nulls last, profile.created_at desc nulls last, profile.ctid desc))[1] as display_name,
    (array_agg(profile.attachment_style order by (profile.attachment_style is null), profile.updated_at desc nulls last, profile.created_at desc nulls last, profile.ctid desc))[1] as attachment_style,
    (array_agg(profile.defaults order by (profile.defaults is null), profile.updated_at desc nulls last, profile.created_at desc nulls last, profile.ctid desc))[1] as defaults,
    max(profile.updated_at) as updated_at,
    min(profile.created_at) as created_at
  from public.user_profile as profile
  group by profile.user_id
)
update public.user_profile as target
set
  username = merged.username,
  display_name = merged.display_name,
  attachment_style = merged.attachment_style,
  defaults = merged.defaults,
  updated_at = coalesce(merged.updated_at, target.updated_at),
  created_at = coalesce(target.created_at, merged.created_at)
from canonical
join merged using (user_id)
where target.ctid = canonical.ctid;

with ranked as (
  select
    ctid,
    user_id,
    row_number() over (
      partition by user_id
      order by updated_at desc nulls last, created_at desc nulls last, ctid desc
    ) as rn
  from public.user_profile
)
delete from public.user_profile as target
using ranked
where target.ctid = ranked.ctid
  and ranked.rn > 1;

create unique index if not exists user_profile_user_id_idx
  on public.user_profile (user_id);
