# OwnEZ CRM — Development Handoff

## Project State (as of 2026-03-19)

Custom Next.js CRM frontend for OwnEZ Capital's HNW investor pipeline. Uses Zoho CRM as the database via API. Currently running with mock data provider — all features work without Zoho connection.

**Live deployment:** https://ownez-crm.vercel.app (auto-deploys from GitHub)
**Repository:** https://github.com/ownez-capital/ownez-investor-crm (branch: `phase1/foundation`)
**124 E2E tests passing, 33 provider tests passing.**

## What's Been Built

### Phase 1 Foundation (prior sessions)
- Next.js App Router on Vercel, Tailwind + shadcn/ui
- Data service abstraction layer (`lib/data.ts`) with mock provider (`lib/providers/mock.ts`)
- Auth (simple JWT login), sidebar nav, all routes
- Dashboard, Pipeline view, Person Detail, People directory
- Quick Log with smart activity type detection (`lib/smart-detection.ts`)
- 55 Playwright E2E tests — all passing at start of this session

### Leadership Dashboard + Admin Panel (2026-03-18 session)

All built via Ralph Loop. 39 Playwright E2E tests pass (`e2e/leadership.spec.ts`, `e2e/admin.spec.ts`).

#### Leadership Dashboard (`/leadership`)

Two-column layout: 115px stat column + right panel. Roles: `marketing`, `admin`, or `canViewLeadership` override.

**Stat Column** — 6 KPI cards (all clickable → drill-down sheet):
- AUM Raised — sum of all FundedInvestment.amountInvested
- Fund Target — progress bar toward configurable target (default $10.5M, set in Admin → Settings)
- Funded YTD — count of FundedInvestments in current year
- Active — count of prospects in active pipeline stages
- Pipeline Value — sum of initialInvestmentTarget for active
- Meetings — count with 7d/14d/30d toggle (default 30d)

**Right Panel:**
- Pipeline Funnel — tapering rows per stage (gold fading, green for Funded), count + sum, clickable drill-down
- Source ROI Table — Source / Prospects / Funded / AUM / Conv%, sorted by AUM

**Drill-down Sheet** — slides in from right, lists prospects or activities with links to `/person/[id]`

**New components:** `components/leadership/stat-column.tsx`, `pipeline-funnel.tsx`, `source-roi-table.tsx`, `drilldown-sheet.tsx`

**New API routes:** `app/api/leadership/stats/route.ts`, `meetings/route.ts`, `funnel/route.ts`, `source-roi/route.ts`, `drilldown/route.ts`

**New DataService methods:** `getLeadershipStats`, `getMeetingsCount`, `getFunnelData`, `getSourceROI`, `getDrilldownProspects`, `getDrilldownActivities`

#### Admin Panel (`/admin`)

Five tabs: **Users** | **Lead Sources** | **Stages** | **Activity Types** | **Settings**. Role: `admin` or `canAccessAdmin` override.

**Users tab:**
- Table: Name/username, Role badge, Status
- Click a row → inline edit panel with gold border:
  - Role template pill selector (Rep/Marketing/Admin)
  - Permission toggle switches with "Role default: on/off" labels — canViewLeadership, canAccessAdmin, canReassignProspects, canViewAllProspects, canMarkDead
  - Deactivate button → shows "Reassign open prospects to:" picker before confirming

**Lead Sources tab:**
- List of all lead sources with per-row controls: inline label edit, active toggle, drag reorder, delete
- "+ New Lead Source" inline add at bottom

**New components:** `components/admin/users-tab.tsx`, `lead-sources-tab.tsx`

**New API routes:** `app/api/admin/users/route.ts`, `users/[id]/route.ts`, `lead-sources/route.ts`, `lead-sources/[key]/route.ts`, `lead-sources/reorder/route.ts`

**New DataService methods:** `updateUser`, `deactivateUser`, `getLeadSources`, `updateLeadSource`, `reorderLeadSources`

### UI Polish Session (2026-03-19, latest)

#### Leadership Drilldown Fixes
- **Active Pipeline drilldown** — now grouped by stage in reverse funnel order (KYC/Docs first → Prospect last) with stage headers and counts. Applies to both "Active" and "Pipeline Value" stat cards.
- **Funded drilldowns** — AUM Raised and Fund Target now drill to all funded investors (all-time), not just YTD. Funded YTD still drills to current year only. All funded drilldowns show actual `fundedAmount` (from FundedInvestment records) with "funded" label, not `initialInvestmentTarget`. Sorted by most recent investment date.
- **Meetings count** — toggles between 7d/14d/30d now live-update the count (client-side fetch), not just the drilldown.
- **New filter:** `DrilldownProspectFilter.fundedAll` added to types + mock provider.

