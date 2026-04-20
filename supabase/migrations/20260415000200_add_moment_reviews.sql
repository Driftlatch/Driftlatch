CREATE TABLE IF NOT EXISTS public.user_moment_reviews (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  who_involved     text NOT NULL,
  moment_type      text NOT NULL,
  state_before     text NOT NULL,
  reflection_text  text,
  fixit_cards      jsonb,
  fixit_used       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_moment_reviews_user_id_idx
  ON public.user_moment_reviews(user_id);
