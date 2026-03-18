# Handoff: Next Ralph Loop — Leadership Dashboard + Admin Panel

## Context

You are working on **OwnEZ CRM** — a custom Next.js CRM for OwnEZ Capital's HNW investor pipeline.
Project is at `c:\Users\erezg\Documents\OwnEZ CRM\` on the `phase1/foundation` branch.

Read `docs/HANDOFF-PROMPT.md` first for full project context, codebase map, and mock data reference.
Read `docs/superpowers/specs/2026-03-18-leadership-admin-design.md` for the full design spec.

---

## Your One Job

Run the Ralph loop with this exact command:

```
/ralph-loop --completion-promise "LEADERSHIP_ADMIN_COMPLETE" --max-iterations 20
Read docs/superpowers/specs/2026-03-18-leadership-admin-design.md for the full implementation spec.
After completing all tasks: run npm run build (zero TS errors), then run
npx playwright test e2e/leadership-admin.spec.ts (all tests pass).
When both pass, output: LEADERSHIP_ADMIN_COMPLETE
```

---

## Task Breakdown

**Task 1 — Types + DataService Interface**
- Add `UserPermissions`, `LeadershipStats`, `FunnelStage`, `SourceROIRow`, `LeadSourceConfig` to `lib/types.ts`
- Add `permissions?: UserPermissions` to `User` interface
- Add all new DataService methods to interface in `lib/data.ts`:
  - `getLeadershipStats()`, `getMeetingsCount(days)`, `getFunnelData()`, `getSourceROI()`
  - `getDrilldownProspects(filter)`, `getDrilldownActivities(filter)`
  - `getLeadSources(opts?)`, `createLeadSource(data)`, `updateLeadSource(key, data)`, `reorderLeadSources(keys[])`
  - `updateUserPermissions(userId, perms)`, `deactivateUser(userId, reassignToId?)`
  - `getUnassignedProspects()`
- Add `hasPermission(user, key)` utility to `lib/auth.ts`

**Task 2 — Mock Provider: Implement All New Methods**
- Seed `LeadSourceConfig[]` from existing `LEAD_SOURCES` constant (all active, order = array index)
- Compute `getLeadershipStats()` from existing mock arrays (fundedInvestments, people)
- Compute `getMeetingsCount(days)` from activities filtered by type + date
- Compute `getFunnelData()` from people grouped by pipelineStage
- Compute `getSourceROI()` from people + fundedInvestments grouped by leadSource
- Implement `getDrilldownProspects` + `getDrilldownActivities` as filtered queries
- Implement `getLeadSources`, `createLeadSource`, `updateLeadSource`, `reorderLeadSources`
- Implement `updateUserPermissions`, `deactivateUser` (bulk reassign or null), `getUnassignedProspects`

**Task 3 — New API Routes**
- `GET /api/leadership/stats`
- `GET /api/leadership/funnel`
- `GET /api/leadership/source-roi`
- `GET /api/leadership/drilldown` (query: `type`, `value`, `days`)
- `GET /api/admin/users`
- `PATCH /api/admin/users/[id]/permissions`
- `PATCH /api/admin/users/[id]/deactivate` (body: `{ reassignToId?: string }`)
- `GET /api/admin/lead-sources`
- `POST /api/admin/lead-sources`
- `PATCH /api/admin/lead-sources/[key]`
- `POST /api/admin/lead-sources/reorder`
- Extend `GET /api/persons` to support `?assignedRep=unassigned` filter

**Task 4 — Leadership Page + Stat Column**
- `app/leadership/page.tsx` — server component, auth guard (role or canViewLeadership), parallel data fetch
- `components/leadership/stat-column.tsx` — 6 KPI cards, all clickable, Meetings with 7d/14d/30d toggle (client component for toggle state)
- `components/leadership/drilldown-sheet.tsx` — reusable Sheet component for all drill-downs

**Task 5 — Leadership Funnel + Source ROI**
- `components/leadership/pipeline-funnel.tsx` — tapering gold funnel, clickable rows → drilldown sheet
- `components/leadership/source-roi-table.tsx` — Source/Prospects/Funded/AUM/Conv% table, clickable rows

**Task 6 — Admin Page + Users Tab**
- `app/admin/page.tsx` — server component, admin-only auth guard, shadcn Tabs (Users | Lead Sources)
- `components/admin/users-tab.tsx` — user list, inline edit panel with role selector + permission toggles + deactivate flow
- Unassigned prospects banner (conditional, links to `/pipeline?assignedRep=unassigned`)

**Task 7 — Admin Lead Sources Tab**
- `components/admin/lead-sources-tab.tsx` — list with rename inline, add inline, reorder arrows, deactivate toggle

**Task 8 — Pipeline: Unassigned Support**
- Add `unassigned` filter option to pipeline filter bar
- Show red "Unassigned" badge on pipeline rows where `assignedRepId` is null
- Add inline rep picker on pipeline rows for reassignment

**Task 9 — E2E Tests + Build**
- Write `e2e/leadership-admin.spec.ts` covering: leadership page loads, funnel renders, drilldown sheet opens, admin users tab, permission toggles, deactivate flow, lead source add/rename/reorder/deactivate
- `npm run build` — zero TS errors
- All E2E tests pass

---

## Key Files

| File | Role |
|---|---|
| `lib/types.ts` | Add new types |
| `lib/data.ts` | Add new DataService methods to interface |
| `lib/providers/mock.ts` | Implement all new methods |
| `lib/auth.ts` | Add `hasPermission()` utility |
| `lib/constants.ts` | `LEAD_SOURCES`, `PIPELINE_STAGES`, `ACTIVE_PIPELINE_STAGES` |
| `lib/format.ts` | `formatCurrency()` — use for all dollar amounts |
| `components/sidebar-nav.tsx` | Leadership + Admin nav already present (role-gated) |
| `app/pipeline/page.tsx` | Extend for unassigned filter + badge |

## Design Tokens (match existing screens)

- Background: `bg-background` (white)
- Cards: `rounded-lg border bg-card`
- Navy text: `text-navy` / `#0b2049`
- Gold accent: `text-gold` / `#e8ba30`
- Muted labels: `text-muted-foreground`
- Funnel gold: `#e8ba30` → `#f7ecc8` (darkest at top, lightest before Funded)
- Funded row: `bg-green-50 border-green-300 text-green-700`

## Completion Check

After all 9 tasks:
1. `npm run build` — zero TypeScript errors
2. `npx playwright test e2e/leadership-admin.spec.ts` — all tests pass
3. Output: `LEADERSHIP_ADMIN_COMPLETE`
