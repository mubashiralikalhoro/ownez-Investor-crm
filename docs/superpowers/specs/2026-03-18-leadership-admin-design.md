# Design Spec: Leadership Dashboard + Admin Panel
**Date:** 2026-03-18
**Status:** Approved
**Routes:** `/leadership`, `/admin`

---

## Overview

Two new pages for OwnEZ CRM:

1. **Leadership Dashboard** (`/leadership`) — fund-level KPIs, pipeline funnel, and source ROI for Eric/leadership to understand the big picture at a glance.
2. **Admin Panel** (`/admin`) — user management with granular permission overrides, and dynamic lead source management.

Both pages follow existing design conventions: white workspace background, navy text, gold accents, `rounded-lg border` cards, inline editing (never modals).

---

## 1. Leadership Dashboard

### Access
- Roles: `marketing`, `admin`
- Plus any user with `permissions.canViewLeadership: true` override

### Layout
- Page header: "Leadership" title + subtitle "Fund performance & pipeline overview"
- Two-column grid: `115px` stat column (left) + flexible right panel
- Max-width: `720px`, centered
- White background (`bg-background`)

### Stat Column (left, 115px)

Six stacked KPI cards. Each card: white background, `border`, `rounded-lg`, number + label. All cards are clickable — clicking opens a slide-out panel (Sheet) with drill-down detail.

| Card | Value | Drill-down content |
|---|---|---|
| AUM Raised | Sum of all `FundedInvestment.amountInvested` | List of funded investors: name, entity, amount, date |
| Fund Target | Progress bar, hardcoded `$10M` for V1 | Same as AUM Raised |
| Funded YTD | Count of FundedInvestments in current calendar year | Funded investors this year |
| Active | Count of prospects in `ACTIVE_PIPELINE_STAGES` | List of active prospects: name, stage, target, days idle |
| Pipeline Value | Sum of `initialInvestmentTarget` for active prospects | Same list as Active |
| Meetings | Count of `meeting` activities in selected window (7d/14d/30d toggle) | List of meetings: prospect name, date, detail |

The Meetings card has a `7d / 14d / 30d` pill toggle. Selected period highlighted in gold. Default: `30d`.

### Right Panel

#### Pipeline Funnel

Tapering funnel visualization. One row per active pipeline stage (in order) plus Funded at the bottom.

- Each row: gold background (fading lighter as stages progress), navy text, stage label left, count + sum of `initialInvestmentTarget` right
- Width narrows with each stage: 100% → 90% → 78% → 66% → 54% → 42% → 30% for active stages; Funded row is green (`dcfce7` bg, `86efac` border)
- Chevron separators between rows
- All rows clickable → slide-out panel listing prospects in that stage (name, target, days idle). Each prospect name is a link to `/person/[id]`

#### Source ROI Table

Below the funnel. Columns: Source, Prospects, Funded, AUM, Conv%.

- Sorted by AUM descending
- Funded count in green, AUM in navy bold
- Sources with zero funded: AUM shows "—"
- Click a row → slide-out panel listing all prospects from that source (name, stage, target)

### Slide-out Panel (Sheet)

- Standard shadcn `Sheet` component, slides in from the right
- Header: context label (e.g. "Pitch · 2 prospects" or "Meetings · last 30 days")
- Content: appropriate list (prospects or activities) with relevant fields
- Prospect rows are clickable links to `/person/[id]`
- Dismiss: ✕ button or click outside

### New DataService Methods

```typescript
getLeadershipStats(): Promise<LeadershipStats>
// Returns: aumRaised, fundTarget, fundedYTDCount, activeCount, pipelineValue

getMeetingsCount(days: number): Promise<number>
// Count of meeting-type activities in past N days

getFunnelData(): Promise<FunnelStage[]>
// Per active stage: { stage, label, count, totalValue }

getSourceROI(): Promise<SourceROIRow[]>
// Per lead source: { source, label, prospectCount, fundedCount, aum, conversionPct }

getDrilldownProspects(filter: DrilldownProspectFilter): Promise<PersonWithComputed[]>
// filter: { stage?, leadSource?, fundedYTD?, active? }

getDrilldownActivities(filter: DrilldownActivityFilter): Promise<RecentActivityEntry[]>
// filter: { activityType, days }
```

---

## 2. Admin Panel

### Access
- Role: `admin` only
- Plus any user with `permissions.canAccessAdmin: true` override

### Layout
- Page header: "Admin" title
- Two tabs: **Users** | **Lead Sources**
- Same white background, `rounded-lg border` card pattern

---

### 2a. Users Tab

#### User List

Table with columns: Name/username, Role badge, Status (Active / Inactive).

- Clicking a row opens inline edit panel below (highlighted with gold border `border-gold`)
- Active users: green "● Active" indicator
- Inactive users: gray "● Inactive" indicator, row text muted

#### Inline Edit Panel

Opens below the selected user row. Contains:

**Role Template selector**
Pill buttons: Rep / Marketing / Admin. Selecting a new role updates the role and resets permissions to that role's defaults.

