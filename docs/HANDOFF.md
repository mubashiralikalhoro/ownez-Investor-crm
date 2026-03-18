# OwnEZ CRM — Development Handoff

## Project State (as of 2026-03-18)

Custom Next.js CRM frontend for OwnEZ Capital's HNW investor pipeline. Uses Zoho CRM as the database via API. Currently running with mock data provider — all features work without Zoho connection.

## What's Been Built

### Phase 1 Foundation (prior sessions)
- Next.js App Router on Vercel, Tailwind + shadcn/ui
- Data service abstraction layer (`lib/data.ts`) with mock provider (`lib/providers/mock.ts`)
- Auth (simple JWT login), sidebar nav, all routes
- Dashboard, Pipeline view, Person Detail, People directory
- Quick Log with smart activity type detection (`lib/smart-detection.ts`)
- 55 Playwright E2E tests — all passing at start of this session

### Dashboard Cockpit Redesign (prior session)
- **Hero card** — #1 priority prospect (overdue → stale → due today → nurture re-engage)
- **Action Items queue** — unified ranked list replacing separate "Today's Actions" and "Needs Attention", max 8 with "Show N more"
- **Stats footer** — compact 4-column bar at bottom (was 4 large cards at top)
- **"+ Prospect" button** — slide-out sheet with create prospect form (POST /api/persons)
- **"Log Activity" button** — slide-out sheet with prospect search + quick log
- **Mobile responsive** — bottom tab bar, full-width layout, two-line queue rows

### UX/UI Polish Session (2026-03-18 — this session)

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

## File Map (key files in this session)

```
lib/
  smart-detection.ts          — Added hasOutcome(); reviewed detectActivityType()
  data.ts                     — Added getLeadSourceCounts(); createPerson() auto-logs Prospect Added
  types.ts                    — No changes this session

app/
  page.tsx                    — Dashboard: Log Activity sheet + timeline preview
  people/page.tsx             — Added back-to-dashboard link
  person/[id]/page.tsx        — Reordered: cockpit → quick log → next action → profile → timeline
  api/
    lead-sources/route.ts     — NEW: GET returns LEAD_SOURCES sorted by frequency (calls getLeadSourceCounts)
    persons/search/route.ts   — NEW: GET ?q= for people autocomplete (calls searchPeople)
    persons/[id]/referrer/    — NEW: POST link referrer, DELETE unlink referrer
    persons/[id]/funding-entities/ — NEW: POST create entity, DELETE remove entity
    organizations/route.ts    — NEW: POST create org (for inline org creation)

components/
  dashboard/
    create-prospect-sheet.tsx — Success screen with two options; date fix; auto-activity
    dashboard-header.tsx      — (from prior session, no changes this session)
  person/
    identity-bar.tsx          — Phone/email prominently shown, inline editing
    quick-log.tsx             — "More options" outcome conditional; post-log flow fixes
    next-action-bar.tsx       — Advance stage clearly clickable; post-confirm state view
    stage-bar.tsx             — Symmetric equal-width pill design
    organization-section.tsx  — Fully editable: autocomplete-or-create, Enter key, named remove
    funding-entities.tsx      — Fully editable: add inline, remove
    referrer-section.tsx      — Fully editable: people search autocomplete
    prospect-fields.tsx       — Inline editing for Phone, Email, Investment/Growth Target
  ui/
    lead-source-picker.tsx    — NEW: chip picker, categories, frequency ordering, "More" + "Add new"
    date-quick-pick.tsx       — Fixed: single selection, default = tomorrow

docs/
  DESIGN-SPEC.md              — Updated version 1.1 (all changes from this session)
  zoho-provider-guide.md      — Updated: new endpoints, getLeadSourceCounts, Prospect Added
  HANDOFF.md                  — This file
  HANDOFF-PROMPT.md           — New: handoff prompt for next Claude Code session
```

---

## What's NOT Built Yet

From DESIGN-SPEC.md, these features are still pending:
- **Smart detection bug**: `detectActivityType()` may have a rendering issue in the Quick Log UI — code logic is correct but worth re-testing. Prefix patterns look correct in the file.
- **Leadership Dashboard** (`/leadership`) — AUM progress, funnel, source ROI
- **Admin Panel** (`/admin`) — user management, stage config, lead source management
- **Last Viewed Bar** — persistent bar across all screens
- **Keyboard shortcuts** — N, L, /, arrow keys, Enter, S, P, Esc, ? overlay
- **Pipeline inline actions** — quick log, advance stage, pin/unpin from pipeline rows
- **Pinned Prospects** — star icon on pipeline rows
- **Duplicate detection** — autocomplete-or-create on prospect Full Name
- **Create Prospect from People page** — currently only accessible from dashboard
- **Zoho provider** (`lib/providers/zoho.ts`) — IT team builds this
- **Mobile Quick Log** — floating action button
- **Daily overdue email** — scheduled notification to Chad
- **Lead Source admin management** — currently managed via `lib/constants.ts`; future admin panel section

---

## How to Run

```bash
npm run dev          # Start dev server (mock data)
npm run build        # Production build
npx playwright test  # Run E2E tests (55 passing at start of session — may drift during active dev)
```

Login: `chad` / `password123` (rep), `eric` / `password123` (admin), `ken` / `password123` (marketing)

---

## Prompt for New Session

See `docs/HANDOFF-PROMPT.md` for a copy-paste prompt to start a new Claude Code session with full context.
