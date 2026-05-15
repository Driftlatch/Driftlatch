"use client";

import Link from "next/link";
import { type CSSProperties, type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  clearStoredPublicProfileData,
  clearStoredPublicProfileResult,
  readStoredPublicProfileAnswers,
  readStoredPublicProfileContext,
  readStoredPublicProfileResult,
  syncPublicProfileResultToAccount,
  writeStoredPublicProfileAnswers,
  writeStoredPublicProfileContext,
  writeStoredPublicProfileResult,
  type PublicProfileContext,
  type PublicProfileResult,
} from "@/lib/publicProfile";
import {
  getAttachmentStyleQualifier,
  getAttachmentStyleSummary,
} from "@/lib/attachmentStyleCopy";
import { getNeedLabel } from "@/lib/supportLabels";
import { getSupabase } from "@/lib/supabase";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type Answer = 0 | 1 | 2 | 3 | 4;

const SCALE: { label: string; value: Answer }[] = [
  { label: "Never", value: 0 },
  { label: "Rarely", value: 1 },
  { label: "Sometimes", value: 2 },
  { label: "Often", value: 3 },
  { label: "Almost always", value: 4 },
];

const SECTION_INTRO_COPY: Record<Question["domain"], { title: string; tagline: string }> = {
  work: { title: "Work", tagline: "How pressure builds while you are on." },
  recovery: { title: "Recovery", tagline: "How you come down from pressure." },
  home: { title: "Home", tagline: "How pressure shows up with people." },
  attach: { title: "Connection", tagline: "How you handle tension with people close to you." },
};

type Question = { id: number; text: string; domain: "work" | "recovery" | "home" | "attach" };

const QUESTIONS: Question[] = [
  // A) Work Focus & Cognitive Load (1–5)
  {
    id: 1,
    domain: "work",
    text: "When I close the laptop, my mind still keeps working in the background.",
  },
  {
    id: 2,
    domain: "work",
    text: "Even during dinner or a walk, part of my mind is still working.",
  },
  {
    id: 3,
    domain: "work",
    text: "One Slack message, Teams notification, or unexpected work message can pull my presence away at home.",
  },
  {
    id: 4,
    domain: "work",
    text: "I sit down to do one thing, and my brain opens ten more.",
  },
  {
    id: 5,
    domain: "work",
    text: "When things pile up, everything feels urgent and nothing gets done properly.",
  },

  // B) Spillover & Recovery (6–10)
  {
    id: 6,
    domain: "recovery",
    text: "My body is tired, but my mind has not caught up.",
  },
  {
    id: 7,
    domain: "recovery",
    text: "After a heavy day, it takes hours before I feel fully off.",
  },
  {
    id: 8,
    domain: "recovery",
    text: "Scrolling or zoning out is the only thing that reliably quiets my mind.",
  },
  {
    id: 9,
    domain: "recovery",
    text: "Work follows me into sleep. I wake early or do not sleep deeply.",
  },
  {
    id: 10,
    domain: "recovery",
    text: "Hours after finishing, I notice tight shoulders, a clenched jaw, or shallow breathing.",
  },

  // C) Home Drift & Family Load (11–15)
  {
    id: 11,
    domain: "home",
    text: "I am in the room, but not fully there.",
  },
  {
    id: 12,
    domain: "home",
    text: "On hard weeks, dinner stops feeling like connection and starts feeling like coordination.",
  },
  {
    id: 13,
    domain: "home",
    text: "After a hard day, my patience is thinner at home than I want it to be.",
  },
  {
    id: 14,
    domain: "home",
    text: "Work gets my best energy and time. The people I'm doing it all for get what's left.",
  },
  {
    id: 15,
    domain: "home",
    text: "I check my phone when no one is looking at home, even when I do not want to.",
  },

  // D) Conflict Pattern & Connection Style (16–20)
  {
    id: 16,
    domain: "attach",
    text: "When tension starts at home, I pull back because I do not have the energy for it.",
  },
  {
    id: 17,
    domain: "attach",
    text: "When something feels off with my partner, it runs in the background of the whole day.",
  },
  {
    id: 18,
    domain: "attach",
    text: "When we disagree, I go quiet and need time alone before I can say anything useful.",
  },
  {
    id: 19,
    domain: "attach",
    text: "In conflict, I shut down. Not to be cold, but to stop things from getting worse.",
  },
  {
    id: 20,
    domain: "attach",
    text: "When someone asks about my day, I give the short version because the full version feels like too much.",
  },
];

type PageKey = "intro" | "context" | "q1" | "q2" | "q3" | "q4" | "results";

type HomeSetup = "Partner/spouse" | "Kids/family" | "Partner + kids" | "Long distance" | "Solo";
type WorkIntensity = "Normal" | "Busy" | "Peak pressure";
type Spillover = "Work → home" | "Home → work" | "Both ways";
type Priority = "Clarity at work" | "Closeness at home" | "Both";
type DomainName = "Work" | "Recovery" | "Home" | "Connection";
type DomainTone = {
  accent: string;
  border: string;
  glow: string;
  label: string;
  mutedGlow: string;
  soft: string;
};

const QUESTION_DOMAIN_TONES: Record<Question["domain"], DomainTone> = {
  work: {
    accent: "rgba(126, 150, 188, 0.92)",
    border: "rgba(126, 150, 188, 0.34)",
    glow: "rgba(126, 150, 188, 0.18)",
    label: "Work",
    mutedGlow: "rgba(126, 150, 188, 0.12)",
    soft: "rgba(126, 150, 188, 0.18)",
  },
  recovery: {
    accent: "rgba(112, 154, 132, 0.9)",
    border: "rgba(112, 154, 132, 0.34)",
    glow: "rgba(112, 154, 132, 0.18)",
    label: "Recovery",
    mutedGlow: "rgba(112, 154, 132, 0.12)",
    soft: "rgba(112, 154, 132, 0.18)",
  },
  home: {
    accent: "rgba(194, 122, 92, 0.94)",
    border: "rgba(194, 122, 92, 0.34)",
    glow: "rgba(194, 122, 92, 0.18)",
    label: "Home",
    mutedGlow: "rgba(194, 122, 92, 0.12)",
    soft: "rgba(194, 122, 92, 0.18)",
  },
  attach: {
    accent: "rgba(168, 118, 136, 0.9)",
    border: "rgba(168, 118, 136, 0.32)",
    glow: "rgba(168, 118, 136, 0.16)",
    label: "Connection",
    mutedGlow: "rgba(168, 118, 136, 0.12)",
    soft: "rgba(168, 118, 136, 0.17)",
  },
};

const RESULT_DOMAIN_TO_QUESTION_DOMAIN: Record<DomainName, Question["domain"]> = {
  Work: "work",
  Recovery: "recovery",
  Home: "home",
  Connection: "attach",
};

function toneForDomain(domain: Question["domain"]): DomainTone {
  return QUESTION_DOMAIN_TONES[domain];
}

function toneForResultDomain(domain: DomainName): DomainTone {
  return QUESTION_DOMAIN_TONES[RESULT_DOMAIN_TO_QUESTION_DOMAIN[domain]];
}

function meterPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round((value / 4) * 100)));
}

function avg(vals: number[]) {
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function top2FromMap(map: Record<string, number>) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);
}

const PACK_ID_BY_NAME: Record<string, string> = {
  "Clear Head": "clear_head_pack",
  "Wind Down": "wind_down_pack",
  "Be Present": "be_here_pack",
  "Repair": "come_back_pack",
  "Overthinking": "settle_the_spiral_pack",
  "Take Space": "space_not_distance_pack",
};

function mapNeedToId(priority: Priority, primaryPack: string) {
  if (priority === "Clarity at work") return "regain_clarity";
  if (priority === "Closeness at home") return "be_here";
  if (primaryPack === "Clear Head") return "regain_clarity";
  if (primaryPack === "Wind Down") return "wind_down";
  if (primaryPack === "Be Present") return "be_here";
  return "come_back";
}

function mapTimeToDefault(workIntensity: WorkIntensity) {
  if (workIntensity === "Normal") return 3;
  if (workIntensity === "Busy") return 5;
  return 10;
}

function mapSituationToId(homeSetup: HomeSetup) {
  if (homeSetup === "Solo") return "alone";
  if (homeSetup === "Long distance") return "long_distance";
  if (homeSetup === "Partner/spouse") return "partner_nearby";
  return "kids_around";
}

function isHomeSetup(value: string): value is HomeSetup {
  return value === "Partner/spouse" || value === "Kids/family" || value === "Partner + kids" || value === "Long distance" || value === "Solo";
}

function isWorkIntensity(value: string): value is WorkIntensity {
  return value === "Normal" || value === "Busy" || value === "Peak pressure";
}

function isSpillover(value: string): value is Spillover {
  return value === "Work → home" || value === "Home → work" || value === "Both ways";
}

function isPriority(value: string): value is Priority {
  return value === "Clarity at work" || value === "Closeness at home" || value === "Both";
}

type ResultCardCopy = {
  heading: string;
  body: string;
  startHere: string;
  label: string;
};

type PersonalizedResultCopy = {
  summary: string;
  detail: string;
  startSummary: string;
  startDetail: string;
};

type ResultInsightInput = {
  homeSetup: HomeSetup;
  priority: Priority;
  spillover: Spillover;
  workIntensity: WorkIntensity;
  groups: {
    primaryDomain: DomainName;
    secondaryDomain: DomainName | null;
    primaryPack: string;
    secondaryPack: string | null;
    style: "Anxious" | "Avoidant" | "Mixed";
    workTop?: [string, number];
    recoveryTop?: [string, number];
    homeTop?: [string, number];
    attachTop?: [string, number];
  };
};

function getTopPatternForDomain(
  groups: ResultInsightInput["groups"],
  domain: DomainName,
) {
  if (domain === "Work") return groups.workTop?.[0];
  if (domain === "Recovery") return groups.recoveryTop?.[0];
  if (domain === "Home") return groups.homeTop?.[0];
  return groups.attachTop?.[0];
}

