import { test } from "node:test";
import { strict as assert } from "node:assert";

import type { Tool } from "./toolLibrary";
import { rankToolsForTesting, type SelectInput } from "./selectTool";

function makeInput(overrides: Partial<SelectInput> = {}): SelectInput {
  return {
    need: "wind_down",
    state: "steady",
    timeMinutes: 1,
    situation: "alone",
    mode: "standard",
    ...overrides,
  };
}

function makeTool(overrides: Partial<Tool> = {}): Tool {
  return {
    id: "tool-1",
    pack_id: "wind_down_pack",
    title: "Test Tool",
    do: "Do the thing.",
    why: "Because it helps.",
    need: ["wind_down"],
    best_for_state: ["steady"],
    best_for_situation: ["alone"],
    time_min_minutes: 0,
    time_max_minutes: 3,
    tags: ["fast"],
    tool_family: "breath_downshift",
    depth: "standard",
    emotional_difficulty: 2,
    social_friction: 2,
    selector_priority: "medium",
    energy_demand: "low",
    social_demand: "light_contact",
    ...overrides,
  };
}

test("avoids repeating the same tool family when another eligible family exists", () => {
  const recent = makeTool({
    id: "recent-breath",
    title: "Recent Breath",
    tool_family: "breath_downshift",
  });
  const repeatedFamily = makeTool({
    id: "candidate-repeat",
    title: "Repeat Family",
    tool_family: "breath_downshift",
  });
  const freshFamily = makeTool({
    id: "candidate-fresh",
    title: "Fresh Family",
    tool_family: "body_release",
  });

  const ranked = rankToolsForTesting([recent, repeatedFamily, freshFamily], makeInput(), [recent.id]);

  assert.equal(ranked[0].id, freshFamily.id);
});

test("quick mode avoids deep tools when a micro tool is otherwise eligible", () => {
  const micro = makeTool({
    id: "micro-tool",
    title: "Micro Tool",
    depth: "micro",
  });
  const deep = makeTool({
    id: "deep-tool",
    title: "Deep Tool",
    depth: "deep",
  });

  const ranked = rankToolsForTesting([deep, micro], makeInput({ mode: "quick" }));

  assert.equal(ranked[0].id, micro.id);
});

test("quick mode prefers high selector priority over low priority", () => {
  const high = makeTool({
    id: "high-priority",
    title: "High Priority",
    selector_priority: "high",
  });
  const low = makeTool({
    id: "low-priority",
    title: "Low Priority",
    selector_priority: "low",
  });

  const ranked = rankToolsForTesting([low, high], makeInput({ mode: "quick" }));

  assert.equal(ranked[0].id, high.id);
});

test("drained state avoids high-friction or high-emotion tools when a gentler option exists", () => {
  const gentle = makeTool({
    id: "gentle-tool",
    title: "Gentle Tool",
    need: ["be_here"],
    best_for_state: ["drained"],
    social_friction: 1,
    emotional_difficulty: 1,
  });
  const hard = makeTool({
    id: "hard-tool",
    title: "Hard Tool",
    need: ["be_here"],
    best_for_state: ["drained"],
    social_friction: 3,
    emotional_difficulty: 3,
  });

  const ranked = rankToolsForTesting([hard, gentle], makeInput({ need: "be_here", state: "drained" }));

  assert.equal(ranked[0].id, gentle.id);
});

