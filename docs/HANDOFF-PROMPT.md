# OwnEZ CRM — Handoff Prompt for New Claude Code Session

Copy everything below the divider into a new Claude Code chat to resume development with full context.

---

I'm continuing development on the OwnEZ CRM. Read these files first to understand the current state:

1. `CLAUDE.md` — project instructions (brief, read first)
2. `docs/HANDOFF.md` — what was built across all sessions, key technical decisions, what's remaining
3. `docs/zoho-provider-guide.md` — Zoho integration guide (for IT team reference, also documents DataService interface)

## What the system is

Custom Next.js CRM for OwnEZ Capital's HNW investor pipeline. Primary user is Chad (Investment Relationship Manager). Design philosophy: "pilot's cockpit" — show Chad exactly what to do next, minimize friction.

- **Tech:** Next.js App Router on Vercel, Tailwind + shadcn/ui
- **Data:** Mock provider (`lib/providers/mock.ts`, in-memory, `globalThis` singleton) for V1; Zoho CRM for V2
- **Single abstraction point:** `lib/data.ts` — UI never calls Zoho directly
- **Dev server:** `npm run dev` (mock data by default)
- **Tests:** `npx playwright test` (E2E tests — run before and after changes)
- **Login:** `chad` / `password123` (rep), `eric` / `password123` (admin)

## Key design tokens
- **Navy** `#0b2049` — sidebar, headers
- **Gold** `#e8ba30` — sole accent, CTAs, active states
- **Red** — stale/overdue only
- **Green** — funded/healthy only
- Jony Ive simplicity. Pill buttons, generous whitespace, no borders where spacing works.
- All inline forms — never modals. Pattern: same component, editing state replaces display state.

## Current state (as of 2026-03-18)

**Fully built and working:**
- Dashboard (hero card, action queue, stats footer, create prospect sheet, log activity sheet)
- Pipeline view (full table with stage filter)
- People directory
- Person Detail page — complete:
  - Identity bar (name, phone/email with visible-pencil inline edit, stage badge, target)
  - Quick Log (collapsed by default, smart type detection, post-log next action prompt)
  - Next Action bar (overdue indicator, inline edit)
  - Stage bar (symmetric pill design, nurture requires re-engage date, dead requires lost reason, post-stage next action prompt, funded flow creates entity + investment record)
  - Profile card (organization as inline row, financials with committed nudge, lead source chip picker, rep assignment, collaborators with add/remove)
  - Activity timeline (filterable by type)
  - Relationships section (referrer, funding entities, related contacts — all editable inline)
  - Background notes

**Key DataService methods (all implemented in mock, all need Zoho impl):**
- `getPerson`, `getPersons`, `updatePerson`, `createPerson`, `searchPeople`
- `getActivities`, `createActivity`, `getRecentActivities`
- `getUsers`, `getUserByUsername`
- `getOrganizations`, `createOrganization`
- `getFundingEntities`, `createFundingEntity`, `deleteFundingEntity`
- `createFundedInvestment` — creates a FundedInvestment record linked to entity + person
- `addRelatedContact`, `removeRelatedContact`
- `getReferrer`, `setReferrer`, `removeReferrer`
- `getLeadSourceCounts`
- `getDashboardStats`

## What's remaining (priority order)

1. **Pipeline inline actions** — quick log + advance stage from pipeline rows (no navigation required)
2. **Pinned Prospects** — star/pin on pipeline rows, pinned section at top
3. **Leadership Dashboard** (`/leadership`) — AUM progress, funnel visualization, source ROI
4. **Admin Panel** (`/admin`) — user management, lead source management
5. **Last Viewed Bar** — persistent most-recent persons bar across all screens
6. **Keyboard shortcuts** — N (new), L (log), /, arrow keys, Enter, Esc
7. **Zoho provider** (`lib/providers/zoho.ts`) — IT team builds this per `docs/zoho-provider-guide.md`

## How to navigate the codebase

```
app/
  page.tsx                    — Dashboard (cockpit)
  people/page.tsx             — People directory
  person/[id]/page.tsx        — Person detail
  pipeline/page.tsx           — Pipeline table
  api/                        — All API routes (proxy to data service)

components/
  dashboard/                  — Dashboard components
  person/                     — Person detail components
    identity-bar.tsx          — Name, phone/email (inline edit with visible pencil)
    quick-log.tsx             — Collapsed log form, smart detection
    stage-bar.tsx             — Stage pills, nurture/dead prompts, funded flow
    profile-card.tsx          — Org, financials, lead source, rep, collaborators
    related-contacts.tsx      — Related contacts with add/remove
    relationships-section.tsx — Referrer, funding entities, related contacts
  ui/
    lead-source-picker.tsx    — Chip picker with frequency ordering
    date-quick-pick.tsx       — Date shortcuts (Today, Tomorrow, +3d, +7d, +14d, +30d)

lib/
  data.ts                     — DataService interface + provider loader
  providers/mock.ts           — In-memory mock (resets on server restart)
  types.ts                    — All TypeScript types
  constants.ts                — LEAD_SOURCES, PIPELINE_STAGES, ACTIVITY_TYPES, LOST_REASONS, NEXT_ACTION_TYPES
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

[Then state what you want to work on next]
