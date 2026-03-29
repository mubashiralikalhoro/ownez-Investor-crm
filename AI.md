# OwnEZ Investor CRM — AI / engineer context

This document summarizes **product intent**, **business rules**, and **code structure** so assistants and developers can work in the repo without rediscovering everything from scratch.

---

## What this app is

**OwnEZ Capital–style investor pipeline CRM**: prospects move through funding stages, activities are logged, relationships (referrers, related contacts) and organizations are modeled, and **Leadership** / **Admin** surfaces expose aggregates and configuration.

**Current data layer**: in-memory **mock** implementation (`demoData`) implementing a single `DataService` contract. There is **no real database or API** in this branch; `getDataService()` is the seam to swap in Neon, Zoho, or another provider later.

**Auth**: **not implemented**. `getSession()` in `src/lib/session.ts` returns a fixed demo user (admin). The login page is a UI shell that navigates to `/` without verifying credentials.

---

## Tech stack

| Layer | Choice |
|--------|--------|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4, design tokens in `src/app/globals.css` |
| UI | shadcn-style components (`src/components/ui/`), Lucide icons, Base UI primitives |
| Aliases | `@/*` → `src/*` (`tsconfig.json`) |

---

## Repository layout

```
src/
  app/
    layout.tsx              # Root: fonts, metadata, globals.css
    globals.css
    login/page.tsx          # Client-only sign-in shell (no real auth)
    (shell)/                # Main app chrome: sidebar + last-viewed bar
      layout.tsx
      page.tsx              # Dashboard
      pipeline/, people/, leadership/, admin/
      person/[id]/          # Person detail (dynamic)
  components/
    ui/                     # Primitives (button, sheet, table, …)
    dashboard/, pipeline/, people/, person/, leadership/, admin/
    sidebar*.tsx, last-viewed-bar.tsx, set-last-viewed.tsx
  data/
    store.ts                # Exports `demoData` singleton
    index.ts                # `getDataService()`, re-exports
    demo-internal.ts        # Mock `DataService` + seed data + `enrichPerson`
    leadership-drilldown.ts # Client/server helper for leadership drill-downs
  lib/
    types.ts                # Domain types + `DataService` interface
    constants.ts            # Pipeline stages, lead sources, activity types, …
    stale.ts                # Stale / overdue / days-since-touch
    smart-detection.ts      # Heuristics for activity type + outcome from free text
    format.ts               # Currency, dates, `getTodayCT()`
    session.ts              # Demo session
    utils.ts                # `cn()` etc.
```

**Config / tooling**: `next.config.ts`, `eslint.config.mjs` (flat config + `eslint-config-next`), `components.json` (shadcn paths under `src/`).

---

## Domain model (concise)

Defined mainly in `src/lib/types.ts`.

- **Person**: core record; `roles` can include `prospect`, `referrer`, `related_contact`, `funded_investor`. Prospects have `pipelineStage`, targets, commitments, next action, lead source, assignment, notes, lost reason / re-engage when relevant.
- **Organization**: optional link from a person; type + notes.
- **Activity**: logged touch (call, email, meeting, note, …), `source` (`manual` | `zoho_telephony` | `o365_sync`), date/time, outcome, detail.
- **FundingEntity** / **FundedInvestment**: entities and deployed capital for funded investors.
- **User**: reps / marketing / admin; optional `permissions` for feature flags.
- **PersonWithComputed**: person + resolved names, `daysSinceLastTouch`, `isStale`, `isOverdue`, `activityCount`, `referrerName`.

**Relationships**:

- **ReferrerLink**: one referrer per prospect in the mock (last write wins on `addReferrer`).
- **RelatedContactLink**: many related contacts with a free-text `role`.

---

## Business logic

### Pipeline stages

Order and labels live in `PIPELINE_STAGES` in `src/lib/constants.ts`. Each active stage can have an **`idleThreshold`** (days without a qualifying touch).

- **`ACTIVE_PIPELINE_STAGES`**: open pipeline (excludes `funded`, `nurture`, `dead`).
- **`COMMITTED_STAGES`**: `soft_commit`, `commitment_processing`, `kyc_docs`.
- **`INACTIVE_STAGES`**: `nurture`, `dead`, `funded` — excluded from stale/overdue logic.

Admin can adjust labels and idle thresholds via `DataService` pipeline config (backed by mock arrays in `demo-internal.ts`).

### “Touches” and recency