function describePattern(pattern?: string) {
  if (pattern === "No Off-Switch") return "unfinished work still running in the background";
  if (pattern === "Context-Switch Drain") return "attention getting pulled in too many directions";
  if (pattern === "Open Loops Load") return "too many open loops staying active in your head";
  if (pattern === "Urgency Distortion") return "too many things feeling urgent at once";
  if (pattern === "Background Processing") return "work continuing in the background even after the day ends";
  if (pattern === "Wired-Tired") return "a tired body with a mind that still has not come down";
  if (pattern === "Slow Decompress") return "recovery taking longer than it should";
  if (pattern === "Numbing Switch-Off") return "switching off by zoning out rather than properly settling";
  if (pattern === "Sleep Spillover") return "stress carrying through into sleep";
  if (pattern === "Body Carry") return "stress staying in your body after work";
  if (pattern === "Mind Elsewhere") return "being home physically but not fully there";
  if (pattern === "Logistics Mode") return "home slipping toward coordination instead of connection";
  if (pattern === "Short Fuse") return "less patience at home than you want";
  if (pattern === "Guilt Loop") return "a sense that work gets the best of you and home gets what is left";
  if (pattern === "Sneaky Checking") return "difficulty fully putting work down around the people who matter";
  if (pattern === "Avoid Tension") return "pulling back when tension starts";
  if (pattern === "Distance Anxiety") return "uncertainty in connection staying active in the background";
  if (pattern === "Retreat to Process") return "needing space before you can say something useful";
  if (pattern === "Shutdown Quiet") return "going quiet to stop things from getting worse";
  if (pattern === "Verbal Depletion") return "having less room for the full conversation after a heavy day";
  return "pressure showing up in a few connected places";
}

function getSpilloverSummary(spillover: Spillover, homeSetup: HomeSetup) {
  if (spillover === "Work → home") {
    if (homeSetup === "Solo") return "Right now, work pressure looks like it is carrying into the rest of your evening.";
    if (homeSetup === "Long distance") return "Right now, work pressure looks like it is carrying into your connection across the distance.";
    return "Right now, work pressure looks like it is carrying into home life.";
  }

  if (spillover === "Home → work") {
    if (homeSetup === "Solo") return "Right now, pressure outside work looks like it is lingering after hours and carrying back into the workday.";
    return "Right now, pressure outside work looks like it is carrying with you into the workday.";
  }

  if (homeSetup === "Solo") return "Right now, pressure looks like it is moving both ways between work and the rest of your life, so neither side is getting a clean reset.";
  return "Right now, pressure looks like it is moving both ways between work and home, so neither side is getting a clean reset.";
}

function getPrimaryDomainImpactLine(primaryDomain: DomainName, homeSetup: HomeSetup) {
  if (primaryDomain === "Work") {
    return "The clearest strain shows up at work, where attention and judgment are getting pulled apart before the day is even over.";
  }

  if (primaryDomain === "Recovery") {
    if (homeSetup === "Solo") {
      return "The clearest strain shows up in recovery, where it is taking longer than it should to come down after the day ends.";
    }

    return "The clearest strain shows up in recovery, where it is taking longer than it should to come down and reset.";
  }

  if (primaryDomain === "Home") {
    if (homeSetup === "Partner/spouse") {
      return "The clearest strain shows up at home, where closeness and steadiness are giving way to tension, logistics, or distance sooner than you want.";
    }

    if (homeSetup === "Kids/family" || homeSetup === "Partner + kids") {
      return "The clearest strain shows up at home, where pressure is thinning out patience, presence, and responsiveness before you have had a chance to recover.";
    }

    if (homeSetup === "Long distance") {
      return "The clearest strain shows up in your personal life, where pressure is making steadiness and responsiveness across the distance harder to hold onto.";
    }

    return "The clearest strain shows up outside work, where the evening is carrying more tension and less ease than it should.";
  }

  if (homeSetup === "Long distance") {
    return "The clearest strain shows up around closeness and uncertainty, where stress makes silence, delay, or repair feel heavier across the distance.";
  }

  if (homeSetup === "Solo") {
    return "The clearest strain shows up in how much you are carrying alone, which makes stress harder to settle because too much of it stays unsupported.";
  }

  return "The clearest strain shows up around closeness and friction, where stress makes reassurance, space, and repair harder to handle cleanly.";
}

function getGoalLine(priority: Priority, homeSetup: HomeSetup) {
  if (priority === "Clarity at work") {
    return "Because you most want to protect clarity at work, the next job is to lower pressure before it keeps taking focus, judgment, and recovery off the table.";
  }

  if (priority === "Closeness at home") {
    if (homeSetup === "Solo") {
      return "Because you most want to protect life outside work, the next job is to make the evening feel more settled, not just quieter.";
    }

    if (homeSetup === "Long distance") {
      return "Because you most want to protect closeness, the next job is to make steadiness and repair easier across the distance without forcing more effort.";
    }

    return "Because you most want to protect closeness at home, the next job is to make presence, patience, and repair easier without asking you to push through.";
  }

  if (homeSetup === "Solo") {
    return "Because you want to protect both work and the rest of your life, the next job is to lower pressure earlier so it stops spilling into both.";
  }

  return "Because you want to protect both clarity at work and how you show up at home, the next job is to lower pressure before it hardens into distance, urgency, or reactivity.";
}

function getPackReason(pack: string, groups: ResultInsightInput["groups"]) {
  if (pack === "Clear Head") return describePattern(groups.workTop?.[0]);
  if (pack === "Wind Down") return describePattern(groups.recoveryTop?.[0]);
  if (pack === "Be Present") return describePattern(groups.homeTop?.[0]);
  if (pack === "Repair") return describePattern(groups.attachTop?.[0]);
  return "the clearest first pressure point";
}

function buildPersonalizedResultCopy(input: ResultInsightInput): PersonalizedResultCopy {
  const primaryPattern = describePattern(getTopPatternForDomain(input.groups, input.groups.primaryDomain));
  const secondaryPattern = input.groups.secondaryDomain
    ? describePattern(getTopPatternForDomain(input.groups, input.groups.secondaryDomain))
    : null;
  const packReason = getPackReason(input.groups.primaryPack, input.groups);
  const secondaryPackReason = input.groups.secondaryPack ? getPackReason(input.groups.secondaryPack, input.groups) : null;
  const workIntro =
    input.workIntensity === "Peak pressure"
      ? "With work under peak pressure, "
      : input.workIntensity === "Busy"
        ? "With work busy, "
        : "With work at a more normal pace, ";

  return {
    summary: `${getSpilloverSummary(input.spillover, input.homeSetup)} ${getPrimaryDomainImpactLine(input.groups.primaryDomain, input.homeSetup)}`,
    detail: `The clearest patterns: ${primaryPattern}${secondaryPattern ? ` and ${secondaryPattern}` : ""}.`,
    startSummary: input.groups.secondaryPack
      ? `Driftlatch will start with ${input.groups.primaryPack}, and keep ${input.groups.secondaryPack} close behind, because ${packReason}, with ${secondaryPackReason} also showing up clearly.`
      : `Driftlatch will start with ${input.groups.primaryPack} because ${packReason} is the clearest place to lower pressure first.`,
    startDetail:
      input.priority === "Clarity at work"
        ? "This is the best place to begin if you want to protect focus and decision-making without adding more pressure."
        : input.priority === "Closeness at home"
          ? input.homeSetup === "Solo"
            ? "This is the best place to begin if you want evenings to feel more settled and supported."
            : "This is the best place to begin if you want more room for presence, closeness, and repair."
          : "This is the best place to begin if you want to protect both clarity at work and how you show up outside it.",
  };
}

function getAttachmentContextDetail(style: "Anxious" | "Avoidant" | "Mixed", homeSetup: HomeSetup, attachTop?: string) {
  const topDetail =
    attachTop === "Distance Anxiety"
      ? "That fits with how quickly uncertainty seems to stay active in the background for you."
      : attachTop === "Retreat to Process"
        ? "It also looks as though needing space before you can respond clearly is part of the pattern."
        : attachTop === "Shutdown Quiet"
          ? "It also looks as though going quiet under strain is part of how you protect yourself."
          : attachTop === "Verbal Depletion"
            ? "After a heavy day, having room for the full conversation may be especially hard."
            : attachTop === "Avoid Tension"
              ? "When tension starts, part of the pattern seems to be stepping away before you have really settled."
              : "";

  if (style === "Anxious") {
    if (homeSetup === "Partner/spouse") {
      return `When connection feels uncertain, you may feel it quickly and look for reassurance or signs that things are okay. With a partner nearby, that can make small shifts in tone or distance feel harder to settle until there is clear repair.${topDetail ? ` ${topDetail}` : ""}`;
    }

    if (homeSetup === "Kids/family" || homeSetup === "Partner + kids") {
      return `When connection feels uncertain, you may feel it quickly and look for reassurance or signs that things are okay. In a busy home, that can narrow your room for patience, presence, or steadiness when pressure is already high.${topDetail ? ` ${topDetail}` : ""}`;
    }

    if (homeSetup === "Long distance") {
      return `When connection feels uncertain, you may feel it quickly and look for reassurance or signs that things are okay. In long distance, small delays or silence can leave more room for your mind to fill in the gaps.${topDetail ? ` ${topDetail}` : ""}`;
    }

    return `When connection feels uncertain, you may feel it quickly and look for reassurance or signs that things are okay. When you are carrying it alone, that uncertainty can stay active internally for longer and be harder to settle cleanly.${topDetail ? ` ${topDetail}` : ""}`;
  }

  if (style === "Avoidant") {
    if (homeSetup === "Partner/spouse") {
      return `When pressure rises, you may protect yourself by stepping back and handling it alone first. With a partner nearby, that can look like distance unless there is a clear way back into conversation.${topDetail ? ` ${topDetail}` : ""}`;
    }

    if (homeSetup === "Kids/family" || homeSetup === "Partner + kids") {
      return `When pressure rises, you may protect yourself by stepping back and handling it alone first. Around kids or family demands, that can look like shorter answers, less availability, or being there physically but harder to reach.${topDetail ? ` ${topDetail}` : ""}`;
    }

    if (homeSetup === "Long distance") {
      return `When pressure rises, you may protect yourself by stepping back and handling it alone first. In long distance, that can show up as delayed replies, more silence, or longer gaps before repair.${topDetail ? ` ${topDetail}` : ""}`;
    }

    return `When pressure rises, you may protect yourself by stepping back and handling it alone first. When you are on your own, that can keep stress internal for longer and make support harder to reach.${topDetail ? ` ${topDetail}` : ""}`;
  }

  if (homeSetup === "Partner/spouse") {
    return `At times you may want closeness strongly, but also feel overwhelmed by it. With a partner nearby, that can create a push-pull rhythm where you reach in and then pull back when the pressure stays high.${topDetail ? ` ${topDetail}` : ""}`;
  }

  if (homeSetup === "Kids/family" || homeSetup === "Partner + kids") {
    return `At times you may want closeness strongly, but also feel overwhelmed by it. In a busy home, that can leave very little room for patience, responsiveness, or clean repair when everyone needs something from you.${topDetail ? ` ${topDetail}` : ""}`;
  }

  if (homeSetup === "Long distance") {
    return `At times you may want closeness strongly, but also feel overwhelmed by it. In long distance, that can show up as wanting connection and then feeling flooded by the uncertainty around it.${topDetail ? ` ${topDetail}` : ""}`;
  }

  return `At times you may want closeness strongly, but also feel overwhelmed by it. When you are carrying it alone, that push-pull can stay mostly internal and feel hard to make sense of.${topDetail ? ` ${topDetail}` : ""}`;
}

