# Handoff: Next Ralph Loop — Pipeline Inline Actions

## Context

You are working on **OwnEZ CRM** — a custom Next.js CRM for OwnEZ Capital's HNW investor pipeline.
Project is at `c:\Users\erezg\Documents\OwnEZ CRM\` on the `phase1/foundation` branch.

Read `docs/HANDOFF-PROMPT.md` first for full project context, codebase map, and mock data reference.

---

## Your One Job

Run the Ralph loop with this exact command:

```
/ralph-loop --completion-promise "PIPELINE_ACTIONS_COMPLETE" --max-iterations 20
Read docs/superpowers/specs/pipeline-inline-actions.md for the full implementation plan.
After completing all tasks: run npm run build (zero TS errors), then run
npx playwright test e2e/pipeline-inline-actions.spec.ts (all tests pass).
When both pass, output: PIPELINE_ACTIONS_COMPLETE
```

---

## What the Loop Will Implement

Full spec: `docs/superpowers/specs/pipeline-inline-actions.md` (to be written before running)
E2E tests: `e2e/pipeline-inline-actions.spec.ts` (to be written before running)

**Feature set: Pipeline Inline Actions**

From the pipeline table (`app/pipeline/page.tsx`), Chad should be able to:

1. **Quick Log from pipeline row** — each row gets a `+ Log` button; clicking expands an inline log form below the row (same `QuickLog` component, adapted for table context)
2. **Advance Stage from pipeline row** — each row gets a `→` next-stage button; clicking calls the stage API and refreshes (reuses stage-bar logic but without the full bar UI)
3. **Pin/Unpin prospect** — star icon on each row; pinned prospects appear in a fixed section at the top of the pipeline table; persisted via `PATCH /api/persons/[id]` with `{ pinned: true/false }`

**Note:** The spec file needs to be written before running the Ralph loop. Start by writing `docs/superpowers/specs/pipeline-inline-actions.md` and `e2e/pipeline-inline-actions.spec.ts`, then run the loop.

---

## Alternative Next Loops

If Pipeline Inline Actions doesn't fit your current focus, consider:

- **Leadership Dashboard** — `GET /leadership` showing AUM progress, funnel by stage, source ROI for Eric (admin role only)
- **Admin Panel** — `GET /admin/lead-sources` to manage lead source picklist values; `GET /admin/users` for user management
- **Last Viewed Bar** — a persistent horizontal strip at the top of every screen showing the 5 most recently viewed prospects (stored in `localStorage` or a session cookie)

---

## Key Files to Know

| File | Role |
|------|------|
| `app/pipeline/page.tsx` | Pipeline table — main target |
| `components/person/quick-log.tsx` | QuickLog component — reuse for inline log |
| `components/person/stage-bar.tsx` | Stage change logic — extract/reuse |
| `lib/types.ts` | DataService interface — add `pinned` field if needed |
| `lib/providers/mock.ts` | Add `pinned` to Person mock data |
| `app/api/persons/[id]/stage/route.ts` | Stage PATCH (already validates nurture/dead) |
| `app/api/test-reset/route.ts` | Resets mock data for Playwright |

---

## Completion Check

After all tasks:
1. `npm run build` — zero TypeScript errors
2. `npx playwright test e2e/pipeline-inline-actions.spec.ts` — all tests pass
3. Output: `PIPELINE_ACTIONS_COMPLETE`
