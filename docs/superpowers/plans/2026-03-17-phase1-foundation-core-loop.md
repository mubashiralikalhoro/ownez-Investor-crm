# Phase 1: Foundation + Core Loop — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the foundation (Next.js scaffold, data layer, mock provider, auth) and Chad's entire daily workflow (Dashboard → Pipeline View → Person Detail with Quick Log + smart detection + Next Action prompt) as a working, demo-able CRM.

**Architecture:** Next.js App Router on Vercel. Server Components by default, Client Components only for interactive widgets (Quick Log, filters, search). Data Service Layer abstracts mock/Zoho providers via a single interface. Auth via httpOnly cookies with env-var-based user store. shadcn/ui + Tailwind CSS with Geist font, navy/gold/white design system.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Geist font, bcrypt (password hashing), jose (JWT session tokens)

**Phasing Context:** This is Phase 1 of 4. Produces a fully working CRM with mock data.
- Phase 1: Foundation + Core Loop (this plan)
- Phase 2: Leadership Dashboard + Admin Panel + Reports
- Phase 3: Mobile polish + Zoho provider prep
- Phase 4: Power Features — create prospect form, inline pipeline actions, Last Viewed bar, pins, keyboard shortcuts, momentum line, Today/Tomorrow/This Week toggle, "New" badge

**Reference files:**
- `DESIGN-SPEC.md` — full specification (source of truth)
- `reference.jsx` — original React prototype with all mock data
- `CLAUDE.md` — project conventions

---

## File Structure

```
├── app/
│   ├── layout.tsx                    # Root layout: Geist font, sidebar nav, auth gate
│   ├── page.tsx                      # Dashboard (Server Component, data fetching)
│   ├── pipeline/
│   │   └── page.tsx                  # Pipeline View (Server Component)
│   ├── person/
│   │   └── [id]/
│   │       └── page.tsx              # Person Detail (Server Component)
│   ├── people/
│   │   └── page.tsx                  # People Directory (Server Component)
│   ├── login/
│   │   └── page.tsx                  # Login page
│   ├── api/
│   │   └── auth/
│   │       └── login/
│   │           └── route.ts          # Login API route
│   │       └── logout/
│   │           └── route.ts          # Logout API route
│   │   └── activities/
│   │       └── route.ts              # Create activity API
│   │   └── persons/
│   │       └── [id]/
│   │           └── route.ts          # Update person API
│   │           └── next-action/
│   │               └── route.ts      # Update next action API
│   │           └── stage/
│   │               └── route.ts      # Change stage API
│   ├── globals.css                   # Tailwind + design tokens
│
├── components/
│   ├── sidebar.tsx                   # Desktop nav sidebar
│   ├── dashboard/
│   │   ├── stats-bar.tsx             # 4 stat cards
│   │   ├── todays-actions.tsx        # Today's Actions list
│   │   ├── needs-attention.tsx       # Needs Attention panel
│   │   └── recent-activity.tsx       # Recent Activity feed (collapsed)
│   ├── pipeline/
│   │   ├── pipeline-table.tsx        # Sortable table with filters
│   │   ├── pipeline-filters.tsx      # Stage, source, stale, rep filters
│   │   └── pipeline-row.tsx          # Single row component
│   ├── person/
│   │   ├── cockpit.tsx               # Fixed top zone (identity, next action, snapshot, quick log)
│   │   ├── identity-bar.tsx          # Name, org, stage badge, phone/email actions
│   │   ├── next-action-bar.tsx       # Editable next action with date quick-picks
│   │   ├── recent-snapshot.tsx       # Last 3 activities compact
│   │   ├── quick-log.tsx             # Quick Log input with smart detection
│   │   ├── next-action-prompt.tsx    # Post-activity Next Action prompt
│   │   ├── activity-timeline.tsx     # Full timeline with filters
│   │   ├── activity-entry.tsx        # Single timeline entry
│   │   ├── stage-bar.tsx             # 9-step progression bar
│   │   ├── detail-zone.tsx           # Scrollable lower section container
│   │   ├── organization-section.tsx  # Org with autocomplete
│   │   ├── funding-entities.tsx      # Entities panel
│   │   ├── related-contacts.tsx      # Related contacts panel
│   │   ├── referrer-section.tsx      # Referrer field
│   │   ├── background-notes.tsx      # Collapsible notes
│   │   └── prospect-fields.tsx       # Editable fields section
│   ├── ui/
│   │   ├── date-quick-pick.tsx       # Date chip selector (Today, Tomorrow, +3d, Mon, Fri, +1w, +2w)
│   │   ├── autocomplete.tsx          # Autocomplete-or-create generic component
│   │   ├── search-bar.tsx            # Global search component
│   │   ├── currency-display.tsx      # Dollar formatting with K/M abbreviation
│   │   └── stale-indicator.tsx       # Red dot + styling for stale/overdue
│
├── lib/
│   ├── data.ts                       # Data Service Layer — provider switcher
│   ├── types.ts                      # All TypeScript types/interfaces
│   ├── providers/
│   │   └── mock.ts                   # Mock provider with all sample data
│   ├── auth.ts                       # Auth utilities (verify session, get user)
│   ├── smart-detection.ts            # Activity type + outcome prefix detection
│   ├── stale.ts                      # Stale flag + days idle computation
│   ├── format.ts                     # Currency formatting, date helpers
│   └── constants.ts                  # Pipeline stages, picklist values, thresholds
│
├── middleware.ts                      # Auth middleware — redirect to /login if no session
```

---

## Task 1: Project Scaffold + Design Tokens

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`
- Create: `app/layout.tsx`, `app/globals.css`, `app/page.tsx`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd "c:/Users/erezg/Documents/OwnEZ CRM"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack
```

Accept defaults. This scaffolds the project with App Router and Tailwind.

- [ ] **Step 2: Install core dependencies**

```bash
npm install geist bcryptjs jose
npm install -D @types/bcryptjs
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

Select: New York style, Zinc base color, CSS variables: yes. This creates `components/ui/` and `lib/utils.ts`.

- [ ] **Step 4: Add shadcn components we'll need**

```bash
npx shadcn@latest add button badge card dialog dropdown-menu input label select separator sheet table tabs tooltip scroll-area
```

- [ ] **Step 5: Set up design tokens in globals.css**

Replace `app/globals.css` with the OwnEZ design system:

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);

  /* OwnEZ Brand */
  --color-navy: #0b2049;
  --color-navy-light: #122d5c;
  --color-gold: #e8ba30;
  --color-gold-hover: #d4a820;
  --color-gold-light: #fdf6e3;
  --color-alert-red: #ef4444;
  --color-alert-red-light: #fef2f2;
  --color-healthy-green: #22c55e;
  --color-healthy-green-light: #f0fdf4;

  /* Activity type colors */
  --color-activity-email: #3b82f6;
  --color-activity-call: #10b981;
  --color-activity-meeting: #8b5cf6;
  --color-activity-note: #f59e0b;
  --color-activity-stage: #6b7280;
  --color-activity-doc: #8b5cf6;
  --color-activity-text: #06b6d4;
  --color-activity-linkedin: #0a66c2;
  --color-activity-whatsapp: #25d366;

  --radius-pill: 9999px;
}

:root {
  --background: #fafafa;
  --foreground: #0b2049;
}

/* Tabular numbers for dollar columns */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 6: Set up root layout with Geist font and basic structure**

Replace `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "OwnEZ CRM",
  description: "OwnEZ Capital Investor Pipeline",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Replace app/page.tsx with placeholder**

```tsx
export default function DashboardPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <h1 className="text-2xl font-semibold text-navy">OwnEZ CRM</h1>
    </div>
  );
}
```

- [ ] **Step 8: Verify dev server starts**