function getWorkCardCopy(topPattern?: string): ResultCardCopy {
  if (topPattern === "Context-Switch Drain" || topPattern === "Urgency Distortion") {
    return {
      label: "AT WORK",
      heading: "Work is pulling your attention apart",
      body:
        "Too many things feel urgent at once. Clear thinking becomes harder, and the pressure stays with you after the day ends.",
      startHere: getNeedLabel("regain_clarity"),
    };
  }

  return {
    label: "AT WORK",
    heading: "Work is staying with you after the day ends",
    body:
      "Part of your mind keeps working after the day ends. Harder to rest, harder to arrive fully at home.",
    startHere: getNeedLabel("regain_clarity"),
  };
}

function getRecoveryCardCopy(topPattern?: string): ResultCardCopy {
  if (topPattern === "Sleep Spillover") {
    return {
      label: "AFTER WORK RECOVERY",
      heading: "Stress may still be following you into the night",
      body:
        "Pressure is carrying into sleep. The next day starts with less energy and less room.",
      startHere: getNeedLabel("wind_down"),
    };
  }

  if (topPattern === "Numbing Switch-Off") {
    return {
      label: "AFTER WORK RECOVERY",
      heading: "Switching off is taking more effort than it should",
      body:
        "Zoning out is easier than settling. It quiets the noise but does not leave you restored.",
      startHere: getNeedLabel("wind_down"),
    };
  }

  return {
    label: "AFTER WORK RECOVERY",
    heading: "You may still be on after the day ends",
    body:
      "Stress is staying in the body even when you try to rest. Tension, restlessness, or a long delay before you feel off.",
    startHere: getNeedLabel("wind_down"),
  };
}

function getHomeCardCopy(topPattern?: string): ResultCardCopy {
  if (topPattern === "Logistics Mode") {
    return {
      label: "AT HOME",
      heading: "Home may be slipping into task mode",
      body:
        "Connection is turning into coordination. Home feels more functional than restorative.",
      startHere: getNeedLabel("be_here"),
    };
  }

  if (topPattern === "Short Fuse") {
    return {
      label: "AT HOME",
      heading: "Your patience may be thinner than you want it to be",
      body:
        "Patience wears thin at home first. Small moments start costing more than they should.",
      startHere: getNeedLabel("be_here"),
    };
  }

  if (topPattern === "Guilt Loop") {
    return {
      label: "AT HOME",
      heading: "Work may be taking more of you than feels right",
      body:
        "Work takes the best of you. Home gets what's left, and the guilt adds its own pressure.",
      startHere: getNeedLabel("be_here"),
    };
  }

  return {
    label: "AT HOME",
    heading: "It may be harder to arrive fully at home",
    body:
      "Attention stays on work or planning. Physically home but not fully settled.",
    startHere: getNeedLabel("be_here"),
  };
}

function getConnectionCardCopy(
  style: "Anxious" | "Avoidant" | "Mixed",
  homeSetup: HomeSetup,
  attachTop?: string,
): ResultCardCopy {
  const copy = getAttachmentStyleSummary(style);
  if (!copy?.startHere) {
    return {
      label: "UNDER STRESS",
      heading: "Relationship stress may need a gentler first step",
      body: "A calmer first move will usually help more than trying to solve everything at once.",
      startHere: "Repair",
    };
  }

  return {
    label: "UNDER STRESS",
    heading: copy.heading,
    body: getAttachmentContextDetail(style, homeSetup, attachTop),
    startHere: copy.startHere,
  };
}

const ONBOARDING_THEME_STYLES_BASE = `
  .profile-page { position: relative; min-height: 100dvh; overflow-x: hidden; background: radial-gradient(circle at 50% 0%, rgba(194,122,92,0.12) 0%, rgba(194,122,92,0.05) 18%, rgba(24,24,27,0) 44%), linear-gradient(180deg, #141417 0%, #18181b 42%, #141416 100%); }
  .profile-atmosphere { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
  .profile-glow { position: absolute; border-radius: 999px; filter: blur(82px); opacity: 0.9; }
  .profile-glow-main { top: -180px; left: 50%; width: min(72vw, 920px); height: 420px; transform: translateX(-50%); background: radial-gradient(circle, rgba(194,122,92,0.28) 0%, rgba(194,122,92,0.12) 36%, rgba(24,24,27,0) 76%); }
  .profile-glow-side { right: -120px; top: 26%; width: 360px; height: 360px; background: radial-gradient(circle, rgba(122,104,92,0.18) 0%, rgba(24,24,27,0) 76%); }
  .profile-glow-bottom { left: -90px; bottom: 6%; width: 300px; height: 300px; background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(24,24,27,0) 76%); }
  .profile-grid-noise { position: absolute; inset: 0; opacity: 0.06; background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 4px 4px, 5px 5px; mix-blend-mode: soft-light; }
  .profile-shell { position: relative; z-index: 1; width: min(1120px, calc(100vw - 36px)); margin: 0 auto; padding: 54px 0 120px; }
  .profile-section, .profile-stack, .profile-results-block, .profile-results-section-head, .profile-progress-copy, .profile-hero-inner, .profile-primary-pack-content, .profile-content-wrap, .profile-card-content { display: grid; }
  .profile-section { gap: 24px; }
  .profile-stack { gap: 22px; }
  .profile-results-stack { gap: 36px; }
  .profile-card { position: relative; overflow: hidden; border-radius: 24px; border: 1px solid rgba(255,255,255,0.08); background: linear-gradient(180deg, rgba(45,45,49,0.82) 0%, rgba(29,29,33,0.76) 100%), radial-gradient(circle at top left, rgba(194,122,92,0.08) 0%, rgba(39,39,42,0) 42%); box-shadow: 0 28px 80px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -28px 60px rgba(0,0,0,0.16); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
  .profile-top-rim { position: absolute; top: 0; left: 22px; right: 22px; height: 1px; background: linear-gradient(90deg, rgba(194,122,92,0), rgba(255,255,255,0.16), rgba(194,122,92,0)); pointer-events: none; }
  .profile-top-rim-strong { background: linear-gradient(90deg, rgba(194,122,92,0), rgba(194,122,92,0.68), rgba(194,122,92,0)); }
  .profile-hero-card { padding: 34px 34px 32px; }
  .profile-hero-card-compact { padding-bottom: 28px; }
  .profile-content-wrap { width: 100%; max-width: 760px; margin-left: 0; justify-items: start; align-content: start; }
  .profile-content-wrap > *, .profile-card-content > * { min-width: 0; }
  .profile-card-content { width: 100%; gap: 14px; align-content: start; }
  .profile-hero-inner { width: 100%; gap: 12px; }
  .profile-intro-stack { gap: 18px; }
  .profile-intro-hero-card { padding-bottom: 28px; }
  .profile-eyebrow-pill, .profile-question-domain { display: inline-flex; align-items: center; width: fit-content; min-height: 30px; padding: 7px 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.035); color: rgba(214,214,219,0.78); font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
  .profile-eyebrow { color: rgba(187,187,193,0.72); font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }
  .profile-display, .profile-card-display, .profile-primary-pack-title { margin: 0; color: rgba(244,244,245,0.94); font-family: "Zodiak", Georgia, serif; font-weight: 560; letter-spacing: -0.05em; text-wrap: balance; }
  .profile-display { font-size: clamp(2.1rem, 5.2vw, 3.6rem); line-height: 1; max-width: none; }
  .profile-display-intro { font-size: clamp(1.95rem, 4.2vw, 3rem); line-height: 1.02; max-width: none; }
  .profile-display-compact { font-size: clamp(1.85rem, 3.7vw, 2.65rem); line-height: 1.03; max-width: none; }
  .profile-display-results { max-width: 12ch; }
  .profile-card-display, .profile-primary-pack-title { font-size: clamp(1.72rem, 3vw, 2.3rem); line-height: 1.02; margin-top: 8px; }
  .profile-lead, .profile-results-summary { margin: 0; color: rgba(228,228,232,0.88); font-size: 17px; line-height: 1.72; max-width: none; }
  .profile-results-summary { color: rgba(239,239,242,0.9); }
  .profile-meta-copy { margin: 0; color: rgba(161,161,170,0.84); font-size: 14px; line-height: 1.78; }
  .profile-meta-width { max-width: none; }
  .profile-meta-spaced { margin-top: 12px; }
  .profile-inline-strong { color: rgba(244,244,245,0.92); }
  .profile-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
`;