#### People Directory
- Default filter changed from "All" to "Prospects" (most common use case)
- Results sorted alphabetically by name

#### Person Detail — Two-Column Layout
- On desktop/tablet (`lg+`): detail zone splits into two columns
  - Left (flex): Profile Card + Activity Timeline
  - Right (300–340px): Relationships + Background Notes
- On mobile: single column as before (no change)

### Gap Closure Session (2026-03-19)

All via Ralph Loop. 94 E2E tests passing.

#### Pipeline Inline Actions
- **Quick Log from row** — hover shows message icon; click expands inline quick log below the row with smart detection + next action prompt. Component: `components/pipeline/inline-quick-log.tsx`
- **Advance Stage from row** — hover shows arrow icon; click advances to next sequential stage with confirmation dialog

#### Last Viewed Bar
- Persistent bar at top of every screen showing most recently viewed prospect
- Quick Log directly from the bar without navigating to person detail
- Set on person detail visit, persists via `localStorage`
- Components: `components/last-viewed-bar.tsx`, `components/set-last-viewed.tsx`

#### Leadership Dashboard Enhancements
- **Top Referrers panel** — referrer name, referral count, pipeline value, funded value. Component: `components/leadership/top-referrers.tsx`
- **Red Flags panel** — stale/overdue prospects at a glance with red styling, or green "Pipeline healthy". Component: `components/leadership/red-flags.tsx`
- **Ken partial-access** — marketing role sees only Source Attribution + Top Referrers (no stats, funnel, or red flags)
- **Fund Target** now reads from configurable SystemConfig (default $10.5M), no longer hardcoded

#### Admin Panel — 3 New Tabs
- **Stages tab** — edit pipeline stage labels and idle thresholds inline. Component: `components/admin/pipeline-stages-tab.tsx`. API: `GET/PATCH /api/admin/pipeline-stages`
- **Activity Types tab** — edit labels, toggle active/inactive, add new custom types. System types locked. Component: `components/admin/activity-types-tab.tsx`. API: `GET/POST/PATCH /api/admin/activity-types`
- **Settings tab** — fund target ($M), company name. Component: `components/admin/system-settings-tab.tsx`. API: `GET/PATCH /api/admin/system-config`

**New DataService methods:** `getSystemConfig`, `updateSystemConfig`, `getPipelineStageConfigs`, `updatePipelineStageConfig`, `getActivityTypeConfigs`, `updateActivityTypeConfig`, `createActivityType`, `getTopReferrers`, `getRedFlags`, `getUnassignedProspects`

**New types:** `SystemConfig`, `PipelineStageConfig`, `ActivityTypeConfig`, `ReferrerStats`

### User Menu / Logout (2026-03-19 session)

14 Playwright E2E tests pass (`e2e/auth.spec.ts`). Total: 53 E2E tests passing.

- **Desktop sidebar** — avatar row at sidebar bottom (initials + first name + chevron). Clicking opens a Base UI Popover above the row: full name, role badge, Sign out button.
- **Mobile bottom nav** — 4th tab with user initials. Tapping opens a Sheet from below: full name, role badge, Sign out button.
- Both logout paths call `POST /api/auth/logout` → redirect to `/login`.

**New files:** `components/sidebar-user-menu.tsx`, `components/ui/popover.tsx`, `components/ui/switch.tsx`
**Modified:** `components/sidebar-nav.tsx` (added MobileNav 4th user tab + sheet), `components/sidebar.tsx` (replaced old logout button with SidebarUserMenu)
**Deleted:** `components/logout-button.tsx`

### Dashboard Cockpit Redesign (prior session)
- **Hero card** — #1 priority prospect (overdue → stale → due today → nurture re-engage)
- **Action Items queue** — unified ranked list replacing separate "Today's Actions" and "Needs Attention", max 8 with "Show N more"
- **Stats footer** — compact 4-column bar at bottom (was 4 large cards at top)
- **"+ Prospect" button** — slide-out sheet with create prospect form (POST /api/persons)
- **"Log Activity" button** — slide-out sheet with prospect search + quick log
- **Mobile responsive** — bottom tab bar, full-width layout, two-line queue rows

### Person Detail Completion + UX Polish (2026-03-18 — second session)

#### Person Detail — 7 Missing Features (all via Ralph Loop)

All 7 tasks completed. 24 Playwright E2E tests pass (`e2e/person-detail-completion.spec.ts`).