```bash
npm run dev
```

Expected: Dev server starts on localhost:3000, shows "OwnEZ CRM" centered.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind, shadcn/ui, Geist font, OwnEZ design tokens"
```

---

## Task 2: TypeScript Types + Constants

**Files:**
- Create: `lib/types.ts`
- Create: `lib/constants.ts`

- [ ] **Step 1: Define all TypeScript types**

Create `lib/types.ts`:

```typescript
// ─── Core Entities ───

export type PersonRole = "prospect" | "referrer" | "related_contact" | "funded_investor";

export type PipelineStage =
  | "prospect"
  | "initial_contact"
  | "discovery"
  | "pitch"
  | "active_engagement"
  | "soft_commit"
  | "commitment_processing"
  | "kyc_docs"
  | "funded"
  | "nurture"
  | "dead";

export type NextActionType =
  | "follow_up"
  | "schedule_meeting"
  | "send_document"
  | "request_info"
  | "make_introduction"
  | "internal_review"
  | "other";

export type LeadSource =
  | "velocis_network"
  | "cpa_referral"
  | "legacy_event"
  | "linkedin"
  | "ken_dbj_list"
  | "ken_event_followup"
  | "tolleson_wm"
  | "ma_attorney"
  | "cold_outreach"
  | "other";

export type ActivityType =
  | "call"
  | "email"
  | "meeting"
  | "note"
  | "text_message"
  | "linkedin_message"
  | "whatsapp"
  | "stage_change"
  | "document_sent"
  | "document_received"
  | "reassignment";

export type ActivitySource = "manual" | "zoho_telephony" | "o365_sync";
export type ActivityOutcome = "connected" | "attempted";

export type EntityType = "llc" | "llp" | "trust" | "individual" | "corporation" | "other";
export type EntityStatus = "active" | "pending_setup" | "inactive";
export type InvestmentTrack = "maintain" | "grow";
export type LostReason = "not_accredited" | "not_interested" | "ghosted" | "timing" | "went_elsewhere" | "other";
export type OrgType = "family_office" | "wealth_management" | "corporate" | "individual_none";
export type ContactType = "cpa" | "attorney" | "wealth_advisor" | "spouse" | "existing_investor" | "other";
export type UserRole = "rep" | "marketing" | "admin";

// ─── Data Models ───

export interface Person {
  id: string;
  fullName: string;
  createdDate: string; // ISO date
  email: string | null;
  phone: string | null;
  organizationId: string | null;
  roles: PersonRole[];

  // Prospect fields (present when roles includes "prospect")
  pipelineStage: PipelineStage | null;
  stageChangedDate: string | null; // ISO date
  initialInvestmentTarget: number | null;
  growthTarget: number | null;
  committedAmount: number | null;
  commitmentDate: string | null; // ISO date, auto-set
  nextActionType: NextActionType | null;
  nextActionDetail: string | null;
  nextActionDate: string | null; // ISO date
  leadSource: LeadSource | null;
  assignedRepId: string | null;
  collaboratorIds: string[];
  notes: string | null;
  lostReason: LostReason | null;
  reengageDate: string | null; // ISO date

  // External contact fields
  contactType: ContactType | null;
  contactCompany: string | null;
}

export interface Organization {
  id: string;
  name: string;
  type: OrgType | null;
  notes: string | null;
}

export interface FundingEntity {
  id: string;
  entityName: string;
  entityType: EntityType;
  personId: string;
  status: EntityStatus;
  einTaxId: string | null;
  notes: string | null;
}

export interface Activity {
  id: string;
  personId: string;
  activityType: ActivityType;
  source: ActivitySource;
  date: string; // ISO date
  time: string | null; // HH:MM
  outcome: ActivityOutcome;
  detail: string;
  documentsAttached: string[]; // file names
  loggedById: string;
  annotation: string | null;
}