const ONBOARDING_THEME_STYLES_LAYOUT = `
  .profile-intro-grid, .profile-context-grid { display: grid; gap: 18px; }
  .profile-intro-content, .profile-context-content, .profile-context-layout { gap: 18px; }
  .profile-intro-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch; width: 100%; }
  .profile-context-grid, .profile-meter-grid, .profile-domain-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); display: grid; gap: 16px; }
  .profile-context-grid { align-items: stretch; }
  .profile-context-layout { display: grid; width: 100%; max-width: none; justify-items: stretch; }
  .profile-context-content { width: 100%; max-width: none; }
  .profile-context-actions { width: 100%; align-items: center; justify-self: stretch; }
  .profile-subcard, .profile-progress-card, .profile-question-card, .profile-domain-card, .profile-meter-card, .profile-primary-pack-card { padding: 24px; }
  .profile-intro-grid .profile-subcard, .profile-context-grid .profile-subcard { min-height: 100%; }
  .profile-privacy-card { min-height: 100%; background: linear-gradient(180deg, rgba(43,43,47,0.82) 0%, rgba(28,28,32,0.78) 100%), radial-gradient(circle at 18% 18%, rgba(194,122,92,0.14) 0%, rgba(39,39,42,0) 42%); }
  .profile-privacy-head { display: inline-flex; align-items: center; gap: 10px; color: rgba(244,244,245,0.9); font-size: 16px; font-weight: 700; letter-spacing: -0.02em; }
  .profile-lock { color: rgba(194,122,92,0.92); filter: drop-shadow(0 0 16px rgba(194,122,92,0.2)); }
  .profile-input-wrap { display: grid; gap: 12px; width: 100%; }
  .profile-input { width: 100%; min-height: 56px; padding: 16px 18px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); background: linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.018) 100%); color: rgba(244,244,245,0.94); font-size: 15px; outline: none; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04); transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease; }
  .profile-input::placeholder { color: rgba(161,161,170,0.6); }
  .profile-input:focus { border-color: rgba(194,122,92,0.34); box-shadow: 0 0 0 4px rgba(194,122,92,0.08), inset 0 1px 0 rgba(255,255,255,0.05); background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.024) 100%); }
  .profile-actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: flex-start; }
  .profile-intro-actions { width: 100%; align-items: center; }
  .profile-actions-inline { margin-top: 20px; }
  .profile-actions-wrap { margin-top: 2px; }
  .profile-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 52px; padding: 14px 18px; border-radius: 16px; border: 1px solid transparent; text-decoration: none; cursor: pointer; font-size: 14px; font-weight: 800; letter-spacing: -0.01em; transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, color 0.18s ease; }
  .profile-btn:hover { transform: translateY(-1px); }
  .profile-btn-primary { color: #fff; background: linear-gradient(180deg, rgba(198,128,97,0.98) 0%, rgba(166,96,73,0.96) 100%); border-color: rgba(194,122,92,0.3); box-shadow: 0 18px 40px rgba(194,122,92,0.2), inset 0 1px 0 rgba(255,255,255,0.12); }
  .profile-btn-secondary { color: rgba(232,232,235,0.84); background: rgba(255,255,255,0.025); border-color: rgba(255,255,255,0.08); box-shadow: inset 0 1px 0 rgba(255,255,255,0.03); }
  .profile-choice-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 14px; }
  .profile-choice { min-height: 46px; padding: 11px 16px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); color: rgba(226,226,230,0.82); font-size: 14px; font-weight: 700; letter-spacing: -0.01em; cursor: pointer; transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease, color 0.18s ease; }
  .profile-choice:hover { transform: translateY(-1px); border-color: rgba(255,255,255,0.16); }
  .profile-choice.is-selected { color: rgba(244,244,245,0.96); border-color: var(--choice-border); background: linear-gradient(180deg, color-mix(in srgb, var(--choice-accent) 28%, rgba(24,24,27,1)) 0%, color-mix(in srgb, var(--choice-accent) 18%, rgba(24,24,27,1)) 100%); box-shadow: 0 16px 32px color-mix(in srgb, var(--choice-accent) 12%, transparent), inset 0 1px 0 rgba(255,255,255,0.08); }
  .profile-divider, .profile-soft-divider { height: 1px; margin: 18px 0; background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.12), rgba(255,255,255,0.04)); }
  .profile-results-section-head { gap: 10px; margin-bottom: 4px; }
  .profile-section-title { color: rgba(244,244,245,0.9); font-family: "Zodiak", Georgia, serif; font-size: clamp(1.5rem, 3vw, 2.1rem); line-height: 1.08; letter-spacing: -0.04em; }
  .profile-results-hero { padding: 34px 34px 32px; background: linear-gradient(180deg, rgba(48,48,52,0.86) 0%, rgba(29,29,34,0.82) 100%), radial-gradient(circle at 18% 12%, rgba(194,122,92,0.18) 0%, rgba(39,39,42,0) 48%); }
  .profile-results-hero-inner { display: grid; gap: 14px; }
  .profile-meter-card { background: linear-gradient(180deg, rgba(43,43,47,0.84) 0%, rgba(27,27,31,0.78) 100%), radial-gradient(circle at 18% 18%, var(--meter-glow) 0%, rgba(39,39,42,0) 42%); }
  .profile-meter-top { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; margin-bottom: 14px; }
  .profile-meter-label { color: rgba(229,229,233,0.9); font-size: 14px; font-weight: 700; letter-spacing: -0.01em; }
  .profile-meter-value { color: rgba(161,161,170,0.84); font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
  .profile-meter-track, .profile-progress-rail, .profile-segment-track { position: relative; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,0.07); }
  .profile-meter-track { height: 10px; }
  .profile-meter-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, color-mix(in srgb, var(--meter-accent) 74%, rgba(255,255,255,0.12)) 0%, var(--meter-accent) 100%); box-shadow: 0 0 24px color-mix(in srgb, var(--meter-accent) 18%, transparent); }
  .profile-domain-card { min-height: 100%; display: grid; gap: 14px; background: linear-gradient(180deg, rgba(43,43,47,0.84) 0%, rgba(27,27,31,0.8) 100%), radial-gradient(circle at 85% 12%, var(--domain-glow) 0%, rgba(39,39,42,0) 42%); }
  .profile-domain-aura { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at 88% 12%, var(--domain-glow) 0%, rgba(39,39,42,0) 40%); }
  .profile-domain-head, .profile-primary-pack-content { position: relative; z-index: 1; }
  .profile-card-copy { position: relative; z-index: 1; min-height: 7.6em; }
  .profile-start-row { position: relative; z-index: 1; display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 12px 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); }
  .profile-start-label { color: rgba(161,161,170,0.72); font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .profile-start-value { color: rgba(244,244,245,0.9); font-size: 14px; font-weight: 700; letter-spacing: -0.01em; }
`;

const ONBOARDING_THEME_STYLES_QUESTIONS = `
  .profile-progress-card { gap: 0; }
  .profile-progress-wrap { width: 100%; max-width: 860px; gap: 18px; justify-items: stretch; }
  .profile-progress-copy { gap: 10px; width: 100%; max-width: none; }
  .profile-progress-helper { max-width: none; }
  .profile-progress-rail { width: 100%; height: 7px; }
  .profile-progress-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, rgba(198,128,97,0.9) 0%, rgba(221,165,137,0.96) 100%); box-shadow: 0 0 22px rgba(194,122,92,0.24); }
  .profile-segment-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; width: 100%; }
  .profile-segment { display: grid; gap: 8px; }
  .profile-segment-label { color: rgba(161,161,170,0.76); font-size: 11.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
  .profile-segment-track { height: 5px; }
  .profile-segment-fill { height: 100%; border-radius: inherit; background: var(--segment-accent); box-shadow: 0 0 18px color-mix(in srgb, var(--segment-accent) 26%, transparent); }
  .profile-question-card { background: linear-gradient(180deg, rgba(45,45,49,0.84) 0%, rgba(26,26,30,0.78) 100%), radial-gradient(circle at top left, var(--question-soft) 0%, rgba(39,39,42,0) 48%); }
  .profile-question-wrap { width: 100%; max-width: 860px; gap: 18px; justify-items: stretch; }
  .profile-question-shell { display: grid; gap: 18px; width: 100%; }
  .profile-question-meta-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding-inline: 2px; }
  .profile-question-count { color: rgba(161,161,170,0.78); font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
  .profile-question-motion { display: grid; width: 100%; min-width: 0; }
  .profile-question-surface { width: 100%; min-width: 0; padding: 24px 24px 20px; border-radius: 22px; border-color: rgba(255,255,255,0.06); background: linear-gradient(180deg, rgba(255,255,255,0.032) 0%, rgba(255,255,255,0.01) 100%), radial-gradient(circle at top left, var(--question-soft) 0%, rgba(255,255,255,0) 44%); box-shadow: inset 0 1px 0 rgba(255,255,255,0.04); }
  .profile-question-content { gap: 18px; width: 100%; }
  .profile-question-text { color: rgba(244,244,245,0.94); font-family: "Zodiak", Georgia, serif; font-size: clamp(1.5rem, 2.4vw, 2.08rem); line-height: 1.28; letter-spacing: -0.028em; max-width: none; text-wrap: pretty; }
  .profile-scale-group { display: grid; gap: 12px; width: 100%; max-width: none; min-width: 0; }
  .profile-scale-row { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; width: 100%; max-width: none; }
  .profile-scale-button { width: 100%; min-height: 64px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); color: rgba(244,244,245,0.88); cursor: pointer; display: grid; place-items: center; box-shadow: inset 0 1px 0 rgba(255,255,255,0.03); transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease; }
  .profile-scale-button:hover { transform: translateY(-1px); border-color: rgba(255,255,255,0.16); }
  .profile-scale-button.is-selected { border-color: var(--question-border); background: linear-gradient(180deg, color-mix(in srgb, var(--question-accent) 40%, rgba(26,26,30,1)) 0%, color-mix(in srgb, var(--question-accent) 22%, rgba(26,26,30,1)) 100%); box-shadow: 0 18px 36px var(--question-glow), inset 0 1px 0 rgba(255,255,255,0.12); }
  .profile-scale-number { font-size: 19px; font-weight: 800; letter-spacing: -0.02em; }
  .profile-scale-legend { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; width: 100%; max-width: none; color: rgba(161,161,170,0.76); font-size: 12px; line-height: 1.55; }
  .profile-scale-legend span:last-child { text-align: right; }
  .profile-actions-inline { margin-top: 0; width: 100%; align-items: center; justify-self: stretch; }
  .profile-primary-pack-card { padding: 30px; border-color: rgba(194,122,92,0.22); background: linear-gradient(180deg, rgba(52,43,39,0.92) 0%, rgba(33,28,28,0.88) 100%), radial-gradient(circle at 14% 10%, rgba(194,122,92,0.22) 0%, rgba(39,39,42,0) 48%); box-shadow: 0 32px 90px rgba(0,0,0,0.46), 0 0 0 1px rgba(194,122,92,0.08), inset 0 1px 0 rgba(255,255,255,0.08); }
  .profile-primary-pack-glow { position: absolute; top: -18px; left: 12%; right: 12%; height: 130px; border-radius: 999px; background: radial-gradient(ellipse at 50% 0%, rgba(194,122,92,0.28) 0%, rgba(194,122,92,0.08) 44%, rgba(24,24,27,0) 74%); filter: blur(22px); pointer-events: none; }
  @media (max-width: 900px) { .profile-shell { width: min(100vw - 28px, 980px); padding: 34px 0 110px; } .profile-intro-grid, .profile-context-grid, .profile-meter-grid, .profile-domain-grid { grid-template-columns: 1fr; } .profile-segment-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .profile-progress-wrap, .profile-question-wrap { width: 100%; max-width: 100%; } }
  @media (max-width: 640px) { .profile-shell { width: calc(100vw - 24px); padding: 24px 0 96px; } .profile-card, .profile-hero-card, .profile-results-hero, .profile-subcard, .profile-progress-card, .profile-question-card, .profile-domain-card, .profile-meter-card, .profile-primary-pack-card { border-radius: 22px; } .profile-hero-card, .profile-results-hero, .profile-subcard, .profile-progress-card, .profile-question-card, .profile-domain-card, .profile-meter-card, .profile-primary-pack-card { padding: 20px; } .profile-display { font-size: clamp(1.95rem, 8vw, 2.7rem); } .profile-display-intro { font-size: clamp(1.8rem, 7.2vw, 2.45rem); line-height: 1.04; } .profile-display-compact { font-size: clamp(1.7rem, 6.6vw, 2.25rem); } .profile-question-surface { padding: 22px 20px 20px; } .profile-question-text { font-size: clamp(1.34rem, 5.6vw, 1.72rem); line-height: 1.3; text-wrap: initial; } .profile-actions { display: grid; grid-template-columns: 1fr; } .profile-choice-grid { gap: 10px; } .profile-choice, .profile-btn { width: 100%; } .profile-segment-grid { grid-template-columns: 1fr; } .profile-scale-row { gap: 10px; } .profile-scale-button { min-height: 54px; } .profile-scale-legend { font-size: 11px; } }
`;

