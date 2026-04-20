import {
  AttachmentStyle,
  DriftNeed,
  DriftSituation,
  DriftState,
  EnergyDemand,
  LIBRARY,
  SocialDemand,
  Tool,
  ToolSituation,
} from "./toolLibrary";
import { isRoomToneForSituation, type RoomTone } from "./roomTone";
import { EQ_DOMAIN_PACK_MAP, type EQDomain } from "./userContext";

export type SelectInput = {
  need: DriftNeed;
  roomTone?: RoomTone | null;
  state: DriftState;
  timeMinutes: number; // 1 | 3 | 5 | 10
  situation: DriftSituation;
  mode?: "quick" | "standard";
  attachmentStyle?: AttachmentStyle;
  preferredPackIds?: string[];
  // optional: used to avoid repeating the same exact tool when user taps "Another option"
  excludeToolIds?: string[];
  weakestEQDomain?: EQDomain | null;
};

export type SelectOutput = {
  primary: Tool;
  alternates: Tool[]; // ordered
  reason: string; // tiny explanation for debugging / future UX
  debug?: {
    excludedBy: Record<string, number>;
    pool: string;
    poolSize: number;
    topCandidates: Array<{
      id: string;
      score: number;
      title: string;
      packId: string;
      energyDemand: EnergyDemand;
      socialDemand: SocialDemand;
      reasons: string[];
      suppressions: string[];
    }>;
    winner: { id: string; score: number | null };
  };
};

const ATTACH_PACK: Record<AttachmentStyle, string[]> = {
  Anxious: ["settle_the_spiral_pack"],
  Avoidant: ["space_not_distance_pack"],
  Mixed: ["settle_the_spiral_pack", "space_not_distance_pack"],
  Unknown: [],
};

const STATE_TAG_BOOST: Record<DriftState, string[]> = {
  carrying_work: ["closure", "open_loops", "tomorrow_first_step", "offload", "containment", "plan"],
  wired: ["breath", "physiology", "grounding", "sensory", "sleep_support", "pause", "defusion", "temperature"],
  drained: ["quiet_presence", "nonverbal", "low_words", "micro_connection", "repair", "re_entry"],
  overloaded: ["fast", "pause", "de_escalate", "grounding", "temperature", "containment", "name_state"],
  steady: ["micro_connection", "plan", "repair", "re_entry", "boundaries"],
  clear_light: [
    "momentum",
    "confidence",
    "starter",
    "decision",
    "plan",
    "boundary_preempt",
    "pattern_lock",
    "repeatability",
    "warmth",
    "connection_deposit",
    "curiosity",
    "play",
    "choose_well",
    "protect_state",
    "transition",
  ],
};

const SITUATION_TAG_BOOST: Record<DriftSituation, string[]> = {
  kids_around: ["kids", "short", "nonverbal", "quiet_presence", "low_words"],
  partner_nearby: ["re_entry", "repair", "name_state", "misread_prevent", "touch_if_welcome"],
  long_distance: ["text_safe", "no_pressure", "misread_prevent", "return_time"],
  alone: ["grounding", "offload", "containment", "sleep_support", "body_scan", "somatic"],
};

const RELATIONAL_TAGS = [
  "partner",
  "kids",
  "family",
  "repair",
  "re_entry",
  "name_state",
  "touch_if_welcome",
  "return_time",
  "text_safe",
  "micro_connection",
  "planning_together",
  "distance_signal",
  "warm_withdrawal",
  "validation",
  "accountability_repair",
  "play_repair",
];

const RELATIONAL_FAMILIES = new Set([
  "repair_script",
  "accountability_repair",
  "planning_together",
  "micro_connection",
  "distance_signal",
  "warm_withdrawal",
  "validation",
  "play_repair",
  "return_time",
  "appreciation",
]);

const RELATIONAL_TEXT = /\b(partner|kid|kids|child|children|family|text your partner|call your partner|voice note|tell your partner|ask your partner)\b/i;

const STATE_PACK_WEIGHT: Record<DriftState, { favored: string[]; suppressed: string[] }> = {
  clear_light: {
    favored: ["sharp_pack", "warm_pack", "expansive_pack", "maintain_light_pack"],
    suppressed: ["settle_the_spiral_pack"],
  },
  carrying_work: {
    favored: ["clear_head_pack", "wind_down_pack", "be_here_pack", "space_not_distance_pack"],
    suppressed: ["sharp_pack"],
  },
  wired: {
    favored: ["wind_down_pack", "settle_the_spiral_pack", "space_not_distance_pack"],
    suppressed: ["expansive_pack"],
  },
  drained: {
    favored: ["be_here_pack", "wind_down_pack", "space_not_distance_pack", "come_back_pack", "maintain_light_pack"],
    suppressed: ["sharp_pack", "expansive_pack", "clear_head_pack"],
  },
  overloaded: {
    favored: [
      "clear_head_pack",
      "wind_down_pack",
      "space_not_distance_pack",
      "come_back_pack",
      "settle_the_spiral_pack",
    ],
    suppressed: ["sharp_pack", "expansive_pack"],
  },
  steady: {
    favored: ["warm_pack", "maintain_light_pack", "sharp_pack"],
    suppressed: [],
  },
};

