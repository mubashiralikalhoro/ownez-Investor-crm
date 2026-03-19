# OwnEZ CRM — Handoff Prompt for New Claude Code Session

Copy everything below the divider into a new Claude Code chat to resume development with full context.

---

I'm continuing development on the OwnEZ CRM. Read these files first to understand the current state:

1. `CLAUDE.md` — project instructions (brief, read first)
2. `docs/HANDOFF.md` — what was built across all sessions, key technical decisions, what's remaining
3. `docs/zoho-provider-guide.md` — Zoho integration guide (for IT team reference, also documents DataService interface)

## What the system is

Custom Next.js CRM for OwnEZ Capital's HNW investor pipeline. Primary user is Chad (Investment Relationship Manager). Eric is admin/leadership. Design philosophy: "pilot's cockpit" — show Chad exactly what to do next, minimize friction.

- **Tech:** Next.js App Router on Vercel, Tailwind + shadcn/ui + Base UI (`@base-ui/react`)
- **Data:** Mock provider (`lib/providers/mock.ts`, in-memory, `globalThis` singleton) for V1; Zoho CRM for V2
- **Single abstraction point:** `lib/data.ts` — UI never calls Zoho directly
- **Dev server:** `npm run dev` (mock data by default)
- **E2E tests:** `npx playwright test` (94 tests — run before and after changes)
- **Provider tests:** `npx tsx scripts/test-provider.ts` (33 tests — validates DataService methods directly, no browser)
- **Login:** `chad` / `password123` (rep), `eric` / `password123` (admin), `ken` / `password123` (marketing), `efri` / `password123` (admin)

## Key design tokens

- **Navy** `#0b2049` — sidebar, headers
- **Gold** `#e8ba30` — sole accent, CTAs, active states
- **Red** — stale/overdue only
- **Green** — funded/healthy only
- Jony Ive simplicity. Pill buttons, generous whitespace, no borders where spacing works.
- All inline forms — never modals. Pattern: same component, editing state replaces display state.
- Base UI (not Radix) for popover, sheet, dialog primitives.

## Current state (as of 2026-03-19)

**Fully built and working (94 E2E tests passing):**

- **Auth:** Login, session (JWT cookie), middleware protection, logout
- **User Menu:** Desktop sidebar avatar-row popover + mobile 4th-tab bottom sheet (sign out from both)
- **Dashboard** (cockpit): hero card, action queue, stats footer, create prospect sheet, log activity sheet
- **Pipeline View:** full table with stage/source/rep/stale filters, column sorting, inline Quick Log + Advance Stage from rows
- **People Directory:** search by name/company
- **Person Detail page — complete:**
  - Identity bar (name, phone/email with visible-pencil inline edit, stage badge, target)
  - Quick Log (collapsed by default, smart type detection, post-log next action prompt)
  - Next Action bar (overdue indicator, inline edit)
  - Stage bar (symmetric pill design, nurture requires re-engage date, dead requires lost reason, post-stage next action prompt, funded flow creates entity + investment record)
  - Profile card (organization as inline row, financials with committed nudge, lead source chip picker, rep assignment, collaborators with add/remove)
  - Activity timeline (filterable by type)
  - Relationships section (referrer, funding entities, related contacts — all editable inline)
  - Background notes
  - Contextual back navigation (← Leadership / Pipeline / People / Dashboard depending on where you came from)
- **Last Viewed Bar** (all screens): persistent bar showing most recently viewed prospect with inline Quick Log
- **Leadership Dashboard** (`/leadership`): stat column (AUM, Fund Target progress, Funded YTD, Active, Pipeline Value, Meetings with 7/14/30d toggle), Pipeline Funnel, Source ROI Table, Top Referrers, Red Flags, drill-down sheets for all cards/rows. Ken (marketing) sees Source Attribution + Top Referrers only.
- **Admin Panel** (`/admin`): Users tab (inline edit, role templates, permissions, deactivate with reassign), Lead Sources tab (edit, toggle, reorder, add), Pipeline Stages tab (edit labels + idle thresholds), Activity Types tab (edit, toggle, add new), System Settings tab (fund target, company name)

## Key DataService methods (all in mock; all need Zoho impl)

**Core:**
- `getPerson`, `getPersons`, `updatePerson`, `createPerson`, `searchPeople`
- `getActivities`, `createActivity`, `getRecentActivities`
- `getUsers`, `getUserByUsername`, `updateUser`, `deactivateUser`
- `getOrganizations`, `createOrganization`
- `getFundingEntities`, `createFundingEntity`, `deleteFundingEntity`
- `createFundedInvestment`
- `addRelatedContact`, `removeRelatedContact`
- `getReferrer`, `setReferrer`, `removeReferrer`
- `getLeadSourceCounts`
- `getDashboardStats`

**Leadership Dashboard:**
- `getLeadershipStats` — { aumRaised, fundTarget, fundedYTDCount, activeCount, pipelineValue }
- `getMeetingsCount(days)` — count of meeting activities in past N days
- `getFunnelData` — per-stage { stage, label, count, totalValue }
- `getSourceROI` — per-source { source, label, prospectCount, fundedCount, aum, conversionPct }
- `getDrilldownProspects(filter)` — prospects filtered by stage/leadSource/fundedYTD
- `getDrilldownActivities(filter)` — activities filtered by type/days

**Admin — Lead Sources:**
- `getLeadSources` — full list with order, active flag, label
- `updateLeadSource(key, data)` — update label, active state
- `reorderLeadSources(keys)` — persist new order

