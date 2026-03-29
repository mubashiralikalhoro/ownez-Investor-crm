import type { ActivityType, ActivityOutcome } from "./types";

// Prefix patterns — matched first (highest confidence, text starts with trigger word)
const PREFIX_PATTERNS: { pattern: RegExp; type: ActivityType }[] = [
  { pattern: /^call(ed)?\b/i, type: "call" },
  { pattern: /^phone[d]?\b/i, type: "call" },
  { pattern: /^rang\b/i, type: "call" },
  { pattern: /^dial(ed)?\b/i, type: "call" },
  { pattern: /^spoke\b/i, type: "call" },
  { pattern: /^(left )?voicemail\b/i, type: "call" },
  { pattern: /^left vm\b/i, type: "call" },
  { pattern: /^email(ed)?\b/i, type: "email" },
  { pattern: /^sent email/i, type: "email" },
  { pattern: /^e-mail/i, type: "email" },
  { pattern: /^met (with\b)?/i, type: "meeting" },
  { pattern: /^meeting\b/i, type: "meeting" },
  { pattern: /^lunch(ed)?\b/i, type: "meeting" },
  { pattern: /^coffee\b/i, type: "meeting" },
  { pattern: /^dinner\b/i, type: "meeting" },
  { pattern: /^text(ed)?\b/i, type: "text_message" },
  { pattern: /^sms/i, type: "text_message" },
  { pattern: /^linkedin\b/i, type: "linkedin_message" },
  { pattern: /^sent deck\b/i, type: "document_sent" },
  { pattern: /^sent ppm\b/i, type: "document_sent" },
  { pattern: /^sent doc/i, type: "document_sent" },
  { pattern: /^received doc/i, type: "document_received" },
];

// Keyword patterns — matched anywhere in the text (lower confidence fallback)
const KEYWORD_PATTERNS: { pattern: RegExp; type: ActivityType }[] = [
  { pattern: /\b(call|called|phone|phoned|rang|dialed|voicemail|vm)\b/i, type: "call" },
  { pattern: /\b(email|emailed|e-mail|e-mailed)\b/i, type: "email" },
  { pattern: /\b(met with|meeting|lunch|coffee|dinner|in[- ]person)\b/i, type: "meeting" },
  { pattern: /\b(texted|text msg|sms)\b/i, type: "text_message" },
  { pattern: /\b(linkedin|li msg|li message)\b/i, type: "linkedin_message" },
  { pattern: /\b(sent deck|sent ppm|sent doc|mailed docs)\b/i, type: "document_sent" },
  { pattern: /\b(received doc|got docs|docs received)\b/i, type: "document_received" },
];

const ATTEMPTED_PATTERNS = [
  /voicemail/i,
  /no answer/i,
  /no response/i,
];

export function detectActivityType(text: string): ActivityType {
  // Try prefix patterns first (highest confidence)
  for (const { pattern, type } of PREFIX_PATTERNS) {
    if (pattern.test(text)) return type;
  }
  // Fall back to keyword matching anywhere in the text
  for (const { pattern, type } of KEYWORD_PATTERNS) {
    if (pattern.test(text)) return type;
  }
  return "note";
}

/** Outcome (connected/attempted) only applies to outreach activity types */
const OUTREACH_TYPES: ActivityType[] = ["call", "email", "text_message", "linkedin_message"];

export function hasOutcome(type: ActivityType): boolean {
  return OUTREACH_TYPES.includes(type);
}

export function detectOutcome(text: string): ActivityOutcome {
  for (const pattern of ATTEMPTED_PATTERNS) {
    if (pattern.test(text)) return "attempted";
  }
  return "connected";
}
