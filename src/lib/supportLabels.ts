export const NEED_DISPLAY = {
  regain_clarity: {
    label: "Clear Head",
    labelLower: "clear head",
    subtitle: "Cut the mental noise and find the next clear step",
  },
  wind_down: {
    label: "Wind Down",
    labelLower: "wind down",
    subtitle: "Come down after pressure without carrying it through the night",
  },
  be_here: {
    label: "Be Present",
    labelLower: "be present",
    subtitle: "Come back to the people and moment in front of you",
  },
  come_back: {
    label: "Repair",
    labelLower: "repair",
    subtitle: "Find your way back after tension, distance, or a hard moment",
  },
} as const;

export const PACK_DISPLAY = {
  clear_head_pack: {
    name: "Clear Head",
    purpose: "Cut the mental noise and find the next clear step.",
    bestWhen: "Open loops, scattered attention, work still running in the background",
  },
  wind_down_pack: {
    name: "Wind Down",
    purpose: "Come down after pressure without carrying it through the night.",
    bestWhen: "Wired evenings, body tension, trouble switching off",
  },
  be_here_pack: {
    name: "Be Present",
    purpose: "Come back to the people and moment in front of you.",
    bestWhen: "Mind elsewhere, home slipping into logistics, patience running thin",
  },
  come_back_pack: {
    name: "Repair",
    purpose: "Find your way back after tension, distance, or a hard moment.",
    bestWhen: "After tension, after distance, when coming back feels harder than it should",
  },
  settle_the_spiral_pack: {
    name: "Overthinking",
    purpose: "Settle overthinking before it takes over the moment.",
    bestWhen: "Mixed signals, reassurance loops, reading too much into too little",
  },
  space_not_distance_pack: {
    name: "Take Space",
    purpose: "Take the space you need without creating more distance.",
    bestWhen: "Need for space, shutdown, quiet without disconnection",
  },
  sharp_pack: {
    name: "Use the Window",
    purpose: "Use a clear stretch of energy well while it is here.",
    bestWhen: "Your head is clear, energy is there, and something is ready to move",
  },
  warm_pack: {
    name: "Stay Close",
    purpose: "Turn a good moment into real closeness.",
    bestWhen: "A good moment at home, more room, easier connection",
  },
  expansive_pack: {
    name: "Make It Count",
    purpose: "Use available energy on something that matters.",
    bestWhen: "A rare good window, energy available, something meaningful to use it on",
  },
  maintain_light_pack: {
    name: "Stay Steady",
    purpose: "Protect a good state before it slips away.",
    bestWhen: "Feeling good and wanting to keep it that way",
  },
} as const;

export function getNeedLabel(need: keyof typeof NEED_DISPLAY) {
  return NEED_DISPLAY[need].label;
}

export function getNeedLabelLower(need: keyof typeof NEED_DISPLAY) {
  return NEED_DISPLAY[need].labelLower;
}

export function getNeedSubtitle(need: keyof typeof NEED_DISPLAY) {
  return NEED_DISPLAY[need].subtitle;
}

export function getPackDisplayName(packId: string, fallback?: string) {
  return PACK_DISPLAY[packId as keyof typeof PACK_DISPLAY]?.name ?? fallback ?? packId;
}

export function getPackPurpose(packId: string, fallback?: string) {
  return PACK_DISPLAY[packId as keyof typeof PACK_DISPLAY]?.purpose ?? fallback ?? "Grounded tools for real pressure.";
}

export function getPackBestWhen(packId: string, fallback?: string) {
  return PACK_DISPLAY[packId as keyof typeof PACK_DISPLAY]?.bestWhen ?? fallback ?? "Real pressure, real life, one steadier next step.";
}