test("drained with kids around suppresses Use the Window style tools in favor of low-energy presence", () => {
  const sharp = makeTool({
    id: "sharp-tool",
    pack_id: "sharp_pack",
    title: "The idea you keep postponing",
    need: ["be_here"],
    best_for_state: ["drained"],
    best_for_situation: ["kids_around"],
    tags: ["momentum", "starter", "anti_delay"],
    tool_family: "starter",
    energy_demand: "medium",
    social_demand: "solo",
  });
  const present = makeTool({
    id: "present-tool",
    pack_id: "be_here_pack",
    title: "Follow Their Lead",
    need: ["be_here"],
    best_for_state: ["drained"],
    best_for_situation: ["kids_around"],
    tags: ["presence", "kids", "low_bar"],
    tool_family: "micro_connection",
    energy_demand: "very_low",
    social_demand: "light_contact",
  });

  const ranked = rankToolsForTesting([sharp, present], makeInput({ need: "be_here", state: "drained", situation: "kids_around" }));

  assert.equal(ranked[0].id, present.id);
});

test("alone excludes partner-only tools even when they otherwise match the need and state", () => {
  const solo = makeTool({
    id: "solo-tool",
    title: "Solo Tool",
    tags: ["grounding"],
    best_for_situation: ["alone"],
  });
  const partner = makeTool({
    id: "partner-tool",
    title: "Partner Tool",
    do: "Tell your partner what is happening.",
    tags: ["partner", "repair"],
    tool_family: "repair_script",
    best_for_situation: ["partner_nearby"],
  });

  const ranked = rankToolsForTesting([partner, solo], makeInput({ situation: "alone" }));

  assert.deepEqual(ranked.map((tool) => tool.id), [solo.id]);
});

test("generic any-situation tools with relational requirements are excluded unless the situation is explicit", () => {
  const genericSolo = makeTool({
    id: "generic-solo",
    title: "Generic Solo",
    tags: ["grounding"],
    best_for_situation: ["any"],
  });
  const genericPartner = makeTool({
    id: "generic-partner",
    title: "Generic Partner",
    do: "Text your partner one honest line.",
    tags: ["partner", "text_safe"],
    tool_family: "distance_signal",
    best_for_situation: ["any"],
  });

  const ranked = rankToolsForTesting([genericPartner, genericSolo], makeInput({ situation: "alone" }));

  assert.deepEqual(ranked.map((tool) => tool.id), [genericSolo.id]);
});

test("overloaded or wired states prefer micro tools over deep ones", () => {
  const micro = makeTool({
    id: "micro-overloaded",
    title: "Micro Overloaded",
    need: ["regain_clarity"],
    best_for_state: ["overloaded"],
    depth: "micro",
  });
  const deep = makeTool({
    id: "deep-overloaded",
    title: "Deep Overloaded",
    need: ["regain_clarity"],
    best_for_state: ["overloaded"],
    depth: "deep",
  });

  const ranked = rankToolsForTesting([deep, micro], makeInput({ need: "regain_clarity", state: "overloaded" }));

  assert.equal(ranked[0].id, micro.id);
});

test("overloaded state suppresses expansive tools when a containment option exists", () => {
  const expansive = makeTool({
    id: "expansive-tool",
    pack_id: "expansive_pack",
    title: "Make a Memory, Not a Dent",
    need: ["wind_down"],
    best_for_state: ["overloaded"],
    tags: ["meaning", "momentum", "choose_well"],
    tool_family: "meaningful_choice",
    energy_demand: "medium",
    social_demand: "light_contact",
  });
  const containment = makeTool({
    id: "containment-tool",
    pack_id: "wind_down_pack",
    title: "No More Processing",
    need: ["wind_down"],
    best_for_state: ["overloaded"],
    tags: ["containment", "stop_processing", "low_words"],
    tool_family: "anti_processing",
    energy_demand: "very_low",
    social_demand: "solo",
  });

  const ranked = rankToolsForTesting([expansive, containment], makeInput({ state: "overloaded" }));

  assert.equal(ranked[0].id, containment.id);
});

