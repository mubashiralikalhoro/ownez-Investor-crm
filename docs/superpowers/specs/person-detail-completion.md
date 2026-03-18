# Person Detail — Completion Plan

**Status:** Ready for execution
**Tests:** `e2e/person-detail-completion.spec.ts`
**Verify after each task:** `npm run build` (zero TS errors)

---

## Task 1 — Related Contacts: Add & Remove

**What:** `components/person/related-contacts.tsx` is read-only. Make it editable.

**UI changes (`related-contacts.tsx`):**
- Make the component `"use client"` and accept `personId: string` as a new prop (pass from `relationships-section.tsx` which already has `person.id`)
- Below the contacts list, add an "Add Contact" button
- Clicking opens an inline form (same pattern as `referrer-section.tsx`):
  - People search input → `GET /api/persons/search?q=` — debounced, shows dropdown results
  - Role text input (free text, e.g. "CPA", "Spouse")
  - Confirm button calls `POST /api/persons/[id]/related-contacts` with `{ contactId, role }`
  - Cancel clears the form
- Each contact row gets an `×` remove button → `DELETE /api/persons/[id]/related-contacts/[contactId]`
- After any mutation: `router.refresh()`

**New API routes:**
- `app/api/persons/[id]/related-contacts/route.ts`
  ```
  POST: body { contactId: string, role: string }
  → requireSession()
  → ds.addRelatedContact(id, contactId, role)
  → revalidatePath(`/person/${id}`)
  → return { success: true }
  ```
- `app/api/persons/[id]/related-contacts/[contactId]/route.ts`
  ```
  DELETE:
  → requireSession()
  → ds.removeRelatedContact(id, contactId)
  → revalidatePath(`/person/${id}`)
  → return { success: true }
  ```

**DataService additions (`lib/types.ts`):**
```ts
removeRelatedContact(prospectId: string, contactId: string): Promise<void>;
```