export interface FundedInvestment {
  id: string;
  fundingEntityId: string;
  personId: string;
  amountInvested: number;
  investmentDate: string; // ISO date
  track: InvestmentTrack;
  growthTarget: number | null;
  nextCheckInDate: string; // ISO date
  notes: string | null;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

// ─── Relationship Links ───

export interface ReferrerLink {
  prospectId: string;
  referrerId: string;
}

export interface RelatedContactLink {
  prospectId: string;
  contactId: string;
  role: string; // "CPA — managing entity structure"
}

// ─── Computed / View Models ───

export interface PersonWithComputed extends Person {
  organizationName: string | null;
  assignedRepName: string | null;
  daysSinceLastTouch: number | null;
  isStale: boolean;
  isOverdue: boolean;
  activityCount: number;
  referrerName: string | null;
}

// ─── Dashboard Stats ───

export interface DashboardStats {
  activePipelineCount: number;
  pipelineValue: number;
  committedValue: number;
  fundedYTD: number;
}

export interface TodaysMomentum {
  activitiesLogged: number;
  stagesAdvanced: number;
  prospectsAdded: number;
}

// ─── Data Service Interface ───

export interface PeopleFilters {
  roles?: PersonRole[];
  pipelineStages?: PipelineStage[];
  leadSources?: LeadSource[];
  assignedRepId?: string;
  staleOnly?: boolean;
  search?: string;
}

export interface ActivityFilters {
  activityTypes?: ActivityType[];
  dateFrom?: string;
  dateTo?: string;
}

export interface RecentActivityFilters {
  repId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

- [ ] **Step 2: Define constants**

Create `lib/constants.ts`:

```typescript
import type { PipelineStage, NextActionType, LeadSource, ActivityType } from "./types";

export const PIPELINE_STAGES: {
  key: PipelineStage;
  label: string;
  idleThreshold: number | null;
  hasStaleAlert: boolean;
  order: number;
}[] = [
  { key: "prospect", label: "Prospect", idleThreshold: 10, hasStaleAlert: true, order: 1 },
  { key: "initial_contact", label: "Initial Contact", idleThreshold: 5, hasStaleAlert: true, order: 2 },
  { key: "discovery", label: "Discovery", idleThreshold: 5, hasStaleAlert: true, order: 3 },
  { key: "pitch", label: "Pitch", idleThreshold: 7, hasStaleAlert: true, order: 4 },
  { key: "active_engagement", label: "Active Engagement", idleThreshold: 14, hasStaleAlert: true, order: 5 },
  { key: "soft_commit", label: "Soft Commit", idleThreshold: 5, hasStaleAlert: true, order: 6 },
  { key: "commitment_processing", label: "Commitment Processing", idleThreshold: 5, hasStaleAlert: true, order: 7 },
  { key: "kyc_docs", label: "KYC / Docs", idleThreshold: 3, hasStaleAlert: true, order: 8 },
  { key: "funded", label: "Funded", idleThreshold: null, hasStaleAlert: false, order: 9 },
  { key: "nurture", label: "Nurture", idleThreshold: null, hasStaleAlert: false, order: 10 },
  { key: "dead", label: "Dead / Lost", idleThreshold: null, hasStaleAlert: false, order: 11 },
];

/** Only the 9 active stages shown in the progression bar (excludes Nurture + Dead) */
export const ACTIVE_STAGES = PIPELINE_STAGES.filter(
  (s) => s.key !== "nurture" && s.key !== "dead"
);

/** Stages that contribute to "Committed" total */
export const COMMITTED_STAGES: PipelineStage[] = [
  "soft_commit",
  "commitment_processing",
  "kyc_docs",
];

/** Activity types that count as "real touches" for Days Since Last Touch */
export const TOUCH_ACTIVITY_TYPES: ActivityType[] = [
  "call",
  "email",
  "meeting",
  "note",
  "text_message",
  "linkedin_message",
  "whatsapp",
  "document_sent",
  "document_received",
];

export const NEXT_ACTION_TYPES: { key: NextActionType; label: string }[] = [
  { key: "follow_up", label: "Follow Up" },
  { key: "schedule_meeting", label: "Schedule Meeting" },
  { key: "send_document", label: "Send Document" },
  { key: "request_info", label: "Request Info" },
  { key: "make_introduction", label: "Make Introduction" },
  { key: "internal_review", label: "Internal Review" },
  { key: "other", label: "Other" },
];

export const LEAD_SOURCES: { key: LeadSource; label: string }[] = [
  { key: "velocis_network", label: "Velocis Network" },
  { key: "cpa_referral", label: "CPA Referral" },
  { key: "legacy_event", label: "Legacy Event" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "ken_dbj_list", label: "Ken — DBJ List" },
  { key: "ken_event_followup", label: "Ken — Event Follow-up" },
  { key: "tolleson_wm", label: "Tolleson WM" },
  { key: "ma_attorney", label: "M&A Attorney" },
  { key: "cold_outreach", label: "Cold Outreach" },
  { key: "other", label: "Other" },
];

export const ACTIVITY_TYPES: { key: ActivityType; label: string; icon: string; color: string }[] = [
  { key: "call", label: "Call", icon: "📞", color: "var(--color-activity-call)" },
  { key: "email", label: "Email", icon: "✉️", color: "var(--color-activity-email)" },
  { key: "meeting", label: "Meeting", icon: "🤝", color: "var(--color-activity-meeting)" },
  { key: "note", label: "Note", icon: "📝", color: "var(--color-activity-note)" },
  { key: "text_message", label: "Text", icon: "💬", color: "var(--color-activity-text)" },
  { key: "linkedin_message", label: "LinkedIn", icon: "💼", color: "var(--color-activity-linkedin)" },
  { key: "whatsapp", label: "WhatsApp", icon: "📱", color: "var(--color-activity-whatsapp)" },
  { key: "stage_change", label: "Stage Change", icon: "➡️", color: "var(--color-activity-stage)" },
  { key: "document_sent", label: "Doc Sent", icon: "📎", color: "var(--color-activity-doc)" },
  { key: "document_received", label: "Doc Received", icon: "📎", color: "var(--color-activity-doc)" },
  { key: "reassignment", label: "Reassignment", icon: "🔄", color: "var(--color-activity-stage)" },
];

export const TIMEZONE = "America/Chicago"; // Central Time
```

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts lib/constants.ts
git commit -m "feat: add TypeScript types and constants for all data models, pipeline stages, picklists"
```

---

## Task 3: Utility Functions (Stale Logic, Formatting, Smart Detection)

**Files:**
- Create: `lib/stale.ts`
- Create: `lib/format.ts`
- Create: `lib/smart-detection.ts`

- [ ] **Step 1: Write tests for stale flag computation**

Create `lib/__tests__/stale.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeDaysSinceLastTouch, computeIsStale, computeIsOverdue } from "../stale";
import type { Activity } from "../types";

const makeActivity = (date: string, type: string = "call"): Activity => ({
  id: "a1",
  personId: "p1",
  activityType: type as any,
  source: "manual",
  date,
  time: null,
  outcome: "connected",
  detail: "test",
  documentsAttached: [],
  loggedById: "u1",
  annotation: null,
});

describe("computeDaysSinceLastTouch", () => {
  it("returns null when no activities", () => {
    expect(computeDaysSinceLastTouch([], "2026-03-17")).toBeNull();
  });

  it("excludes stage_change activities", () => {
    const activities = [makeActivity("2026-03-17", "stage_change")];
    expect(computeDaysSinceLastTouch(activities, "2026-03-17")).toBeNull();
  });

  it("excludes reassignment activities", () => {
    const activities = [makeActivity("2026-03-17", "reassignment")];
    expect(computeDaysSinceLastTouch(activities, "2026-03-17")).toBeNull();
  });

  it("computes days from most recent real touch", () => {
    const activities = [
      makeActivity("2026-03-10", "call"),
      makeActivity("2026-03-15", "email"),
      makeActivity("2026-03-17", "stage_change"), // excluded
    ];
    expect(computeDaysSinceLastTouch(activities, "2026-03-17")).toBe(2);
  });
});

describe("computeIsStale", () => {
  it("returns false for nurture stage", () => {
    expect(computeIsStale("nurture", 30, null, "2026-03-17")).toBe(false);
  });

  it("returns false when idle days below threshold", () => {
    expect(computeIsStale("prospect", 5, null, "2026-03-17")).toBe(false);
  });

  it("returns true when idle days exceed threshold and no future next action", () => {
    expect(computeIsStale("prospect", 12, null, "2026-03-17")).toBe(true);
  });

  it("returns false when future next action date suppresses stale", () => {
    expect(computeIsStale("prospect", 12, "2026-03-20", "2026-03-17")).toBe(false);
  });

  it("returns true when next action date is past", () => {
    expect(computeIsStale("prospect", 12, "2026-03-15", "2026-03-17")).toBe(true);
  });
});

describe("computeIsOverdue", () => {
  it("returns true when next action date is before today", () => {
    expect(computeIsOverdue("2026-03-15", "active_engagement", "2026-03-17")).toBe(true);
  });

  it("returns false when next action date is today", () => {
    expect(computeIsOverdue("2026-03-17", "active_engagement", "2026-03-17")).toBe(false);
  });

  it("returns false for dead stage", () => {
    expect(computeIsOverdue("2026-03-15", "dead", "2026-03-17")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/__tests__/stale.test.ts
```

Expected: FAIL — modules not found.

Note: If vitest is not installed, run `npm install -D vitest` first.

- [ ] **Step 3: Implement stale computation**

Create `lib/stale.ts`:

```typescript
import type { Activity, PipelineStage } from "./types";
import { PIPELINE_STAGES, TOUCH_ACTIVITY_TYPES } from "./constants";

/**
 * Compute days since most recent real interaction.
 * Excludes stage_change and reassignment — those are audit trail, not engagement.
 */
export function computeDaysSinceLastTouch(
  activities: Activity[],
  todayISO: string
): number | null {
  const touches = activities.filter((a) =>
    TOUCH_ACTIVITY_TYPES.includes(a.activityType)
  );
  if (touches.length === 0) return null;

  const sorted = touches.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const lastDate = new Date(sorted[0].date);
  const today = new Date(todayISO);
  const diffMs = today.getTime() - lastDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Stale flag: daysIdle >= stageThreshold AND
 * (nextActionDate IS NULL OR nextActionDate <= today) AND
 * stage is active (not Nurture/Dead/Funded)
 */
export function computeIsStale(
  stage: PipelineStage,
  daysIdle: number | null,
  nextActionDate: string | null,
  todayISO: string
): boolean {
  if (["nurture", "dead", "funded"].includes(stage)) return false;
  if (daysIdle === null) return false;

  const stageConfig = PIPELINE_STAGES.find((s) => s.key === stage);
  if (!stageConfig?.idleThreshold) return false;
  if (daysIdle < stageConfig.idleThreshold) return false;

  // Future next action date suppresses stale flag
  if (nextActionDate && nextActionDate > todayISO) return false;

  return true;
}

/**
 * Overdue: nextActionDate < today AND stage is active
 */
export function computeIsOverdue(
  nextActionDate: string | null,
  stage: PipelineStage,
  todayISO: string
): boolean {
  if (!nextActionDate) return false;
  if (["dead", "funded"].includes(stage)) return false;
  return nextActionDate < todayISO;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/__tests__/stale.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Write smart detection tests**

Create `lib/__tests__/smart-detection.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { detectActivityType, detectOutcome } from "../smart-detection";

describe("detectActivityType", () => {
  it("detects call from 'Called Robert...'", () => {
    expect(detectActivityType("Called Robert, discussed returns")).toBe("call");
  });

  it("detects email from 'Emailed Sandra...'", () => {
    expect(detectActivityType("Emailed Sandra the deck")).toBe("email");
  });

  it("detects email from 'Sent email...'", () => {
    expect(detectActivityType("Sent email with performance data")).toBe("email");
  });

  it("detects meeting from 'Met with...'", () => {
    expect(detectActivityType("Met with Robert at Ascension")).toBe("meeting");
  });

  it("detects text from 'Texted...'", () => {
    expect(detectActivityType("Texted David about timing")).toBe("text_message");
  });

  it("detects linkedin from 'LinkedIn message...'", () => {
    expect(detectActivityType("LinkedIn message about the fund")).toBe("linkedin_message");
  });

  it("detects document_sent from 'Sent deck...'", () => {
    expect(detectActivityType("Sent deck and one-pager")).toBe("document_sent");
  });

  it("detects document_sent from 'Sent PPM...'", () => {
    expect(detectActivityType("Sent PPM to attorney")).toBe("document_sent");
  });

  it("detects document_received from 'Received docs...'", () => {
    expect(detectActivityType("Received docs from attorney")).toBe("document_received");
  });

  it("defaults to note for unrecognized text", () => {
    expect(detectActivityType("Good conversation about the market")).toBe("note");
  });

  it("is case-insensitive", () => {
    expect(detectActivityType("CALLED Robert")).toBe("call");
  });
});

describe("detectOutcome", () => {
  it("detects attempted from 'voicemail'", () => {
    expect(detectOutcome("Called Robert, left voicemail")).toBe("attempted");
  });

  it("detects attempted from 'no answer'", () => {
    expect(detectOutcome("Called, no answer")).toBe("attempted");
  });

  it("detects attempted from 'no response'", () => {
    expect(detectOutcome("Emailed, no response yet")).toBe("attempted");
  });

  it("defaults to connected", () => {
    expect(detectOutcome("Called Robert, discussed returns")).toBe("connected");
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

```bash
npx vitest run lib/__tests__/smart-detection.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 7: Implement smart detection**

Create `lib/smart-detection.ts`:

```typescript
import type { ActivityType, ActivityOutcome } from "./types";

const TYPE_PATTERNS: { pattern: RegExp; type: ActivityType }[] = [
  { pattern: /^(called|spoke with|spoke to|phone call)/i, type: "call" },
  { pattern: /^(emailed|sent email|email to|forwarded)/i, type: "email" },
  { pattern: /^(met with|meeting|lunch|coffee|breakfast|dinner|zoom call)/i, type: "meeting" },
  { pattern: /^(texted|text message|sms)/i, type: "text_message" },
  { pattern: /^(linkedin|dm'd|dm to|inmail)/i, type: "linkedin_message" },
  { pattern: /^(whatsapp|wa message)/i, type: "whatsapp" },
  { pattern: /^(sent deck|sent ppm|sent doc|sent one-pager|sent presentation|sent case study|sent report)/i, type: "document_sent" },
  { pattern: /^(received doc|received form|got docs|docs received)/i, type: "document_received" },
];

const ATTEMPTED_PATTERNS = [
  /voicemail/i,
  /no answer/i,
  /didn'?t pick up/i,
  /left message/i,
  /no response/i,
  /no reply/i,
  /no\s*show/i,
];

/**
 * Auto-detect activity type from the first words of the log text.
 * Returns "note" if no pattern matches.
 */
export function detectActivityType(text: string): ActivityType {
  const trimmed = text.trim();
  for (const { pattern, type } of TYPE_PATTERNS) {
    if (pattern.test(trimmed)) return type;
  }
  return "note";
}

/**
 * Auto-detect outcome based on keywords in the log text.
 * Returns "connected" by default, "attempted" if keywords found.
 */
export function detectOutcome(text: string): ActivityOutcome {
  for (const pattern of ATTEMPTED_PATTERNS) {
    if (pattern.test(text)) return "attempted";
  }
  return "connected";
}
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
npx vitest run lib/__tests__/smart-detection.test.ts
```

Expected: All tests PASS.

- [ ] **Step 9: Create formatting utilities**

Create `lib/format.ts`:

```typescript
import { TIMEZONE } from "./constants";

/**
 * Format currency with K/M abbreviation.
 * $1,500,000 → "$1.5M", $250,000 → "$250K", $500 → "$500"
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

/**
 * Get today's date in ISO format (YYYY-MM-DD) in Central Time.
 */
export function getTodayCT(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

/**
 * Format an ISO date string for display: "Feb 25, 2026"
 */
export function formatDate(isoDate: string | null): string {
  if (!isoDate) return "—";
  const date = new Date(isoDate + "T12:00:00"); // noon to avoid timezone shifts
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: TIMEZONE,
  });
}

/**
 * Format a date relative to today: "Today", "Tomorrow", "Mar 5", "Overdue (3d)"
 */
export function formatRelativeDate(isoDate: string | null, todayISO: string): string {
  if (!isoDate) return "—";

  const today = new Date(todayISO + "T12:00:00");
  const target = new Date(isoDate + "T12:00:00");
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 0) return `Overdue (${Math.abs(diffDays)}d)`;
  if (diffDays <= 7) return `In ${diffDays}d`;
  return formatDate(isoDate);
}

/**
 * Compute a date offset from today: "+3d", "+1w", "next monday", etc.
 */
export function computeDateOffset(
  offset: "today" | "tomorrow" | "+3d" | "next_mon" | "next_fri" | "+1w" | "+2w",
  todayISO: string
): string {
  const d = new Date(todayISO + "T12:00:00");

  switch (offset) {
    case "today":
      break;
    case "tomorrow":
      d.setDate(d.getDate() + 1);
      break;
    case "+3d":
      d.setDate(d.getDate() + 3);
      break;
    case "next_mon": {
      const daysUntilMon = ((1 - d.getDay() + 7) % 7) || 7;
      d.setDate(d.getDate() + daysUntilMon);
      break;
    }
    case "next_fri": {
      const daysUntilFri = ((5 - d.getDay() + 7) % 7) || 7;
      d.setDate(d.getDate() + daysUntilFri);
      break;
    }
    case "+1w":
      d.setDate(d.getDate() + 7);
      break;
    case "+2w":
      d.setDate(d.getDate() + 14);
      break;
  }

  return d.toISOString().split("T")[0];
}
```

- [ ] **Step 10: Commit**

```bash
git add lib/stale.ts lib/format.ts lib/smart-detection.ts lib/__tests__/
git commit -m "feat: add stale flag computation, smart activity detection, currency/date formatting with tests"
```

---

## Task 4: Data Service Layer + Mock Provider

**Files:**
- Create: `lib/data.ts`
- Create: `lib/providers/mock.ts`

- [ ] **Step 1: Create the Data Service interface**

Create `lib/data.ts`:

```typescript
import type {
  Person,
  PersonWithComputed,
  Organization,
  FundingEntity,
  Activity,
  FundedInvestment,
  User,
  DashboardStats,
  PeopleFilters,
  ActivityFilters,
  RecentActivityFilters,
  ReferrerLink,
  RelatedContactLink,
} from "./types";

export interface DataService {
  // People
  getPeople(filters?: PeopleFilters): Promise<PersonWithComputed[]>;
  getPerson(id: string): Promise<PersonWithComputed | null>;
  createPerson(data: Partial<Person>): Promise<Person>;
  updatePerson(id: string, data: Partial<Person>): Promise<Person>;
  searchPeople(query: string): Promise<PersonWithComputed[]>;

  // Referrer relationships
  addReferrer(prospectId: string, referrerId: string): Promise<void>;
  getReferrals(referrerId: string): Promise<PersonWithComputed[]>;
  getReferrerForProspect(prospectId: string): Promise<Person | null>;

  // Related Contact relationships
  addRelatedContact(prospectId: string, contactId: string, role: string): Promise<void>;
  getRelatedContacts(prospectId: string): Promise<(RelatedContactLink & { contact: Person })[]>;

  // Organizations
  getOrganizations(): Promise<Organization[]>;
  getOrganization(id: string): Promise<Organization | null>;
  createOrganization(data: Partial<Organization>): Promise<Organization>;
  searchOrganizations(query: string): Promise<Organization[]>;

  // Funding Entities
  getFundingEntities(personId: string): Promise<FundingEntity[]>;
  createFundingEntity(data: Partial<FundingEntity>): Promise<FundingEntity>;

  // Activities
  getActivities(personId: string, filters?: ActivityFilters): Promise<Activity[]>;
  getRecentActivities(filters?: RecentActivityFilters): Promise<(Activity & { personName: string })[]>;
  createActivity(personId: string, data: Partial<Activity>): Promise<Activity>;

  // Funded Investments
  getFundedInvestments(): Promise<FundedInvestment[]>;
  createFundedInvestment(data: Partial<FundedInvestment>): Promise<FundedInvestment>;

  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;

  // Users
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<(User & { passwordHash: string }) | null>;
}

// Provider loader
let _provider: DataService | null = null;

export async function getDataService(): Promise<DataService> {
  if (_provider) return _provider;

  const providerType = process.env.DATA_PROVIDER || "mock";

  if (providerType === "mock") {
    const { MockProvider } = await import("./providers/mock");
    _provider = new MockProvider();
  } else {
    throw new Error(`Unknown DATA_PROVIDER: ${providerType}. Expected "mock" or "zoho".`);
  }

  return _provider;
}
```

- [ ] **Step 2: Create the mock provider with all sample data**

Create `lib/providers/mock.ts`. This is a large file that contains all the sample data from `reference.jsx` mapped to our TypeScript types plus the full DataService implementation.

Due to the size of this file (the mock data alone is ~400 lines), the implementation should:

1. Define all sample data arrays: `MOCK_USERS`, `MOCK_PEOPLE`, `MOCK_ORGANIZATIONS`, `MOCK_FUNDING_ENTITIES`, `MOCK_ACTIVITIES`, `MOCK_FUNDED_INVESTMENTS`, `MOCK_REFERRER_LINKS`, `MOCK_RELATED_CONTACT_LINKS`
2. Port all 12 prospects + 3 funded investors + organizations + timeline entries from `reference.jsx`
3. Add the new fields: `createdDate`, `stageChangedDate`, `commitmentDate`, `outcome` on activities
4. Include 3 sample auto-synced activities (Source = "zoho_telephony" and "o365_sync") with ⚡AUTO appearance
5. Include mix of "connected" and "attempted" outcomes
6. Implement all `DataService` methods using in-memory array operations
7. Computed fields (`daysSinceLastTouch`, `isStale`, `isOverdue`, `activityCount`) are calculated on read using `lib/stale.ts`

**Key implementation details for the mock provider:**

```typescript
import type { DataService } from "../data";
import type { /* all types */ } from "../types";
import { computeDaysSinceLastTouch, computeIsStale, computeIsOverdue } from "../stale";
import { getTodayCT } from "../format";

export class MockProvider implements DataService {
  private people: Person[] = [...MOCK_PEOPLE];
  private organizations: Organization[] = [...MOCK_ORGANIZATIONS];
  private activities: Activity[] = [...MOCK_ACTIVITIES];
  private fundingEntities: FundingEntity[] = [...MOCK_FUNDING_ENTITIES];
  private fundedInvestments: FundedInvestment[] = [...MOCK_FUNDED_INVESTMENTS];
  private referrerLinks: ReferrerLink[] = [...MOCK_REFERRER_LINKS];
  private relatedContactLinks: RelatedContactLink[] = [...MOCK_RELATED_CONTACT_LINKS];
  private users: (User & { passwordHash: string })[] = [...MOCK_USERS];

  private enrichPerson(person: Person): PersonWithComputed {
    const today = getTodayCT();
    const personActivities = this.activities.filter(a => a.personId === person.id);
    const daysSinceLastTouch = computeDaysSinceLastTouch(personActivities, today);
    const org = person.organizationId
      ? this.organizations.find(o => o.id === person.organizationId)
      : null;
    const rep = person.assignedRepId
      ? this.users.find(u => u.id === person.assignedRepId)
      : null;
    const referrerLink = this.referrerLinks.find(r => r.prospectId === person.id);
    const referrer = referrerLink
      ? this.people.find(p => p.id === referrerLink.referrerId)
      : null;

    return {
      ...person,
      organizationName: org?.name ?? null,
      assignedRepName: rep?.fullName ?? null,
      daysSinceLastTouch,
      isStale: computeIsStale(
        person.pipelineStage!,
        daysSinceLastTouch,
        person.nextActionDate,
        today
      ),
      isOverdue: computeIsOverdue(person.nextActionDate, person.pipelineStage!, today),
      activityCount: personActivities.filter(a => a.activityType !== "stage_change" && a.activityType !== "reassignment").length,
      referrerName: referrer?.fullName ?? null,
    };
  }

  // ... implement all DataService methods
}
```

The mock data should include these specific people (ported from `reference.jsx`):
- Robert Calloway (Active Engagement, $500K)
- Sandra Kim (Soft Commit, $250K committed)
- David Thornton (Discovery, $500K)
- Patricia Wells (Pitch, $750K)
- Marcus Johnson (Active Engagement, $300K)
- James Whitfield (Commitment Processing, $500K committed)
- Angela Torres (KYC/Docs, $350K committed)
- Richard Huang (Prospect, no amounts)
- William Grant (Initial Contact)
- Catherine Blake (Nurture, $200K)
- Thomas Park (Dead, not accredited)
- Rachel Adams (Active Engagement, $250K)
- Steven Morrison (Funded, $500K maintain)
- Lisa Chang (Funded, $100K grow)
- Daniel Reeves (Funded, $250K grow)

And 5 external contacts as People with referrer/related_contact roles:
- Mike Lawson (CPA, Sandra Kim's referrer)
- Tolleson Advisor (Wealth Advisor, William Grant's referrer)
- Ken Warsaw (existing user, Rachel Adams' connection)
- Attorney for Whitfield (Related Contact)
- Mrs. Calloway (Spouse, Related Contact for Robert)

- [ ] **Step 3: Create .env.local**

Create `.env.local`:

```
DATA_PROVIDER=mock
```

Add to `.gitignore` if not already there:
```
.env*.local
```

- [ ] **Step 4: Verify mock provider loads**

Create a temporary test: add to `app/page.tsx`:

```tsx
import { getDataService } from "@/lib/data";

export default async function DashboardPage() {
  const ds = await getDataService();
  const stats = await ds.getDashboardStats();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-navy">OwnEZ CRM</h1>
      <pre className="mt-4 text-sm">{JSON.stringify(stats, null, 2)}</pre>
    </div>
  );
}
```

Run `npm run dev`, verify stats JSON appears on screen.

- [ ] **Step 5: Commit**

```bash
git add lib/data.ts lib/providers/mock.ts .env.local .gitignore
git commit -m "feat: add Data Service Layer with mock provider, all sample data from reference prototype"
```

---

## Task 5: Authentication

**Files:**
- Create: `lib/auth.ts`
- Create: `app/login/page.tsx`
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `middleware.ts`

- [ ] **Step 1: Create auth utilities**

Create `lib/auth.ts`:

```typescript
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { User, UserRole } from "./types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "ownez-dev-secret-change-in-production"
);
const COOKIE_NAME = "ownez-session";

export interface SessionPayload {
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
}

export async function createSession(user: User): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
  } satisfies SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("Not authenticated");
  }
  return session;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
```

- [ ] **Step 2: Create login page**

Create `app/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Login failed");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            OwnEZ Capital
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-navy">Sign In</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="chad"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-alert-red">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gold hover:bg-gold-hover text-navy font-semibold rounded-full"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create login API route**

Create `app/api/auth/login/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { getDataService } from "@/lib/data";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const ds = await getDataService();
  const user = await ds.getUserByUsername(username);

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createSession(user);

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return response;
}
```

- [ ] **Step 4: Create logout API route**

Create `app/api/auth/logout/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
```

- [ ] **Step 5: Create auth middleware**

Create `middleware.ts` (project root):

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "ownez-dev-secret-change-in-production"
);

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static assets
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // Check session
  const token = request.cookies.get("ownez-session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 6: Add mock user passwords to mock provider**

In the mock provider, the users should have pre-hashed passwords. Generate hashes for dev:

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('password123', 10).then(h => console.log(h))"
```

Use this hash for all mock users (chad/ken/eric/efri all use "password123" in dev).

- [ ] **Step 7: Verify login flow works**

```bash
npm run dev
```

1. Navigate to `localhost:3000` → should redirect to `/login`
2. Enter `chad` / `password123` → should redirect to `/`
3. Refresh → should stay on `/` (session persists)

- [ ] **Step 8: Commit**

```bash
git add lib/auth.ts app/login/ app/api/auth/ middleware.ts
git commit -m "feat: add auth system with JWT sessions, login page, middleware route protection"
```

---

## Task 6: App Shell (Sidebar Navigation + Layout)

**Files:**
- Create: `components/sidebar.tsx`
- Modify: `app/layout.tsx`
- Create: `app/(authenticated)/layout.tsx`

- [ ] **Step 1: Create authenticated layout group**

Restructure routes so authenticated pages share a layout with sidebar. Move `page.tsx` (dashboard) into `app/(authenticated)/page.tsx`. Create the authenticated layout:

Create `app/(authenticated)/layout.tsx`:

```tsx
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        currentUser={session.fullName}
        userRole={session.role}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Build the sidebar**

Create `components/sidebar.tsx`:

```tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "⊞", roles: ["rep", "marketing", "admin"] },
  { href: "/pipeline", label: "Pipeline", icon: "▤", roles: ["rep", "marketing", "admin"] },
  { href: "/people", label: "People", icon: "◉", roles: ["rep", "marketing", "admin"] },
  { href: "/leadership", label: "Leadership", icon: "◈", roles: ["admin", "marketing"] },
  { href: "/admin", label: "Admin", icon: "⚙", roles: ["admin"] },
] as const;

interface SidebarProps {
  currentUser: string;
  userRole: UserRole;
}

export function Sidebar({ currentUser, userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="w-44 bg-navy flex flex-col shrink-0">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="text-[9px] font-medium tracking-[0.15em] text-white/40 uppercase">
          OwnEZ Capital
        </div>
        <div className="text-sm font-semibold text-white mt-0.5">
          CRM
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex items-center gap-2.5 w-full px-4 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "text-gold bg-white/5"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              )}
            >
              <span className="text-sm w-4 text-center">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-3 border-t border-white/10">
        <div className="text-[10px] text-white/40">{currentUser}</div>
        <button
          onClick={handleLogout}
          className="text-[10px] text-white/30 hover:text-white/60 mt-1"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Move existing routes into authenticated group**

```
app/(authenticated)/page.tsx           ← Dashboard
app/(authenticated)/pipeline/page.tsx  ← Pipeline View
app/(authenticated)/person/[id]/page.tsx ← Person Detail
app/(authenticated)/people/page.tsx    ← People Directory
```

Create placeholder pages for pipeline, person, and people routes.

- [ ] **Step 4: Verify sidebar renders and navigation works**

```bash
npm run dev
```

Login → should see navy sidebar with nav items. Click items → URL changes. Chad (rep) should NOT see Leadership or Admin links.

- [ ] **Step 5: Commit**

```bash
git add app/ components/sidebar.tsx
git commit -m "feat: add app shell with navy sidebar, role-based navigation, authenticated layout"
```

---

## Task 7: Dashboard — Stats Bar + Today's Actions + Needs Attention

**Files:**
- Create: `components/dashboard/stats-bar.tsx`
- Create: `components/dashboard/todays-actions.tsx`
- Create: `components/dashboard/needs-attention.tsx`
- Create: `components/dashboard/recent-activity.tsx`
- Create: `components/ui/currency-display.tsx`
- Create: `components/ui/stale-indicator.tsx`
- Modify: `app/(authenticated)/page.tsx`

- [ ] **Step 1: Build stat card component**

Create `components/dashboard/stats-bar.tsx`:

Four cards: Active Pipeline Count, Pipeline Value, Committed, Funded YTD. Uses design tokens — white cards, navy text, gold accent for Funded. Tabular-nums for dollar values. Uses `formatCurrency` from `lib/format.ts`.

- [ ] **Step 2: Build Today's Actions list**

Create `components/dashboard/todays-actions.tsx`:

Client Component (needs date toggle state). Fetches data via props from Server Component parent.
- Date toggle: Today | Tomorrow | This Week (three pill buttons, gold = active)
- List rows: Name, Company, Stage badge, Initial Investment, Next Action Type + Detail
- "New" badge (gold) for prospects where creator ≠ assigned rep and rep hasn't logged activity yet
- Click row → navigate to `/person/[id]`
- Empty state with directional guidance per spec Section 6.2

- [ ] **Step 3: Build Needs Attention panel**

Create `components/dashboard/needs-attention.tsx`:

- Red-tinted border on container
- Rows: Name, Stage, Days Idle, Next Action, Next Action Date
- Red indicator dot on each record
- Sorted by severity (most overdue first)
- Empty state: green "Pipeline Healthy" indicator

- [ ] **Step 4: Build Recent Activity feed**

Create `components/dashboard/recent-activity.tsx`:

- Collapsible (collapsed by default)
- Reverse-chronological, last 7 days, cross-prospect
- Columns: Date/Time, Person (linked), Activity Type, Outcome, Detail (truncated), Logged By

- [ ] **Step 5: Wire up Dashboard page**

Modify `app/(authenticated)/page.tsx` as Server Component:

```tsx
import { getDataService } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { getTodayCT } from "@/lib/format";
import { StatsBar } from "@/components/dashboard/stats-bar";
import { TodaysActions } from "@/components/dashboard/todays-actions";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { RecentActivity } from "@/components/dashboard/recent-activity";

export default async function DashboardPage() {
  const [session, ds] = await Promise.all([getSession(), getDataService()]);
  const today = getTodayCT();

  const [stats, people, recentActivities] = await Promise.all([
    ds.getDashboardStats(),
    ds.getPeople(),
    ds.getRecentActivities({ limit: 50 }),
  ]);

  // Filter for Today's Actions, Needs Attention, etc.
  // Pass as props to client components

  return (
    <div className="p-6 max-w-7xl">
      {/* Row 0: Today's Momentum — Phase 2 */}
      {/* Row 1: Stats */}
      <StatsBar stats={stats} />
      {/* Row 2: Today's Actions + Needs Attention */}
      <div className="grid grid-cols-5 gap-6 mt-6">
        <div className="col-span-3">
          <TodaysActions people={people} today={today} />
        </div>
        <div className="col-span-2">
          <NeedsAttention people={people} />
        </div>
      </div>
      {/* Row 3: Recent Activity */}
      <RecentActivity activities={recentActivities} />
    </div>
  );
}
```

- [ ] **Step 6: Verify dashboard renders with mock data**

```bash
npm run dev
```

Login as chad → Dashboard should show 4 stat cards with real numbers, Today's Actions list, Needs Attention panel with red indicators.

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/ components/ui/ app/\(authenticated\)/page.tsx
git commit -m "feat: add Dashboard with stats bar, Today's Actions, Needs Attention, Recent Activity"
```

---

## Task 8: Pipeline View

**Files:**
- Create: `components/pipeline/pipeline-table.tsx`
- Create: `components/pipeline/pipeline-filters.tsx`
- Create: `components/pipeline/pipeline-row.tsx`
- Create: `app/(authenticated)/pipeline/page.tsx`

- [ ] **Step 1: Build pipeline filters bar**

Create `components/pipeline/pipeline-filters.tsx`:

Client Component. Stage dropdown, Source dropdown, "Stale Only" toggle, Rep filter. Gold accent on active filters. Clear all button.

- [ ] **Step 2: Build pipeline row**

Create `components/pipeline/pipeline-row.tsx`:

Single table row. Columns: Name, Company, Stage (badge), Initial Investment, Growth Target, Lead Source, Touches, Days Idle, Next Action, Next Action Date (relative format), Stale Flag (red dot). Dollar values right-aligned with tabular-nums. Click → navigate to `/person/[id]`.

- [ ] **Step 3: Build pipeline table**

Create `components/pipeline/pipeline-table.tsx`:

Client Component (needs sort state). Sortable column headers — click to sort, visual indicator for active sort. Default sort: Next Action Date ascending. Uses shadcn Table component.

- [ ] **Step 4: Wire up Pipeline page**

Create `app/(authenticated)/pipeline/page.tsx` as Server Component. Fetches all people with prospect role, passes to client table component.

- [ ] **Step 5: Verify pipeline renders**

```bash
npm run dev
```

Login → Pipeline → should show sortable table with all 9 active prospects (excludes Nurture + Dead). Sorting, filtering, stale indicators all working.

- [ ] **Step 6: Commit**

```bash
git add components/pipeline/ app/\(authenticated\)/pipeline/
git commit -m "feat: add Pipeline View with sortable table, filters, stale indicators"
```

---

## Task 9: Person Detail — Cockpit Zone

**Files:**
- Create: `components/person/cockpit.tsx`
- Create: `components/person/identity-bar.tsx`
- Create: `components/person/next-action-bar.tsx`
- Create: `components/person/recent-snapshot.tsx`
- Create: `components/person/quick-log.tsx`
- Create: `components/person/next-action-prompt.tsx`
- Create: `components/ui/date-quick-pick.tsx`
- Create: `app/api/activities/route.ts`
- Create: `app/api/persons/[id]/next-action/route.ts`

- [ ] **Step 1: Build DateQuickPick component**

Create `components/ui/date-quick-pick.tsx`:

Client Component. Shows chips: [Today] [Tomorrow] [+3d] [Mon] [Fri] [+1w] [+2w] + calendar icon. One tap sets the date. Uses `computeDateOffset` from `lib/format.ts`. Gold highlight on selected chip.

- [ ] **Step 2: Build Identity Bar**

Create `components/person/identity-bar.tsx`:

Name (large), Organization (linked, smaller), Stage badge (color-coded), Investment Target, Stale indicator (red dot). Phone with 📞 click-to-call (`tel:` link). Email with ✉️ click-to-email (`mailto:` link).

- [ ] **Step 3: Build Next Action Bar**

Create `components/person/next-action-bar.tsx`:

Client Component. Inline-editable: Next Action Type (dropdown), Detail (text input), Date (DateQuickPick). Saves via API on change. Gold border when focused.

- [ ] **Step 4: Build Recent Snapshot**

Create `components/person/recent-snapshot.tsx`:

Last 3 activities — compact: type icon + date + first line of detail (truncated). If fewer than 3, shows what's available. If none: "No activity logged yet."

- [ ] **Step 5: Build Quick Log**

Create `components/person/quick-log.tsx`:

Client Component. Single text input with placeholder "Quick log: Called Robert, discussed...". As user types, real-time badge shows detected activity type (using `detectActivityType`). Enter submits. "+ More options" expands full form with Activity Type dropdown, Date, Time, Outcome toggle, Detail textarea, Attachments.

After submit: POSTs to `/api/activities`, shows Next Action prompt.

- [ ] **Step 6: Build Next Action Prompt**

Create `components/person/next-action-prompt.tsx`:

Appears after Quick Log submit. Pre-filled with current Next Action Type, Detail, Date (using DateQuickPick). Enter to confirm (PATCHes person via API). Includes "Advance to [Next Stage]?" link below.

- [ ] **Step 7: Build activity creation API**

Create `app/api/activities/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getDataService } from "@/lib/data";
import { requireSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await requireSession();
  const body = await request.json();

  const ds = await getDataService();
  const activity = await ds.createActivity(body.personId, {
    ...body,
    loggedById: session.userId,
    source: "manual",
  });

  return NextResponse.json(activity);
}
```

- [ ] **Step 8: Build next action update API**

Create `app/api/persons/[id]/next-action/route.ts`:

PATCHes nextActionType, nextActionDetail, nextActionDate on the person record.

- [ ] **Step 9: Build the Cockpit container**

Create `components/person/cockpit.tsx`:

Assembles: Identity Bar → Next Action Bar → Recent Snapshot → Quick Log. Fixed positioning (stays visible as user scrolls the detail zone).

- [ ] **Step 10: Verify cockpit works end-to-end**

```bash
npm run dev
```

Login → Dashboard → click a prospect → Cockpit shows identity, next action, last 3 activities, quick log. Type "Called Robert, discussed returns" → badge shows "Call". Enter → Next Action prompt appears. Enter → confirms. Activity appears in Recent Snapshot.

- [ ] **Step 11: Commit**

```bash
git add components/person/cockpit.tsx components/person/identity-bar.tsx components/person/next-action-bar.tsx components/person/recent-snapshot.tsx components/person/quick-log.tsx components/person/next-action-prompt.tsx components/ui/date-quick-pick.tsx app/api/
git commit -m "feat: add Person Detail cockpit with Quick Log, smart detection, Next Action prompt, date quick-picks"
```

---

## Task 10: Person Detail — Detail Zone

**Files:**
- Create: `components/person/detail-zone.tsx`
- Create: `components/person/activity-timeline.tsx`
- Create: `components/person/activity-entry.tsx`
- Create: `components/person/stage-bar.tsx`
- Create: `components/person/organization-section.tsx`
- Create: `components/person/funding-entities.tsx`
- Create: `components/person/related-contacts.tsx`
- Create: `components/person/referrer-section.tsx`
- Create: `components/person/background-notes.tsx`
- Create: `components/person/prospect-fields.tsx`
- Create: `components/ui/autocomplete.tsx`
- Create: `app/api/persons/[id]/stage/route.ts`
- Modify: `app/(authenticated)/person/[id]/page.tsx`

- [ ] **Step 1: Build Activity Timeline with filter pills**

Create `components/person/activity-timeline.tsx` and `components/person/activity-entry.tsx`:

- Filter pills: [All] [Calls] [Emails] [Meetings] [Notes] [Docs] [Stage Changes] [Auto ⚡]
- Entry anatomy: type icon (color-coded), outcome badge ("Attempted" if not connected), date/time, who logged it, detail text, attached documents, ⚡AUTO badge for auto-synced
- Stage changes render as timeline dividers
- Reassignments render as timeline dividers

- [ ] **Step 2: Build Stage Progression Bar**

Create `components/person/stage-bar.tsx`:

9-step horizontal bar (funded included, nurture/dead as separate buttons below). Current stage highlighted in gold. Click stage → confirmation dialog → POSTs stage change to API → fires post-stage-change prompt.

- [ ] **Step 3: Build Autocomplete-or-Create component**

Create `components/ui/autocomplete.tsx`:

Generic reusable component. Takes a search function, renders dropdown with matches. "Create new [entity]" at bottom when no match. Badge for existing roles. Used by Organization, Referrer, Related Contacts, Funding Entities sections.

- [ ] **Step 4: Build Organization, Funding Entities, Related Contacts, Referrer sections**

Each uses autocomplete-or-create pattern. Funding Entities shows nudge at Commitment Processing / KYC if empty.

- [ ] **Step 5: Build Background Notes (collapsible, de-emphasized)**

Collapsible section, placeholder: "Background context — use Quick Log for activities."

- [ ] **Step 6: Build Prospect Fields (inline-editable)**

Investment Target, Growth Target, Committed Amount (auto-sets Commitment Date), Lead Source, Collaborators, Lost/Dead Reason. Assigned Rep visible but non-editable for non-admins.

- [ ] **Step 7: Build stage change API**

Create `app/api/persons/[id]/stage/route.ts`:

PATCHes pipelineStage, auto-updates stageChangedDate, creates Stage Change activity.

- [ ] **Step 8: Assemble Person Detail page**

Create `app/(authenticated)/person/[id]/page.tsx`:

Server Component. Fetches person, activities, funding entities, related contacts, referrer. Renders Cockpit (fixed) + Detail Zone (scrollable).

- [ ] **Step 9: Verify full Person Detail works**

```bash
npm run dev
```

Login → click Robert Calloway → Full detail page: cockpit with quick log, scrollable timeline, stage bar, organization, funding entities, related contacts, referrer, background notes, prospect fields. Log activity, change stage, update fields — all working with mock data.

- [ ] **Step 10: Commit**

```bash
git add components/person/ components/ui/autocomplete.tsx app/api/persons/ app/\(authenticated\)/person/
git commit -m "feat: add Person Detail with activity timeline, stage bar, autocomplete-or-create, inline editing"
```

---

## Task 11: People Directory

**Files:**
- Create: `components/ui/search-bar.tsx`
- Modify: `app/(authenticated)/people/page.tsx`

- [ ] **Step 1: Build search bar**

Create `components/ui/search-bar.tsx`:

Full-width search input with fuzzy matching. Results show: Name, Roles (badges), Organization, Stage (if prospect). Click → `/person/[id]`.

- [ ] **Step 2: Build People Directory page**

Create `app/(authenticated)/people/page.tsx`:

Search bar at top. Results list. Filters: Role (Prospect, Referrer, Related Contact, Funded Investor), Organization.

- [ ] **Step 3: Verify**

```bash
npm run dev
```

People directory shows all people, search works, role filters work, click navigates to person detail.

- [ ] **Step 4: Commit**

```bash
git add components/ui/search-bar.tsx app/\(authenticated\)/people/
git commit -m "feat: add People Directory with fuzzy search and role filters"
```

---

## Task 12: Error States + Loading States + Polish

**Files:**
- Create: `app/(authenticated)/loading.tsx`
- Create: `app/(authenticated)/error.tsx`
- Create: `components/ui/skeleton-cards.tsx`

- [ ] **Step 1: Add loading states**

Create `app/(authenticated)/loading.tsx` with skeleton placeholders matching dashboard layout shape. Skeleton cards for stats, skeleton rows for lists.

Create route-specific loading states for pipeline and person detail.

- [ ] **Step 2: Add error states**

Create `app/(authenticated)/error.tsx` — "Something went wrong — try again." with retry button. Dashboard stat cards show "—" on individual failures.

- [ ] **Step 3: Add empty states**

Ensure every list has contextual empty states per spec Section 15:
- Pipeline: "No active prospects yet — add your first one."
- Needs Attention: green "Pipeline Healthy" indicator
- Timeline: "No activity logged yet."
- Today's Actions complete: directional guidance

- [ ] **Step 4: Visual polish pass**

- Verify navy/gold/white color system is applied consistently
- Pill-shaped buttons (rounded-full on all CTAs)
- Tabular nums on all dollar columns
- Whitespace creates hierarchy — check spacing
- Gold = action — verify all interactive elements use gold
- Stale/overdue red indicators are visually prominent

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add loading skeletons, error boundaries, empty states, visual polish"
```

---

## Task 13: End-to-End Flow Verification

- [ ] **Step 1: Verify Chad's full morning workflow**

1. Login as chad / password123
2. Dashboard loads: 4 stat cards, Today's Actions, Needs Attention
3. Click Robert Calloway → Person Detail Cockpit loads
4. See last 3 activities in Recent Snapshot
5. Type "Called Robert, discussed Q3 returns" → badge shows "Call"
6. Hit Enter → Activity logged, Next Action prompt appears
7. Update Next Action Date to Tomorrow → hit Enter
8. Scroll down → full Activity Timeline shows new entry
9. Navigate back to Dashboard → stats updated

- [ ] **Step 2: Verify Pipeline workflow**

1. Navigate to Pipeline
2. Sort by Days Idle descending
3. Filter by Stage = "Active Engagement"
4. Click Marcus Johnson → Person Detail
5. Log "Left voicemail, no answer" → type = Call, outcome = Attempted detected
6. Navigate back to Pipeline → Days Since Last Touch reset for Marcus

- [ ] **Step 3: Verify role-based access**

1. Login as ken / password123 → should NOT see Admin link in sidebar
2. Marketing role restrictions apply (can view, limited actions)
3. Login as eric / password123 → should see Leadership + Admin links

- [ ] **Step 4: Verify error handling**

1. Navigate to `/person/nonexistent-id` → should show 404 or "Prospect not found"
2. Page refresh maintains session
3. Logout → redirect to login → cannot access protected routes

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: Phase 1 complete — foundation, auth, dashboard, pipeline, person detail with core loop"
```

---

## Phase 1 Deliverables Summary

After completing all 13 tasks, Phase 1 delivers:

1. **Next.js project** with Tailwind + shadcn/ui + Geist + OwnEZ design system
2. **Data Service Layer** with mock provider (12 prospects, 3 funded, 30+ activities)
3. **Auth system** with JWT sessions, login page, role-based middleware
4. **Dashboard** — 4 stat cards, Today's Actions, Needs Attention, Recent Activity
5. **Pipeline View** — sortable/filterable table with stale indicators
6. **Person Detail** — Two-zone layout (Cockpit + Detail Zone):
   - Quick Log with smart prefix detection + outcome detection
   - Non-skippable Next Action prompt
   - Date Quick-Pick chips
   - Activity Timeline with filter pills
   - Stage Progression Bar
   - Autocomplete-or-create for Org, Funding Entities, Related Contacts, Referrer
   - Background Notes (de-emphasized)
   - Inline-editable prospect fields
7. **People Directory** — fuzzy search, role filters
8. **Loading/Error/Empty states** per spec

**Not included in Phase 1 (deferred to later phases):**
- Leadership Dashboard (Phase 2)
- Admin Panel (Phase 2)
- Reports (Phase 2)
- Mobile-responsive layout + bottom nav (Phase 3)
- Zoho provider prep (Phase 3)
- Create Prospect form + "+" button (Phase 4)
- Inline pipeline actions — Quick Log + Advance Stage on rows (Phase 4)
- Last Viewed Bar (Phase 4)
- Pinned prospects (Phase 4)
- Keyboard shortcuts (Phase 4)
- Today's Momentum line (Phase 4)
- Today/Tomorrow/This Week toggle (Phase 4)
- "New" badge handoff signal (Phase 4)
