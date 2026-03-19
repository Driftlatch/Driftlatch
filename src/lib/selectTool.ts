import { AttachmentStyle, DriftNeed, DriftSituation, DriftState, LIBRARY, Tool } from "./toolLibrary";

export type SelectInput = {
  need: DriftNeed;
  state: DriftState;
  timeMinutes: number; // 1 | 3 | 5 | 10
  situation: DriftSituation;
  mode?: "quick" | "standard";
  attachmentStyle?: AttachmentStyle;
  preferredPackIds?: string[];
  // optional: used to avoid repeating the same exact tool when user taps "Another option"
  excludeToolIds?: string[];
};

export type SelectOutput = {
  primary: Tool;
  alternates: Tool[]; // ordered
  reason: string; // tiny explanation for debugging / future UX
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

function matchesSituation(bestForSituation: DriftSituation[], situation: DriftSituation) {
  const situations = bestForSituation as string[];
  return situations.includes(situation) || situations.includes("any");
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

function isQuickMode(input: SelectInput) {
  return input.mode !== "standard";
}

function priorityRank(priority: "high" | "medium" | "low") {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
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

  score += 50;

  if (withinTime(t, input.timeMinutes)) score += 25;
  else score -= 100;

  if (t.best_for_state.includes(input.state)) score += 55;
  else score -= 35;

  if (matchesSituation(t.best_for_situation, input.situation)) score += 18;
  else score -= 6;

  score += needCoherenceBonus(input);

  score += overlaps(t.tags, STATE_TAG_BOOST[input.state]) * 4;
  score += overlaps(t.tags, SITUATION_TAG_BOOST[input.situation]) * 3;

  if (hasTagMatch(t.tags, STATE_TAG_BOOST[input.state])) score += 6;
  if (hasTagMatch(t.tags, SITUATION_TAG_BOOST[input.situation])) score += 4;

  if (input.state === "clear_light") {
    if (hasTagMatch(t.tags, ["containment", "worry", "sleep_support", "temperature", "defusion", "spiral"])) {
      score -= 28;
    }
  }

  const preferred = input.preferredPackIds ?? [];
  if (t.pack_id === preferred[0]) score += 20;
  else if (t.pack_id === preferred[1]) score += 12;
  else if (t.pack_id === preferred[2]) score += 6;

  score += recentPenalty(t.id, recentToolIds);
  score += getFamilyPenalty(t, recentFamilies);
  score += getPriorityWeight(t, input);
  score += getDepthWeight(t, input);
  score += getFrictionWeight(t, input);
  score += getEmotionalWeight(t, input);

  if (fatiguedPackId && t.pack_id === fatiguedPackId) score -= 10;

  if (input.state === "drained" || input.state === "overloaded") {
    if (hasTagMatch(t.tags, ["write", "journal"])) score -= 18;
    if (input.timeMinutes < 5 && t.time_min_minutes >= 5) score -= 18;
  }

  if (input.state === "wired" && hasTagMatch(t.tags, ["breath", "ground", "downshift", "sleep"])) {
    score += 14;
  }

  return score;
}

function compareScored(
  a: { t: Tool; s: number },
  b: { t: Tool; s: number }
) {
  if (b.s !== a.s) return b.s - a.s;

  const priorityDelta = priorityRank(getSelectorPriority(b.t)) - priorityRank(getSelectorPriority(a.t));
  if (priorityDelta !== 0) return priorityDelta;

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
) {
  const exclude = new Set(excludeToolIds);
  const recentFamilies = getRecentFamilies(recentToolIds, tools);
  const fatiguedPackId = mostCommonRecentPackId(recentToolIds, tools);

  return tools
    .filter((tool) => !exclude.has(tool.id))
    .map((tool) => ({
      t: tool,
      s: scoreTool(tool, input, recentToolIds, fatiguedPackId, recentFamilies),
    }))
    .sort(compareScored);
}

function injectAlternate(alternates: Tool[], candidate: Tool | undefined, primaryId: string) {
  if (!candidate || candidate.id === primaryId || alternates.some((tool) => tool.id === candidate.id)) return alternates;
  return [candidate, ...alternates];
}

export function rankToolsForTesting(tools: Tool[], input: SelectInput, recentToolIds: string[] = []) {
  return rankTools(tools, input, recentToolIds, input.excludeToolIds).map((item) => item.t);
}

export function selectTool(input: SelectInput): SelectOutput {
  const exclude = new Set(input.excludeToolIds ?? []);
  const attachmentStyle: AttachmentStyle = input.attachmentStyle ?? "Unknown";
  const attachmentPacks = ATTACH_PACK[attachmentStyle];
  const recentToolIds = readRecentToolIds();

  const stageA = LIBRARY.tools.filter(
    (t) => baseNeedFilter(t, input.need) && withinTime(t, input.timeMinutes) && t.best_for_state.includes(input.state)
  );
  const stageB = LIBRARY.tools.filter((t) => baseNeedFilter(t, input.need) && withinTime(t, input.timeMinutes));

  let candidates = stageA.length >= 4 ? stageA : dedupeTools([...stageA, ...stageB]);
  let pool = stageA.length >= 4 ? "A" : "B";

  if (candidates.length < 6) {
    const stageC = LIBRARY.tools.filter((t) => baseNeedFilter(t, input.need));
    candidates = dedupeTools([...candidates, ...stageC]);
    pool = "C";
  }

  if (candidates.length === 0) {
    candidates = LIBRARY.tools.filter((t) => baseNeedFilter(t, input.need));
    pool = "C";
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
          (t.best_for_state.includes(input.state) || overlaps(t.tags, STATE_TAG_BOOST[input.state]) > 0) &&
          (matchesSituation(t.best_for_situation, input.situation) || overlaps(t.tags, SITUATION_TAG_BOOST[input.situation]) > 0)
      )
      .filter((t) => !exclude.has(t.id));

    const overlay = rankTools(overlayCandidates, input, recentToolIds)[0]?.t;

    alternates = injectAlternate(alternates, overlay, primary.id).slice(0, 6);
  }

  const reason = `need=${input.need} state=${input.state} time=${input.timeMinutes} situation=${input.situation} style=${attachmentStyle} mode=${input.mode ?? "quick"} pool=${pool} recent=${recentToolIds.length} preferred=${(input.preferredPackIds ?? []).length > 0}`;

  return { primary, alternates, reason };
}