**Mock implementation (`lib/providers/mock.ts`):**
```ts
async removeRelatedContact(prospectId, contactId) {
  relatedContactLinks = relatedContactLinks.filter(
    (l) => !(l.prospectId === prospectId && l.contactId === contactId)
  );
}
```
Also update `resetData()` if `relatedContactLinks` needs re-snapshot (check if it's already in the initial snapshot).

---

## Task 2 — Collaborators Field

**What:** `person.collaboratorIds` exists in the type but is not shown or editable anywhere.

**UI changes (`components/person/prospect-fields.tsx`):**
- After the Assigned Rep row, add a Collaborators section
- Display: look up each ID in `users` prop → show name with `×` remove button (if `canEdit`)
- Empty state: muted "—" or "None"
- Add button (if `canEdit`): a `<select>` dropdown showing users not in `collaboratorIds` and not the `assignedRepId`
  - Selecting a user immediately calls `PATCH /api/persons/[id]` with `{ collaboratorIds: [...existing, newId] }`
- Remove `×`: calls `PATCH /api/persons/[id]` with `{ collaboratorIds: existing.filter(id !== removed) }`
- Same label/row style: `text-xs text-muted-foreground w-32 shrink-0` for "Collaborators" label
- After any mutation: `router.refresh()`

**No new API routes** — reuses existing `PATCH /api/persons/[id]`.

---

## Task 3 — Reassignment Auto-Log

**What:** Admin changing Assigned Rep currently silently patches the person. Should auto-log a Reassignment activity.

**New API route (`app/api/persons/[id]/rep/route.ts`):**
```
PATCH: body { assignedRepId: string }
→ requireSession() — verify admin role (session.role === "admin")
→ ds.getPerson(id) — get oldAssignedRepId
→ get old rep name from users: ds.getUsers().find(u => u.id === oldId)
→ get new rep name from users
→ ds.updatePerson(id, { assignedRepId: newRepId })
→ ds.createActivity(id, {
    activityType: "reassignment",
    source: "manual",
    date: getTodayCT(),
    time: current CT time,
    outcome: "connected",
    detail: `Reassigned from ${oldRepName} to ${newRepName}`,
    documentsAttached: [],
    loggedById: session.userId,
    annotation: null,
  })
→ revalidatePath(`/person/${id}`)
→ return { success: true }
```

**Component change (`components/person/prospect-fields.tsx`):**
- Change the Assigned Rep `<select>` onChange from `saveField("assignedRepId", ...)` to:
  ```ts
  fetch(`/api/persons/${person.id}/rep`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignedRepId: e.target.value }),
  }).then(() => { setEditing(null); router.refresh(); });
  ```

---

## Task 4 — Nurture Stage: Re-engage Date Required

**What:** Clicking Nurture in the stage bar should prompt for a Re-engage Date before saving.

**UI changes (`components/person/stage-bar.tsx`):**
- Add local state: `nurturePromptOpen: boolean`, `nurtureDate: string` (default: today + 30 days in CT)
- When user clicks Nurture button: instead of calling the API, set `nurturePromptOpen = true`
- Show inline form within the stage picker card:
  ```
  Re-engage Date
  [date input — default +30d]
  [Move to Nurture]  [Cancel]
  ```
- On confirm: call `PATCH /api/persons/[id]/stage` with `{ newStage: "nurture", reengageDate }`
- Cancel: reset `nurturePromptOpen = false`

**API route change (`app/api/persons/[id]/stage/route.ts`):**
- Accept `reengageDate?: string` in request body
- If `newStage === "nurture"` and no `reengageDate`: return 400 `{ error: "reengageDate required for Nurture" }`
- Pass `reengageDate` to `ds.updatePerson(id, { pipelineStage: "nurture", reengageDate, stageChangedDate: today })`

**Note:** The stage route already auto-logs a Stage Change activity — that stays. After the API call, call `router.refresh()` (no post-stage prompt for Nurture/Dead).

---

## Task 5 — Dead Stage: Lost Reason Required

**What:** Same pattern as Task 4 but for Dead stage with Lost Reason select.

**UI changes (`components/person/stage-bar.tsx`):**
- Add local state: `deadPromptOpen: boolean`, `deadLostReason: string` (default: "")
- When user clicks Dead button: set `deadPromptOpen = true`
- Show inline form:
  ```
  Lost Reason
  [select LOST_REASONS — required, default empty]
  [Mark as Dead (red)]  [Cancel]
  ```
- Confirm disabled if no reason selected
- On confirm: call `PATCH /api/persons/[id]/stage` with `{ newStage: "dead", lostReason }`
- Cancel: reset `deadPromptOpen = false`

**API route change (`app/api/persons/[id]/stage/route.ts`):**
- Accept `lostReason?: string` in request body
- If `newStage === "dead"` and no `lostReason`: return 400 `{ error: "lostReason required for Dead" }`
- Pass `lostReason` to `ds.updatePerson(id, { pipelineStage: "dead", lostReason, stageChangedDate: today })`

---

## Task 6 — Post-Stage-Change Inline Prompt

**What:** After a successful stage change (for the 9 active progression stages only — not Nurture/Dead), show an inline Next Action update prompt rather than immediately refreshing. Same UX pattern as the post-quick-log prompt in `quick-log.tsx`.

**Add `person` prop to StageBar:**
- Change `StageBarProps` to include `person: PersonWithComputed`
- Update `app/person/[id]/page.tsx` to pass `person` (already available on the page) to `<StageBar>`
- The ProfileCard component renders StageBar — check how it's wired and pass person through

**UI changes (`components/person/stage-bar.tsx`):**
- Add state: `postChangePrompt: { newStage: PipelineStage } | null`
- In `handleStageClick` (for the 9 progression stages), after API returns success:
  - Do NOT call `router.refresh()` yet
  - Set `postChangePrompt = { newStage }`
  - Collapse the expanded picker
- Render the prompt (replaces the expanded picker when active):
  ```
  Update your plan for [New Stage Label]?
  [Follow Up ▾]  [detail field — empty, placeholder=old value]  [Tomorrow ▾]  [✓ Confirm]
  [Skip →]
  ```
  - Next Action Type: `<select>` of `NEXT_ACTION_TYPES`, default = `person.nextActionType`
  - Detail: text input, starts empty, placeholder = `person.nextActionDetail ?? "What's next?"`
  - Date: use `DateQuickPick` component from `components/ui/date-quick-pick.tsx`, default = tomorrow
  - Confirm: `PATCH /api/persons/[id]/next-action` with `{ nextActionType, nextActionDetail: detail || person.nextActionDetail, nextActionDate }`, then `router.refresh()`
  - Skip: `router.refresh()` directly

**Imports needed in stage-bar.tsx:** `DateQuickPick`, `NEXT_ACTION_TYPES`

---

## Task 7 — Funded Transition Flow

**What:** Clicking Funded in the stage bar should open a specialized dialog to create a Funded Investment record, not just change the stage.

**Add `entities` prop to StageBar:**
- `StageBarProps`: add `entities: FundingEntity[]`
- `app/person/[id]/page.tsx` passes `entities` (already fetched)
- ProfileCard (which renders StageBar) receives and passes it through

**UI changes (`components/person/stage-bar.tsx`):**
- Add state: `fundedFlowOpen: boolean`, `fundedFormData: { entityId?, entityName?, entityType?, amountInvested, investmentDate, track, growthTarget? }`
- When user clicks Funded: set `fundedFlowOpen = true`
- Render inline form (replaces picker):

  **Path A — entities.length > 0:**
  ```
  Select entity:    [dropdown of entities by name]
  Amount Invested:  [$_____]
  Investment Date:  [date — default today]
  Track:            [Maintain / Grow]
  Growth Target:    [$_____]  ← only if Track = Grow
  [Complete Funding →]  [Cancel]
  ```

  **Path B — entities.length === 0:**
  ```
  Entity Name:      [text input]
  Entity Type:      [select: LLC, LLP, Trust, Individual, Corporation, Other]
  Amount Invested:  [$_____]
  Investment Date:  [date — default today]
  Track:            [Maintain / Grow]
  Growth Target:    [$_____]  ← only if Track = Grow
  [Complete Funding →]  [Cancel]
  ```

- On confirm (sequential API calls):
  1. If Path B: `POST /api/persons/[id]/funding-entities` with `{ entityName, entityType }` → get back `{ id: newEntityId }`
  2. `POST /api/persons/[id]/funded-investment` with `{ fundingEntityId, amountInvested, investmentDate, track, growthTarget, nextCheckInDate: +90 days from investmentDate }`
  3. `PATCH /api/persons/[id]/stage` with `{ newStage: "funded" }`
  4. `router.refresh()`

**New API route (`app/api/persons/[id]/funded-investment/route.ts`):**
```
POST: body { fundingEntityId, amountInvested, investmentDate, track, growthTarget?, nextCheckInDate }
→ requireSession()
→ ds.createFundedInvestment({ fundingEntityId, personId: id, amountInvested, investmentDate, track, growthTarget, nextCheckInDate, notes: null })
→ return { success: true, id: result.id }
```

**DataService additions (`lib/types.ts`):**
```ts
createFundedInvestment(data: Omit<FundedInvestment, "id">): Promise<FundedInvestment>;
```

**Mock implementation (`lib/providers/mock.ts`):**
```ts
async createFundedInvestment(data) {
  const entity: FundedInvestment = { ...data, id: `fi-${Date.now()}` };
  fundedInvestments.push(entity);
  return entity;
}
```
Add `fundedInvestments` to `resetData()` (check if already there — `INITIAL_FUNDED_INVESTMENTS` snapshot exists, just add the restore line).

---

## Completion Check

After all 7 tasks:
1. `npm run build` — zero TypeScript errors
2. `npx playwright test e2e/person-detail-completion.spec.ts` — all tests pass
3. Output the string: `PERSON_DETAIL_COMPLETE`
