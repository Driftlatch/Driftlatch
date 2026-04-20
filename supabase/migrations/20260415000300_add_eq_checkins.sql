CREATE TABLE IF NOT EXISTS public.user_eq_checkins (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  micro_question   text        NOT NULL,
  response         integer     NOT NULL CHECK (response BETWEEN 1 AND 4),
  domain           text        NOT NULL,
  state_at_checkin text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_eq_checkins_user_id_idx
  ON public.user_eq_checkins(user_id);
