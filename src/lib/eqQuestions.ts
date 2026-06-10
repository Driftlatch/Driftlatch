// Pressure EQ assessment — static question bank
// 50 scenarios across 6 domains. Pure TypeScript. No external dependencies.

import { resolveVariant, type WorkPattern } from "@/lib/workPattern";

export type EQDomain =
  | "pressure_reading"
  | "repair_instinct"
  | "presence_quality"
  | "boundary_intel"
  | "recovery_aware"
  | "signal_accuracy";

export type SituationType =
  | "partner"
  | "kids"
  | "solo"
  | "colleague"
  | "work_home"
  | "holiday"
  | "morning"
  | "evening"
  | "weekend";

export type IntensityLevel = "low" | "medium" | "high";

export interface EQOption {
  text: string;
  // Optional per-work-pattern wording for this option. Authored in the
  // content PR — none today. Scoring always reads `scores` and never `text`,
  // so swapping `text` cannot affect domain scores.
  textVariants?: Partial<Record<WorkPattern, string>>;
  scores: Partial<Record<EQDomain, number>>;
}

export interface EQScenario {
  id: string;
  situation: string;
  primaryDomain: EQDomain;
  secondaryDomain: EQDomain;
  situationType: SituationType;
  intensity: IntensityLevel;
  requiresKids: boolean;
  requiresPartner: boolean;
  options: EQOption[];
  // Author-discipline note: a short string describing what the scenario
  // measures so future variants stay anchored to the same construct.
  // Never rendered to users, never read at runtime.
  intent?: string;
  // Optional per-work-pattern wording for the situation stem. None today.
  situationVariants?: Partial<Record<WorkPattern, string>>;
}

// ─────────────────────────────────────────────────────────────────
// QUESTION BANK
// Each option scores 1 to 4 on primaryDomain and 1 to 4 on
// secondaryDomain. Higher score = stronger expression of that domain.
// Options are not ordered best to worst. They are shuffled on display.
// No dash characters appear in any situation or option text.
// ─────────────────────────────────────────────────────────────────

