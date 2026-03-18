# OwnEZ CRM — Handoff Prompt for New Claude Code Session

Copy everything below the divider into a new Claude Code chat to resume development with full context.

---

I'm continuing development on the OwnEZ CRM. Read these files first to understand the current state:

1. `CLAUDE.md` — project instructions (brief, read first)
2. `DESIGN-SPEC.md` — full design specification v1.1 (updated 2026-03-18)
3. `docs/HANDOFF.md` — what was built across all sessions, key technical decisions, what's remaining
4. `docs/zoho-provider-guide.md` — Zoho integration guide (updated 2026-03-18, for IT team reference)

## What the system is

Custom Next.js CRM for OwnEZ Capital's HNW investor pipeline. Primary user is Chad (Investment Relationship Manager). Design philosophy: "pilot's cockpit" — show Chad exactly what to do next, minimize friction.

- **Tech:** Next.js App Router on Vercel, Tailwind + shadcn/ui
- **Data:** Mock provider (`lib/providers/mock.ts`, in-memory, `globalThis` singleton) for V1; Zoho CRM for V2
- **Single abstraction point:** `lib/data.ts` — UI never calls Zoho directly
- **Dev server:** `npm run dev` (mock data by default)
- **Tests:** `npx playwright test` (55 E2E tests — some may need updating after recent changes)
- **Login:** `chad` / `password123` (rep), `eric` / `password123` (admin)

## Key design tokens
- **Navy** `#0b2049` — sidebar, headers
- **Gold** `#e8ba30` — sole accent, CTAs, active states
- **Red** — stale/overdue only
- **Green** — funded/healthy only
- Jony Ive simplicity. Pill buttons, generous whitespace, no borders where spacing works.

## What was just built (2026-03-18 session)

- **Person Detail** — Reordered: phone/email in sticky cockpit, inline editing for phone, email, org, referrer, funding entities, investment/growth targets
- **Stage bar** — Symmetric equal-width pill design (was asymmetric grid)
- **Lead Source** — Chip picker replacing dropdown; frequency-ordered; "More" expansion + "+ Add new"; maps 1:1 to Zoho picklist keys
- **Create Prospect** — Success screen with two options (Back to Dashboard / Open Profile) instead of auto-navigate; auto-creates "Prospect Added" activity
- **Post-log "What's Next?"** — Detail starts empty with old value as gray placeholder; "Advance stage" clearly clickable
- **Log Activity (Dashboard)** — Shows prospect's timeline when prospect selected
- **Outcome toggle** — Only shown for outreach types (Call, Email, Text, LinkedIn) — not Note, Meeting, Document
- **People page** — Back to Dashboard link added
- **Docs** — DESIGN-SPEC.md v1.1, HANDOFF.md, zoho-provider-guide.md, this file all updated

## Known issues / pending work

- **Smart detection** — `lib/smart-detection.ts` logic is correct (regexes look good). A prior bug report said "always shows note" — needs re-testing to confirm resolved or diagnose the real source
- **E2E tests** — Some tests may be out of date given the UI changes. Run `npx playwright test` and update failing tests.
- **Leadership Dashboard** — Not built yet (`/leadership`)
- **Admin Panel** — Not built yet (`/admin`) — needed for lead source management
- **Lead source "+ Add new"** — Saves to UI state for the session but doesn't persist to `lib/constants.ts` yet — full persistence needs admin panel or file write logic
- **Last Viewed Bar** — Global persistent bar across all screens (not built)
- **Keyboard shortcuts** — Not built
- **Pipeline inline actions** — Quick log, advance stage from pipeline rows

## How to navigate the codebase

```
app/
  page.tsx                    — Dashboard (cockpit)
  people/page.tsx             — People directory
  person/[id]/page.tsx        — Person detail
  pipeline/page.tsx           — Pipeline table
  api/                        — All API routes (proxy to data service)

components/
  dashboard/                  — Dashboard components (hero card, action queue, create/log sheets)
  person/                     — Person detail components (identity bar, quick log, stage bar, etc.)
  ui/                         — Shared components (lead-source-picker, date-quick-pick, etc.)
  sidebar.tsx                 — Desktop sidebar + mobile bottom nav

lib/
  data.ts                     — DataService interface + provider loader (globalThis singleton)
  providers/mock.ts           — Mock provider (in-memory, resets on server restart)
  smart-detection.ts          — detectActivityType(), detectOutcome(), hasOutcome()
  types.ts                    — All TypeScript types
  constants.ts                — LEAD_SOURCES, STAGES, ACTIVITY_TYPES
  format.ts                   — Date/currency formatting utilities
```

[Then state what you want to work on next]