test("clear light state still favors clear-state packs over settling packs", () => {
  const clearWindow = makeTool({
    id: "clear-window",
    pack_id: "sharp_pack",
    title: "Catch Yourself Saying Later",
    need: ["regain_clarity"],
    best_for_state: ["clear_light"],
    tags: ["momentum", "starter", "fast"],
    tool_family: "starter",
    energy_demand: "low",
    social_demand: "solo",
  });
  const settle = makeTool({
    id: "settle-tool",
    pack_id: "wind_down_pack",
    title: "Extended Exhale",
    need: ["regain_clarity"],
    best_for_state: ["clear_light"],
    tags: ["breath", "sleep_support", "containment"],
    tool_family: "breath_downshift",
    energy_demand: "very_low",
    social_demand: "solo",
  });

  const ranked = rankToolsForTesting([settle, clearWindow], makeInput({ need: "regain_clarity", state: "clear_light" }));

  assert.equal(ranked[0].id, clearWindow.id);
});

test("overloaded with kids around and a frayed room favors calming room-softening support", () => {
  const calming = makeTool({
    id: "calming-tool",
    pack_id: "be_here_pack",
    title: "Quiet Reset",
    need: ["be_here"],
    best_for_state: ["overloaded"],
    best_for_situation: ["kids_around"],
    tags: ["quiet_presence", "low_words", "containment", "environment_reset"],
    energy_demand: "very_low",
    social_demand: "light_contact",
  });
  const hype = makeTool({
    id: "hype-tool",
    pack_id: "warm_pack",
    title: "Big Family Rally",
    need: ["be_here"],
    best_for_state: ["overloaded"],
    best_for_situation: ["kids_around"],
    tags: ["play", "positive"],
    energy_demand: "medium",
    social_demand: "active_conversation",
  });

  const ranked = rankToolsForTesting(
    [hype, calming],
    makeInput({ need: "be_here", state: "overloaded", situation: "kids_around", roomTone: "frayed" }),
  );

  assert.equal(ranked[0].id, calming.id);
});

test("drained with a guarded partner context favors low-word reassurance over active conversation", () => {
  const lowWordRepair = makeTool({
    id: "low-word-repair",
    pack_id: "come_back_pack",
    title: "Visible Care",
    need: ["come_back"],
    best_for_state: ["drained"],
    best_for_situation: ["partner_nearby"],
    tags: ["low_words", "signal", "care", "quiet_presence"],
    social_demand: "light_contact",
    emotional_difficulty: 1,
  });
  const bigTalk = makeTool({
    id: "big-talk",
    pack_id: "come_back_pack",
    title: "Talk It Through",
    need: ["come_back"],
    best_for_state: ["drained"],
    best_for_situation: ["partner_nearby"],
    tags: ["repair"],
    social_demand: "active_conversation",
    emotional_difficulty: 3,
  });

  const ranked = rankToolsForTesting(
    [bigTalk, lowWordRepair],
    makeInput({ need: "come_back", state: "drained", situation: "partner_nearby", roomTone: "guarded" }),
  );

  assert.equal(ranked[0].id, lowWordRepair.id);
});

test("carrying work with a neutral partner context favors re-entry supports", () => {
  const reentry = makeTool({
    id: "reentry-tool",
    pack_id: "be_here_pack",
    title: "Re-enter Gently",
    need: ["be_here"],
    best_for_state: ["carrying_work"],
    best_for_situation: ["partner_nearby"],
    tags: ["re_entry", "transition", "micro_connection"],
    social_demand: "light_contact",
  });
  const generic = makeTool({
    id: "generic-tool",
    pack_id: "clear_head_pack",
    title: "Solo Brain Dump",
    need: ["be_here"],
    best_for_state: ["carrying_work"],
    best_for_situation: ["partner_nearby"],
    tags: ["offload"],
    social_demand: "solo",
  });

  const ranked = rankToolsForTesting(
    [generic, reentry],
    makeInput({ need: "be_here", state: "carrying_work", situation: "partner_nearby", roomTone: "neutral" }),
  );

  assert.equal(ranked[0].id, reentry.id);
});

