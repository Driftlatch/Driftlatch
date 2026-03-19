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
