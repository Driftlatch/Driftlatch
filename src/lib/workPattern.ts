// Work pattern axis. Captured on the Pressure Profile context page and in the
// Pressure EQ intro. Used only to swap question and option framing at render
// time. NEVER feeds scoring math or default mappings.

export type WorkPattern =
  | "fixed_hours"
  | "always_on"
  | "shift_or_on_call"
  | "no_clear_boundary";

export const WORK_PATTERN_VALUES: readonly WorkPattern[] = [
  "fixed_hours",
  "always_on",
  "shift_or_on_call",
  "no_clear_boundary",
] as const;

export const WORK_PATTERN_LABEL: Record<WorkPattern, string> = {
  fixed_hours: "Set hours, mostly",
  always_on: "Always on",
  shift_or_on_call: "Shift work or on-call",
  no_clear_boundary: "No real shape to it",
};

export function isWorkPattern(value: unknown): value is WorkPattern {
  return typeof value === "string" && (WORK_PATTERN_VALUES as readonly string[]).includes(value);
}

// Variant resolver shared by PP questions, EQ scenario stems, and EQ option
// text. Falls back to the default string when no variant matches the current
// work pattern (or when work pattern is null).
export function resolveVariant(
  defaultText: string,
  variants: Partial<Record<WorkPattern, string>> | undefined,
  workPattern: WorkPattern | null,
): string {
  if (!workPattern || !variants) return defaultText;
  return variants[workPattern] ?? defaultText;
}
