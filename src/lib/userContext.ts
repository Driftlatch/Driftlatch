// ─── Types ────────────────────────────────────────────────────────────────────

export type WeekPattern = "recovering" | "compounding" | "stable" | "peaking";

export type EQDomain =
  | "pressure_reading"
  | "repair_instinct"
  | "presence_quality"
  | "boundary_intel"
  | "recovery_aware"
  | "signal_accuracy";

export interface EQProfileSnapshot {
  pressure_reading: number;
  repair_instinct: number;
  presence_quality: number;
  boundary_intel: number;
  recovery_aware: number;
  signal_accuracy: number;
  weakest_domain: string;
  archetype: string;
}

export interface UserMomentContext {
  // Right now
  currentState: string | null;
  timeAvailable: number | null;

  // This week
  weekPattern: WeekPattern;
  consecutiveHardDays: number;
  weeklyAvgStateRank: number;
  totalCheckInsThisWeek: number;

  // Profile
  attachmentStyle: string | null;
  eqProfile: EQProfileSnapshot | null;
  weakestDomainUnderPressure: EQDomain | null;
  baseline: number | null;

  // Derived flags
  presenceLikelyThin: boolean;
  repairWindowOpen: boolean;
  recoveryDeficit: boolean;
  consecutiveHardDaysAlert: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATE_RANK: Record<string, number> = {
  clear_light: 0,
  steady: 1,
  carrying_work: 2,
  wired: 3,
  drained: 4,
  overloaded: 5,
};

const HARD_STATES = ["carrying_work", "wired", "drained", "overloaded"];

export const EQ_DOMAIN_PACK_MAP: Record<EQDomain, string[]> = {
  presence_quality: ["be_here_pack", "warm_pack"],
  boundary_intel: ["clear_head_pack", "sharp_pack"],
  repair_instinct: ["come_back_pack", "space_not_distance_pack"],
  pressure_reading: ["wind_down_pack", "maintain_light_pack"],
  recovery_aware: ["wind_down_pack", "expansive_pack"],
  signal_accuracy: ["settle_the_spiral_pack", "clear_head_pack"],
};

// ─── Main function ────────────────────────────────────────────────────────────

export function buildUserMomentContext(params: {
  currentState: string | null;
  timeAvailable: number | null;
  attachmentStyle: string | null;
  eqProfile: EQProfileSnapshot | null;
  weekCheckins: Array<{
    state: string;
    source: string;
    created_at: string;
  }>;
}): UserMomentContext {
  const { currentState, timeAvailable, attachmentStyle, eqProfile, weekCheckins } = params;

  // Only use home check-ins (mood logs) for weekly pattern
  const moodLogs = weekCheckins.filter((c) => c.source === "home");

  // Week pattern calculation
  const ranks = moodLogs.map((c) => STATE_RANK[c.state] ?? 2);

  const weeklyAvgStateRank =
    ranks.length > 0 ? ranks.reduce((a, b) => a + b, 0) / ranks.length : 2;

  // Consecutive hard days (most recent streak)
  const sortedLogs = [...moodLogs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  let consecutiveHardDays = 0;
  for (const log of sortedLogs) {
    if (HARD_STATES.includes(log.state)) {
      consecutiveHardDays++;
    } else {
      break;
    }
  }

  // Week pattern
  let weekPattern: WeekPattern = "stable";
  if (ranks.length >= 2) {
    const firstHalf = ranks.slice(0, Math.floor(ranks.length / 2));
    const secondHalf = ranks.slice(Math.floor(ranks.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (secondAvg < firstAvg - 0.5) {
      weekPattern = "recovering";
    } else if (secondAvg > firstAvg + 0.5) {
      weekPattern = "compounding";
    } else if (weeklyAvgStateRank >= 3) {
      weekPattern = "peaking";
    } else {
      weekPattern = "stable";
    }
  }

  // EQ baseline
  const baseline = eqProfile
    ? Math.round(
        (eqProfile.pressure_reading +
          eqProfile.repair_instinct +
          eqProfile.presence_quality +
          eqProfile.boundary_intel +
          eqProfile.recovery_aware +
          eqProfile.signal_accuracy) /
          6,
      )
    : null;

  // Weakest domain under pressure
  let weakestDomainUnderPressure: EQDomain | null = null;
  if (eqProfile && currentState && HARD_STATES.includes(currentState)) {
    const scores: Record<EQDomain, number> = {
      pressure_reading: eqProfile.pressure_reading,
      repair_instinct: eqProfile.repair_instinct,
      presence_quality: eqProfile.presence_quality,
      boundary_intel: eqProfile.boundary_intel,
      recovery_aware: eqProfile.recovery_aware,
      signal_accuracy: eqProfile.signal_accuracy,
    };
    weakestDomainUnderPressure = (Object.entries(scores) as [EQDomain, number][]).sort(
      (a, b) => a[1] - b[1],
    )[0][0];
  }

  // Derived flags
  const presenceLikelyThin =
    consecutiveHardDays >= 2 && eqProfile !== null && eqProfile.presence_quality < 60;

  const repairWindowOpen =
    currentState !== null &&
    HARD_STATES.includes(currentState) &&
    eqProfile !== null &&
    eqProfile.repair_instinct < 55;

  const recoveryDeficit = consecutiveHardDays >= 3 || weekPattern === "compounding";

  const consecutiveHardDaysAlert = consecutiveHardDays >= 3;

  return {
    currentState,
    timeAvailable,
    weekPattern,
    consecutiveHardDays,
    weeklyAvgStateRank,
    totalCheckInsThisWeek: moodLogs.length,
    attachmentStyle,
    eqProfile,
    weakestDomainUnderPressure,
    baseline,
    presenceLikelyThin,
    repairWindowOpen,
    recoveryDeficit,
    consecutiveHardDaysAlert,
  };
}

// ─── Greeting generator ───────────────────────────────────────────────────────

export function generateHomeGreeting(
  displayName: string,
  context: UserMomentContext,
): { headline: string; subline: string } {
  const name = displayName || "there";
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";

  let subline = "Start from the smallest useful move.";

  if (context.consecutiveHardDaysAlert) {
    subline = "Third heavy day. Small is enough.";
  } else if (context.weekPattern === "recovering") {
    subline = "Things are easing. Keep going.";
  } else if (context.weekPattern === "compounding") {
    subline = "It has been building. One move.";
  } else if (context.recoveryDeficit) {
    subline = "You are carrying a lot. One thing.";
  } else if (context.weekPattern === "peaking") {
    subline = "Heavy week. The small move counts.";
  }

  return {
    headline: `Good ${timeOfDay}, ${name}.`,
    subline,
  };
}