**Admin — Pipeline Stages & Activity Types:**
- `getPipelineStageConfigs` — all stages with label, idleThreshold, order
- `updatePipelineStageConfig(key, data)` — update label/threshold
- `getActivityTypeConfigs` — all types with label, isActive, isSystem
- `updateActivityTypeConfig(key, data)` — update label/active
- `createActivityType(data)` — add new custom type

**Admin — System Config:**
- `getSystemConfig` — { fundTarget, companyName, defaultRepId }
- `updateSystemConfig(data)` — update fund target, company name

**Leadership — Additional:**
- `getTopReferrers(limit)` — referrer stats: name, count, pipeline value, funded value
- `getRedFlags` — stale/overdue active prospects sorted by days idle

## What's remaining (priority order)

1. **Admin Role Templates** — define permission sets at the template level (planned)
2. **Admin Data Hygiene** — merge duplicate people/orgs (planned)
3. **Zoho provider** (`lib/providers/zoho.ts`) — IT team builds this per `docs/zoho-provider-guide.md`

**Deferred to future releases:**
- Pinned Prospects (pipeline star/pin)
- Keyboard shortcuts (N, L, /, arrow keys, Enter, Esc)
- Dashboard Recent Activity feed (cross-prospect activity log)

## How to navigate the codebase

```
app/
  page.tsx                    — Dashboard (cockpit)
  people/page.tsx             — People directory
  person/[id]/page.tsx        — Person detail
  pipeline/page.tsx           — Pipeline table
  leadership/page.tsx         — Leadership Dashboard
  admin/page.tsx              — Admin Panel (Users, Lead Sources, Stages, Activity Types, Settings)
  api/                        — All API routes (proxy to data service)

components/
  sidebar.tsx                 — Server component: desktop sidebar + mobile nav
  sidebar-user-menu.tsx       — Desktop avatar row + Base UI popover
  sidebar-nav.tsx             — SidebarNav + MobileNav (includes user tab + sheet)
  last-viewed-bar.tsx         — Persistent last-viewed prospect bar with Quick Log
  set-last-viewed.tsx         — Sets last-viewed data on person detail visit
  dashboard/                  — Hero card, action queue, stats, create/log sheets
  person/                     — Identity bar, quick log, stage bar, profile card, etc.
  pipeline/
    pipeline-table.tsx        — Full pipeline table with filters, sorting, inline actions
    inline-quick-log.tsx      — Inline Quick Log component for pipeline rows
  leadership/
    stat-column.tsx           — 6 KPI cards + drill-down; Meetings 7d/14d/30d toggle
    pipeline-funnel.tsx       — Tapering funnel visualization
    source-roi-table.tsx      — Source attribution table
    top-referrers.tsx         — Top referrers panel (name, count, pipeline/funded value)
    red-flags.tsx             — Stale/overdue prospect panel
    drilldown-sheet.tsx       — Shared slide-out sheet for all drill-down views
  admin/
    users-tab.tsx             — User list + inline edit panel
    lead-sources-tab.tsx      — Lead source list (edit, toggle, reorder, add)
    pipeline-stages-tab.tsx   — Pipeline stage label + threshold editing
    activity-types-tab.tsx    — Activity type label, active toggle, add new
    system-settings-tab.tsx   — Fund target, company name
  ui/
    popover.tsx               — Base UI @base-ui/react/popover wrapper
    switch.tsx                — Base UI switch
    lead-source-picker.tsx    — Chip picker with frequency ordering
    date-quick-pick.tsx       — Date shortcuts (Today, Tomorrow, +3d, +7d, +14d, +30d)

lib/
  data.ts                     — DataService interface + provider loader
  providers/mock.ts           — In-memory mock (resets on server restart)
  types.ts                    — All TypeScript types
  constants.ts                — LEAD_SOURCES, PIPELINE_STAGES, ACTIVITY_TYPES, LOST_REASONS
  format.ts                   — Date/currency formatting utilities (getTodayCT, formatCurrency)
  smart-detection.ts          — detectActivityType(), detectOutcome(), hasOutcome()
```

## Mock data reference

- `p-david` — David Thornton, Pitch, $500K target, Thornton Capital
- `p-robert` — Robert Calloway, Active Engagement, relatedContacts=[p-mrs-calloway]
- `p-marcus` — Marcus Johnson, Active Engagement, no related contacts
- `p-torres` — Angela Torres, KYC/Docs, entities=[fe-4 Torres Family Trust]
- `p-huang` — Richard Huang, Prospect, collaboratorIds=["u-ken"]
- `p-grant` — William Grant, Initial Contact, assignedRepId="u-chad"
- `p-blake` — Nathan Blake, Nurture, reengageDate="2026-04-15"
- `p-park` — Michael Park, Dead, lostReason="not_accredited"
- Users: `u-chad` (Chad Cormier, rep), `u-ken` (Ken Warsaw, marketing), `u-eric` (Eric Gewirtzman, admin)

## First task for this session

[Replace this section with what you want to work on. Examples:]

- **UI tweaks** — describe what needs fixing/changing
- **New feature** — describe the feature, reference DESIGN-SPEC.md section
- **Bug fix** — describe the bug, include screenshots if possible
- **Zoho integration** — work on `lib/providers/zoho.ts` per `docs/zoho-provider-guide.md`

Always run tests before and after changes:
- `npx playwright test` (E2E, 94 tests)
- `npx tsx scripts/test-provider.ts` (provider, 33 tests)
