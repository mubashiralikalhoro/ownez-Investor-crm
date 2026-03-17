import type { ActivityType, ActivityOutcome } from "./types";

const TYPE_PATTERNS: { pattern: RegExp; type: ActivityType }[] = [
  { pattern: /^called\b/i, type: "call" },
  { pattern: /^emailed\b/i, type: "email" },
  { pattern: /^sent email\b/i, type: "email" },
  { pattern: /^met with\b/i, type: "meeting" },
  { pattern: /^texted\b/i, type: "text_message" },
  { pattern: /^linkedin\b/i, type: "linkedin_message" },
  { pattern: /^sent deck\b/i, type: "document_sent" },
  { pattern: /^sent ppm\b/i, type: "document_sent" },
  { pattern: /^sent doc/i, type: "document_sent" },
  { pattern: /^received doc/i, type: "document_received" },
];

const ATTEMPTED_PATTERNS = [
  /voicemail/i,
  /no answer/i,
  /no response/i,
];

export function detectActivityType(text: string): ActivityType {
  for (const { pattern, type } of TYPE_PATTERNS) {
    if (pattern.test(text)) return type;
  }
  return "note";
}

export function detectOutcome(text: string): ActivityOutcome {
  for (const pattern of ATTEMPTED_PATTERNS) {
    if (pattern.test(text)) return "attempted";
  }
  return "connected";
}
