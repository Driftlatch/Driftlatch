import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { Json, TablesInsert } from "@/lib/types/supabase";

export const PUBLIC_PROFILE_ANSWERS_KEY = "driftlatch_public_profile_answers";
export const PUBLIC_PROFILE_CONTEXT_KEY = "driftlatch_public_profile_context";
export const PUBLIC_PROFILE_RESULT_KEY = "driftlatch_public_profile_result";
export const PUBLIC_PROFILE_COMPLETED_AT_KEY = "driftlatch_public_profile_completed_at";

export type PublicProfileContext = {
  display_name: string;
  home_setup: string;
  priority: string;
  spillover: string;
  work_intensity: string;
};

export type PublicProfileResult = {
  attachment_style: string;
  defaults: {
    default_need: string;
    default_situation: string;
    default_time: number;
    primary_pack_ids: string[];
    top_patterns: string[];
  };
  display_name: string | null;
  primary_pack_ids: string[];
  result_summary: {
    attach_top: string | null;
    emotional_line: string;
    home_top: string | null;
    micro_pack: string;
    primary_pack: string;
    priority: string;
    recovery_top: string | null;
    secondary_pack: string | null;
    spillover: string;
    work_top: string | null;
  };
};

function readJson<T>(key: string) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function removeKey(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

export function readStoredPublicProfileAnswers() {
  const value = readJson<unknown>(PUBLIC_PROFILE_ANSWERS_KEY);
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === "number") : null;
}

export function writeStoredPublicProfileAnswers(answers: number[]) {
  writeJson(PUBLIC_PROFILE_ANSWERS_KEY, answers);
}

export function readStoredPublicProfileContext() {
  const value = readJson<unknown>(PUBLIC_PROFILE_CONTEXT_KEY);
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as PublicProfileContext)
    : null;
}

export function writeStoredPublicProfileContext(context: PublicProfileContext) {
  writeJson(PUBLIC_PROFILE_CONTEXT_KEY, context);
}

export function readStoredPublicProfileResult() {
  const value = readJson<unknown>(PUBLIC_PROFILE_RESULT_KEY);
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as PublicProfileResult)
    : null;
}

export function writeStoredPublicProfileResult(result: PublicProfileResult, completedAt = new Date().toISOString()) {
  writeJson(PUBLIC_PROFILE_RESULT_KEY, result);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PUBLIC_PROFILE_COMPLETED_AT_KEY, completedAt);
  }
}

export function clearStoredPublicProfileResult() {
  removeKey(PUBLIC_PROFILE_RESULT_KEY);
  removeKey(PUBLIC_PROFILE_COMPLETED_AT_KEY);
}

export function clearStoredPublicProfileData() {
  removeKey(PUBLIC_PROFILE_ANSWERS_KEY);
  removeKey(PUBLIC_PROFILE_CONTEXT_KEY);
  removeKey(PUBLIC_PROFILE_RESULT_KEY);
  removeKey(PUBLIC_PROFILE_COMPLETED_AT_KEY);
}

export function hasStoredPublicProfileResult() {
  return Boolean(readStoredPublicProfileResult());
}

export async function syncPublicProfileResultToAccount(session: Session, result: PublicProfileResult) {
  const supabase = getSupabase();
  const email = session.user.email?.trim().toLowerCase() ?? null;
  const displayName = result.display_name?.trim() || null;

  const payload: TablesInsert<"user_profile"> = {
    user_id: session.user.id,
    username: email,
    attachment_style: result.attachment_style,
    defaults: result.defaults as Json,
    primary_pack_ids: result.primary_pack_ids,
    updated_at: new Date().toISOString(),
  };

  if (displayName) {
    payload.display_name = displayName;
  }

  const { error } = await supabase.from("user_profile").upsert(payload);

  if (error) throw error;
}

export async function syncStoredPublicProfileToAccount(session: Session) {
  const result = readStoredPublicProfileResult();
  if (!result) return false;

  await syncPublicProfileResultToAccount(session, result);
  clearStoredPublicProfileData();
  return true;
}