**Task 1 — Related Contacts: Add & Remove**
- `components/person/related-contacts.tsx` now `"use client"` with inline Add Contact form (people-search autocomplete + role input) and × remove buttons
- New routes: `POST /api/persons/[id]/related-contacts`, `DELETE /api/persons/[id]/related-contacts/[contactId]`
- `DataService.removeRelatedContact(prospectId, contactId)` added to interface + mock

**Task 2 — Collaborators Field**
- Collaborators row added to `components/person/profile-card.tsx` (after Assigned Rep)
- Names with × remove; quiet `+ Add` text button opens inline `<select>` of available users
- Reuses existing `PATCH /api/persons/[id]` — no new route

**Task 3 — Reassignment Auto-Log**
- New route `PATCH /api/persons/[id]/rep` — looks up old/new rep names, patches person, auto-logs `reassignment` activity
- Assigned Rep select in ProfileCard now calls `/rep` endpoint

**Task 4 — Nurture Stage: Re-engage Date Required**
- Stage bar shows inline date prompt when Nurture is clicked (not immediate)
- API validates: `nurture` requires `reengageDate` → 400 if missing

**Task 5 — Dead Stage: Lost Reason Required**
- Stage bar shows inline `<select>` of `LOST_REASONS` when Dead is clicked
- Confirm disabled until reason selected; API validates `lostReason` required → 400

**Task 6 — Post-Stage-Change Inline Prompt**
- After any of the 9 active-progression stages: inline Next Action prompt (type + detail + date) instead of immediate refresh
- Confirm calls `PATCH /api/persons/[id]/next-action` then `router.refresh()`; Skip refreshes directly

**Task 7 — Funded Transition Flow**
- Clicking Funded shows inline form: Entity Name, Entity Type, Amount, Date, Track (Maintain/Grow), Growth Target
- Sequential calls: `POST /funding-entities` → `POST /funded-investment` → `PATCH /stage` → `router.refresh()`
- New route: `app/api/persons/[id]/funded-investment/route.ts`
- `DataService.createFundedInvestment(data)` added to interface + mock

#### UX Polish (same session)

- **Profile card**: Financial grid border removed (no card-within-card), label widths unified to `w-28 tracking-wide`, `CollaboratorsField` uses hidden `+ Add` button (consistent with other fields), null financials show "Not set" italic
- **Stage bar**: "change stage" hint text invisible until hover (`text-transparent group-hover:text-muted-foreground/40`)
- **Log Activity**: collapsed by default — renders as quiet `+ Log Activity` dashed button; expands on click, collapses after submit
- **Organization section**: removed bold `<h3>` heading; now renders as inline row matching Lead Source / Rep / Collaborators (small muted label + value with pencil-on-hover)
- **Committed "Not set"**: gold/60 italic when `canEdit && !value` — subtle nudge that field needs attention
- **Phone/email**: pencil icon always visible at low opacity (`text-muted-foreground/25`) beside each pill; clicking pill still dials/emails; clicking pencil opens inline edit

### UX/UI Polish Session (2026-03-18 — prior session)

#### Smart Detection
- `lib/smart-detection.ts` reviewed — code logic is correct. Bug report ("always shows note") is likely a UI render issue, not a detection issue. The `detectActivityType()` function runs pattern matching correctly; needs further investigation if the bug resurfaces.
- `hasOutcome(type)` function added — returns `true` only for Call, Email, Text, LinkedIn. Used to conditionally show the Connected/Attempted dropdown in "More options".

#### Post-Log "What's Next?" Flow (Dashboard + Person Detail)
- Detail field now **starts empty** with old value as gray placeholder (was incorrectly pre-filled)
- Cursor begins at field start (was at end, making mobile editing hard)
- "Advance to [Next Stage]?" displayed as clearly clickable gold `text-sm` link (was tiny, not obviously interactive)
- After confirm: shows brief state summary (stage, next action, days idle) as visual confirmation it worked

#### Log Activity — Outcome Dropdown
- Connected/Attempted toggle now **only shown for outreach types**: Call, Email, Text, LinkedIn
- Hidden for Note, Meeting, Document Sent, Document Received types
- Powered by `hasOutcome(type)` in `lib/smart-detection.ts`

#### Dashboard Log Activity Sheet
- Activity timeline appears below when prospect is selected (was blank)
- Timestamps in relative format matching Person Detail style: "Today at 2:30 PM", "Yesterday at 10:15 AM"

