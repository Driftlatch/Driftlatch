import toolLibrary from "./toolLibrary.json";

export type DriftState = "carrying_work" | "wired" | "drained" | "overloaded" | "steady" | "clear_light";
export type DriftSituation = "partner_nearby" | "kids_around" | "alone" | "long_distance";
export type DriftNeed = "regain_clarity" | "wind_down" | "be_here" | "come_back";
export type AttachmentStyle = "Anxious" | "Avoidant" | "Mixed" | "Unknown";

export type Tool = {
  id: string;
  pack_id: string;
  title: string;
  do: string;
  why: string;
  need: DriftNeed[];
  best_for_state: DriftState[];
  best_for_situation: DriftSituation[];
  time_min_minutes: number;
  time_max_minutes: number;
  tags: string[];
  tool_family?: string | null;
  depth?: "micro" | "standard" | "deep";
  emotional_difficulty?: 1 | 2 | 3;
  social_friction?: 1 | 2 | 3;
  selector_priority?: "high" | "medium" | "low";
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

export const LIBRARY = toolLibrary as ToolLibrary;

export function getPackName(packId: string) {
  return LIBRARY.packs.find((p) => p.id === packId)?.name ?? packId;
}