const ONBOARDING_THEME_STYLES = [
  ONBOARDING_THEME_STYLES_BASE,
  ONBOARDING_THEME_STYLES_LAYOUT,
  ONBOARDING_THEME_STYLES_QUESTIONS,
].join("\n");

export default function OnboardingPage() {
  const pathname = usePathname();
  const isPublicFlow = !pathname.startsWith("/app/");
  const hasPersistedResultsRef = useRef(false);
  const [page, setPage] = useState<PageKey>("intro");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [sectionIntroFor, setSectionIntroFor] = useState<Question["domain"] | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [homeSetup, setHomeSetup] = useState<HomeSetup>("Partner + kids");
  const [workIntensity, setWorkIntensity] = useState<WorkIntensity>("Busy");
  const [spillover, setSpillover] = useState<Spillover>("Both ways");
  const [priority, setPriority] = useState<Priority>("Both");

  const [answers, setAnswers] = useState<Answer[]>(Array(20).fill(2) as Answer[]);

  const groups = useMemo(() => {
    const work = answers.slice(0, 5);
    const recovery = answers.slice(5, 10);
    const home = answers.slice(10, 15);
    const attach = answers.slice(15, 20);

    const workAvg = avg(work);
    const recoveryAvg = avg(recovery);
    const homeAvg = avg(home);
    const attachAvg = avg(attach);

    const q16 = answers[15];
    const q17 = answers[16];
    const q18 = answers[17];
    const q19 = answers[18];
    const q20 = answers[19];

    const anxiousIndex = q17 * 1.3 + q16 * 0.6 + q20 * 0.3;
    const avoidantIndex = (q18 + q19) * 1.0 + q16 * 0.5 + q20 * 0.6;

    const diff = anxiousIndex - avoidantIndex;
    let style: "Anxious" | "Avoidant" | "Mixed" = "Mixed";
    if (diff >= 1.2) style = "Anxious";
    else if (diff <= -1.2) style = "Avoidant";
    else style = "Mixed";

    const workSub = {
      "No Off-Switch": answers[0] + answers[1],
      "Context-Switch Drain": answers[2] * 1.3,
      "Open Loops Load": answers[3] + answers[4] * 1.1,
      "Urgency Distortion": answers[4] * 1.4,
      "Background Processing": answers[1] + answers[3],
    };

    const recoverySub = {
      "Wired-Tired": answers[5] + answers[6] * 0.6,
      "Slow Decompress": answers[6] * 1.4,
      "Numbing Switch-Off": answers[7] * 1.4,
      "Sleep Spillover": answers[8] * 1.4,
      "Body Carry": answers[9] * 1.4,
    };

    const homeSub = {
      "Mind Elsewhere": answers[10] * 1.4,
      "Logistics Mode": answers[11] * 1.4,
      "Short Fuse": answers[12] * 1.4,
      "Guilt Loop": answers[13] * 1.4,
      "Sneaky Checking": answers[14] * 1.4,
    };

    const attachSub = {
      "Avoid Tension": q16 * 1.2,
      "Distance Anxiety": q17 * 1.4,
      "Retreat to Process": q18 * 1.3,
      "Shutdown Quiet": q19 * 1.3,
      "Verbal Depletion": q20 * 1.2,
    };

    const [workTop, workAlso] = top2FromMap(workSub);
    const [recoveryTop, recoveryAlso] = top2FromMap(recoverySub);
    const [homeTop, homeAlso] = top2FromMap(homeSub);
    const [attachTop, attachAlso] = top2FromMap(attachSub);

    const domainScores: Record<DomainName, number> = {
      Work: workAvg,
      Recovery: recoveryAvg,
      Home: homeAvg,
      Connection: attachAvg,
    };
    const primaryDomain = Object.entries(domainScores).sort((a, b) => b[1] - a[1])[0][0];

    const primaryPack =
      primaryDomain === "Work"
        ? "Clear Head"
        : primaryDomain === "Recovery"
          ? "Wind Down"
          : primaryDomain === "Home"
            ? "Be Present"
            : "Repair";

    const microPack =
      style === "Anxious"
        ? "Overthinking"
        : style === "Avoidant"
          ? "Take Space"
          : "Overthinking and Take Space";

    const sortedDomains = Object.entries(domainScores).sort((a, b) => b[1] - a[1]);
    const second = sortedDomains[1];
    const secondaryDomain = (second?.[0] as DomainName | undefined) ?? null;
    const secondaryPack =
      spillover === "Both ways" && Math.abs(sortedDomains[0][1] - second[1]) <= 0.25
        ? second[0] === "Work"
          ? "Clear Head"
          : second[0] === "Recovery"
            ? "Wind Down"
            : second[0] === "Home"
              ? "Be Present"
              : "Repair"
        : null;

    const overallAvg = avg(answers);
    const emotionalLine =
      overallAvg > 2.8
        ? "Stress is asking a lot of you right now. This map shows where it seems to be landing most."
        : overallAvg > 1.8
          ? "Stress is showing up in a few clear places right now. This map shows where to start."
          : "Some things look fairly steady right now. This map shows what is still worth noticing.";

    return {
      workAvg,
      recoveryAvg,
      homeAvg,
      attachAvg,
      overallAvg,
      emotionalLine,
      primaryDomain: primaryDomain as DomainName,
      secondaryDomain,
      style,
      anxiousIndex,
      avoidantIndex,
      workTop,
      workAlso,
      recoveryTop,
      recoveryAlso,
      homeTop,
      homeAlso,
      attachTop,
      attachAlso,
      primaryPack,
      secondaryPack,
      microPack,
    };
  }, [answers, spillover]);

  const personalizedResultCopy = useMemo(
    () =>
      buildPersonalizedResultCopy({
        homeSetup,
        priority,
        spillover,
        workIntensity,
        groups,
      }),
    [groups, homeSetup, priority, spillover, workIntensity],
  );

  const connectionCardCopy = useMemo(
    () => getConnectionCardCopy(groups.style, homeSetup, groups.attachTop?.[0]),
    [groups.attachTop, groups.style, homeSetup],
  );
  const workCardCopy = useMemo(() => getWorkCardCopy(groups.workTop?.[0]), [groups.workTop]);
  const recoveryCardCopy = useMemo(() => getRecoveryCardCopy(groups.recoveryTop?.[0]), [groups.recoveryTop]);
  const homeCardCopy = useMemo(() => getHomeCardCopy(groups.homeTop?.[0]), [groups.homeTop]);

  const primaryPackIds = useMemo(
    () =>
      [groups.primaryPack, groups.secondaryPack]
        .filter((pack): pack is string => Boolean(pack))
        .map((pack) => PACK_ID_BY_NAME[pack])
        .filter((id): id is string => Boolean(id)),
    [groups.primaryPack, groups.secondaryPack],
  );

  const topPatterns = useMemo(
    () =>
      [groups.workTop?.[0], groups.recoveryTop?.[0], groups.homeTop?.[0], groups.attachTop?.[0]]
        .filter((pattern): pattern is string => Boolean(pattern)),
    [groups.attachTop, groups.homeTop, groups.recoveryTop, groups.workTop],
  );

  const publicProfileContext = useMemo<PublicProfileContext>(
    () => ({
      display_name: displayNameInput,
      home_setup: homeSetup,
      priority,
      spillover,
      work_intensity: workIntensity,
    }),
    [displayNameInput, homeSetup, priority, spillover, workIntensity],
  );

  const publicProfileResult = useMemo<PublicProfileResult>(
    () => ({
      attachment_style: groups.style,
      defaults: {
        default_need: mapNeedToId(priority, groups.primaryPack),
        default_situation: mapSituationToId(homeSetup),
        default_time: mapTimeToDefault(workIntensity),
        primary_pack_ids: primaryPackIds,
        top_patterns: topPatterns,
      },
      display_name: displayNameInput.trim() || null,
      primary_pack_ids: primaryPackIds,
      result_summary: {
        attach_top: groups.attachTop?.[0] ?? null,
        emotional_line: groups.emotionalLine,
        home_top: groups.homeTop?.[0] ?? null,
        micro_pack: groups.microPack,
        primary_pack: groups.primaryPack,
        priority,
        recovery_top: groups.recoveryTop?.[0] ?? null,
        secondary_pack: groups.secondaryPack,
        spillover,
        work_top: groups.workTop?.[0] ?? null,
      },
    }),
    [
      displayNameInput,
      groups.attachTop,
      groups.emotionalLine,
      groups.homeTop,
      groups.microPack,
      groups.primaryPack,
      groups.recoveryTop,
      groups.secondaryPack,
      groups.style,
      groups.workTop,
      homeSetup,
      primaryPackIds,
      priority,
      spillover,
      topPatterns,
      workIntensity,
    ],
  );

  function setAnswer(questionIndex: number, val: Answer) {
    setAnswers((prev) => {
      const next = [...prev] as Answer[];
      next[questionIndex] = val;
      return next;
    });
  }

  function handleDisplayNameChange(event: ChangeEvent<HTMLInputElement>) {
    setDisplayNameInput(event.target.value);
  }

  function handleRetakeProfile() {
    hasPersistedResultsRef.current = false;
    if (isPublicFlow) clearStoredPublicProfileResult();
    goToQuestion(0);
  }

  const progressLabel = (key: PageKey) => {
    if (key === "q1") return "1/4";
    if (key === "q2") return "2/4";
    if (key === "q3") return "3/4";
    if (key === "q4") return "4/4";
    return "";
  };

  const pageFromQuestionIndex = (idx: number): PageKey => {
    if (idx <= 4) return "q1";
    if (idx <= 9) return "q2";
    if (idx <= 14) return "q3";
    return "q4";
  };

  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const withinGroupIndex = (currentQuestionIndex % 5) + 1;
  const totalProgressPct = ((currentQuestionIndex + 1) / 20) * 100;
  const currentQuestionTone = toneForDomain(currentQuestion.domain);
  const pageGroupIndex = Math.floor(currentQuestionIndex / 5);
  const groupedProgress = useMemo(
    () =>
      ([
        { label: "Work", value: pageGroupIndex > 0 ? 100 : pageGroupIndex === 0 ? (withinGroupIndex / 5) * 100 : 0 },
        { label: "Recovery", value: pageGroupIndex > 1 ? 100 : pageGroupIndex === 1 ? (withinGroupIndex / 5) * 100 : 0 },
        { label: "Home", value: pageGroupIndex > 2 ? 100 : pageGroupIndex === 2 ? (withinGroupIndex / 5) * 100 : 0 },
        { label: "Connection", value: pageGroupIndex > 3 ? 100 : pageGroupIndex === 3 ? (withinGroupIndex / 5) * 100 : 0 },
      ]) satisfies { label: DomainName; value: number }[],
    [pageGroupIndex, withinGroupIndex],
  );
  const pressureMeters = useMemo(
    () =>
      ([
        { domain: "Work", value: groups.workAvg },
        { domain: "Recovery", value: groups.recoveryAvg },
        { domain: "Home", value: groups.homeAvg },
        { domain: "Connection", value: groups.attachAvg },
      ]) satisfies { domain: DomainName; value: number }[],
    [groups.attachAvg, groups.homeAvg, groups.recoveryAvg, groups.workAvg],
  );
  const domainCards = useMemo(
    () =>
      ([
        { copy: workCardCopy, domain: "Work" },
        { copy: recoveryCardCopy, domain: "Recovery" },
        { copy: homeCardCopy, domain: "Home" },
        { copy: connectionCardCopy, domain: "Connection" },
      ]) satisfies { copy: ResultCardCopy; domain: DomainName }[],
    [connectionCardCopy, homeCardCopy, recoveryCardCopy, workCardCopy],
  );

  const goToQuestion = (idx: number) => {
    const safeIdx = Math.max(0, Math.min(19, idx));
    setCurrentQuestionIndex(safeIdx);
    setPage(pageFromQuestionIndex(safeIdx));
  };

  const goNextQuestion = () => {
    if (currentQuestionIndex >= 19) {
      setIsRevealing(true);
      window.setTimeout(() => {
        setIsRevealing(false);
        setPage("results");
      }, 2400);
      return;
    }
    const nextIdx = currentQuestionIndex + 1;
    const nextDomain = QUESTIONS[nextIdx].domain;
    const currentDomain = QUESTIONS[currentQuestionIndex].domain;
    if (nextDomain !== currentDomain) {
      setSectionIntroFor(nextDomain);
      return;
    }
    goToQuestion(nextIdx);
  };

  const goBackQuestion = () => {
    if (currentQuestionIndex <= 0) return;
    goToQuestion(currentQuestionIndex - 1);
  };

  useEffect(() => {
    if (!sectionIntroFor) return;
    const t = window.setTimeout(() => {
      setSectionIntroFor(null);
      goToQuestion(currentQuestionIndex + 1);
    }, 1800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionIntroFor]);

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;

    const loadSessionState = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setIsLoggedIn(Boolean(data.user));
    };

    void loadSessionState();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setIsLoggedIn(Boolean(session));
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isPublicFlow) return;

    const restoreTimer = window.setTimeout(() => {
      const storedAnswers = readStoredPublicProfileAnswers();
      if (storedAnswers && storedAnswers.length === 20) {
        const nextAnswers = storedAnswers.map(
          (answer) => Math.max(0, Math.min(4, Math.round(answer))) as Answer,
        );
        setAnswers(nextAnswers);
      }

      const storedContext = readStoredPublicProfileContext();
      if (storedContext) {
        setDisplayNameInput(storedContext.display_name ?? "");
        if (isHomeSetup(storedContext.home_setup)) setHomeSetup(storedContext.home_setup);
        if (isWorkIntensity(storedContext.work_intensity)) setWorkIntensity(storedContext.work_intensity);
        if (isSpillover(storedContext.spillover)) setSpillover(storedContext.spillover);
        if (isPriority(storedContext.priority)) setPriority(storedContext.priority);
      }

      if (readStoredPublicProfileResult()) {
        setCurrentQuestionIndex(19);
        setPage("results");
      }
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, [isPublicFlow]);

  useEffect(() => {
    if (!isPublicFlow) return;
    writeStoredPublicProfileAnswers(answers);
  }, [answers, isPublicFlow]);

  useEffect(() => {
    if (!isPublicFlow) return;
    writeStoredPublicProfileContext(publicProfileContext);
  }, [isPublicFlow, publicProfileContext]);

  useEffect(() => {
    const supabase = getSupabase();
    if (page !== "results" || hasPersistedResultsRef.current) return;
    hasPersistedResultsRef.current = true;

    let cancelled = false;

    const persistProfile = async () => {
      if (isPublicFlow) {
        writeStoredPublicProfileAnswers(answers);
        writeStoredPublicProfileContext(publicProfileContext);
        writeStoredPublicProfileResult(publicProfileResult);
      }

      const { data, error: authError } = await supabase.auth.getSession();
      if (cancelled) return;
      if (authError || !data.session) return;

      const error = await (async () => {
        try {
          await syncPublicProfileResultToAccount(data.session, publicProfileResult);
          if (isPublicFlow) clearStoredPublicProfileData();
          return null;
        } catch (persistError) {
          return persistError;
        }
      })();

      if (cancelled) return;
      if (error) {
        console.error("Failed to upsert user_profile from onboarding:", error);
        hasPersistedResultsRef.current = false;
      }
    };

    void persistProfile();
    return () => { cancelled = true; };
  }, [
    answers,
    isPublicFlow,
    page,
    publicProfileContext,
    publicProfileResult,
  ]);

  return (
    <main className="profile-page" style={{ background: "#0B0B0E" }}>
      <div aria-hidden style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: 600, height: 300, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(194,122,92,0.08) 0%, transparent 70%)", filter: "blur(80px)", pointerEvents: "none" as const, zIndex: 0 }} />

      <div className="profile-shell" style={{ position: "relative", zIndex: 1 }}>
        <AnimatePresence mode="wait">

          {/* ── INTRO ── */}
          {page === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.28, ease: EASE }}>
              <div style={{ maxWidth: 560, margin: "0 auto", padding: "80px 24px 40px", textAlign: "center" as const }}>
                <span style={{ display: "inline-flex", padding: "5px 14px", borderRadius: 999, border: "1px solid rgba(194,122,92,0.2)", background: "rgba(194,122,92,0.07)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(194,122,92,0.85)", marginBottom: 24 }}>PRESSURE PROFILE</span>
                <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 700, letterSpacing: "-0.05em", color: "var(--text)", lineHeight: 1.05, margin: "0 0 16px" }}>Two minutes to see where pressure is landing.</h1>
                <p style={{ fontSize: 15, color: "rgba(161,161,170,0.65)", lineHeight: 1.7, maxWidth: 440, margin: "0 auto 48px" }}>
                  You will answer 20 short statements about work, recovery, home, and how you handle tension. Driftlatch uses that to show where pressure is landing and where to begin.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 480, margin: "0 auto 36px" }}>
                  <div style={{ padding: "20px 18px", background: "rgba(18,18,22,0.9)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, textAlign: "left" as const }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(161,161,170,0.4)", marginBottom: 10 }}>WHAT SHOULD WE CALL YOU? (OPTIONAL)</div>
                    <label>
                      <span className="profile-sr-only">Display name</span>
                      <input
                        type="text"
                        value={displayNameInput}
                        onChange={handleDisplayNameChange}
                        placeholder="Display name"
                        autoComplete="nickname"
                        style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 14, color: "rgba(244,244,245,0.85)", outline: "none" }}
                      />
                    </label>
                  </div>

                  <div style={{ padding: "20px 18px", background: "rgba(18,18,22,0.9)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, textAlign: "left" as const }}>
                    <span style={{ fontSize: 18, marginBottom: 8, display: "block" }} aria-hidden>🔒</span>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(244,244,245,0.85)", marginBottom: 6 }}>Private by design</div>
                    <p style={{ fontSize: 13, color: "rgba(161,161,170,0.55)", lineHeight: 1.55, margin: 0 }}>No message reading. No behavior tracking. Only what you choose to enter here.</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button type="button" onClick={() => setPage("context")} style={{ padding: "14px 36px", borderRadius: 12, fontSize: 15, fontWeight: 700, background: "linear-gradient(170deg, rgba(206,132,98,0.97), rgba(162,96,62,0.97))", border: "1px solid rgba(194,122,92,0.3)", color: "white", cursor: "pointer", boxShadow: "0 8px 32px rgba(194,122,92,0.25)" }}>Start</button>
                  <Link href="/" style={{ padding: "14px 20px", borderRadius: 12, fontSize: 14, fontWeight: 600, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(161,161,170,0.6)", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Back to site</Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── CONTEXT ── */}
          {page === "context" && (
            <motion.div key="context" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.28, ease: EASE }}>
              <div style={{ maxWidth: 640, margin: "0 auto", padding: "60px 24px" }}>
                <span style={{ display: "inline-flex", padding: "4px 12px", borderRadius: 999, border: "1px solid rgba(194,122,92,0.2)", background: "rgba(194,122,92,0.07)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(194,122,92,0.85)", marginBottom: 20 }}>CONTEXT</span>
                <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.6rem,4vw,2.2rem)", fontWeight: 700, letterSpacing: "-0.04em", color: "var(--text)", lineHeight: 1.1, margin: "0 0 8px" }}>Tell us what your life actually looks like.</h1>
                <p style={{ fontSize: 14, color: "rgba(161,161,170,0.55)", lineHeight: 1.6, margin: "0 0 36px" }}>These answers help Driftlatch choose the most useful place to start. There are no right answers.</p>

                {/* Who is at home */}
                <div style={{ position: "relative", overflow: "hidden", background: "rgba(18,18,22,0.9)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 22, padding: "22px 20px", marginBottom: 12 }}>
                  <div aria-hidden style={{ position: "absolute", top: 0, left: 16, right: 16, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)", pointerEvents: "none" as const }} />
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(161,161,170,0.4)", marginBottom: 14 }}>Who is at home with you most days?</div>
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                    {(["Partner/spouse", "Kids/family", "Partner + kids", "Long distance", "Solo"] as HomeSetup[]).map((v) => {
                      const selected = homeSetup === v;
                      return (
                        <button key={v} type="button" onClick={() => setHomeSetup(v)} style={{ padding: "9px 18px", borderRadius: 999, border: selected ? "1px solid rgba(194,122,92,0.28)" : "1px solid rgba(255,255,255,0.08)", background: selected ? "rgba(194,122,92,0.12)" : "rgba(255,255,255,0.04)", fontSize: 13, fontWeight: 500, color: selected ? "rgba(194,122,92,0.9)" : "rgba(161,161,170,0.6)", cursor: "pointer", transition: "all 0.18s ease" }}>{v}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Work intensity + spillover */}
                <div style={{ position: "relative", overflow: "hidden", background: "rgba(18,18,22,0.9)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 22, padding: "22px 20px", marginBottom: 12 }}>
                  <div aria-hidden style={{ position: "absolute", top: 0, left: 16, right: 16, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)", pointerEvents: "none" as const }} />
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(161,161,170,0.4)", marginBottom: 14 }}>How intense is work right now?</div>
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                    {(["Normal", "Busy", "Peak pressure"] as WorkIntensity[]).map((v) => {
                      const selected = workIntensity === v;
                      return (
                        <button key={v} type="button" onClick={() => setWorkIntensity(v)} style={{ padding: "9px 18px", borderRadius: 999, border: selected ? "1px solid rgba(194,122,92,0.28)" : "1px solid rgba(255,255,255,0.08)", background: selected ? "rgba(194,122,92,0.12)" : "rgba(255,255,255,0.04)", fontSize: 13, fontWeight: 500, color: selected ? "rgba(194,122,92,0.9)" : "rgba(161,161,170,0.6)", cursor: "pointer", transition: "all 0.18s ease" }}>{v}</button>
                      );
                    })}
                  </div>

                  <div style={{ height: 1, margin: "18px 0", background: "linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.12), rgba(255,255,255,0.04))" }} />

                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(161,161,170,0.4)", marginBottom: 14 }}>Where is pressure spilling over?</div>
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                    {(["Work → home", "Home → work", "Both ways"] as Spillover[]).map((v) => {
                      const selected = spillover === v;
                      return (
                        <button key={v} type="button" onClick={() => setSpillover(v)} style={{ padding: "9px 18px", borderRadius: 999, border: selected ? "1px solid rgba(194,122,92,0.28)" : "1px solid rgba(255,255,255,0.08)", background: selected ? "rgba(194,122,92,0.12)" : "rgba(255,255,255,0.04)", fontSize: 13, fontWeight: 500, color: selected ? "rgba(194,122,92,0.9)" : "rgba(161,161,170,0.6)", cursor: "pointer", transition: "all 0.18s ease" }}>{v}</button>
                      );
                    })}
                  </div>
                </div>

                {/* What to protect */}
                <div style={{ position: "relative", overflow: "hidden", background: "rgba(18,18,22,0.9)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 22, padding: "22px 20px", marginBottom: 12 }}>
                  <div aria-hidden style={{ position: "absolute", top: 0, left: 16, right: 16, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)", pointerEvents: "none" as const }} />
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(161,161,170,0.4)", marginBottom: 14 }}>What do you most want to protect?</div>
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                    {(["Clarity at work", "Closeness at home", "Both"] as Priority[]).map((v) => {
                      const selected = priority === v;
                      return (
                        <button key={v} type="button" onClick={() => setPriority(v)} style={{ padding: "9px 18px", borderRadius: 999, border: selected ? "1px solid rgba(194,122,92,0.28)" : "1px solid rgba(255,255,255,0.08)", background: selected ? "rgba(194,122,92,0.12)" : "rgba(255,255,255,0.04)", fontSize: 13, fontWeight: 500, color: selected ? "rgba(194,122,92,0.9)" : "rgba(161,161,170,0.6)", cursor: "pointer", transition: "all 0.18s ease" }}>{v}</button>
                      );
                    })}
                  </div>
                  <p style={{ margin: "12px 0 0", color: "rgba(161,161,170,0.55)", fontSize: 13, lineHeight: 1.6 }}>This helps Driftlatch choose the kind of support most likely to help first.</p>
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24 }}>
                  <button type="button" onClick={() => goToQuestion(0)} style={{ padding: "14px 36px", borderRadius: 12, fontSize: 15, fontWeight: 700, background: "linear-gradient(170deg, rgba(206,132,98,0.97), rgba(162,96,62,0.97))", border: "1px solid rgba(194,122,92,0.3)", color: "white", cursor: "pointer", boxShadow: "0 8px 32px rgba(194,122,92,0.25)" }}>Continue</button>
                  <button type="button" onClick={() => setPage("intro")} style={{ padding: "14px 20px", borderRadius: 12, fontSize: 14, fontWeight: 600, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(161,161,170,0.6)", cursor: "pointer" }}>Back</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── QUESTIONS ── */}
          {(page === "q1" || page === "q2" || page === "q3" || page === "q4") && (
            <motion.div key={page} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.28, ease: EASE }}>
              <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 24px" }}>
                {/* Overall progress bar */}
                <div style={{ width: "100%", height: 2, borderRadius: 999, background: "rgba(255,255,255,0.06)", marginBottom: 8 }}>
                  <div style={{ height: "100%", borderRadius: 999, background: "rgba(194,122,92,0.6)", width: `${totalProgressPct}%`, transition: "width 0.4s ease" }} />
                </div>

                {/* Domain progress row */}
                <div style={{ display: "flex", gap: 6, marginBottom: 40 }}>
                  {groupedProgress.map((segment) => (
                    <div key={segment.label} style={{ flex: 1, display: "grid", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase" as const,
                          color:
                            currentQuestion.domain === RESULT_DOMAIN_TO_QUESTION_DOMAIN[segment.label]
                              ? "rgba(194,122,92,0.85)"
                              : segment.value >= 100
                                ? "rgba(244,244,245,0.55)"
                                : "rgba(161,161,170,0.28)",
                          textAlign: "center" as const,
                          transition: "color 0.22s ease",
                        }}
                      >
                        {segment.label}
                      </span>
                      <div
                        style={{
                          height: 3,
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.06)",
                          overflow: "hidden",
                        }}
                      >
                        <motion.div
                          initial={false}
                          animate={{ width: `${segment.value}%` }}
                          transition={{ duration: 0.4, ease: EASE }}
                          style={{
                            height: "100%",
                            borderRadius: 999,
                            background:
                              currentQuestion.domain === RESULT_DOMAIN_TO_QUESTION_DOMAIN[segment.label]
                                ? "rgba(194,122,92,0.8)"
                                : "rgba(194,122,92,0.32)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Question card */}
                <div style={{ position: "relative", overflow: "hidden", background: "rgba(18,18,22,0.9)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 22, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", boxShadow: "0 24px 70px rgba(0,0,0,0.45)", padding: "28px 24px", marginBottom: 20 }}>
                  {/* Rim light */}
                  <div aria-hidden style={{ position: "absolute", top: 0, left: 16, right: 16, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)", pointerEvents: "none" as const }} />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    {/* Domain badge */}
                    <span style={{ display: "inline-flex", padding: "4px 12px", borderRadius: 999, border: `1px solid ${currentQuestionTone.border}`, background: currentQuestionTone.soft, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: currentQuestionTone.accent }}>{currentQuestionTone.label}</span>
                    {/* Question counter */}
                    <span style={{ fontSize: 12, color: "rgba(161,161,170,0.3)", fontWeight: 500 }}>{withinGroupIndex} OF 5</span>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div key={currentQuestionIndex} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
                      <div style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.1rem,2.5vw,1.35rem)", fontWeight: 700, letterSpacing: "-0.025em", color: "rgba(244,244,245,0.92)", lineHeight: 1.5, marginTop: 16, marginBottom: 0 }}>
                        {currentQuestion.id}. {currentQuestion.text}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Answer options */}
                <div style={{ display: "flex", gap: 8, marginTop: 28, marginBottom: 8, alignItems: "stretch" }}>
                  {SCALE.map((opt, i) => {
                    const selected = answers[currentQuestionIndex] === opt.value;
                    return (
                      <button key={opt.label} type="button" aria-label={`${i + 1}`} onClick={() => setAnswer(currentQuestionIndex, opt.value)} style={{ flex: 1, padding: "16px 8px", borderRadius: 12, textAlign: "center" as const, cursor: "pointer", transition: "all 0.18s ease", border: selected ? "1px solid rgba(194,122,92,0.3)" : "1px solid rgba(255,255,255,0.07)", background: selected ? "rgba(194,122,92,0.12)" : "rgba(255,255,255,0.03)", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 6, transform: selected ? "scale(1.04)" : "scale(1)" }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: selected ? "rgba(194,122,92,0.95)" : "rgba(244,244,245,0.7)" }}>{i + 1}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Scale labels */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: "rgba(161,161,170,0.3)", fontWeight: 500 }}>Never</span>
                  <span style={{ fontSize: 11, color: "rgba(161,161,170,0.3)", fontWeight: 500 }}>Almost always</span>
                </div>

                {/* Navigation */}
                <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24 }}>
                  {currentQuestionIndex > 0 && (
                    <button type="button" onClick={goBackQuestion} style={{ padding: "13px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(161,161,170,0.6)", cursor: "pointer" }}>Back</button>
                  )}
                  <button type="button" onClick={goNextQuestion} style={{ padding: "13px 32px", borderRadius: 10, fontSize: 15, fontWeight: 700, background: "linear-gradient(170deg, rgba(206,132,98,0.97), rgba(162,96,62,0.97))", border: "1px solid rgba(194,122,92,0.3)", color: "white", cursor: "pointer", boxShadow: "0 8px 32px rgba(194,122,92,0.25)" }}>{currentQuestionIndex === 19 ? "See my map" : "Next"}</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── RESULTS ── */}
          {page === "results" && (
            <motion.div key="results" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.28, ease: EASE }}>
            <div className="profile-stack profile-results-stack">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0 }}
                className="profile-card profile-results-hero"
              >
                <div className="profile-top-rim profile-top-rim-strong" />
                <div className="profile-results-hero-inner">
                  <span className="profile-eyebrow-pill">Pressure Profile</span>
                  <h1 className="profile-display profile-display-results">
                    {displayNameInput.trim() ? `Here's your profile, ${displayNameInput.trim()}.` : "Your Pressure Profile"}
                  </h1>
                  <p className="profile-lead profile-meta-width">
                    This profile shows where pressure is landing most often right now and where Driftlatch can help first.
                  </p>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: EASE, delay: 0.2 }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 20px",
                      borderRadius: 999,
                      border: "1px solid rgba(194,122,92,0.36)",
                      background: "linear-gradient(180deg, rgba(194,122,92,0.14) 0%, rgba(194,122,92,0.06) 100%)",
                      boxShadow: "0 12px 32px rgba(194,122,92,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
                      width: "fit-content",
                      marginTop: 8,
                    }}
                  >
                    <motion.span
                      animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        background: "rgba(194,122,92,0.95)",
                        boxShadow: "0 0 14px rgba(194,122,92,0.7)",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "rgba(244,244,245,0.92)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      Pressure lands hardest in{" "}
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.7, ease: EASE, delay: 0.55 }}
                        style={{
                          color: "rgba(220,155,122,1)",
                          fontWeight: 800,
                          textShadow: "0 0 22px rgba(194,122,92,0.4)",
                        }}
                      >
                        {groups.primaryDomain}
                      </motion.span>
                      . Driftlatch starts there.
                    </span>
                  </motion.div>
                  <p className="profile-results-summary profile-meta-width">{personalizedResultCopy.summary}</p>
                  <p className="profile-meta-copy profile-meta-width">{personalizedResultCopy.detail}</p>
                  <p className="profile-meta-copy profile-meta-width profile-meta-spaced">
                    {getGoalLine(priority, homeSetup)}
                  </p>
                  <p className="profile-meta-copy profile-meta-width">{getAttachmentStyleQualifier()}</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.18 }}
                className="profile-results-block"
              >
                <div className="profile-results-section-head">
                  <div className="profile-eyebrow">PRESSURE METERS</div>
                  <div className="profile-section-title">Where pressure is landing</div>
                </div>
                <div className="profile-meter-grid">
                  {pressureMeters.map((meter) => {
                    const tone = toneForResultDomain(meter.domain);
                    return (
                      <div
                        key={meter.domain}
                        className="profile-card profile-meter-card"
                        style={
                          {
                            "--meter-accent": tone.accent,
                            "--meter-glow": tone.mutedGlow,
                          } as CSSProperties
                        }
                      >
                        <div className="profile-meter-top">
                          <span className="profile-meter-label">{meter.domain}</span>
                          <span className="profile-meter-value">{meterPercent(meter.value)}%</span>
                        </div>
                        <div className="profile-meter-track">
                          <div className="profile-meter-fill" style={{ width: `${meterPercent(meter.value)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.36 }}
                className="profile-results-block"
              >
                <div className="profile-results-section-head">
                  <div className="profile-eyebrow">DOMAIN CARDS</div>
                  <div className="profile-section-title">How pressure is showing up</div>
                </div>
                <div className="profile-domain-grid">
                  {domainCards.map(({ copy, domain }) => {
                    const tone = toneForResultDomain(domain);
                    return (
                      <div
                        key={domain}
                        className="profile-card profile-domain-card"
                        style={
                          {
                            "--domain-glow": tone.mutedGlow,
                          } as CSSProperties
                        }
                      >
                        <div className="profile-domain-aura" />
                        <div className="profile-domain-head">
                          <div className="profile-eyebrow">{copy.label}</div>
                          <h2 className="profile-card-display">{copy.heading}</h2>
                        </div>
                        <p className="profile-meta-copy profile-card-copy">{copy.body}</p>
                        <div className="profile-soft-divider" />
                        <div className="profile-start-row">
                          <span className="profile-start-label">Start here</span>
                          <span className="profile-start-value">{copy.startHere}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: EASE, delay: 0.54 }}
                className="profile-card profile-primary-pack-card"
              >
                <div className="profile-top-rim profile-top-rim-strong" />
                <div className="profile-primary-pack-glow" />
                <div className="profile-primary-pack-content">
                  <div className="profile-eyebrow">DRIFTLATCH WILL START HERE</div>
                  <h2 className="profile-primary-pack-title">{groups.primaryPack}</h2>
                  <p className="profile-meta-copy profile-meta-width">{personalizedResultCopy.startSummary}</p>
                  <p className="profile-meta-copy profile-meta-width profile-meta-spaced">{personalizedResultCopy.startDetail}</p>
                  <div className="profile-soft-divider" />

                  {!isPublicFlow || isLoggedIn ? (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "28px 0" }} />
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                        <div>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(194,122,92,0.55)", marginBottom: 5, display: "block" }}>NEXT LAYER</span>
                          <span style={{ fontSize: 14, color: "rgba(244,244,245,0.75)", lineHeight: 1.55 }}>See how your EQ holds up under this pressure pattern.</span>
                        </div>
                        <Link
                          href="/pressure-eq"
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 999, background: "rgba(194,122,92,0.1)", border: "1px solid rgba(194,122,92,0.2)", color: "rgba(194,122,92,0.85)", fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" as const, flexShrink: 0 }}
                        >
                          4 min →
                        </Link>
                      </div>
                    </motion.div>
                  ) : null}

                  <div className="profile-actions profile-actions-wrap">
                    {isPublicFlow && !isLoggedIn ? (
                      <>
                        <Link className="profile-btn profile-btn-primary" href="/pricing">
                          See pricing →
                        </Link>
                        <Link className="profile-btn profile-btn-secondary" href="/buy?plan=annual">
                          Start annual
                        </Link>
                        <Link className="profile-btn profile-btn-secondary" href="/buy?plan=monthly">
                          Start monthly
                        </Link>
                      </>
                    ) : (
                      <Link className="profile-btn profile-btn-primary" href="/app/checkin">
                        Open your first step →
                      </Link>
                    )}
                    <button className="profile-btn profile-btn-secondary" type="button" onClick={handleRetakeProfile}>
                      Retake
                    </button>
                    <Link className="profile-btn profile-btn-secondary" href="/">
                      Back to site
                    </Link>
                  </div>
                  {isPublicFlow && !isLoggedIn ? (
                    <p className="profile-meta-copy profile-meta-spaced">
                      This result is saved in this browser until you log in or start a plan. If you return on another device first, you may need to take the profile again.
                    </p>
                  ) : null}
                  <p className="profile-meta-copy profile-meta-spaced">
                    This read is based on home looking like <span className="profile-inline-strong">{homeSetup}</span>, your main priority being{" "}
                    <span className="profile-inline-strong">{priority}</span>, work feeling <span className="profile-inline-strong">{workIntensity}</span>, and pressure moving{" "}
                    <span className="profile-inline-strong">{spillover.toLowerCase()}</span>.
                  </p>
                </div>
              </motion.div>
            </div>
            </motion.div>
          )}

          {sectionIntroFor && (
            <motion.div
              key={`section-intro-${sectionIntroFor}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32, ease: EASE }}
              onClick={() => {
                setSectionIntroFor(null);
                goToQuestion(currentQuestionIndex + 1);
              }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                background: "rgba(11,11,14,0.96)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            >
              <div style={{ textAlign: "center", padding: "0 32px", maxWidth: 440 }}>
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 36 }}>
                  {(["work", "recovery", "home", "attach"] as Question["domain"][]).map((d, i) => {
                    const currentSectionIdx = ["work", "recovery", "home", "attach"].indexOf(sectionIntroFor);
                    const isFilled = i < currentSectionIdx;
                    const isActive = i === currentSectionIdx;
                    return (
                      <span
                        key={d}
                        style={{
                          width: isActive ? 24 : 8,
                          height: 8,
                          borderRadius: 999,
                          background: isFilled || isActive ? "rgba(194,122,92,0.85)" : "rgba(255,255,255,0.12)",
                          transition: "width 0.3s ease",
                        }}
                      />
                    );
                  })}
                </div>
                <motion.div
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.12 }}
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "clamp(2.4rem, 7vw, 3.6rem)",
                    fontWeight: 600,
                    letterSpacing: "-0.04em",
                    color: "rgba(244,244,245,0.94)",
                    lineHeight: 1,
                    marginBottom: 14,
                  }}
                >
                  {SECTION_INTRO_COPY[sectionIntroFor].title}
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.32 }}
                  style={{
                    fontSize: 15,
                    color: "rgba(161,161,170,0.72)",
                    lineHeight: 1.55,
                  }}
                >
                  {SECTION_INTRO_COPY[sectionIntroFor].tagline}
                </motion.div>
              </div>
            </motion.div>
          )}

          {isRevealing && (
            <motion.div
              key="revealing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 20,
                display: "flex",
                flexDirection: "column" as const,
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(11,11,14,0.98)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }}
            >
              <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{
                      opacity: [0.25, 1, 0.25],
                      scale: [0.9, 1.15, 0.9],
                    }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      delay: i * 0.18,
                      ease: "easeInOut",
                    }}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: "rgba(194,122,92,0.85)",
                      boxShadow: "0 0 20px rgba(194,122,92,0.5)",
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(1.4rem, 4vw, 1.8rem)",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "rgba(244,244,245,0.9)",
                }}
              >
                Reading your pattern
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  color: "rgba(161,161,170,0.55)",
                }}
              >
                This takes a moment.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <style jsx>{ONBOARDING_THEME_STYLES}</style>
    </main>
  );
}