#### Create Prospect Flow
- **Success screen** replaces auto-navigation after creation: "Prospect created!" with two buttons:
  1. "Back to Dashboard" — stays on dashboard
  2. "Open Profile →" — navigates to new person detail
- **Date quick-pick**: fixed double-highlight bug (Today + Tomorrow both showing as selected)
- **Default date**: Tomorrow (was Today), correct for scheduling follow-up actions
- **Next action section**: optional during creation (was blocking with mandatory pre-filled field)
- **Auto-created "Prospect Added" activity**: `ds.createPerson()` auto-logs a system activity on creation — timeline is never empty, context is always available for the next action prompt

#### Person Detail Page Reorder
- **Phone/email in sticky cockpit** (Identity Bar) — not buried in scrollable sections
- Inline editing on Identity Bar fields (phone, email)
- New section order: Identity Bar → Quick Log → Next Action → Profile/Relationships → Timeline

#### Inline Editing — New in This Session
All previously read-only fields are now editable inline on Person Detail:
- **Phone** — tap to edit inline
- **Email** — tap to edit inline
- **Investment Target** — tap to edit inline
- **Growth Target** — tap to edit inline
- **Organization** — autocomplete-or-create with Enter key support; remove shows org name
- **Referrer** — people search autocomplete; can select from existing people
- **Funding Entities** — add inline (no modal); 1:1 per person (two prospects can share same entity name as separate records)

#### Stage Progression Bar Redesign
- Symmetric design: all 9 stage pills equal width
- Current stage: gold background + navy text
- Other stages: muted outline pills
- Horizontally scrollable on mobile

#### Lead Source — Chip Picker (`components/ui/lead-source-picker.tsx`)
- **Visual chips** replace dropdown
- **Categorized**: Referral, Network, Event, Direct
- **Frequency ordered**: top row shows 4 most-used sources (computed via `getLeadSourceCounts()`)
- **"More" expansion**: shows all remaining + "+ Add new" option
- **Data integrity**: chips map 1:1 to Zoho picklist values — no free text
- New sources added via "+ Add new" (future: admin panel manages these)

#### People Directory
- **Back to Dashboard** link ("← Dashboard") added at top

---

## Key Technical Decisions

### Data persistence in dev mode
`lib/data.ts` uses `globalThis` (not module-level `let`) to persist the mock data singleton across Next.js module re-evaluations. Without this, API routes and page renders get separate data instances.

> ⚠️ **HMR caveat:** Saving files during dev can reset in-memory arrays (HMR re-evaluates the mock module). Symptoms: "Prospect not found" errors for newly created records. Fix: restart dev server or avoid saving files immediately after creating test data.

### Page refresh after mutations
All API routes call `revalidatePath()`. Client components use `window.location.reload()` instead of `router.refresh()` — more reliable with the mock provider. When Zoho provider is built, `router.refresh()` may work better since data comes from an external source.

### Form input styling
Global CSS forces `background-color: #ffffff !important` on all inputs/selects/textareas and overrides `--ring` to navy (`#0b2049`) for form focus rings. This was needed because shadcn's Input component uses `bg-transparent` which inherits parent backgrounds, and the global `--ring` was gold.

### Smart detection
`lib/smart-detection.ts` — three exported functions:
- `detectActivityType(text)` — auto-detects type from text prefix + keyword fallback
- `detectOutcome(text)` — "attempted" if text contains voicemail/no answer/no response
- `hasOutcome(type)` — whether to show Connected/Attempted toggle (outreach types only)

### Autocomplete-or-create pattern
- Organization: type → autocomplete → Enter to create new, or click existing
- Referrer: type → people search → click existing, or "Create new contact" to add
- Funding Entity: click "Add" → type name + type → save inline

### Lead source frequency
`getLeadSourceCounts()` on DataService — returns `Record<string, number>` (leadSource key → person count). Single-pass count over all people in mock provider; COQL GROUP BY query in Zoho provider.

`GET /api/lead-sources` — new API endpoint that calls `getLeadSourceCounts()` and returns the full `LEAD_SOURCES` array sorted by frequency plus the raw counts. Used by `LeadSourcePicker` on mount.

---

## File Map (key files across all sessions)

