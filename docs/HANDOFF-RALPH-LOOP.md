# Handoff: Next Ralph Loop — Leadership Dashboard + Admin Panel

## Context

You are working on **OwnEZ CRM** — a custom Next.js CRM for OwnEZ Capital's HNW investor pipeline.
Project is at `c:\Users\erezg\Documents\OwnEZ CRM\` on the `phase1/foundation` branch.

Read `docs/HANDOFF-PROMPT.md` first for full project context, codebase map, and mock data reference.

---

## Your One Job

Run the Ralph loop with this exact command:

```
/ralph-loop --completion-promise "LEADERSHIP_ADMIN_COMPLETE" --max-iterations 20
Read docs/superpowers/specs/leadership-admin.md for the full implementation plan.
After completing all 9 tasks: run npm run build (zero TS errors), then run
npx playwright test e2e/leadership-admin.spec.ts (all tests pass).
When both pass, output: LEADERSHIP_ADMIN_COMPLETE
```

---

## What the Loop Will Implement

Full spec: `docs/superpowers/specs/leadership-admin.md`
E2E tests:  `e2e/leadership-admin.spec.ts`

**Task 1 — DataService: New Methods + Types**
- Add `LeadershipStats`, `ReferrerStats`, `SystemConfig` types to `lib/types.ts`
- Add `getLeadershipStats()`, `getTopReferrers()`, `getSystemConfig()`, `updateSystemConfig()`, `createUser()`, `updateUser()`, `getPicklistValues()`, `updatePicklistValues()` to DataService interface
- Implement all in `lib/providers/mock.ts`

**Task 2 — Leadership Dashboard: Page + Layout**
- New route `app/leadership/page.tsx` — admin-only, parallel data fetch, 3-row grid layout

**Task 3 — Leadership Dashboard: Components**
- `components/leadership/aum-progress-bar.tsx` — $60M → funded YTD → $105M bar
- `components/leadership/funnel-chart.tsx` — horizontal bars by pipeline stage
- `components/leadership/source-attribution-table.tsx` — source | count | pipeline $ | funded $
- `components/leadership/top-referrers-table.tsx` — referrer | referrals | pipeline $ | funded $
- `components/leadership/red-flags-panel.tsx` — stale/overdue list or green "Pipeline Healthy"

**Task 4 — Add Leadership Link to Sidebar**
- `BarChart2` icon, admin-only nav item in `components/sidebar.tsx`

**Task 5 — Admin Panel: Page + Tabs Layout**
- New route `app/admin/page.tsx` — admin-only, tabs: System Settings | Users | Lead Sources

**Task 6 — Admin: System Settings Tab**
- `components/admin/system-settings-tab.tsx` — company name, AUM baseline/target
- New API route `app/api/admin/system-config/route.ts` (PATCH)

**Task 7 — Admin: Users Tab**
- `components/admin/users-tab.tsx` — list users, inline edit name/role, deactivate, add user form
- New API routes `app/api/admin/users/route.ts` (POST) and `app/api/admin/users/[userId]/route.ts` (PATCH)

**Task 8 — Admin: Lead Sources Tab**
- `components/admin/lead-sources-tab.tsx` — list sources, add new source inline
- New API route `app/api/admin/lead-sources/route.ts` (PATCH)

**Task 9 — Add Admin Link to Sidebar**
- `Settings` icon, admin-only nav item in `components/sidebar.tsx`

---

## Key Files to Know

| File | Role |
|------|------|
| `lib/types.ts` | DataService interface — add new methods + types |
| `lib/providers/mock.ts` | Mock implementations — compute stats from existing mock arrays |
| `lib/constants.ts` | LEAD_SOURCES, PIPELINE_STAGES, STAGE_LABELS — used by leadership components |
| `components/sidebar.tsx` | Add Leadership + Admin nav items (admin-only) |
| `lib/format.ts` | `formatCurrency()` — use for all dollar amounts |
| `app/api/persons/[id]/stage/route.ts` | Reference for requireSession() pattern |
| `middleware.ts` | Route protection pattern reference |
| `@/components/ui/tabs` | shadcn Tabs component — use for admin panel |

## Mock Data Reference (for computing leadership stats)

The existing mock data has everything needed:
- **12 prospects** spread across pipeline stages → funnel chart
- **Various lead sources** (M&A Attorney, CPA Referral, LinkedIn, etc.) → source attribution
- **Funded investments** with amounts and dates → AUM funded YTD
- **Referrer links** (p-robert has a referrer) → top referrers
- **Overdue/stale prospects** → red flags panel
- `aumBaseline: 60_000_000`, `aumTarget: 105_000_000` (hardcoded in mock for now)

---

## Completion Check

After all 9 tasks:
1. `npm run build` — zero TypeScript errors
2. `npx playwright test e2e/leadership-admin.spec.ts` — all tests pass
3. Output: `LEADERSHIP_ADMIN_COMPLETE`