**Permission Overrides**
Toggle switches grouped into two sections. Each toggle shows "Role default: on/off" to indicate whether the toggle is overriding the default.

*Pages section:*
- Leadership Dashboard — `canViewLeadership`
- Admin Panel — `canAccessAdmin`

*Actions section:*
- Reassign Prospects — `canReassignProspects`
- View All Prospects — `canViewAllProspects`
- Mark Prospect Dead — `canMarkDead`

Role defaults:

| Permission | Rep | Marketing | Admin |
|---|---|---|---|
| canViewLeadership | off | on | on |
| canAccessAdmin | off | off | on |
| canReassignProspects | off | off | on |
| canViewAllProspects | on | on | on |
| canMarkDead | on | on | on |

**Deactivate button**
Red pill button. Clicking shows inline confirmation:
> "Chad has 5 assigned prospects. Reassign to: [rep picker] or [Skip]"

- Rep picker: dropdown of all active reps
- Confirm: sets `isActive: false`, updates `assignedRepId` for all their prospects to selected rep (or `null` if skipped)
- Prospects with `assignedRepId: null` are "unassigned"

**Save Changes button**
Gold pill. Calls `updateUserPermissions(userId, permissions)`.

#### Unassigned Prospects Banner

Shown at the top of the Users tab when `getUnassignedProspects()` returns count > 0:

> "⚠ 3 prospects are unassigned — [view in pipeline →]"

Links to `/pipeline?assignedRep=unassigned`.

#### Pipeline Changes Required

- Add `unassigned` as a filter option in the pipeline filter bar
- Show "Unassigned" red badge in place of rep name on affected rows
- Add inline rep picker on pipeline rows (enabling reassignment from pipeline; also serves the inline actions backlog item)

---

### 2b. Lead Sources Tab

#### Lead Source List

Each row: drag handle (for reorder), label (editable), active/inactive toggle, up/down reorder arrows.

**Operations:**

| Operation | Interaction |
|---|---|
| Rename | Click label → inline text input → Enter or blur to save |
| Add | "＋ Add source" button at bottom → inline text input → Enter to save (slug key auto-generated from label) |
| Reorder | Up/down arrow buttons per row |
| Deactivate | Toggle per row. Off = hidden from LeadSourcePicker but label preserved on existing prospects |

#### Data Model Change

Lead sources move from static `lib/constants.ts` to dynamic DataService storage.

New type:
```typescript
interface LeadSourceConfig {
  key: string;        // slug, immutable after creation
  label: string;      // display name, editable
  order: number;      // sort order
  isActive: boolean;  // false = hidden from picker
}
```

New DataService methods:
```typescript
getLeadSources(opts?: { includeInactive?: boolean }): Promise<LeadSourceConfig[]>
// Admin panel: includeInactive: true. LeadSourcePicker: default (false)

createLeadSource(data: { label: string }): Promise<LeadSourceConfig>
// Auto-generates key from label (slugify)

updateLeadSource(key: string, data: Partial<Pick<LeadSourceConfig, 'label' | 'isActive'>>): Promise<LeadSourceConfig>

reorderLeadSources(keys: string[]): Promise<void>
// Full ordered key array — mock reassigns order values
```

Mock provider seeds `LeadSourceConfig[]` from existing `LEAD_SOURCES` constant (all active, order = array index).

---

## 3. User Type Changes

```typescript
export interface UserPermissions {
  canViewLeadership?: boolean;
  canAccessAdmin?: boolean;
  canReassignProspects?: boolean;
  canViewAllProspects?: boolean;
  canMarkDead?: boolean;
}

export interface User {
  // ... existing fields ...
  permissions?: UserPermissions;  // undefined = use role defaults
}
```

Permission resolution: `hasPermission(user, key)` — returns override if set, otherwise role default from table above.

---

## 4. New API Routes

```
GET  /api/leadership/stats
GET  /api/leadership/funnel
GET  /api/leadership/source-roi
GET  /api/leadership/drilldown?type=stage&value=pitch
GET  /api/leadership/drilldown?type=kpi&value=meetings&days=30

GET  /api/admin/users
PATCH /api/admin/users/[id]/permissions
PATCH /api/admin/users/[id]/deactivate   (body: { reassignToId?: string })

GET  /api/admin/lead-sources
POST /api/admin/lead-sources
PATCH /api/admin/lead-sources/[key]
POST /api/admin/lead-sources/reorder     (body: { keys: string[] })

GET  /api/persons?assignedRep=unassigned  (extend existing persons filter)
```

---

## 5. Auth Guard

Both pages check the session role + permissions on the server component. Unauthorized access redirects to `/` (dashboard).

```typescript
// lib/auth-guards.ts
export function requirePermission(session, key: keyof UserPermissions): boolean
```

---

## 6. Out of Scope (V1)

- Fund target configurable from admin (hardcoded $10M)
- Date range filter on funnel/source ROI (always all-time)
- Creating new users from admin panel (IT handles this)
- Password reset from admin panel
- Drag-to-reorder lead sources (up/down arrows sufficient)
- Export / CSV download
