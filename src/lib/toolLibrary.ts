import toolLibrary from "./toolLibrary.json";
import { getPackDisplayName } from "@/lib/supportLabels";

export type DriftState = "carrying_work" | "wired" | "drained" | "overloaded" | "steady" | "clear_light";
export type DriftSituation = "partner_nearby" | "kids_around" | "alone" | "long_distance";
export type ToolSituation = DriftSituation | "any";
export type DriftNeed = "regain_clarity" | "wind_down" | "be_here" | "come_back";
export type AttachmentStyle = "Anxious" | "Avoidant" | "Mixed" | "Unknown";
export type EnergyDemand = "very_low" | "low" | "medium" | "high";
export type SocialDemand = "solo" | "light_contact" | "active_conversation";

type RawTool = {
  id: string;
  pack_id: string;
  title: string;
  do: string;
  why: string;
  need: DriftNeed[];
  best_for_state: DriftState[];
  best_for_situation: ToolSituation[];
  time_min_minutes: number;
  time_max_minutes: number;
  tags: string[];
  tool_family?: string | null;
  depth?: "micro" | "standard" | "deep";
  emotional_difficulty?: 1 | 2 | 3;
  social_friction?: 1 | 2 | 3;
  selector_priority?: "high" | "medium" | "low";
  energy_demand?: EnergyDemand;
  social_demand?: SocialDemand;
};

export type Tool = RawTool & {
  energy_demand: EnergyDemand;
  social_demand: SocialDemand;
};

export type Pack = {
  id: string;
  name: string;
  purpose: string;
};

export type ToolLibrary = {
  version: string;
  packs: Pack[];
  tools: Tool[];
};

type RawToolLibrary = {
  version: string;
  packs: Pack[];
  tools: RawTool[];
};

const ACTIVE_CONVERSATION_TEXT = /\b(say|tell|ask|call|video|voice note|repair|talk|text them|text your|correct it)\b/i;
const LIGHT_CONTACT_TEXT = /\b(join|sit near|turn toward|touchpoint|private joke|repeat it|follow their lead|soft touchpoint|borrowed quiet)\b/i;
const SOLO_TAGS = new Set(["grounding", "offload", "containment", "focus", "journal", "sleep_support", "body_scan", "somatic"]);
const ACTIVE_CONVERSATION_FAMILIES = new Set([
  "repair_script",
  "accountability_repair",
  "planning_together",
  "validation",
  "play_repair",
  "misread_repair",
  "naming_repair",
]);
const LIGHT_CONTACT_FAMILIES = new Set([
  "quiet_presence",
  "micro_connection",
  "distance_signal",
  "appreciation",
  "environment_reset",
  "side_by_side_repair",
]);

function normalizeEnergyDemand(tool: RawTool): EnergyDemand {
  if (tool.energy_demand) return tool.energy_demand;
  if ((tool.time_max_minutes ?? 0) <= 2 && (tool.emotional_difficulty ?? 2) === 1) return "very_low";
  if ((tool.emotional_difficulty ?? 2) === 3 || tool.depth === "deep" || tool.time_min_minutes >= 8) return "medium";
  if ((tool.emotional_difficulty ?? 2) === 1 || tool.depth === "micro") return "low";
  return "low";
}

function normalizeSocialDemand(tool: RawTool): SocialDemand {
  if (tool.social_demand) return tool.social_demand;
  if (tool.tool_family && ACTIVE_CONVERSATION_FAMILIES.has(tool.tool_family)) return "active_conversation";
  if (tool.tool_family && LIGHT_CONTACT_FAMILIES.has(tool.tool_family)) return "light_contact";
  if (ACTIVE_CONVERSATION_TEXT.test(`${tool.title} ${tool.do} ${tool.why}`)) return "active_conversation";
  if (LIGHT_CONTACT_TEXT.test(`${tool.title} ${tool.do} ${tool.why}`)) return "light_contact";
  if (tool.tags.some((tag) => SOLO_TAGS.has(tag))) return "solo";
  if ((tool.social_friction ?? 2) === 3) return "active_conversation";
  if (tool.best_for_situation.every((situation) => situation === "alone" || situation === "any")) return "solo";
  if ((tool.social_friction ?? 2) === 1) return "solo";
  return "light_contact";
}

function normalizeTool(tool: RawTool): Tool {
  return {
    ...tool,
    energy_demand: normalizeEnergyDemand(tool),
    social_demand: normalizeSocialDemand(tool),
  };
}

const rawLibrary = toolLibrary as RawToolLibrary;

export const LIBRARY: ToolLibrary = {
  ...rawLibrary,
  tools: rawLibrary.tools.map(normalizeTool),
};

export function getPackName(packId: string) {
  const fallback = LIBRARY.packs.find((p) => p.id === packId)?.name;
  return getPackDisplayName(packId, fallback);
}
