create table if not exists public.user_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_entitlements
  add column if not exists paddle_customer_id text,
  add column if not exists paddle_subscription_id text,
  add column if not exists paddle_transaction_id text,
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists last_event_id text,
  add column if not exists last_event_type text,
  add column if not exists last_event_at timestamptz;

create unique index if not exists user_entitlements_paddle_customer_id_idx
  on public.user_entitlements (paddle_customer_id)
  where paddle_customer_id is not null;

create unique index if not exists user_entitlements_paddle_subscription_id_idx
  on public.user_entitlements (paddle_subscription_id)
  where paddle_subscription_id is not null;
