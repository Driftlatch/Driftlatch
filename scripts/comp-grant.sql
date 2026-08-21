-- Comp-grant template.
-- Grants annual, active-status entitlement to a list of emails.
-- Run in the Supabase SQL editor (dashboard). Not wired to migrations.
--
-- Prerequisites:
--   * Each email must already exist in auth.users (i.e. the person has
--     signed up via /login at least once, or you invited them via
--     Supabase Dashboard -> Authentication -> Users -> Invite user).
--   * If a listed email is not in auth.users, the join returns zero rows
--     for that email and the upsert silently skips it. Use the verify
--     query at the bottom to confirm each grant landed.
--
-- Edit the email list and the current_period_end interval to taste.

insert into public.user_entitlements
  (user_id, plan, status, current_period_end)
select
  id,
  'annual',
  'active',
  now() + interval '1 year'
from auth.users
where email in (
  -- Add / remove emails here, comma-separated. Keep quotes single.
  'example1@example.com',
  'example2@example.com'
)
on conflict (user_id) do update set
  plan = excluded.plan,
  status = excluded.status,
  current_period_end = excluded.current_period_end,
  updated_at = now();

-- Verify: rows should come back for every email you granted.
-- If an email is missing here, they have not signed up yet in auth.users.
select au.email, ue.status, ue.plan, ue.current_period_end
from public.user_entitlements ue
join auth.users au on au.id = ue.user_id
where au.email in (
  'example1@example.com',
  'example2@example.com'
);