type ScoredTool = {
  t: Tool;
  s: number;
  reasons: string[];
  suppressions: string[];
};

function overlaps(a: string[], b: string[]) {
  const setB = new Set(b);
  let n = 0;
  for (const x of a) {
    if (setB.has(x)) n++;
  }
  return n;
}

function withinTime(t: Tool, minutes: number) {
  return t.time_min_minutes <= minutes && t.time_max_minutes >= minutes;
}

function baseNeedFilter(t: Tool, need: DriftNeed) {
  return t.need.includes(need);
}

function readRecentToolIds() {
  if (typeof window === "undefined") return [] as string[];

  try {
    const raw = window.localStorage.getItem("driftlatch_recent_tools");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function hasTagMatch(tags: string[], needles: string[]) {
  const normalizedTags = tags.map((tag) => tag.toLowerCase());
  return needles.some((needle) => normalizedTags.some((tag) => tag.includes(needle)));
}

function matchesFamily(tool: Tool, families: string[]) {
  return typeof tool.tool_family === "string" && families.includes(tool.tool_family);
}

function matchesPack(tool: Tool, packIds: string[]) {
  return packIds.includes(tool.pack_id);
}

function hasExplicitSituationMatch(bestForSituation: ToolSituation[], situation: DriftSituation) {
  const situations = bestForSituation as string[];
  return situations.includes(situation);
}

function isRelationalTool(tool: Tool) {
  if (tool.tags.some((tag) => RELATIONAL_TAGS.includes(tag.toLowerCase()))) return true;
  if (tool.tool_family && RELATIONAL_FAMILIES.has(tool.tool_family)) return true;
  return RELATIONAL_TEXT.test(`${tool.title} ${tool.do} ${tool.why}`);
}

function evaluateSituation(tool: Tool, situation: DriftSituation) {
  const situations = tool.best_for_situation as string[];

  if (hasExplicitSituationMatch(tool.best_for_situation, situation)) {
    return { pass: true as const, reason: "explicit_match" as const };
  }

  if (situations.includes("any")) {
    if (isRelationalTool(tool)) {
      return { pass: false as const, reason: "needs_explicit_relational_situation" as const };
    }

    return { pass: true as const, reason: "generic_match" as const };
  }

  return { pass: false as const, reason: "best_for_situation_mismatch" as const };
}

function matchesSituation(bestForSituation: ToolSituation[], situation: DriftSituation, tool?: Tool) {
  if (!tool) {
    const situations = bestForSituation as string[];
    return situations.includes(situation) || situations.includes("any");
  }

  return evaluateSituation(tool, situation).pass;
}

function isSelectorDebugEnabled() {
  return process.env.NODE_ENV !== "production";
}

function findToolById(tools: Tool[], toolId: string) {
  return tools.find((tool) => tool.id === toolId) ?? LIBRARY.tools.find((tool) => tool.id === toolId);
}

function getToolFamily(tool: Tool) {
  return tool.tool_family ?? null;
}

function getToolDepth(tool: Tool) {
  return tool.depth ?? "standard";
}

function getEmotionalDifficulty(tool: Tool) {
  return tool.emotional_difficulty ?? 2;
}

function getSocialFriction(tool: Tool) {
  return tool.social_friction ?? 2;
}

function getSelectorPriority(tool: Tool) {
  return tool.selector_priority ?? "medium";
}

function getEnergyDemand(tool: Tool) {
  return tool.energy_demand;
}

function getSocialDemand(tool: Tool) {
  return tool.social_demand;
}

function isQuickMode(input: SelectInput) {
  return input.mode !== "standard";
}

function priorityRank(priority: "high" | "medium" | "low") {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function energyRank(energyDemand: EnergyDemand) {
  if (energyDemand === "very_low") return 0;
  if (energyDemand === "low") return 1;
  if (energyDemand === "medium") return 2;
  return 3;
}

function socialDemandRank(socialDemand: SocialDemand) {
  if (socialDemand === "solo") return 0;
  if (socialDemand === "light_contact") return 1;
  return 2;
}

function depthRank(depth: "micro" | "standard" | "deep") {
  if (depth === "micro") return 0;
  if (depth === "standard") return 1;
  return 2;
}

function getRecentFamilies(recentToolIds: string[], tools: Tool[] = LIBRARY.tools) {
  return recentToolIds
    .slice(0, 2)
    .map((toolId) => getToolFamily(findToolById(tools, toolId) ?? ({} as Tool)))
    .filter((family): family is string => typeof family === "string" && family.length > 0);
}

function getFamilyPenalty(tool: Tool, recentFamilies: string[]) {
  const family = getToolFamily(tool);
  if (!family || recentFamilies.length === 0) return 0;
  if (recentFamilies[0] === family) return -18;
  if (recentFamilies.includes(family)) return -12;
  return 0;
}

function getPriorityWeight(tool: Tool, input: SelectInput) {
  if (!isQuickMode(input)) return 0;
  const priority = getSelectorPriority(tool);
  if (priority === "high") return 8;
  if (priority === "low") return -25;
  return 0;
}

function getDepthWeight(tool: Tool, input: SelectInput) {
  const depth = getToolDepth(tool);
  let score = 0;

  if (isQuickMode(input) && depth === "deep") score -= 20;

  if (input.state === "wired" || input.state === "overloaded") {
    if (depth === "micro") score += 10;
    else if (depth === "standard") score += 2;
    else score -= 10;
  }

  return score;
}

function getFrictionWeight(tool: Tool, input: SelectInput) {
  const socialFriction = getSocialFriction(tool);
  let score = 0;

  if (input.state === "drained" || input.state === "overloaded") {
    if (socialFriction === 3) score -= 15;
  }

  if (input.state === "drained" || input.state === "overloaded" || input.state === "wired") {
    if (socialFriction === 1) score += 8;
    else if (socialFriction === 2) score += 2;
    else score -= 8;
  }

  return score;
}

function getEmotionalWeight(tool: Tool, input: SelectInput) {
  const emotionalDifficulty = getEmotionalDifficulty(tool);
  let score = 0;

  if (input.state === "drained" || input.state === "overloaded") {
    if (emotionalDifficulty === 3) score -= 15;
  }

  if (input.state === "drained") {
    if (emotionalDifficulty === 1) score += 6;
    else if (emotionalDifficulty === 3) score -= 12;
  }

  return score;
}

function recentPenalty(toolId: string, recentToolIds: string[]) {
  let penalty = 0;

  if (recentToolIds.slice(0, 5).includes(toolId)) penalty -= 35;
  if (recentToolIds.slice(0, 2).includes(toolId)) penalty -= 25;

  return penalty;
}

function mostCommonRecentPackId(recentToolIds: string[], tools: Tool[] = LIBRARY.tools) {
  const counts = new Map<string, number>();

  for (const toolId of recentToolIds.slice(0, 5)) {
    const packId = findToolById(tools, toolId)?.pack_id;
    if (!packId) continue;
    counts.set(packId, (counts.get(packId) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function needCoherenceBonus(input: SelectInput) {
  if (input.state === "carrying_work" && input.need === "regain_clarity") return 10;
  if (input.state === "wired" && input.need === "wind_down") return 10;
  if (input.state === "drained" && input.need === "be_here") return 10;
  if (input.state === "overloaded" && (input.need === "wind_down" || input.need === "regain_clarity")) return 8;
  return 0;
}

function getNeedWeight(tool: Tool, input: SelectInput) {
  const packId = tool.pack_id;

  if (input.need === "regain_clarity") {
    if (packId === "clear_head_pack") return 16;
    if (packId === "wind_down_pack") return 4;
  }

  if (input.need === "wind_down") {
    if (packId === "wind_down_pack") return 16;
    if (packId === "settle_the_spiral_pack") return 10;
    if (packId === "space_not_distance_pack") return 8;
    if (packId === "maintain_light_pack") return 4;
  }

  if (input.need === "be_here") {
    if (packId === "be_here_pack") return 16;
    if (packId === "warm_pack") return 8;
    if (packId === "maintain_light_pack") return 4;
  }

  if (input.need === "come_back") {
    if (packId === "come_back_pack") return 16;
    if (packId === "space_not_distance_pack") return 10;
    if (packId === "be_here_pack") return 4;
    if (packId === "settle_the_spiral_pack") return 2;
  }

  return 0;
}

function isLowWordRepair(tool: Tool) {
  if (tool.pack_id !== "come_back_pack") return false;
  return (
    tool.social_demand !== "active_conversation" ||
    hasTagMatch(tool.tags, ["low_words", "return_time", "pause", "soft_start", "visibility", "care", "signal"])
  );
}

function isLowEffortRepair(tool: Tool) {
  if (tool.pack_id !== "come_back_pack") return false;
  return tool.energy_demand !== "medium" && tool.social_demand !== "active_conversation";
}

function isContainmentRepair(tool: Tool) {
  if (tool.pack_id !== "come_back_pack") return false;
  return hasTagMatch(tool.tags, ["pause", "return_time", "containment", "signal", "soft_start", "repair"]);
}

function isInterruptiveOverthinking(tool: Tool) {
  if (tool.pack_id !== "settle_the_spiral_pack") return false;
  return (
    tool.depth === "micro" ||
    hasTagMatch(tool.tags, ["interrupt", "pause", "defusion", "fast", "breath", "grounding", "temperature"])
  );
}

function isProtectiveStaySteady(tool: Tool) {
  if (tool.pack_id !== "maintain_light_pack") return false;
  return hasTagMatch(tool.tags, [
    "protect_state",
    "boundary_preempt",
    "pattern_lock",
    "repeatability",
    "protect",
    "threshold",
    "transition",
    "routine",
  ]);
}

function isInitiativeHeavyClearHead(tool: Tool) {
  if (tool.pack_id !== "clear_head_pack") return false;
  return (
    tool.energy_demand === "medium" ||
    hasTagMatch(tool.tags, [
      "decision",
      "prioritization",
      "next_action",
      "plan",
      "tomorrow_first_step",
      "starter",
      "momentum",
    ])
  );
}

function isPlanningHeavy(tool: Tool) {
  return (
    tool.depth === "deep" ||
    tool.energy_demand === "medium" ||
    hasTagMatch(tool.tags, [
      "journal",
      "write",
      "plan",
      "decision",
      "prioritization",
      "tomorrow_first_step",
      "next_action",
      "reflection",
    ])
  );
}

function getPackWeight(tool: Tool, input: SelectInput) {
  const packWeight = STATE_PACK_WEIGHT[input.state];
  let score = 0;
  const reasons: string[] = [];
  const suppressions: string[] = [];

  if (packWeight.favored.includes(tool.pack_id)) {
    score += 26;
    reasons.push(`state_pack_favored:${tool.pack_id}`);
  }

  if (packWeight.suppressed.includes(tool.pack_id)) {
    score -= 34;
    suppressions.push(`state_pack_suppressed:${tool.pack_id}`);
  }

  if (input.state === "drained") {
    if (tool.pack_id === "come_back_pack" && !isLowWordRepair(tool)) {
      score -= 24;
      suppressions.push("drained_requires_low_word_repair");
    }

    if (tool.pack_id === "maintain_light_pack" && !isProtectiveStaySteady(tool)) {
      score -= 20;
      suppressions.push("drained_requires_protective_stay_steady");
    }

    if (tool.pack_id === "clear_head_pack" && isInitiativeHeavyClearHead(tool)) {
      score -= 26;
      suppressions.push("drained_suppresses_initiative_heavy_clear_head");
    }
  }

  if (input.state === "wired" && tool.pack_id === "come_back_pack" && !isLowEffortRepair(tool)) {
    score -= 18;
    suppressions.push("wired_prefers_low_effort_repair");
  }

  if (input.state === "overloaded") {
    if (tool.pack_id === "come_back_pack" && !isContainmentRepair(tool)) {
      score -= 18;
      suppressions.push("overloaded_requires_containment_repair");
    }

    if (tool.pack_id === "settle_the_spiral_pack" && !isInterruptiveOverthinking(tool)) {
      score -= 18;
      suppressions.push("overloaded_prefers_interruptive_overthinking");
    }

    if (isPlanningHeavy(tool)) {
      score -= 12;
      suppressions.push("overloaded_suppresses_planning_heavy_actions");
    }
  }

  return { score, reasons, suppressions };
}

function getDemandWeight(tool: Tool, input: SelectInput) {
  const energyDemand = getEnergyDemand(tool);
  const socialDemand = getSocialDemand(tool);
  let score = 0;
  const reasons: string[] = [];
  const suppressions: string[] = [];

  if (input.state === "drained") {
    if (energyDemand === "very_low") {
      score += 14;
      reasons.push("drained_prefers_very_low_energy");
    } else if (energyDemand === "low") {
      score += 8;
      reasons.push("drained_prefers_low_energy");
    } else if (energyDemand === "medium") {
      score -= 20;
      suppressions.push("drained_penalizes_medium_energy");
    } else {
      score -= 32;
      suppressions.push("drained_penalizes_high_energy");
    }

    if (socialDemand === "solo") {
      score += 8;
      reasons.push("drained_prefers_solo_or_low_words");
    } else if (socialDemand === "light_contact") {
      score += 3;
    } else {
      score -= 24;
      suppressions.push("drained_penalizes_active_conversation");
    }
  } else if (input.state === "overloaded") {
    if (energyDemand === "very_low") {
      score += 10;
      reasons.push("overloaded_prefers_very_low_energy");
    } else if (energyDemand === "low") {
      score += 5;
    } else if (energyDemand === "medium") {
      score -= 18;
      suppressions.push("overloaded_penalizes_medium_energy");
    } else {
      score -= 30;
      suppressions.push("overloaded_penalizes_high_energy");
    }

    if (socialDemand === "solo") {
      score += 6;
    } else if (socialDemand === "light_contact") {
      score += 1;
    } else {
      score -= 18;
      suppressions.push("overloaded_penalizes_active_conversation");
    }
  } else if (input.state === "wired") {
    if (energyDemand === "very_low") score += 6;
    else if (energyDemand === "low") score += 4;
    else if (energyDemand === "medium") score -= 6;
    else score -= 18;

    if (socialDemand === "active_conversation") {
      score -= 10;
      suppressions.push("wired_penalizes_active_conversation");
    }
  } else if (input.state === "carrying_work") {
    if (energyDemand === "low") score += 4;
    if (energyDemand === "high") score -= 8;
  } else if (input.state === "clear_light") {
    if (energyDemand === "medium") score += 4;
    if (socialDemand === "light_contact") score += 3;
  } else if (input.state === "steady") {
    if (energyDemand === "very_low" || energyDemand === "low") score += 3;
  }

  return { score, reasons, suppressions };
}

function getRoomToneWeight(tool: Tool, input: SelectInput) {
  const roomTone = isRoomToneForSituation(input.situation, input.roomTone) ? input.roomTone : null;
  if (!roomTone) {
    return { score: 0, reasons: [] as string[], suppressions: [] as string[] };
  }

  let score = 0;
  const reasons: string[] = [];
  const suppressions: string[] = [];

  const applyScore = (delta: number, label: string) => {
    if (delta === 0) return;
    score += delta;
    if (delta > 0) reasons.push(label);
    else suppressions.push(label);
  };

  const boostTags = (needles: string[], delta: number, label: string) => {
    if (hasTagMatch(tool.tags, needles)) applyScore(delta, label);
  };

  const boostFamilies = (families: string[], delta: number, label: string) => {
    if (matchesFamily(tool, families)) applyScore(delta, label);
  };

  const boostPacks = (packIds: string[], delta: number, label: string) => {
    if (matchesPack(tool, packIds)) applyScore(delta, label);
  };

  switch (input.situation) {
    case "partner_nearby":
      if (roomTone === "easy") {
        boostPacks(["warm_pack", "maintain_light_pack", "be_here_pack"], 10, "room_tone_partner_easy_pack");
        boostTags(["warmth", "play", "appreciation", "micro_connection", "connection_deposit"], 14, "room_tone_partner_easy_tags");
        applyScore(tool.pack_id === "come_back_pack" && tool.social_demand === "active_conversation" ? -8 : 0, "room_tone_partner_easy_suppresses_repair_heavy");
      }

      if (roomTone === "neutral") {
        boostTags(["re_entry", "transition", "micro_connection", "return_time", "name_state"], 12, "room_tone_partner_neutral_tags");
        boostFamilies(["micro_connection", "distance_signal"], 10, "room_tone_partner_neutral_family");
        if (input.state === "carrying_work") {
          boostTags(["re_entry", "transition", "offload", "containment"], 10, "room_tone_partner_neutral_carrying_work");
        }
      }

      if (roomTone === "tense") {
        boostPacks(["come_back_pack", "space_not_distance_pack"], 12, "room_tone_partner_tense_pack");
        boostTags(["repair", "validation", "soft_start", "return_time", "misread_prevent", "low_words", "name_state"], 16, "room_tone_partner_tense_tags");
        applyScore(tool.social_demand === "active_conversation" && !hasTagMatch(tool.tags, ["low_words", "soft_start", "return_time"]) ? -12 : 0, "room_tone_partner_tense_penalizes_conversation_heavy");
      }

      if (roomTone === "guarded") {
        boostPacks(["come_back_pack", "be_here_pack"], 12, "room_tone_partner_guarded_pack");
        boostTags(["low_words", "quiet_presence", "visibility", "care", "signal", "soft_start", "repair"], 18, "room_tone_partner_guarded_tags");
        applyScore(tool.social_demand === "active_conversation" ? -20 : 0, "room_tone_partner_guarded_penalizes_active_conversation");
        if (input.state === "drained" && (tool.social_demand === "solo" || tool.social_demand === "light_contact")) {
          applyScore(10, "room_tone_partner_guarded_drained_low_word_bonus");
        }
      }

      if (roomTone === "distant") {
        boostPacks(["come_back_pack", "space_not_distance_pack"], 10, "room_tone_partner_distant_pack");
        boostTags(["re_entry", "repair", "return_time", "signal", "no_pressure", "validation"], 14, "room_tone_partner_distant_tags");
        boostFamilies(["distance_signal", "micro_connection"], 10, "room_tone_partner_distant_family");
        applyScore(tool.social_demand === "active_conversation" ? -10 : 0, "room_tone_partner_distant_penalizes_active_conversation");
      }
      break;

    case "kids_around":
      if (roomTone === "settled") {
        boostPacks(["warm_pack", "maintain_light_pack", "be_here_pack"], 10, "room_tone_kids_settled_pack");
        boostTags(["play", "warmth", "connection_deposit", "follow", "join", "positive"], 16, "room_tone_kids_settled_tags");
        if (input.state === "clear_light") {
          applyScore(12, "room_tone_kids_settled_clear_light_bonus");
        }
      }

      if (roomTone === "busy") {
        boostTags(["short", "fast", "transition", "nonverbal", "low_words", "quiet_presence"], 12, "room_tone_kids_busy_tags");
        applyScore(tool.depth === "deep" ? -10 : 0, "room_tone_kids_busy_penalizes_deep");
      }

      if (roomTone === "frayed") {
        boostPacks(["wind_down_pack", "be_here_pack", "come_back_pack"], 12, "room_tone_kids_frayed_pack");
        boostTags(["quiet_presence", "low_words", "containment", "de_escalate", "grounding", "soften", "environment_reset", "sensory"], 20, "room_tone_kids_frayed_tags");
        applyScore(tool.social_demand === "active_conversation" ? -18 : 0, "room_tone_kids_frayed_penalizes_active_conversation");
        if (input.state === "overloaded" && (tool.energy_demand === "very_low" || tool.energy_demand === "low")) {
          applyScore(10, "room_tone_kids_frayed_overloaded_bonus");
        }
      }

      if (roomTone === "loud") {
        boostTags(["sensory", "temperature", "grounding", "pause", "breath", "quiet_presence", "containment"], 18, "room_tone_kids_loud_tags");
        applyScore(tool.social_demand === "active_conversation" ? -16 : 0, "room_tone_kids_loud_penalizes_active_conversation");
      }

      if (roomTone === "clingy") {
        boostTags(["micro_connection", "quiet_presence", "validation", "touch_if_welcome", "co_regulation", "follow"], 14, "room_tone_kids_clingy_tags");
        boostFamilies(["micro_connection", "quiet_presence"], 10, "room_tone_kids_clingy_family");
        applyScore(tool.energy_demand === "high" ? -10 : 0, "room_tone_kids_clingy_penalizes_high_energy");
      }
      break;

    case "long_distance":
      if (roomTone === "connected") {
        boostPacks(["warm_pack", "maintain_light_pack"], 10, "room_tone_distance_connected_pack");
        boostTags(["appreciation", "play", "curiosity", "text_safe", "warmth"], 12, "room_tone_distance_connected_tags");
        if (input.state === "clear_light") {
          applyScore(8, "room_tone_distance_connected_clear_light_bonus");
        }
      }

      if (roomTone === "neutral") {
        boostTags(["re_entry", "return_time", "text_safe", "no_pressure", "micro_connection"], 12, "room_tone_distance_neutral_tags");
      }

      if (roomTone === "unclear") {
        boostPacks(["come_back_pack", "space_not_distance_pack"], 12, "room_tone_distance_unclear_pack");
        boostTags(["misread_prevent", "return_time", "text_safe", "no_pressure", "repair"], 18, "room_tone_distance_unclear_tags");
        applyScore(tool.social_demand === "active_conversation" ? -12 : 0, "room_tone_distance_unclear_penalizes_active_conversation");
      }

      if (roomTone === "tense") {
        boostPacks(["come_back_pack", "space_not_distance_pack"], 12, "room_tone_distance_tense_pack");
        boostTags(["repair", "validation", "soft_start", "text_safe", "no_pressure", "return_time"], 16, "room_tone_distance_tense_tags");
        applyScore(tool.social_demand === "active_conversation" ? -10 : 0, "room_tone_distance_tense_penalizes_active_conversation");
      }

      if (roomTone === "far") {
        boostTags(["distance_signal", "return_time", "text_safe", "low_words", "appreciation", "visibility"], 16, "room_tone_distance_far_tags");
        boostFamilies(["distance_signal", "appreciation"], 10, "room_tone_distance_far_family");
        applyScore(tool.social_demand === "active_conversation" ? -10 : 0, "room_tone_distance_far_penalizes_active_conversation");
      }
      break;

    default:
      break;
  }

  return { score, reasons, suppressions };
}

function dedupeTools(tools: Tool[]) {
  const seen = new Set<string>();
  const result: Tool[] = [];

  for (const tool of tools) {
    if (seen.has(tool.id)) continue;
    seen.add(tool.id);
    result.push(tool);
  }

  return result;
}

function scoreTool(
  t: Tool,
  input: SelectInput,
  recentToolIds: string[],
  fatiguedPackId: string | null,
  recentFamilies: string[]
) {
  let score = 0;
  const reasons: string[] = [];
  const suppressions: string[] = [];

  const applyScore = (delta: number, label: string) => {
    if (delta === 0) return;
    score += delta;
    if (delta > 0) reasons.push(`${label}:${delta}`);
    else suppressions.push(`${label}:${delta}`);
  };

  applyScore(50, "base");

  if (withinTime(t, input.timeMinutes)) applyScore(25, "within_time");
  else applyScore(-100, "outside_time");

  if (t.best_for_state.includes(input.state)) applyScore(55, "state_match");
  else applyScore(-35, "state_mismatch");

  if (matchesSituation(t.best_for_situation, input.situation)) applyScore(18, "situation_match");
  else applyScore(-6, "situation_mismatch");

  applyScore(getNeedWeight(t, input), "need_coherence");
  applyScore(needCoherenceBonus(input), "state_need_alignment");

  const stateTagOverlap = overlaps(t.tags, STATE_TAG_BOOST[input.state]) * 4;
  const situationTagOverlap = overlaps(t.tags, SITUATION_TAG_BOOST[input.situation]) * 3;
  applyScore(stateTagOverlap, "state_tag_overlap");
  applyScore(situationTagOverlap, "situation_tag_overlap");

  if (hasTagMatch(t.tags, STATE_TAG_BOOST[input.state])) applyScore(6, "state_tag_match");
  if (hasTagMatch(t.tags, SITUATION_TAG_BOOST[input.situation])) applyScore(4, "situation_tag_match");

  const packWeight = getPackWeight(t, input);
  applyScore(packWeight.score, "pack_fit");
  reasons.push(...packWeight.reasons);
  suppressions.push(...packWeight.suppressions);

  // EQ domain boost
  if (input.weakestEQDomain) {
    const boostedPacks = EQ_DOMAIN_PACK_MAP[input.weakestEQDomain];
    if (boostedPacks && boostedPacks.includes(t.pack_id)) {
      applyScore(15, "eq_domain_boost");
    }
  }

  const demandWeight = getDemandWeight(t, input);
  applyScore(demandWeight.score, "demand_fit");
  reasons.push(...demandWeight.reasons);
  suppressions.push(...demandWeight.suppressions);

  const roomToneWeight = getRoomToneWeight(t, input);
  applyScore(roomToneWeight.score, "room_tone_fit");
  reasons.push(...roomToneWeight.reasons);
  suppressions.push(...roomToneWeight.suppressions);

  if (input.state === "clear_light") {
    if (hasTagMatch(t.tags, ["containment", "worry", "sleep_support", "temperature", "defusion", "spiral"])) {
      applyScore(-28, "clear_light_avoids_settling_tools");
    }
  }

  const preferred = input.preferredPackIds ?? [];
  if (t.pack_id === preferred[0]) applyScore(10, "preferred_pack_primary");
  else if (t.pack_id === preferred[1]) applyScore(6, "preferred_pack_secondary");
  else if (t.pack_id === preferred[2]) applyScore(3, "preferred_pack_tertiary");

  applyScore(recentPenalty(t.id, recentToolIds), "recent_repeat_penalty");
  applyScore(getFamilyPenalty(t, recentFamilies), "recent_family_penalty");
  applyScore(getPriorityWeight(t, input), "selector_priority");
  applyScore(getDepthWeight(t, input), "depth_fit");
  applyScore(getFrictionWeight(t, input), "social_friction");
  applyScore(getEmotionalWeight(t, input), "emotional_difficulty");

  if (fatiguedPackId && t.pack_id === fatiguedPackId) applyScore(-10, "fatigued_pack_penalty");

  if (input.state === "drained" || input.state === "overloaded") {
    if (hasTagMatch(t.tags, ["write", "journal"])) applyScore(-18, "low_capacity_write_penalty");
    if (input.timeMinutes < 5 && t.time_min_minutes >= 5) applyScore(-18, "low_capacity_long_duration_penalty");
  }

  if (input.state === "wired" && hasTagMatch(t.tags, ["breath", "ground", "downshift", "sleep", "temperature"])) {
    applyScore(14, "wired_prefers_downshift_tools");
  }

  return {
    t,
    s: score,
    reasons,
    suppressions,
  };
}

function compareScored(a: ScoredTool, b: ScoredTool) {
  if (b.s !== a.s) return b.s - a.s;

  const priorityDelta = priorityRank(getSelectorPriority(b.t)) - priorityRank(getSelectorPriority(a.t));
  if (priorityDelta !== 0) return priorityDelta;

  const energyDelta = energyRank(getEnergyDemand(a.t)) - energyRank(getEnergyDemand(b.t));
  if (energyDelta !== 0) return energyDelta;

  const demandDelta = socialDemandRank(getSocialDemand(a.t)) - socialDemandRank(getSocialDemand(b.t));
  if (demandDelta !== 0) return demandDelta;

  const socialDelta = getSocialFriction(a.t) - getSocialFriction(b.t);
  if (socialDelta !== 0) return socialDelta;

  const emotionalDelta = getEmotionalDifficulty(a.t) - getEmotionalDifficulty(b.t);
  if (emotionalDelta !== 0) return emotionalDelta;

  return depthRank(getToolDepth(a.t)) - depthRank(getToolDepth(b.t));
}

function rankTools(
  tools: Tool[],
  input: SelectInput,
  recentToolIds: string[],
  excludeToolIds: string[] = []
): ScoredTool[] {
  const exclude = new Set(excludeToolIds);
  const recentFamilies = getRecentFamilies(recentToolIds, tools);
  const fatiguedPackId = mostCommonRecentPackId(recentToolIds, tools);

  return tools
    .filter((tool) => !exclude.has(tool.id))
    .map((tool) => scoreTool(tool, input, recentToolIds, fatiguedPackId, recentFamilies))
    .sort(compareScored);
}

function injectAlternate(alternates: Tool[], candidate: Tool | undefined, primaryId: string) {
  if (!candidate || candidate.id === primaryId || alternates.some((tool) => tool.id === candidate.id)) return alternates;
  return [candidate, ...alternates];
}

export function rankToolsForTesting(tools: Tool[], input: SelectInput, recentToolIds: string[] = []) {
  return rankTools(
    tools.filter((tool) => evaluateSituation(tool, input.situation).pass),
    input,
    recentToolIds,
    input.excludeToolIds
  ).map((item) => item.t);
}

export function selectTool(input: SelectInput): SelectOutput {
  const exclude = new Set(input.excludeToolIds ?? []);
  const attachmentStyle: AttachmentStyle = input.attachmentStyle ?? "Unknown";
  const attachmentPacks = ATTACH_PACK[attachmentStyle];
  const recentToolIds = readRecentToolIds();
  const excludedBy = {
    need: 0,
    time: 0,
    state: 0,
    situation: 0,
    excluded: 0,
  };

  const strictCandidates = LIBRARY.tools.filter((tool) => {
    if (!baseNeedFilter(tool, input.need)) {
      excludedBy.need += 1;
      return false;
    }

    if (!withinTime(tool, input.timeMinutes)) {
      excludedBy.time += 1;
      return false;
    }

    if (!tool.best_for_state.includes(input.state)) {
      excludedBy.state += 1;
      return false;
    }

    if (!evaluateSituation(tool, input.situation).pass) {
      excludedBy.situation += 1;
      return false;
    }

    if (exclude.has(tool.id)) {
      excludedBy.excluded += 1;
    }

    return true;
  });

  const fallbackStateCandidates = LIBRARY.tools.filter(
    (tool) =>
      baseNeedFilter(tool, input.need) &&
      withinTime(tool, input.timeMinutes) &&
      evaluateSituation(tool, input.situation).pass
  );

  let candidates = strictCandidates;
  let pool = "strict";

  if (candidates.length === 0) {
    candidates = fallbackStateCandidates;
    pool = "fallback_without_state";
  }

  const scored = rankTools(candidates, input, recentToolIds, [...exclude]);

  const fallbackCandidates = candidates.filter((t) => !exclude.has(t.id));
  const primary = (scored[0]?.t ?? fallbackCandidates[0] ?? candidates[0] ?? LIBRARY.tools[0]) as Tool;

  let alternates = scored
    .slice(1)
    .map((item) => item.t)
    .filter((t) => t.id !== primary.id)
    .slice(0, 6);

  const bestStateMatch = scored.find((item) => item.t.id !== primary.id && item.t.best_for_state.includes(input.state))?.t;
  const bestSituationMatch = scored.find(
    (item) => item.t.id !== primary.id && item.t.best_for_situation.includes(input.situation)
  )?.t;

  alternates = injectAlternate(alternates, bestSituationMatch, primary.id);
  alternates = injectAlternate(alternates, bestStateMatch, primary.id).slice(0, 6);

  if (attachmentPacks.length > 0) {
    const overlayCandidates = LIBRARY.tools
      .filter(
        (t) =>
          attachmentPacks.includes(t.pack_id) &&
          withinTime(t, input.timeMinutes) &&
          evaluateSituation(t, input.situation).pass &&
          (t.best_for_state.includes(input.state) || overlaps(t.tags, STATE_TAG_BOOST[input.state]) > 0)
      )
      .filter((t) => !exclude.has(t.id));

    const overlay = rankTools(overlayCandidates, input, recentToolIds)[0]?.t;

    alternates = injectAlternate(alternates, overlay, primary.id).slice(0, 6);
  }

  const topCandidates = scored.slice(0, 5).map((item) => ({
    id: item.t.id,
    score: item.s,
    title: item.t.title,
    packId: item.t.pack_id,
    energyDemand: item.t.energy_demand,
    socialDemand: item.t.social_demand,
    reasons: item.reasons.slice(0, 6),
    suppressions: item.suppressions.slice(0, 6),
  }));
  const winnerScore = scored.find((item) => item.t.id === primary.id)?.s ?? null;
  const reason = `need=${input.need} state=${input.state} time=${input.timeMinutes} situation=${input.situation} roomTone=${input.roomTone ?? "none"} style=${attachmentStyle} mode=${input.mode ?? "quick"} pool=${pool} poolSize=${candidates.length} filteredNeed=${excludedBy.need} filteredTime=${excludedBy.time} filteredState=${excludedBy.state} filteredSituation=${excludedBy.situation} excluded=${excludedBy.excluded} recent=${recentToolIds.length} preferred=${(input.preferredPackIds ?? []).length > 0}`;
  const debug = {
    excludedBy,
    pool,
    poolSize: candidates.length,
    topCandidates,
    winner: { id: primary.id, score: winnerScore },
  };

  if (isSelectorDebugEnabled()) {
    const winner = scored.find((item) => item.t.id === primary.id) ?? null;
    console.info("[selector-debug]", {
      input: {
        attachmentStyle,
        excludeToolIds: input.excludeToolIds ?? [],
        mode: input.mode ?? "quick",
        need: input.need,
        preferredPackIds: input.preferredPackIds ?? [],
        situation: input.situation,
        state: input.state,
        timeMinutes: input.timeMinutes,
      },
      candidatePackIds: [...new Set(scored.slice(0, 8).map((item) => item.t.pack_id))],
      debug,
      winner: winner
        ? {
            id: winner.t.id,
            title: winner.t.title,
            packId: winner.t.pack_id,
            energyDemand: winner.t.energy_demand,
            socialDemand: winner.t.social_demand,
            reasons: winner.reasons,
            suppressions: winner.suppressions,
          }
        : null,
    });
  }

  return { primary, alternates, reason, debug };
}
