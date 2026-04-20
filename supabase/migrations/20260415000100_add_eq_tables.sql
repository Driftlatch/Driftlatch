-- Migration: add EQ profile and sessions tables
-- RLS is managed on the Supabase dashboard — no policies here.

-- ──────────────────────────────────────────────
-- TABLE: user_eq_profile
-- One row per user. Stores the latest EQ snapshot
-- scores and the derived archetype/opening copy.
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_eq_profile (
  user_id              uuid PRIMARY KEY
                       REFERENCES auth.users(id) ON DELETE CASCADE,
  pressure_reading     integer NOT NULL CHECK (pressure_reading BETWEEN 0 AND 100),
  repair_instinct      integer NOT NULL CHECK (repair_instinct BETWEEN 0 AND 100),
  presence_quality     integer NOT NULL CHECK (presence_quality BETWEEN 0 AND 100),
  boundary_intel       integer NOT NULL CHECK (boundary_intel BETWEEN 0 AND 100),
  recovery_aware       integer NOT NULL CHECK (recovery_aware BETWEEN 0 AND 100),
  signal_accuracy      integer NOT NULL CHECK (signal_accuracy BETWEEN 0 AND 100),
  weakest_domain       text NOT NULL,
  archetype            text NOT NULL,
  has_kids_context     boolean NOT NULL DEFAULT false,
  has_partner_context  boolean NOT NULL DEFAULT true,
  opening_paragraph    text NOT NULL,
  version              integer NOT NULL DEFAULT 1,
  completed_at         timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────
-- TABLE: user_eq_sessions
-- Append-only log of every completed EQ session.
-- Stores which scenario IDs were shown so they are
-- never repeated on reassessment.
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_eq_sessions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type         text NOT NULL DEFAULT 'snapshot',
  scenario_ids         text[] NOT NULL,
  raw_scores           jsonb NOT NULL,
  completed_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_eq_sessions_user_id_idx
  ON public.user_eq_sessions(user_id);

-- ──────────────────────────────────────────────
-- TRIGGER: keep updated_at current on user_eq_profile
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_user_eq_profile_updated_at
  BEFORE UPDATE ON public.user_eq_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
