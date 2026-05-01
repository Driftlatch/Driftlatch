import type { EQDomain } from "@/lib/eqQuestions";

export const PUBLIC_EQ_RESULT_KEY = "driftlatch_public_eq_result";
export const PUBLIC_EQ_COMPLETED_AT_KEY = "driftlatch_public_eq_completed_at";

export type PublicEQResult = {
  scores: Record<EQDomain, number>;
  weakestDomain: EQDomain;
  archetype: string;
  openingParagraph: string;
  hasPartnerContext: boolean;
  hasKidsContext: boolean;
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
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / privacy mode errors
  }
}

function removeKey(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function readStoredPublicEQResult() {
  const value = readJson<unknown>(PUBLIC_EQ_RESULT_KEY);
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as PublicEQResult)
    : null;
}

export function writeStoredPublicEQResult(
  result: PublicEQResult,
  completedAt = new Date().toISOString(),
) {
  writeJson(PUBLIC_EQ_RESULT_KEY, result);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(PUBLIC_EQ_COMPLETED_AT_KEY, completedAt);
    } catch {
      // ignore
    }
  }
}

export function clearStoredPublicEQResult() {
  removeKey(PUBLIC_EQ_RESULT_KEY);
  removeKey(PUBLIC_EQ_COMPLETED_AT_KEY);
}

export function hasStoredPublicEQResult() {
  return Boolean(readStoredPublicEQResult());
}
