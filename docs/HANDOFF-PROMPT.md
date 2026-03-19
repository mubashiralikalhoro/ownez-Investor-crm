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
- **Tests:** `npx playwright test` (E2E tests — run before and after changes)
- **Login:** `chad` / `password123` (rep), `eric` / `password123` (admin), `ken` / `password123` (marketing)

## Key design tokens

- **Navy** `#0b2049` — sidebar, headers
- **Gold** `#e8ba30` — sole accent, CTAs, active states
- **Red** — stale/overdue only
- **Green** — funded/healthy only
- Jony Ive simplicity. Pill buttons, generous whitespace, no borders where spacing works.
- All inline forms — never modals. Pattern: same component, editing state replaces display state.
- Base UI (not Radix) for popover, sheet, dialog primitives.

## Current state (as of 2026-03-19)

**Fully built and working (53 E2E tests passing):**

- **Auth:** Login, session (JWT cookie), middleware protection, logout
- **User Menu:** Desktop sidebar avatar-row popover + mobile 4th-tab bottom sheet (sign out from both)
- **Dashboard** (cockpit): hero card, action queue, stats footer, create prospect sheet, log activity sheet
- **Pipeline View:** full table with stage filter
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
- **Leadership Dashboard** (`/leadership`): stat column (AUM, Fund Target progress, Funded YTD, Active, Pipeline Value, Meetings with 7/14/30d toggle), Pipeline Funnel, Source ROI Table, drill-down sheets for all cards/rows
- **Admin Panel** (`/admin`): Users tab (inline edit panel, role templates, permission toggles, deactivate with reassign), Lead Sources tab (inline label edit, active toggle, drag-reorder, add new)

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

**Admin Lead Sources:**
- `getLeadSources` — full list with order, active flag, label
- `updateLeadSource(key, data)` — update label, active state
- `reorderLeadSources(keys)` — persist new order

## What's remaining (priority order)

1. **Pipeline inline actions** — quick log + advance stage from pipeline rows (no navigation required)
2. **Pinned Prospects** — star/pin on pipeline rows, pinned section at top
3. **Leadership Dashboard gaps** — Top Referrers panel, Red Flags panel, AUM vs. $105M target, Ken partial-access
4. **Admin Panel gaps** — Role Templates, Pipeline Stage Config, Activity Type mgmt, Data Hygiene, System Settings
5. **Last Viewed Bar** — persistent most-recent prospect bar across all screens
6. **Keyboard shortcuts** — N (new), L (log), /, arrow keys, Enter, Esc
7. **Zoho provider** (`lib/providers/zoho.ts`) — IT team builds this per `docs/zoho-provider-guide.md`

## How to navigate the codebase

```
app/
  page.tsx                    — Dashboard (cockpit)
  people/page.tsx             — People directory
  person/[id]/page.tsx        — Person detail
  pipeline/page.tsx           — Pipeline table
  leadership/page.tsx         — Leadership Dashboard
  admin/page.tsx              — Admin Panel (Users + Lead Sources tabs)
  api/                        — All API routes (proxy to data service)

components/
  sidebar.tsx                 — Server component: desktop sidebar + mobile nav
  sidebar-user-menu.tsx       — Desktop avatar row + Base UI popover
  sidebar-nav.tsx             — SidebarNav + MobileNav (includes user tab + sheet)
  dashboard/                  — Hero card, action queue, stats, create/log sheets
  person/                     — Identity bar, quick log, stage bar, profile card, etc.
  leadership/
    stat-column.tsx           — 6 KPI cards + drill-down; Meetings 7d/14d/30d toggle
    pipeline-funnel.tsx       — Tapering funnel visualization
    source-roi-table.tsx      — Source attribution table
    drilldown-sheet.tsx       — Shared slide-out sheet for all drill-down views
  admin/
    users-tab.tsx             — User list + inline edit panel
    lead-sources-tab.tsx      — Lead source list (edit, toggle, reorder, add)
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

1. **Push all changes to GitHub** — commit everything on the current branch (`phase1/foundation`) and push to origin.
2. **Gap analysis** — compare what's been built against `DESIGN-SPEC.md` to identify what's missing. Present a prioritized list.
3. **Based on Eric's decision** — continue development using a Ralph Loop (`/ralph-loop`) to complete the next priority items.