test("clear light with kids around and a settled room favors warm positive-energy supports", () => {
  const warm = makeTool({
    id: "warm-tool",
    pack_id: "warm_pack",
    title: "Keep the Good Going",
    need: ["be_here"],
    best_for_state: ["clear_light"],
    best_for_situation: ["kids_around"],
    tags: ["play", "warmth", "connection_deposit"],
    social_demand: "light_contact",
  });
  const repair = makeTool({
    id: "repair-tool",
    pack_id: "come_back_pack",
    title: "Reset the Mood",
    need: ["be_here"],
    best_for_state: ["clear_light"],
    best_for_situation: ["kids_around"],
    tags: ["repair", "containment"],
    social_demand: "active_conversation",
  });

  const ranked = rankToolsForTesting(
    [repair, warm],
    makeInput({ need: "be_here", state: "clear_light", situation: "kids_around", roomTone: "settled" }),
  );

  assert.equal(ranked[0].id, warm.id);
});

test("tie-break prefers higher selector priority before lower social friction", () => {
  const highPriority = makeTool({
    id: "tie-high-priority",
    title: "Tie High Priority",
    selector_priority: "high",
    social_friction: 3,
    emotional_difficulty: 3,
    depth: "deep",
  });
  const mediumPriority = makeTool({
    id: "tie-medium-priority",
    title: "Tie Medium Priority",
    selector_priority: "medium",
    social_friction: 1,
    emotional_difficulty: 1,
    depth: "micro",
  });

  const ranked = rankToolsForTesting([mediumPriority, highPriority], makeInput());

  assert.equal(ranked[0].id, highPriority.id);
});

test("tie-break then prefers lower social friction, then lower emotional difficulty, then shallower depth", () => {
  const lowFriction = makeTool({
    id: "low-friction",
    title: "Low Friction",
    social_friction: 1,
    emotional_difficulty: 2,
    depth: "deep",
  });
  const highFriction = makeTool({
    id: "high-friction",
    title: "High Friction",
    social_friction: 3,
    emotional_difficulty: 1,
    depth: "micro",
  });
  const lowEmotion = makeTool({
    id: "low-emotion",
    title: "Low Emotion",
    social_friction: 2,
    emotional_difficulty: 1,
    depth: "deep",
  });
  const highEmotion = makeTool({
    id: "high-emotion",
    title: "High Emotion",
    social_friction: 2,
    emotional_difficulty: 3,
    depth: "micro",
  });
  const micro = makeTool({
    id: "tie-micro",
    title: "Tie Micro",
    social_friction: 2,
    emotional_difficulty: 2,
    depth: "micro",
  });
  const standard = makeTool({
    id: "tie-standard",
    title: "Tie Standard",
    social_friction: 2,
    emotional_difficulty: 2,
    depth: "standard",
  });

  const frictionRanked = rankToolsForTesting([highFriction, lowFriction], makeInput());
  const emotionRanked = rankToolsForTesting([highEmotion, lowEmotion], makeInput());
  const depthRanked = rankToolsForTesting([standard, micro], makeInput());

  assert.equal(frictionRanked[0].id, lowFriction.id);
  assert.equal(emotionRanked[0].id, lowEmotion.id);
  assert.equal(depthRanked[0].id, micro.id);
});

test("missing metadata falls back safely without crashing", () => {
  const fallbackTool = makeTool({
    id: "fallback-tool",
    title: "Fallback Tool",
  });
  delete fallbackTool.tool_family;
  delete fallbackTool.depth;
  delete fallbackTool.emotional_difficulty;
  delete fallbackTool.social_friction;
  delete fallbackTool.selector_priority;

  const explicitTool = makeTool({
    id: "explicit-tool",
    title: "Explicit Tool",
    selector_priority: "high",
    depth: "micro",
  });

  assert.doesNotThrow(() => {
    const ranked = rankToolsForTesting([fallbackTool, explicitTool], makeInput({ mode: "quick" }));
    assert.equal(ranked.length, 2);
  });
});
