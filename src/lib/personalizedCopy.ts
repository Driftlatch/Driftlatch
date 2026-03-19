import type { AttachmentStyle, DriftNeed, DriftSituation, DriftState, Tool } from "@/lib/toolLibrary";

type WhyThisNowInput = {
  attachmentStyle: AttachmentStyle;
  need: DriftNeed | null;
  situation: DriftSituation | null;
  state: DriftState | null;
  timeMinutes: 1 | 3 | 5 | 10 | null;
  tool: Pick<Tool, "depth" | "selector_priority" | "tool_family">;
};

function buildStateLine(state: DriftState | null, timeMinutes: number | null) {
  if (state === "clear_light") {
    return "You're in a clear window. This helps you keep it instead of losing it to one extra thing.";
  }
  if (state === "carrying_work") {
    return "You're carrying work right now. This gives your mind somewhere clean to stop.";
  }
  if (state === "wired") {
    return timeMinutes !== null && timeMinutes <= 3
      ? "You're wired right now. A shorter reset is more likely to help."
      : "You're wired right now. This helps because it gives your system one clear thing to do.";
  }
  if (state === "drained") {
    return "You're drained right now. This keeps the ask small and steady.";
  }
  if (state === "overloaded") {
    return "You're overloaded right now. This narrows the next move.";
  }
  if (state === "steady") {
    return "You're steady right now. This helps you keep the day simple.";
  }
  return timeMinutes !== null && timeMinutes <= 3
    ? "Right now, a shorter reset is more likely to help."
    : "This is meant to be a steady next step.";
}

function buildPatternLine({
  attachmentStyle,
  need,
  situation,
  tool,
}: Pick<WhyThisNowInput, "attachmentStyle" | "need" | "situation" | "tool">) {
  if (attachmentStyle === "Anxious") {
    return "For your pattern, something simple and steady is usually more likely to help first.";
  }

  if (attachmentStyle === "Avoidant") {
    return "For your pattern, a lower-pressure move is usually more likely to help first.";
  }

  if (attachmentStyle === "Mixed") {
    return "For your pattern, the simpler version usually lands better first.";
  }

  if (need === "be_here") {
    return "This helps because it brings you back into the room you're actually in.";
  }

  if (need === "regain_clarity") {
    return "This helps because it gives the noise somewhere to settle.";
  }

  if (need === "wind_down") {
    return "This helps because it takes a little heat out of the moment.";
  }

  if (need === "come_back") {
    return "This helps because it makes re-entry feel a little easier.";
  }

  if (situation === "kids_around") {
    return "Right now, something simpler is more likely to help around kids.";
  }

  if (situation === "partner_nearby") {
    return "Right now, a cleaner move is more likely to help than forcing a bigger one.";
  }

  if (tool.depth === "micro" || tool.selector_priority === "high") {
    return "Right now, a simpler step is more likely to help.";
  }

  if (tool.tool_family === "movement_reset" || tool.tool_family === "body_release") {
    return "For your pattern, this kind of reset usually works better first.";
  }

  return "This helps because it gives the moment a cleaner shape.";
}

export function buildWhyThisNowCopy(input: WhyThisNowInput) {
  return `${buildStateLine(input.state, input.timeMinutes)} ${buildPatternLine(input)}`;
}

export function buildHomeSetupLine(defaultsSummary: string) {
  return `Using your usual setup: ${defaultsSummary}`;
}

export function buildHomePickerLine(defaultsSummary: string) {
  return `Picked from your state and usual setup: ${defaultsSummary}`;
}
