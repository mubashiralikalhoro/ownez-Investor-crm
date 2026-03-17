import { describe, it, expect } from "vitest";
import { detectActivityType, detectOutcome } from "../smart-detection";

describe("detectActivityType", () => {
  it('detects "Called Robert, discussed returns" as call', () => {
    expect(detectActivityType("Called Robert, discussed returns")).toBe("call");
  });

  it('detects "Emailed Sandra the deck" as email', () => {
    expect(detectActivityType("Emailed Sandra the deck")).toBe("email");
  });

  it('detects "Sent email with performance data" as email', () => {
    expect(detectActivityType("Sent email with performance data")).toBe("email");
  });

  it('detects "Met with Robert at Ascension" as meeting', () => {
    expect(detectActivityType("Met with Robert at Ascension")).toBe("meeting");
  });

  it('detects "Texted David about timing" as text_message', () => {
    expect(detectActivityType("Texted David about timing")).toBe("text_message");
  });

  it('detects "LinkedIn message about the fund" as linkedin_message', () => {
    expect(detectActivityType("LinkedIn message about the fund")).toBe("linkedin_message");
  });

  it('detects "Sent deck and one-pager" as document_sent', () => {
    expect(detectActivityType("Sent deck and one-pager")).toBe("document_sent");
  });

  it('detects "Sent PPM to attorney" as document_sent', () => {
    expect(detectActivityType("Sent PPM to attorney")).toBe("document_sent");
  });

  it('detects "Received docs from attorney" as document_received', () => {
    expect(detectActivityType("Received docs from attorney")).toBe("document_received");
  });

  it('defaults "Good conversation about the market" to note', () => {
    expect(detectActivityType("Good conversation about the market")).toBe("note");
  });

  it("is case-insensitive", () => {
    expect(detectActivityType("CALLED Robert")).toBe("call");
  });
});

describe("detectOutcome", () => {
  it('detects "Called Robert, left voicemail" as attempted', () => {
    expect(detectOutcome("Called Robert, left voicemail")).toBe("attempted");
  });

  it('detects "Called, no answer" as attempted', () => {
    expect(detectOutcome("Called, no answer")).toBe("attempted");
  });

  it('detects "Emailed, no response yet" as attempted', () => {
    expect(detectOutcome("Emailed, no response yet")).toBe("attempted");
  });

  it('defaults "Called Robert, discussed returns" to connected', () => {
    expect(detectOutcome("Called Robert, discussed returns")).toBe("connected");
  });
});