```
lib/
  data.ts                     — Full DataService interface + provider loader + all new methods
  providers/mock.ts           — All mock implementations including leadership/admin/lead sources
  smart-detection.ts          — detectActivityType(), detectOutcome(), hasOutcome()
  types.ts                    — All TypeScript types

app/
  page.tsx                    — Dashboard (cockpit: hero card, action queue, stats)
  people/page.tsx             — People directory (← Dashboard link)
  person/[id]/page.tsx        — Person detail (full cockpit + detail zone)
  pipeline/page.tsx           — Pipeline table with filters
  leadership/page.tsx         — Leadership Dashboard (stat column + funnel + source ROI)
  admin/page.tsx              — Admin Panel (Users + Lead Sources tabs)
  api/
    auth/logout/route.ts      — POST: clear session cookie
    lead-sources/route.ts     — GET: lead sources sorted by frequency
    persons/[id]/...          — CRUD for person fields, stage, next action, activities, etc.
    leadership/...            — stats, meetings, funnel, source-roi, drilldown
    admin/users/...           — CRUD users + deactivate with reassign
    admin/lead-sources/...    — CRUD lead sources + reorder

components/
  sidebar.tsx                 — Server component: desktop sidebar + mobile nav
  sidebar-user-menu.tsx       — NEW: desktop avatar row + Base UI popover (user info + sign out)
  sidebar-nav.tsx             — SidebarNav (desktop) + MobileNav (mobile, includes 4th user tab)
  dashboard/                  — Hero card, action queue, stats footer, create/log sheets
  person/                     — Identity bar, quick log, next action, stage bar, profile card, etc.
  leadership/
    stat-column.tsx           — 6 KPI cards with drill-down; 7d/14d/30d toggle on Meetings
    pipeline-funnel.tsx       — Tapering funnel visualization per stage
    source-roi-table.tsx      — Source / Prospects / Funded / AUM / Conv% table
    drilldown-sheet.tsx       — Slide-out sheet for all drill-down views
  admin/
    users-tab.tsx             — User list + inline edit panel (role + permissions + deactivate)
    lead-sources-tab.tsx      — Lead source list (inline edit, active toggle, reorder, add)
  ui/
    popover.tsx               — NEW: Base UI @base-ui/react/popover wrapper
    switch.tsx                — NEW: Base UI switch for admin permission toggles
    lead-source-picker.tsx    — Chip picker, categories, frequency ordering, "More" + "Add new"
    date-quick-pick.tsx       — Date shortcuts (Today, Tomorrow, +3d, +7d, +14d, +30d)
    sheet.tsx                 — Base UI Sheet (used by mobile nav and drill-down)

e2e/                            — 124 E2E tests total
  auth.spec.ts                — 14 tests: login, logout, user menu (desktop + mobile)
  dashboard.spec.ts           — 8 tests: hero card, action queue, stats, create/log sheets
  leadership-admin.spec.ts    — 39 tests: leadership stats, funnel, source ROI, admin tabs
  people.spec.ts              — 7 tests: people directory, search, filters
  person-detail-completion.spec.ts — 24 tests: relationships, collaborators, stage flows
  person-detail.spec.ts       — 17 tests: identity bar, quick log, next action, profile
  pipeline.spec.ts            — 8 tests: pipeline table, filters, inline actions
  sidebar.spec.ts             — 5 tests: sidebar nav, mobile nav
  workflow.spec.ts            — 2 tests: end-to-end workflow

docs/
  DESIGN-SPEC.md              — Version 1.2 (updated with leadership, admin, user menu)
  zoho-provider-guide.md      — Updated: all new DataService methods documented
  HANDOFF.md                  — This file
  HANDOFF-PROMPT.md           — Copy-paste prompt for new Claude Code session
  superpowers/specs/          — All design specs
  superpowers/plans/          — All implementation plans
```

---

## What's NOT Built Yet

**Planned:**
- **Admin Role Templates** — define permission sets at the template level
- **Admin Data Hygiene** — merge duplicate people/orgs
- **Zoho provider** (`lib/providers/zoho.ts`) — IT team builds this per `docs/zoho-provider-guide.md`

**Deferred to future releases:**
- Pinned Prospects (pipeline star/pin)
- Keyboard shortcuts (N, L, /, arrow keys, Enter, Esc)
- Duplicate detection (autocomplete-or-create on prospect Full Name)
- Create Prospect from People page (currently only from Dashboard)
- People Directory Organization filter
- Daily overdue email (scheduled notification to Chad)

---

## How to Run

```bash
npm run dev          # Start dev server (mock data)
npm run build        # Production build
npx playwright test  # Run E2E tests (124 passing)
```

Login: `chad` / `password123` (rep), `eric` / `password123` (admin), `ken` / `password123` (marketing)

---

## Prompt for New Session

See `docs/HANDOFF-PROMPT.md` for a copy-paste prompt to start a new Claude Code session with full context.