`TOUCH_ACTIVITY_TYPES` lists activity types that count as engagement for **days since last touch** and **activity count** on `PersonWithComputed` (`enrichPerson` in `demo-internal.ts`).

`computeDaysSinceLastTouch` (`stale.ts`): newest qualifying activity date vs **today in America/Chicago** (`TIMEZONE`, `getTodayCT()`).

### Stale vs overdue

Both are computed in `stale.ts` and attached in `enrichPerson`.

- **Stale**: person has an **active** stage, `daysSinceLastTouch` ≥ that stage’s `idleThreshold`, and **no** `nextActionDate` strictly in the **future** (future next action suppresses stale).
- **Overdue**: active stage, `nextActionDate` set, and that date is **strictly before** today (CT).

**Red flags** (`getRedFlags`): active prospects where `isStale || isOverdue`, sorted by `daysSinceLastTouch` descending.

### Quick log / smart detection

`smart-detection.ts`: `detectActivityType` and `detectOutcome` infer activity type and connected vs attempted from free-text (prefix rules, then keyword rules; default `note`). Used where users type a quick log line without picking a type.

### Dashboard stats (`getDashboardStats`)

- **activePipelineCount**: prospects in `ACTIVE_PIPELINE_STAGES`.
- **pipelineValue**: sum of `initialInvestmentTarget` for those prospects.
- **committedValue**: sum of `committedAmount` for people in `COMMITTED_STAGES`.
- **fundedYTD**: sum of `FundedInvestment.amountInvested` where `investmentDate` is on or after **Jan 1 of the current calendar year** (using `getTodayCT()`).

### Leadership stats and drill-downs

- **LeadershipStats**: total AUM from all funded investments, `fundTarget` from system config, **count** of investments YTD, active pipeline count/value, etc.
- **Funnel**: counts/value by stage for prospects + funded investors in selected stages.
- **Source ROI**: groups by `leadSource`; conversion % = funded count / prospect count in that bucket; AUM from investments on funded persons.
- **Drill-downs**: `runLeadershipDrilldown` (`leadership-drilldown.ts`) maps UI actions to `getDrilldownProspects` / `getDrilldownActivities` on `demoData`.

### People list filters

`getPeople` supports roles, stages, lead sources, assigned rep, unassigned, stale/overdue only (`staleOnly`), and name/org/email search.

### Admin / config (mock)

- **Lead sources**: CRUD-ish + reorder; new keys slugified from labels.
- **Activity types**: toggle/label custom types; `stage_change` / `reassignment` are **system** and not editable.
- **Users**: permissions object, deactivate with optional prospect reassignment.
- **System config**: e.g. `fundTarget`, `companyName`, `defaultRepId`.

---

## UI structure and routing

| Route | Purpose |
|--------|---------|
| `/` | Dashboard: stats, queues, recent activity |
| `/pipeline` | Table-oriented pipeline view |
| `/people` | Search / browse people |
| `/person/[id]` | Person detail: profile, stage, activities, funding, relationships |
| `/leadership` | KPIs, funnel, source ROI, referrers, red flags (nav: marketing + admin) |
| `/admin` | Tabs: users, lead sources, pipeline stages, activity types, system settings (admin only) |
| `/login` | Visual login; no backend check |

**Shell**: `src/app/(shell)/layout.tsx` wraps pages with `Sidebar` (desktop) / `MobileNav` (bottom) and `LastViewedBar`. **Role-based nav** is in `sidebar-nav.tsx` (`rep` vs `marketing` vs `admin`).

**Data access pattern**: Server Components call `getDataService()` from `src/data/index.ts` and await methods; client components that must mutate use `demoData` from `@/data/store` and `router.refresh()` (acceptable only while the app is mock-backed).

---

## Extension points (for a real backend)

1. **Implement `DataService`** (or a narrower port per feature) against your database/API.
2. **Change `getDataService()`** in `src/data/index.ts` to return that implementation (env-driven switch is typical).
3. **Replace `getSession()`** with real auth (cookies/JWT/session) and gate routes via middleware if needed.
4. **Stop importing `demoData` in client components** once mutations go through Server Actions or API routes — keep a single server-side data boundary.

---

## Commands

- `npm run dev` — development server  
- `npm run build` — production build  
- `npm run lint` — ESLint (flat config)  
- `npm start` — serve production build  

---

*Last updated to match the `src/` App Router layout and mock `DataService` implementation.*