export const EQ_QUESTION_BANK: EQScenario[] = [

  // ── PRESSURE READING ──────────────────────────────────────────

  {
    id: "PR-01",
    situationType: "partner",
    intensity: "medium",
    requiresKids: false,
    requiresPartner: true,
    primaryDomain: "pressure_reading",
    secondaryDomain: "boundary_intel",
    situation:
      "Your partner sends you a short message mid afternoon. Something feels off in the tone but they say everything is fine. You are in back to back meetings until 7pm. What do you actually do?",
    options: [
      {
        text: "Make a note to check in properly when free and follow through.",
        scores: { pressure_reading: 4, boundary_intel: 3 },
      },
      {
        text: "Send a quick reply asking if they are sure then focus back on work.",
        scores: { pressure_reading: 3, boundary_intel: 3 },
      },
      {
        text: "Feel a low worry in the background but you cannot do anything right now.",
        scores: { pressure_reading: 2, boundary_intel: 2 },
      },
      {
        text: "Assume you are reading into it and move on.",
        scores: { pressure_reading: 1, boundary_intel: 2 },
      },
    ],
  },

  {
    id: "PR-02",
    situationType: "kids",
    intensity: "high",
    requiresKids: true,
    requiresPartner: false,
    primaryDomain: "pressure_reading",
    secondaryDomain: "presence_quality",
    situation:
      "You get home and your child is upset about something that happened at school. You are carrying a difficult work situation. What happens in the conversation?",
    options: [
      {
        text: "You give them your full attention. Your stuff can wait.",
        scores: { pressure_reading: 4, presence_quality: 4 },
      },
      {
        text: "You listen but part of your mind is elsewhere and they can probably tell.",
        scores: { pressure_reading: 2, presence_quality: 2 },
      },
      {
        text: "You ask the right questions but feel impatient for it to resolve.",
        scores: { pressure_reading: 3, presence_quality: 2 },
      },
      {
        text: "You comfort them but do not fully land in the moment.",
        scores: { pressure_reading: 2, presence_quality: 1 },
      },
    ],
  },

  {
    id: "PR-03",
    situationType: "colleague",
    intensity: "low",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "pressure_reading",
    secondaryDomain: "repair_instinct",
    situation:
      "You are in a meeting and someone gives a short answer when they usually speak freely. No one else seems to notice. What do you do?",
    options: [
      {
        text: "Clock it and find a moment to check in with them after.",
        scores: { pressure_reading: 4, repair_instinct: 4 },
      },
      {
        text: "Notice it but wait to see if they bring something up.",
        scores: { pressure_reading: 3, repair_instinct: 2 },
      },
      {
        text: "Assume it is nothing. People have off moments.",
        scores: { pressure_reading: 1, repair_instinct: 1 },
      },
      {
        text: "Feel slightly anxious that you might have done something.",
        scores: { pressure_reading: 2, repair_instinct: 2 },
      },
    ],
  },

  {
    id: "PR-04",
    situationType: "partner",
    intensity: "high",
    requiresKids: false,
    requiresPartner: true,
    primaryDomain: "pressure_reading",
    secondaryDomain: "signal_accuracy",
    situation:
      "Your partner is quieter than usual for the third evening in a row. When you ask directly they say they are tired. You are also exhausted. What do you actually do?",
    options: [
      {
        text: "Name it gently. Something like: it seems like there might be more going on.",
        scores: { pressure_reading: 4, signal_accuracy: 4 },
      },
      {
        text: "Accept tired at face value. You are too depleted to probe.",
        scores: { pressure_reading: 2, signal_accuracy: 2 },
      },
      {
        text: "Feel torn between wanting to help and not having the capacity.",
        scores: { pressure_reading: 3, signal_accuracy: 3 },
      },
      {
        text: "Quietly wonder if it is something to do with you.",
        scores: { pressure_reading: 2, signal_accuracy: 1 },
      },
    ],
  },

  {
    id: "PR-05",
    situationType: "work_home",
    intensity: "medium",
    requiresKids: false,
    requiresPartner: true,
    primaryDomain: "pressure_reading",
    secondaryDomain: "boundary_intel",
    situation:
      "You are on a call that is running long. You can see from your phone that dinner is happening at home without you. Nobody has texted to complain. What is going on in the back of your mind?",
    options: [
      {
        text: "A low guilt that you push aside because you cannot do anything right now.",
        scores: { pressure_reading: 3, boundary_intel: 2 },
      },
      {
        text: "Nothing. This is part of the deal and everyone knows it.",
        scores: { pressure_reading: 1, boundary_intel: 1 },
      },
      {
        text: "A mental note to make it up somehow.",
        scores: { pressure_reading: 3, boundary_intel: 2 },
      },
      {
        text: "You feel the cost of it but do not fully let yourself sit with it.",
        scores: { pressure_reading: 2, boundary_intel: 2 },
      },
    ],
  },

  {
    id: "PR-06",
    situationType: "partner",
    intensity: "low",
    requiresKids: false,
    requiresPartner: true,
    primaryDomain: "pressure_reading",
    secondaryDomain: "presence_quality",
    situation:
      "Your partner seems more energised than usual tonight. Lighter. You notice but you are flat yourself. What do you do with that gap?",
    options: [
      {
        text: "Meet them where they are even if it takes some effort.",
        scores: { pressure_reading: 4, presence_quality: 4 },
      },
      {
        text: "Let them be and hope the energy is still there when you come back online.",
        scores: { pressure_reading: 3, presence_quality: 2 },
      },
      {
        text: "Feel a small relief that the room is easy tonight.",
        scores: { pressure_reading: 2, presence_quality: 2 },
      },
      {
        text: "Feel slightly disconnected. Like you are in different places.",
        scores: { pressure_reading: 2, presence_quality: 1 },
      },
    ],
  },

  {
    id: "PR-07",
    situationType: "kids",
    intensity: "low",
    requiresKids: true,
    requiresPartner: false,
    primaryDomain: "pressure_reading",
    secondaryDomain: "repair_instinct",
    situation:
      "Your child has been quieter than usual for a few days. Nothing dramatic. No obvious cause. What do you do?",
    options: [
      {
        text: "Find a low pressure moment to open a door. Not a big conversation. Just a door.",
        scores: { pressure_reading: 4, repair_instinct: 4 },
      },
      {
        text: "Watch for a bit longer before doing anything.",
        scores: { pressure_reading: 3, repair_instinct: 2 },
      },
      {
        text: "Ask directly if something is wrong.",
        scores: { pressure_reading: 3, repair_instinct: 3 },
      },
      {
        text: "Assume it is a phase and give it space to pass.",
        scores: { pressure_reading: 1, repair_instinct: 1 },
      },
    ],
  },

  {
    id: "PR-08",
    situationType: "colleague",
    intensity: "high",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "pressure_reading",
    secondaryDomain: "signal_accuracy",
    situation:
      "Someone on your team delivers something below their usual standard. When you look closer you notice they have seemed off for about a week. What was your first read of the situation?",
    options: [
      {
        text: "I noticed something was off before the work showed it.",
        scores: { pressure_reading: 4, signal_accuracy: 4 },
      },
      {
        text: "The work flagged it. I had not read the earlier signs.",
        scores: { pressure_reading: 2, signal_accuracy: 2 },
      },
      {
        text: "I assumed a rough patch with the work and did not connect it to them.",
        scores: { pressure_reading: 1, signal_accuracy: 1 },
      },
      {
        text: "I focused on the output and have not thought much about what is behind it.",
        scores: { pressure_reading: 1, signal_accuracy: 1 },
      },
    ],
  },

  {
    id: "PR-09",
    situationType: "solo",
    intensity: "high",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "pressure_reading",
    secondaryDomain: "recovery_aware",
    situation:
      "You are in back to back meetings all day running purely on momentum. You get home and someone needs something from you emotionally. What is actually available?",
    options: [
      {
        text: "Very little. I know I am empty and try to say so honestly.",
        scores: { pressure_reading: 4, recovery_aware: 4 },
      },
      {
        text: "I try to show up but I can feel myself going through the motions.",
        scores: { pressure_reading: 3, recovery_aware: 2 },
      },
      {
        text: "I give what I can and feel guilty it is not more.",
        scores: { pressure_reading: 2, recovery_aware: 2 },
      },
      {
        text: "I do not register what they need. I am too depleted to read it.",
        scores: { pressure_reading: 1, recovery_aware: 1 },
      },
    ],
  },

  // ── REPAIR INSTINCT ───────────────────────────────────────────

  {
    id: "RI-01",
    situationType: "partner",
    intensity: "medium",
    requiresKids: false,
    requiresPartner: true,
    primaryDomain: "repair_instinct",
    secondaryDomain: "signal_accuracy",
    situation:
      "You said something sharp to your partner that you did not mean. The moment passed but it is sitting between you. It is now two hours later. What do you do?",
    options: [
      {
        text: "Go back to it directly. Something like: that came out wrong, I am sorry.",
        scores: { repair_instinct: 4, signal_accuracy: 4 },
      },
      {
        text: "Wait for the right moment which keeps not quite arriving.",
        scores: { repair_instinct: 2, signal_accuracy: 2 },
      },
      {
        text: "Move on and show it through your behaviour rather than words.",
        scores: { repair_instinct: 3, signal_accuracy: 3 },
      },
      {
        text: "Feel guilty but struggle to find the opening to address it.",
        scores: { repair_instinct: 1, signal_accuracy: 2 },
      },
    ],
  },

  {
    id: "RI-02",
    situationType: "kids",
    intensity: "high",
    requiresKids: true,
    requiresPartner: false,
    primaryDomain: "repair_instinct",
    secondaryDomain: "presence_quality",
    situation:
      "Your child cried earlier after you raised your voice during a stressful moment. The evening moved on and they seemed okay. It is now bedtime. Have you actually repaired it?",
    options: [
      {
        text: "I went back to it and we talked it through before bed.",
        scores: { repair_instinct: 4, presence_quality: 4 },
      },
      {
        text: "Things felt okay again so I let it be.",
        scores: { repair_instinct: 2, presence_quality: 2 },
      },
      {
        text: "I gave them a long hug and made sure things felt warm before sleep.",
        scores: { repair_instinct: 3, presence_quality: 3 },
      },
      {
        text: "I moved on. They seemed fine.",
        scores: { repair_instinct: 1, presence_quality: 1 },
      },
    ],
  },

  {
    id: "RI-03",
    situationType: "colleague",
    intensity: "medium",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "repair_instinct",
    secondaryDomain: "boundary_intel",
    situation:
      "You cut someone short in a meeting because you were under pressure. It was not malicious but you could see it landed badly. The meeting ended and everyone moved on. Two days later it is still sitting with you. What do you do?",
    options: [
      {
        text: "I find a moment to address it directly with them.",
        scores: { repair_instinct: 4, boundary_intel: 3 },
      },
      {
        text: "I carry it but cannot find a way to bring it up without making it bigger.",
        scores: { repair_instinct: 2, boundary_intel: 2 },
      },
      {
        text: "I make a point of being warmer than usual and hope that lands.",
        scores: { repair_instinct: 3, boundary_intel: 2 },
      },
      {
        text: "I assume they have moved on and I probably should too.",
        scores: { repair_instinct: 1, boundary_intel: 1 },
      },
    ],
  },

  {
    id: "RI-04",
    situationType: "partner",
    intensity: "high",
    requiresKids: false,
    requiresPartner: true,
    primaryDomain: "repair_instinct",
    secondaryDomain: "signal_accuracy",
    situation:
      "You and your partner had a proper disagreement last week. It got resolved on the surface but something still feels unresolved underneath. They have not brought it back up. You are not sure if they have actually moved on or are waiting. What do you do?",
    options: [
      {
        text: "I check in properly. Something like: are we actually okay or is there more to say?",
        scores: { repair_instinct: 4, signal_accuracy: 4 },
      },
      {
        text: "I watch how they are with me and use that as my read.",
        scores: { repair_instinct: 3, signal_accuracy: 3 },
      },
      {
        text: "I hope time finishes what the conversation started.",
        scores: { repair_instinct: 1, signal_accuracy: 1 },
      },
      {
        text: "If they have not brought it up I take that as a sign we are fine.",
        scores: { repair_instinct: 2, signal_accuracy: 2 },
      },
    ],
  },

  {
    id: "RI-05",
    situationType: "solo",
    intensity: "low",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "repair_instinct",
    secondaryDomain: "pressure_reading",
    situation:
      "You realise mid afternoon that you sent an email this morning in a tone that was sharper than you intended. The recipient has not replied. What do you do?",
    options: [
      {
        text: "Send a follow up that softens it or acknowledges the tone.",
        scores: { repair_instinct: 4, pressure_reading: 3 },
      },
      {
        text: "Feel bad about it but assume they will interpret it charitably.",
        scores: { repair_instinct: 2, pressure_reading: 2 },
      },
      {
        text: "Wait to see if they reply and handle it from there.",
        scores: { repair_instinct: 2, pressure_reading: 3 },
      },
      {
        text: "Let it go. The content was right even if the tone was off.",
        scores: { repair_instinct: 1, pressure_reading: 1 },
      },
    ],
  },

  {
    id: "RI-06",
    situationType: "evening",
    intensity: "medium",
    requiresKids: false,
    requiresPartner: true,
    primaryDomain: "repair_instinct",
    secondaryDomain: "pressure_reading",
    situation:
      "You arrived home clearly stressed and the first twenty minutes of the evening were tense. Things calmed down but you did not acknowledge how the arrival landed. It is now after dinner. What happens?",
    options: [
      {
        text: "I go back to the arrival and name it. Something like: I came in carrying too much tonight.",
        scores: { repair_instinct: 4, pressure_reading: 4 },
      },
      {
        text: "The evening smoothed out. I leave well enough alone.",
        scores: { repair_instinct: 2, pressure_reading: 2 },
      },
      {
        text: "I am warmer than usual for the rest of the evening without naming it.",
        scores: { repair_instinct: 3, pressure_reading: 2 },
      },
      {
        text: "I did not notice anything needed addressing until this question.",
        scores: { repair_instinct: 1, pressure_reading: 1 },
      },
    ],
  },

  {
    id: "RI-07",
    situationType: "partner",
    intensity: "low",
    requiresKids: false,
    requiresPartner: true,
    primaryDomain: "repair_instinct",
    secondaryDomain: "presence_quality",
    situation:
      "You cancelled plans with your partner at short notice last week. You apologised at the time. It has not come up since but you have a sense it is still sitting there. What do you do?",
    options: [
      {
        text: "Acknowledge it properly. Not just sorry but what it cost them.",
        scores: { repair_instinct: 4, presence_quality: 4 },
      },
      {
        text: "Check in to make sure it is actually behind you.",
        scores: { repair_instinct: 3, presence_quality: 2 },
      },
      {
        text: "Create something to replace what was lost rather than dwelling on the gap.",
        scores: { repair_instinct: 3, presence_quality: 3 },
      },
      {
        text: "You said sorry at the time. That should be enough.",
        scores: { repair_instinct: 1, presence_quality: 1 },
      },
    ],
  },

  {
    id: "RI-08",
    situationType: "kids",
    intensity: "medium",
    requiresKids: true,
    requiresPartner: false,
    primaryDomain: "repair_instinct",
    secondaryDomain: "presence_quality",
    situation:
      "You were distracted during a conversation your child wanted to have yesterday. You half listened and they noticed. They have not mentioned it. What do you do with that?",
    options: [
      {
        text: "I find a moment today to come back to what they wanted to say.",
        scores: { repair_instinct: 4, presence_quality: 4 },
      },
      {
        text: "I carry a small guilt about it but have not acted on it.",
        scores: { repair_instinct: 2, presence_quality: 2 },
      },
      {
        text: "I make sure I am more present next time as a way of making it right.",
        scores: { repair_instinct: 3, presence_quality: 3 },
      },
      {
        text: "I do not think about it much. Kids move on quickly.",
        scores: { repair_instinct: 1, presence_quality: 1 },
      },
    ],
  },

  {
    id: "RI-09",
    situationType: "work_home",
    intensity: "high",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "repair_instinct",
    secondaryDomain: "signal_accuracy",
    situation:
      "You gave critical feedback to someone in a way that was accurate but harsh. The message landed hard and you could see the impact. Professionally the feedback was correct. What do you do in the hours after?",
    options: [
      {
        text: "Follow up separately to acknowledge how it was delivered.",
        scores: { repair_instinct: 4, signal_accuracy: 4 },
      },
      {
        text: "Send a follow up that is warm but does not specifically reference the delivery.",
        scores: { repair_instinct: 3, signal_accuracy: 3 },
      },
      {
        text: "Feel uncomfortable but convince yourself it was professionally appropriate.",
        scores: { repair_instinct: 2, signal_accuracy: 2 },
      },
      {
        text: "Trust that the content matters more than the delivery and leave it.",
        scores: { repair_instinct: 1, signal_accuracy: 2 },
      },
    ],
  },

  // ── PRESENCE QUALITY ──────────────────────────────────────────

  {
    id: "PQ-01",
    situationType: "evening",
    intensity: "medium",
    requiresKids: false,
    requiresPartner: true,
    primaryDomain: "presence_quality",
    secondaryDomain: "pressure_reading",
    situation:
      "You are home for dinner but your mind is still on a problem from work. Your partner is talking. You are technically in the conversation. What is actually happening?",
    options: [
      {
        text: "I am fully in the conversation. Work is work. Home is home.",
        scores: { presence_quality: 4, pressure_reading: 2 },
      },
      {
        text: "I catch myself drifting and make a deliberate effort to come back.",
        scores: { presence_quality: 3, pressure_reading: 3 },
      },
      {
        text: "I am tracking the conversation well enough but not fully in it.",
        scores: { presence_quality: 2, pressure_reading: 3 },
      },
      {
        text: "I am physically there but very little is actually landing.",
        scores: { presence_quality: 1, pressure_reading: 2 },
      },
    ],
  },

  {
    id: "PQ-02",
    situationType: "kids",
    intensity: "medium",
    requiresKids: true,
    requiresPartner: false,
    primaryDomain: "presence_quality",
    secondaryDomain: "recovery_aware",
    situation:
      "It is the weekend and your child wants to play something with you. You have thirty minutes before you need to do something else. How much of those thirty minutes are actually spent with them?",
    options: [
      {
        text: "All of it. When I am in it I am in it.",
        scores: { presence_quality: 4, recovery_aware: 3 },
      },
      {
        text: "Most of it. One or two things pull my attention briefly.",
        scores: { presence_quality: 3, recovery_aware: 2 },
      },
      {
        text: "I am there but part of me is running through the list of things to do.",
        scores: { presence_quality: 2, recovery_aware: 2 },
      },
      {
        text: "It keeps getting interrupted by things I feel I should be doing.",
        scores: { presence_quality: 1, recovery_aware: 1 },
      },
    ],
  },

  {
    id: "PQ-03",
    situationType: "partner",
    intensity: "high",
    requiresKids: false,
    requiresPartner: true,
    primaryDomain: "presence_quality",
    secondaryDomain: "repair_instinct",
    situation:
      "Your partner tells you something personal that they have been sitting on for a while. You are listening. What is actually happening in you during that conversation?",
    options: [
      {
        text: "I am fully with them. The rest drops away.",
        scores: { presence_quality: 4, repair_instinct: 4 },
      },
      {
        text: "I am listening well but part of me is already thinking about what to say.",
        scores: { presence_quality: 3, repair_instinct: 3 },
      },
      {
        text: "I stay in it but it is effortful. I am aware of the effort.",
        scores: { presence_quality: 2, repair_instinct: 2 },
      },
      {
        text: "I find myself hoping it resolves quickly so we can move on.",
        scores: { presence_quality: 1, repair_instinct: 1 },
      },
    ],
  },

  {
    id: "PQ-04",
    situationType: "weekend",
    intensity: "low",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "presence_quality",
    secondaryDomain: "recovery_aware",
    situation:
      "You have a rare free afternoon with no obligations. How easy is it to actually be in it rather than in your head about it?",
    options: [
      {
        text: "I am there pretty quickly. Free time feels genuinely restorative.",
        scores: { presence_quality: 4, recovery_aware: 4 },
      },
      {
        text: "I can settle into it. Not immediately but within the first hour.",
        scores: { presence_quality: 3, recovery_aware: 3 },
      },
      {
        text: "I enjoy it but underneath there is a low hum of something unresolved.",
        scores: { presence_quality: 2, recovery_aware: 2 },
      },
      {
        text: "I spend most of it thinking about what I should be doing instead.",
        scores: { presence_quality: 1, recovery_aware: 1 },
      },
    ],
  },

  {
    id: "PQ-05",
    situationType: "morning",
    intensity: "low",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "presence_quality",
    secondaryDomain: "boundary_intel",
    situation:
      "You are having breakfast before the day starts. How present are you in that window before the pressure picks up?",
    options: [
      {
        text: "I protect that window. It is mine and I do not let the day in early.",
        scores: { presence_quality: 4, boundary_intel: 4 },
      },
      {
        text: "I am there most mornings. Some mornings the day comes in early.",
        scores: { presence_quality: 3, boundary_intel: 3 },
      },
      {
        text: "I am partially there. The phone is usually nearby.",
        scores: { presence_quality: 2, boundary_intel: 2 },
      },
      {
        text: "My head is already in the day before I have left the house.",
        scores: { presence_quality: 1, boundary_intel: 1 },
      },
    ],
  },

  {
    id: "PQ-06",
    situationType: "holiday",
    intensity: "medium",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "presence_quality",
    secondaryDomain: "recovery_aware",
    situation:
      "You are on holiday or on a break of more than two days. How long does it take before you are actually away rather than just physically elsewhere?",
    options: [
      {
        text: "I am away pretty quickly. By day two I have landed.",
        scores: { presence_quality: 4, recovery_aware: 4 },
      },
      {
        text: "About two or three days. After that the break actually does something.",
        scores: { presence_quality: 3, recovery_aware: 3 },
      },
      {
        text: "Somewhere in the middle. I am never fully away but I do get some distance.",
        scores: { presence_quality: 2, recovery_aware: 2 },
      },
      {
        text: "It takes until the last day or two. Then it is already nearly over.",
        scores: { presence_quality: 1, recovery_aware: 1 },
      },
    ],
  },

  {
    id: "PQ-07",
    situationType: "kids",
    intensity: "high",
    requiresKids: true,
    requiresPartner: false,
    primaryDomain: "presence_quality",
    secondaryDomain: "repair_instinct",
    situation:
      "Your child is having a hard moment and needs you to just be with them without trying to fix it. How easy is that to do?",
    options: [
      {
        text: "I sit with them. I have learned that presence is usually enough.",
        scores: { presence_quality: 4, repair_instinct: 4 },
      },
      {
        text: "I can do it but I have to work against the urge to make it better.",
        scores: { presence_quality: 3, repair_instinct: 3 },
      },
      {
        text: "Genuinely hard. I want to fix things and being still does not come naturally.",
        scores: { presence_quality: 2, repair_instinct: 2 },
      },
      {
        text: "I struggle to stay in it for long. I usually end up speaking too soon.",
        scores: { presence_quality: 1, repair_instinct: 1 },
      },
    ],
  },

  {
    id: "PQ-08",
    situationType: "work_home",
    intensity: "high",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "presence_quality",
    secondaryDomain: "boundary_intel",
    situation:
      "Something significant happened at work today. You are home now. How long does it take before that thing stops running in the background of everything else?",
    options: [
      {
        text: "I have a practice for this. It works most of the time.",
        scores: { presence_quality: 4, boundary_intel: 4 },
      },
      {
        text: "It depends on the day but usually I get there within a couple of hours.",
        scores: { presence_quality: 3, boundary_intel: 3 },
      },
      {
        text: "It is there until I have dinner and then it fades a bit.",
        scores: { presence_quality: 2, boundary_intel: 2 },
      },
      {
        text: "It is with me all evening. It does not go until I am asleep.",
        scores: { presence_quality: 1, boundary_intel: 1 },
      },
    ],
  },

  // ── BOUNDARY INTEL ────────────────────────────────────────────

  {
    id: "BI-01",
    situationType: "work_home",
    intensity: "high",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "boundary_intel",
    secondaryDomain: "recovery_aware",
    situation:
      "It is 9pm on a Tuesday. You have been away from your desk for three hours. How many work related thoughts have crossed your mind since you closed your laptop?",
    options: [
      {
        text: "The laptop is closed and so is the day. Not many.",
        scores: { boundary_intel: 4, recovery_aware: 4 },
      },
      {
        text: "A handful. I worked through them and then let go.",
        scores: { boundary_intel: 3, recovery_aware: 3 },
      },
      {
        text: "A few. Nothing I acted on but they were there.",
        scores: { boundary_intel: 2, recovery_aware: 2 },
      },
      {
        text: "Enough that my partner or someone close would have noticed.",
        scores: { boundary_intel: 1, recovery_aware: 1 },
      },
    ],
  },

  {
    id: "BI-02",
    situationType: "weekend",
    intensity: "medium",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "boundary_intel",
    secondaryDomain: "presence_quality",
    situation:
      "It is Saturday morning. You have nothing formal until the afternoon. When does your first work related action happen today?",
    options: [
      {
        text: "Not until Monday. Weekends are weekends.",
        scores: { boundary_intel: 4, presence_quality: 4 },
      },
      {
        text: "I check messages once in the morning and then leave it alone.",
        scores: { boundary_intel: 3, presence_quality: 3 },
      },
      {
        text: "Mid morning usually. After coffee and some downtime.",
        scores: { boundary_intel: 2, presence_quality: 2 },
      },
      {
        text: "Within the first hour. There is usually something that cannot wait.",
        scores: { boundary_intel: 1, presence_quality: 1 },
      },
    ],
  },

  {
    id: "BI-03",
    situationType: "evening",
    intensity: "medium",
    requiresKids: false,
    requiresPartner: true,
    primaryDomain: "boundary_intel",
    secondaryDomain: "signal_accuracy",
    situation:
      "Your partner has mentioned more than once that you seem elsewhere in the evenings. What is your honest read on why?",
    options: [
      {
        text: "I have genuinely worked on this and it is mostly resolved.",
        scores: { boundary_intel: 4, signal_accuracy: 4 },
      },
      {
        text: "I know when it is happening but struggle to do much about it in the moment.",
        scores: { boundary_intel: 2, signal_accuracy: 4 },
      },
      {
        text: "I have a ritual for closing the day but it only works about half the time.",
        scores: { boundary_intel: 2, signal_accuracy: 3 },
      },
      {
        text: "Work follows me home and I have not found a reliable way to close the day.",
        scores: { boundary_intel: 1, signal_accuracy: 3 },
      },
    ],
  },

  {
    id: "BI-04",
    situationType: "solo",
    intensity: "low",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "boundary_intel",
    secondaryDomain: "recovery_aware",
    situation:
      "You finish a working day. What does your transition out of work actually look like?",
    options: [
      {
        text: "I have a deliberate practice that marks the end of work. It works.",
        scores: { boundary_intel: 4, recovery_aware: 4 },
      },
      {
        text: "I close the laptop and wait for my head to catch up. It usually does.",
        scores: { boundary_intel: 3, recovery_aware: 3 },
      },
      {
        text: "I have something I try to do but I am inconsistent with it.",
        scores: { boundary_intel: 2, recovery_aware: 2 },
      },
      {
        text: "Work ends when something else demands my attention.",
        scores: { boundary_intel: 1, recovery_aware: 1 },
      },
    ],
  },

  {
    id: "BI-05",
    situationType: "work_home",
    intensity: "high",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "boundary_intel",
    secondaryDomain: "presence_quality",
    situation:
      "You are in the middle of a family dinner and your phone lights up with something from work. What actually happens next?",
    options: [
      {
        text: "I do not check it during dinner. Whatever it is can wait.",
        scores: { boundary_intel: 4, presence_quality: 4 },
      },
      {
        text: "I check it briefly, decide it can wait, but the moment has already shifted.",
        scores: { boundary_intel: 3, presence_quality: 2 },
      },
      {
        text: "I check it. If it is important I deal with it. If not I put it away.",
        scores: { boundary_intel: 2, presence_quality: 2 },
      },
      {
        text: "I leave it face down but part of my attention goes to it.",
        scores: { boundary_intel: 2, presence_quality: 1 },
      },
    ],
  },

  {
    id: "BI-06",
    situationType: "morning",
    intensity: "low",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "boundary_intel",
    secondaryDomain: "recovery_aware",
    situation:
      "Before the working day formally starts. How much of your morning belongs to you rather than to work?",
    options: [
      {
        text: "Most of it. I protect the morning as a buffer before the day begins.",
        scores: { boundary_intel: 4, recovery_aware: 4 },
      },
      {
        text: "About half. I have routines but I also check in early most days.",
        scores: { boundary_intel: 3, recovery_aware: 3 },
      },
      {
        text: "Some of it. Work starts creeping in around an hour before I actually start.",
        scores: { boundary_intel: 2, recovery_aware: 2 },
      },
      {
        text: "The day starts when I wake up. There is no real buffer.",
        scores: { boundary_intel: 1, recovery_aware: 1 },
      },
    ],
  },

  {
    id: "BI-07",
    situationType: "holiday",
    intensity: "high",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "boundary_intel",
    secondaryDomain: "recovery_aware",
    situation:
      "You are on a week off. By day three how much have you checked or responded to work?",
    options: [
      {
        text: "Not at all. I set an out of office and I mean it.",
        scores: { boundary_intel: 4, recovery_aware: 4 },
      },
      {
        text: "Once or twice for things I genuinely could not leave. Nothing optional.",
        scores: { boundary_intel: 3, recovery_aware: 3 },
      },
      {
        text: "A few times but less than I normally would. Partial progress.",
        scores: { boundary_intel: 2, recovery_aware: 2 },
      },
      {
        text: "Daily. I tell myself it is just to stay on top of things.",
        scores: { boundary_intel: 1, recovery_aware: 1 },
      },
    ],
  },

  {
    id: "BI-08",
    situationType: "partner",
    intensity: "medium",
    requiresKids: false,
    requiresPartner: true,
    primaryDomain: "boundary_intel",
    secondaryDomain: "repair_instinct",
    situation:
      "You are planning a proper evening with your partner. Nothing formal but intentional time together. How often does something from work interrupt that?",
    options: [
      {
        text: "Rarely. I protect that time and people around me know it.",
        scores: { boundary_intel: 4, repair_instinct: 4 },
      },
      {
        text: "Occasionally. I am better than I used to be but not where I want to be.",
        scores: { boundary_intel: 3, repair_instinct: 3 },
      },
      {
        text: "Sometimes. Not every time but enough that it has been noticed.",
        scores: { boundary_intel: 2, repair_instinct: 2 },
      },
      {
        text: "Often. The evening sounds intentional but work usually finds a way in.",
        scores: { boundary_intel: 1, repair_instinct: 1 },
      },
    ],
  },

  // ── RECOVERY AWARENESS ────────────────────────────────────────

  {
    id: "RA-01",
    situationType: "solo",
    intensity: "high",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "recovery_aware",
    secondaryDomain: "boundary_intel",
    situation:
      "You have had a particularly hard week. Saturday arrives and you have most of the day to yourself. What does recovery actually look like for you?",
    options: [
      {
        text: "I have a clear sense of what restores me and I reach for it without guilt.",
        scores: { recovery_aware: 4, boundary_intel: 4 },
      },
      {
        text: "I have a rough sense of what helps. I get there eventually.",
        scores: { recovery_aware: 3, boundary_intel: 3 },
      },
      {
        text: "I know what helps but I do not always let myself do it without earning it first.",
        scores: { recovery_aware: 2, boundary_intel: 2 },
      },
      {
        text: "I fill the day with tasks. Rest feels less comfortable than doing.",
        scores: { recovery_aware: 1, boundary_intel: 1 },
      },
    ],
  },

  {
    id: "RA-02",
    situationType: "evening",
    intensity: "medium",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "recovery_aware",
    secondaryDomain: "presence_quality",
    situation:
      "You are running low and have an evening to yourself. What actually happens?",
    options: [
      {
        text: "I know exactly what I need and I usually get there within a couple of hours.",
        scores: { recovery_aware: 4, presence_quality: 4 },
      },
      {
        text: "I have a rough toolkit. Not perfect but it mostly works.",
        scores: { recovery_aware: 3, presence_quality: 3 },
      },
      {
        text: "It depends on how depleted I am. Sometimes I land. Sometimes I do not.",
        scores: { recovery_aware: 2, presence_quality: 2 },
      },
      {
        text: "I default to something that passes time rather than something that restores me.",
        scores: { recovery_aware: 1, presence_quality: 1 },
      },
    ],
  },

  {
    id: "RA-03",
    situationType: "work_home",
    intensity: "high",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "recovery_aware",
    secondaryDomain: "signal_accuracy",
    situation:
      "You have been running hard for three weeks with no real break. Your body and mind are both sending signals. What actually happens next?",
    options: [
      {
        text: "I read the signals clearly and do something deliberate about it.",
        scores: { recovery_aware: 4, signal_accuracy: 4 },
      },
      {
        text: "I make small adjustments but I do not take a proper reset.",
        scores: { recovery_aware: 2, signal_accuracy: 2 },
      },
      {
        text: "I notice but I keep going because there is no obvious moment to stop.",
        scores: { recovery_aware: 2, signal_accuracy: 3 },
      },
      {
        text: "I push through until something forces me to stop.",
        scores: { recovery_aware: 1, signal_accuracy: 1 },
      },
    ],
  },

  {
    id: "RA-04",
    situationType: "morning",
    intensity: "low",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "recovery_aware",
    secondaryDomain: "boundary_intel",
    situation:
      "You slept badly last night. How does that change what you ask of yourself today?",
    options: [
      {
        text: "I adjust the day accordingly. Not everything on the list needs to happen today.",
        scores: { recovery_aware: 4, boundary_intel: 4 },
      },
      {
        text: "I lower my expectations of myself and try not to make big decisions.",
        scores: { recovery_aware: 3, boundary_intel: 3 },
      },
      {
        text: "I push through and assume I will catch up on rest later.",
        scores: { recovery_aware: 2, boundary_intel: 2 },
      },
      {
        text: "I notice it but the day runs the same as usual.",
        scores: { recovery_aware: 1, boundary_intel: 1 },
      },
    ],
  },

  {
    id: "RA-05",
    situationType: "weekend",
    intensity: "medium",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "recovery_aware",
    secondaryDomain: "presence_quality",
    situation:
      "You notice you have not had a proper break in several weeks. What happens next?",
    options: [
      {
        text: "I schedule something that will genuinely restore me and I follow through.",
        scores: { recovery_aware: 4, presence_quality: 4 },
      },
      {
        text: "I find partial recovery here and there rather than one proper reset.",
        scores: { recovery_aware: 3, presence_quality: 3 },
      },
      {
        text: "I acknowledge it and wait for the right moment that does not quite arrive.",
        scores: { recovery_aware: 2, presence_quality: 2 },
      },
      {
        text: "I do not really notice it until it becomes a problem.",
        scores: { recovery_aware: 1, presence_quality: 1 },
      },
    ],
  },

  {
    id: "RA-06",
    situationType: "partner",
    intensity: "high",
    requiresKids: false,
    requiresPartner: true,
    primaryDomain: "recovery_aware",
    secondaryDomain: "signal_accuracy",
    situation:
      "Your partner tells you that you have not seemed like yourself lately. What is your honest first response to that?",
    options: [
      {
        text: "I already knew. I had been waiting for someone to say it.",
        scores: { recovery_aware: 4, signal_accuracy: 4 },
      },
      {
        text: "It lands as feedback I did not want but probably needed.",
        scores: { recovery_aware: 3, signal_accuracy: 3 },
      },
      {
        text: "It surprises me a little. I thought I was managing it.",
        scores: { recovery_aware: 2, signal_accuracy: 2 },
      },
      {
        text: "I deflect. I tell them I am fine and I will get some rest.",
        scores: { recovery_aware: 1, signal_accuracy: 1 },
      },
    ],
  },

  {
    id: "RA-07",
    situationType: "solo",
    intensity: "low",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "recovery_aware",
    secondaryDomain: "boundary_intel",
    situation:
      "You have an unexpected free hour in the middle of a busy day. How do you use it?",
    options: [
      {
        text: "I protect it deliberately. The body and mind need the gap.",
        scores: { recovery_aware: 4, boundary_intel: 4 },
      },
      {
        text: "I try to rest but I feel slightly guilty about it the whole time.",
        scores: { recovery_aware: 3, boundary_intel: 2 },
      },
      {
        text: "I use it to get ahead on something so the rest of the day feels lighter.",
        scores: { recovery_aware: 2, boundary_intel: 2 },
      },
      {
        text: "I fill it with work. It feels wrong to waste the gap.",
        scores: { recovery_aware: 1, boundary_intel: 1 },
      },
    ],
  },

  {
    id: "RA-08",
    situationType: "holiday",
    intensity: "high",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "recovery_aware",
    secondaryDomain: "pressure_reading",
    situation:
      "You are back from a week off. After two days at your desk how do you feel compared to how you felt when you left for the break?",
    options: [
      {
        text: "The break genuinely helped. I came back with something restored.",
        scores: { recovery_aware: 4, pressure_reading: 4 },
      },
      {
        text: "Better than before the break but not as good as I was mid holiday.",
        scores: { recovery_aware: 3, pressure_reading: 3 },
      },
      {
        text: "The reentry is its own kind of depletion. The break got cancelled out quickly.",
        scores: { recovery_aware: 2, pressure_reading: 2 },
      },
      {
        text: "About the same as before I left. The break did not quite do what it needed to.",
        scores: { recovery_aware: 1, pressure_reading: 2 },
      },
    ],
  },

  // ── SIGNAL ACCURACY ───────────────────────────────────────────

  {
    id: "SA-01",
    situationType: "solo",
    intensity: "medium",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "signal_accuracy",
    secondaryDomain: "pressure_reading",
    situation:
      "You are irritable today. When you trace it back honestly, where does it come from?",
    options: [
      {
        text: "I know exactly. I can name the thing or things causing it.",
        scores: { signal_accuracy: 4, pressure_reading: 4 },
      },
      {
        text: "I have a general sense but not a clear single source.",
        scores: { signal_accuracy: 3, pressure_reading: 3 },
      },
      {
        text: "I am not sure. It feels like a background thing with no obvious cause.",
        scores: { signal_accuracy: 2, pressure_reading: 2 },
      },
      {
        text: "I do not tend to trace it. I just wait for it to pass.",
        scores: { signal_accuracy: 1, pressure_reading: 1 },
      },
    ],
  },

  {
    id: "SA-02",
    situationType: "partner",
    intensity: "medium",
    requiresKids: false,
    requiresPartner: true,
    primaryDomain: "signal_accuracy",
    secondaryDomain: "repair_instinct",
    situation:
      "You reacted more strongly to something your partner said than the situation called for. After the fact what is your honest account of what happened?",
    options: [
      {
        text: "I knew at the time that it was not really about them. I said so.",
        scores: { signal_accuracy: 4, repair_instinct: 4 },
      },
      {
        text: "I realised after and went back to explain what was actually going on.",
        scores: { signal_accuracy: 3, repair_instinct: 4 },
      },
      {
        text: "I knew something was off about my reaction but did not address it.",
        scores: { signal_accuracy: 3, repair_instinct: 1 },
      },
      {
        text: "I did not connect it to anything else. It just felt justified in the moment.",
        scores: { signal_accuracy: 1, repair_instinct: 1 },
      },
    ],
  },

  {
    id: "SA-03",
    situationType: "colleague",
    intensity: "high",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "signal_accuracy",
    secondaryDomain: "pressure_reading",
    situation:
      "You have been reading a colleague as difficult for several weeks. Then you find out they are going through something significant in their personal life. How does this land?",
    options: [
      {
        text: "It confirms what I sensed. I knew something was off beyond just behaviour.",
        scores: { signal_accuracy: 4, pressure_reading: 4 },
      },
      {
        text: "I had wondered if there was something but had not looked further.",
        scores: { signal_accuracy: 3, pressure_reading: 3 },
      },
      {
        text: "It reframes it completely. I had not read the signals behind the behaviour.",
        scores: { signal_accuracy: 2, pressure_reading: 2 },
      },
      {
        text: "I had been taking it personally. This shifts things significantly.",
        scores: { signal_accuracy: 1, pressure_reading: 1 },
      },
    ],
  },

  {
    id: "SA-04",
    situationType: "work_home",
    intensity: "medium",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "signal_accuracy",
    secondaryDomain: "repair_instinct",
    situation:
      "You give someone feedback that you believe is fair. They respond more defensively than you expected. What is your first read of the situation?",
    options: [
      {
        text: "I check whether my delivery contributed to their response.",
        scores: { signal_accuracy: 4, repair_instinct: 4 },
      },
      {
        text: "I sit with it and wonder if I missed something.",
        scores: { signal_accuracy: 3, repair_instinct: 3 },
      },
      {
        text: "I assume they are not ready to hear it. That might also be true.",
        scores: { signal_accuracy: 2, repair_instinct: 2 },
      },
      {
        text: "I hold my ground. The feedback was correct.",
        scores: { signal_accuracy: 1, repair_instinct: 1 },
      },
    ],
  },

  {
    id: "SA-05",
    situationType: "evening",
    intensity: "low",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "signal_accuracy",
    secondaryDomain: "recovery_aware",
    situation:
      "You feel flat and low energy this evening. How accurate are you at distinguishing between physical tiredness, emotional depletion, and something sitting unresolved?",
    options: [
      {
        text: "I can usually tell the difference. Each one calls for something slightly different.",
        scores: { signal_accuracy: 4, recovery_aware: 4 },
      },
      {
        text: "I know when I am physically tired. The other two are harder to separate.",
        scores: { signal_accuracy: 3, recovery_aware: 3 },
      },
      {
        text: "I am getting better at it but I often realise the real cause too late.",
        scores: { signal_accuracy: 2, recovery_aware: 2 },
      },
      {
        text: "It all feels the same to me. I call it tired and leave it there.",
        scores: { signal_accuracy: 1, recovery_aware: 1 },
      },
    ],
  },

  {
    id: "SA-06",
    situationType: "partner",
    intensity: "high",
    requiresKids: false,
    requiresPartner: true,
    primaryDomain: "signal_accuracy",
    secondaryDomain: "boundary_intel",
    situation:
      "Your partner says you have been distant lately. Your first read is that you have just been tired. How confident are you that is the full story?",
    options: [
      {
        text: "Very confident. I know the difference when I take the time to check.",
        scores: { signal_accuracy: 4, boundary_intel: 4 },
      },
      {
        text: "Fairly confident. I track this reasonably well.",
        scores: { signal_accuracy: 3, boundary_intel: 3 },
      },
      {
        text: "Not very confident. There is probably more I have not looked at.",
        scores: { signal_accuracy: 2, boundary_intel: 2 },
      },
      {
        text: "I do not think about it at that level of detail. Tired is tired.",
        scores: { signal_accuracy: 1, boundary_intel: 1 },
      },
    ],
  },

  {
    id: "SA-07",
    situationType: "kids",
    intensity: "medium",
    requiresKids: true,
    requiresPartner: false,
    primaryDomain: "signal_accuracy",
    secondaryDomain: "pressure_reading",
    situation:
      "Your child has been testing limits this week. Before you respond how well do you read what might actually be driving the behaviour beneath the surface?",
    options: [
      {
        text: "I look for the signal behind the behaviour before I do anything.",
        scores: { signal_accuracy: 4, pressure_reading: 4 },
      },
      {
        text: "I try to. I am better at it on days when I have something in reserve.",
        scores: { signal_accuracy: 3, pressure_reading: 3 },
      },
      {
        text: "I tend to respond to the behaviour first and reflect later.",
        scores: { signal_accuracy: 2, pressure_reading: 2 },
      },
      {
        text: "I respond to what is in front of me. The analysis comes afterward if at all.",
        scores: { signal_accuracy: 1, pressure_reading: 1 },
      },
    ],
  },

  {
    id: "SA-08",
    situationType: "morning",
    intensity: "high",
    requiresKids: false,
    requiresPartner: false,
    primaryDomain: "signal_accuracy",
    secondaryDomain: "recovery_aware",
    situation:
      "You wake up with a vague sense of dread. Nothing specific. How well do you track what that feeling is pointing to?",
    options: [
      {
        text: "I sit with it. I can usually identify the source within a few minutes.",
        scores: { signal_accuracy: 4, recovery_aware: 4 },
      },
      {
        text: "I name it to myself even if I cannot fully resolve it. That helps.",
        scores: { signal_accuracy: 3, recovery_aware: 3 },
      },
      {
        text: "I notice it but I do not tend to probe. I just move into the day.",
        scores: { signal_accuracy: 2, recovery_aware: 2 },
      },
      {
        text: "I distract from it and hope it fades. It usually does eventually.",
        scores: { signal_accuracy: 1, recovery_aware: 1 },
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────
// SAMPLING
// ─────────────────────────────────────────────────────────────────

function shuffleWithConstraints(scenarios: EQScenario[]): EQScenario[] {
  let attempts = 0;
  let result = [...scenarios];

  while (attempts < 20) {
    result = result.sort(() => Math.random() - 0.5);

    const startsHard = result[0]?.intensity === "high";
    const hasAdjacent = result.some(
      (s, i) => i > 0 && result[i - 1]!.primaryDomain === s.primaryDomain,
    );

    if (!startsHard && !hasAdjacent) break;
    attempts++;
  }

  return result;
}

export function drawEQScenarios(context: {
  hasKidsContext: boolean;
  hasPartnerContext: boolean;
  attachmentStyle?: string;
  previousScenarioIds?: string[];
}): EQScenario[] {
  const { hasKidsContext, hasPartnerContext, previousScenarioIds = [] } = context;

  const available = EQ_QUESTION_BANK.filter((s) => {
    if (previousScenarioIds.includes(s.id)) return false;
    if (s.requiresKids && !hasKidsContext) return false;
    if (s.requiresPartner && !hasPartnerContext) return false;
    return true;
  });

  const domains: EQDomain[] = [
    "pressure_reading",
    "repair_instinct",
    "presence_quality",
    "boundary_intel",
    "recovery_aware",
    "signal_accuracy",
  ];

  const picked: EQScenario[] = [];
  const usedIds = new Set<string>();

  // Step 1: one scenario per domain guaranteed
  for (const domain of domains) {
    const pool = available.filter(
      (s) => s.primaryDomain === domain && !usedIds.has(s.id),
    );
    if (pool.length === 0) continue;
    const chosen = pool[Math.floor(Math.random() * pool.length)]!;
    picked.push(chosen);
    usedIds.add(chosen.id);
  }

  // Step 2: fill to 8 with remaining
  // Prioritise domains with lower coverage
  const remaining = available.filter((s) => !usedIds.has(s.id));
  while (picked.length < 8 && remaining.length > 0) {
    const idx = Math.floor(Math.random() * remaining.length);
    picked.push(remaining[idx]!);
    usedIds.add(remaining[idx]!.id);
    remaining.splice(idx, 1);
  }

  // Step 3: shuffle but never start with high intensity
  // and never put two same domain scenarios adjacent
  return shuffleWithConstraints(picked);
}

// ─────────────────────────────────────────────────────────────────
// SCORING
// ─────────────────────────────────────────────────────────────────

export function calculateEQScores(
  answers: Record<string, number>,
): Record<EQDomain, number> {
  // answers: { scenarioId: optionIndex (0–3) }

  const domainTotals: Record<EQDomain, number[]> = {
    pressure_reading: [],
    repair_instinct: [],
    presence_quality: [],
    boundary_intel: [],
    recovery_aware: [],
    signal_accuracy: [],
  };

  for (const [scenarioId, optionIndex] of Object.entries(answers)) {
    const scenario = EQ_QUESTION_BANK.find((s) => s.id === scenarioId);
    if (!scenario) continue;

    const option = scenario.options[optionIndex];
    if (!option) continue;

    for (const [domain, score] of Object.entries(option.scores)) {
      domainTotals[domain as EQDomain].push(score as number);
    }
  }

  const result = {} as Record<EQDomain, number>;
  for (const domain of Object.keys(domainTotals) as EQDomain[]) {
    const scores = domainTotals[domain];
    if (scores.length === 0) {
      result[domain] = 50;
      continue;
    }
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    result[domain] = Math.round(((avg - 1) / 3) * 100);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────
// DOMAIN HELPERS
// ─────────────────────────────────────────────────────────────────

export function getWeakestDomain(scores: Record<EQDomain, number>): EQDomain {
  return (Object.entries(scores) as [EQDomain, number][]).sort(
    (a, b) => a[1] - b[1],
  )[0]![0];
}

export function getArchetype(scores: Record<EQDomain, number>): string {
  const weakest = getWeakestDomain(scores);
  const archetypes: Record<EQDomain, string> = {
    pressure_reading: "The Carrier",
    repair_instinct: "The Avoider",
    presence_quality: "The Ghost",
    boundary_intel: "The Open Loop",
    recovery_aware: "The Runner",
    signal_accuracy: "The Reactor",
  };
  return archetypes[weakest];
}

// ─────────────────────────────────────────────────────────────────
// OPENING PARAGRAPH GENERATOR
// Fully deterministic. No AI. Lookup matrix only.
// ─────────────────────────────────────────────────────────────────

export function generateOpeningParagraph(
  scores: Record<EQDomain, number>,
  weakestDomain: EQDomain,
  _hasPartnerContext: boolean,
  _hasKidsContext: boolean,
): string {
  const paragraphs: Record<EQDomain, { high: string; medium: string; low: string }> = {
    pressure_reading: {
      high: "You read people well. Even when you are tired, something in you stays tuned in to what is happening under the surface. The people around you feel noticed. That is not a small thing.",
      medium:
        "You pick up on people when you are at your best. Under pressure your bandwidth narrows and signals that would normally reach you get missed. The gap is not about caring less. It is about having less to give.",
      low: "When you are under load, reading what others need becomes genuinely hard. Not because you do not care but because your own system is already full. The people closest to you absorb that cost most.",
    },
    repair_instinct: {
      high: "When something breaks you move toward it. Not dramatically. Just steadily. Most people in your life probably do not fully appreciate how rare that is.",
      medium:
        "You know when something needs repairing and you usually get there. The gap is in the window between knowing and doing. That window costs more than you realise over time.",
      low: "Repair is hard for you. Not because you do not care about the relationship but because the act of going back to something difficult feels costly when you are already running low. The longer you wait the harder it gets.",
    },
    presence_quality: {
      high: "You have a genuine ability to land in a moment. When you are there, people feel it. That presence is what the people who matter to you remember long after the specifics fade.",
      medium:
        "You show up. Whether you fully land is another question. There is often a gap between being in the room and being in the moment. The people closest to you can usually tell.",
      low: "Physical presence and actual presence are two different things and you know that gap well. You are often in the room while part of you is somewhere else entirely. The people around you feel that absence even when they cannot name it.",
    },
    boundary_intel: {
      high: "You have built real edges between work and the rest of your life. They are not perfect but they hold. That ability to close the day is rarer than it sounds and more valuable than most people measure.",
      medium:
        "You know where work should end. Whether it actually ends there is a different story. The background channel stays open more than you would choose if you were choosing consciously.",
      low: "Work follows you home most days. Not because you are undisciplined but because the kind of work you do does not come with clear edges. The cost lands on everything that happens after you close the laptop.",
    },
    recovery_aware: {
      high: "You know what actually restores you and you reach for it. That self knowledge is the difference between compounding pressure and breaking the cycle. Most people are still guessing.",
      medium:
        "You have a sense of what helps but you do not always reach for it. Under pressure you default to easier things that pass time rather than restore. The gap between what works and what you do is worth closing.",
      low: "Recovery is still mostly something that happens to you rather than something you do deliberately. You wait for things to ease rather than creating the conditions for them to ease. The pressure does not compound all at once. It just never fully clears.",
    },
    signal_accuracy: {
      high: "You have a clear read on the difference between what you are feeling and what is actually happening. That gap is where most people make their worst decisions. You close it faster than most.",
      medium:
        "You catch yourself after the fact more often than in the moment. You know when your internal state has rewritten a situation but usually only once you have already reacted to the version you made up.",
      low: "What you are feeling and what is actually happening in front of you get tangled. Not always. But enough that people sometimes experience a version of you that is responding to something they did not do.",
    },
  };

  const level =
    scores[weakestDomain] >= 65
      ? "high"
      : scores[weakestDomain] >= 40
        ? "medium"
        : "low";

  return paragraphs[weakestDomain][level];
}

// ─────────────────────────────────────────────────────────────────
// VARIANT RESOLUTION
// Render-time only. Returns the work-pattern-specific wording when
// one exists, otherwise the default. Scoring paths do not call
// these — they read `scenario.options[i].scores` directly.
// ─────────────────────────────────────────────────────────────────

export function resolveScenarioSituation(scenario: EQScenario, workPattern: WorkPattern | null): string {
  return resolveVariant(scenario.situation, scenario.situationVariants, workPattern);
}

export function resolveOptionText(option: EQOption, workPattern: WorkPattern | null): string {
  return resolveVariant(option.text, option.textVariants, workPattern);
}
