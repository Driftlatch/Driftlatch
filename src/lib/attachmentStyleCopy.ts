export type AttachmentStyleSummary = {
  label: string;
  heading: string;
  body: string;
  startHere?: string;
};

export function getAttachmentStyleExplanation() {
  return "Attachment style describes the pattern you tend to fall into when closeness feels uncertain or stress gets high. It shapes what you need from other people, how you protect yourself, and what tends to happen when you feel overwhelmed, distant, or misunderstood.";
}

export function getAttachmentStyleQualifier() {
  return "This is not a diagnosis, and it is not your whole personality. It is one useful way to understand how you tend to respond in relationships when pressure is high.";
}

export function getAttachmentStyleDisplayLabel(style: string | null | undefined) {
  if (style === "Anxious") return "Leans anxious";
  if (style === "Avoidant") return "Leans avoidant";
  if (style === "Mixed") return "Mixed / both";
  if (style === "Secure") return "Secure";
  return "Not set yet";
}

export function getAttachmentStyleSummary(style: string | null | undefined): AttachmentStyleSummary | null {
  if (style === "Anxious") {
    return {
      label: "ATTACHMENT PATTERN",
      heading: "You may lean anxious under stress",
      body:
        "When connection feels uncertain, you may feel it quickly. You may want reassurance, closeness, or some sign that things are okay. Under stress, that can show up as overthinking, urgency, or trouble settling when someone feels far away.",
      startHere: "Overthinking",
    };
  }

  if (style === "Avoidant") {
    return {
      label: "ATTACHMENT PATTERN",
      heading: "You may lean avoidant under stress",
      body:
        "When pressure rises, you may protect yourself by stepping back. Space may help you settle, but from the outside it can look like distance or withdrawal. That does not mean you care less. It means stress tends to push you toward self-protection first.",
      startHere: "Take Space",
    };
  }

  if (style === "Mixed") {
    return {
      label: "ATTACHMENT PATTERN",
      heading: "You may lean both ways under stress",
      body:
        "At times you may want closeness strongly, but also feel overwhelmed by it. That can create a push-pull pattern where you want connection and distance at the same time. Under stress, that can feel confusing and exhausting.",
      startHere: "Overthinking and Take Space",
    };
  }

  if (style === "Secure") {
    return {
      label: "ATTACHMENT PATTERN",
      heading: "Closeness may feel steadier under stress",
      body:
        "Closeness tends to feel safer and easier to manage. Stress can still affect you, but it is less likely to push you into panic, shutdown, or mixed signals.",
    };
  }

  return null;
}
