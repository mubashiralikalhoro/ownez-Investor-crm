# Leadership Dashboard + Admin Panel — Implementation Spec

**Status:** Ready for execution
**Tests:** `e2e/leadership-admin.spec.ts`
**Verify after each task:** `npm run build` (zero TS errors)

---

## Overview

Two new protected routes:
- `/leadership` — Eric/Efri only (Ken sees partial). Read-only analytics and reports.
- `/admin` — Eric/Efri only. System configuration.

Both are server-rendered pages using the same `DataService` abstraction as everything else. Use the existing sidebar nav (which already has the links — just needs the pages to exist).

---

## Task 1 — DataService: New Methods + Types

Add to `lib/types.ts` and implement in `lib/providers/mock.ts`.

### New types in `lib/types.ts`

```typescript
export interface LeadershipStats {
  aumBaseline: number;          // e.g. 60_000_000
  aumTarget: number;            // e.g. 105_000_000
  fundedYTD: number;            // sum of all FundedInvestment.amountInvested YTD
  committed: number;            // sum of committedAmount across active pipeline
  pipelineValue: number;        // sum of initialInvestmentTarget across active pipeline
  funnelByStage: { stage: PipelineStage; count: number }[];
  sourceAttribution: { source: string; label: string; count: number; pipelineValue: number; fundedValue: number }[];
  redFlags: PersonWithComputed[];  // stale or overdue, active stages only
}

export interface ReferrerStats {
  referrerId: string;
  referrerName: string;
  referralCount: number;
  pipelineValue: number;
  fundedValue: number;
}

export interface SystemConfig {
  aumBaseline: number;
  aumTarget: number;
  companyName: string;
  defaultRepId: string | null;
}
```

Add to `DataService` interface in `lib/types.ts`:

```typescript
getLeadershipStats(): Promise<LeadershipStats>;
getTopReferrers(limit?: number): Promise<ReferrerStats[]>;
getSystemConfig(): Promise<SystemConfig>;
updateSystemConfig(data: Partial<SystemConfig>): Promise<SystemConfig>;
createUser(data: { fullName: string; username: string; role: UserRole; password: string }): Promise<User>;
updateUser(id: string, data: { fullName?: string; role?: UserRole; isActive?: boolean }): Promise<User>;
getPicklistValues(field: "leadSources" | "pipelineStages"): Promise<{ key: string; label: string }[]>;
updatePicklistValues(field: "leadSources" | "pipelineStages", values: { key: string; label: string }[]): Promise<void>;
```

### Mock implementations in `lib/providers/mock.ts`

**`getLeadershipStats()`** — compute from existing mock arrays:
- `funnelByStage`: count persons per active stage (exclude nurture/dead), map to `{ stage, count }`
- `sourceAttribution`: group persons by leadSource, sum `initialInvestmentTarget` for pipelineValue, sum `fundedInvestments.amountInvested` for fundedValue
- `redFlags`: filter to persons where `isStale || isOverdue` and active stage
- `fundedYTD`: sum all `fundedInvestments` where investmentDate is in current year
- `committed`, `pipelineValue`: sum from persons with active pipeline stage
- `aumBaseline: 60_000_000`, `aumTarget: 105_000_000`

**`getTopReferrers(limit = 5)`** — compute from `relatedContactLinks` / `referrerLinks`:
- Group referrer links by `referrerId`
- For each referrer, sum `initialInvestmentTarget` of linked prospects (pipelineValue) and `fundedInvestments.amountInvested` (fundedValue)
- Sort by referralCount descending, take `limit`

**`getSystemConfig()`** — return a mutable singleton:
```typescript
let systemConfig: SystemConfig = {
  aumBaseline: 60_000_000,
  aumTarget: 105_000_000,
  companyName: "OwnEZ Capital",
  defaultRepId: "u-chad",
};
```
Include `systemConfig` in `resetData()`.

**`updateSystemConfig(data)`** — merge and return updated config.

**`createUser(data)`** — hash password with `hashSync`, push to users array, return user (without hash).

**`updateUser(id, data)`** — find user, merge fields, return updated user.

**`getPicklistValues(field)`** — return from `lib/constants.ts` arrays (LEAD_SOURCES, PIPELINE_STAGES). Read-only for now; `updatePicklistValues` is a no-op in mock (log warning, return void).

---

## Task 2 — Leadership Dashboard: Page + Layout

**File:** `app/leadership/page.tsx`

### Access control

```typescript
const session = await getSession();
if (!session || session.role !== "admin") redirect("/");
```

Note: Ken (marketing) should see *partial* view per PRD — but for V1 simplicity, admin-only is fine. Add a comment: `// TODO: Ken gets sourceAttribution + topReferrers only`

### Data fetching (parallel)

```typescript
const [stats, topReferrers] = await Promise.all([
  ds.getLeadershipStats(),
  ds.getTopReferrers(5),
]);
```

### Layout

```tsx
<div className="px-6 py-6 space-y-6">
  <div className="flex items-center justify-between">
    <h1 className="text-xl font-semibold text-navy">Leadership Dashboard</h1>
  </div>

  {/* Row 1: AUM Progress */}
  <AumProgressBar stats={stats} />

  {/* Row 2: Funnel + Source Attribution */}
  <div className="grid grid-cols-2 gap-6">
    <FunnelChart stats={stats} />
    <SourceAttributionTable stats={stats} />
  </div>

  {/* Row 3: Top Referrers + Red Flags */}
  <div className="grid grid-cols-2 gap-6">
    <TopReferrersTable referrers={topReferrers} />
    <RedFlagsPanel flags={stats.redFlags} />
  </div>
</div>
```

All sub-components are Server Components in `components/leadership/`.

---

## Task 3 — Leadership Dashboard: Components

Create these files in `components/leadership/`:

### `aum-progress-bar.tsx`

```
OwnEZ Capital                                     $105M Target
$60M ████████████████░░░░░░░░░░░░░░░░░ $78.5M (74.8%)
      baseline        funded YTD           target
```

- Container: `rounded-lg border bg-card px-6 py-5`
- Title: `text-sm font-semibold text-navy` — "AUM Progress"
- Numbers: tabular-nums, `formatCurrency()`
- Bar: relative container with absolute fill div; fill width = `(fundedYTD / aumTarget) * 100%`; gold background (`bg-gold`)
- Bar track: `bg-muted rounded-full h-3`
- Below bar: three labels at left/current/right positions
- Percentage: `text-sm font-medium text-navy` — "X% to target"

### `funnel-chart.tsx`

Horizontal bar chart — stages on Y axis, prospect count on X axis.

- Container: `rounded-lg border bg-card px-6 py-5`
- Title: "Pipeline Funnel"
- Show all 9 active stages (not nurture/dead)
- Each row: stage label (left, `w-36 text-xs text-muted-foreground`) + bar + count
- Bar color: gold for late stages (Soft Commit → Funded), navy/10 for early stages (Prospect → Active Engagement)
- Bar width: relative to max count in dataset
- Use `STAGE_LABELS` from `lib/constants.ts` for labels
- Empty rows (count = 0) still shown at zero width

### `source-attribution-table.tsx`

Table: Lead Source | Count | Pipeline $ | Funded $

- Container: `rounded-lg border bg-card px-6 py-5`
- Title: "Source Attribution"
- Only show sources with count > 0
- Sort by pipelineValue descending
- `formatCurrency()` for dollar columns
- Use `LEAD_SOURCES.find(s => s.key === row.source)?.label ?? row.source` for display label
- Row hover: `hover:bg-muted/30`
- Footer row: "Total" with sums

### `top-referrers-table.tsx`

Table: Referrer | Referrals | Pipeline $ | Funded $

- Container: `rounded-lg border bg-card px-6 py-5`
- Title: "Top Referrers"
- Empty state: `<p className="text-sm text-muted-foreground italic">No referrals logged yet</p>`
- Sort by referralCount descending

### `red-flags-panel.tsx`

- Container: `rounded-lg border bg-card px-6 py-5`
- Title: "Red Flags"
- List each flagged person: Name + Stage badge + "Overdue Xd" or "Stale Xd" tag + next action
- Click on name → `/person/[id]`
- Empty state: green "Pipeline Healthy ✓" indicator (`text-healthy-green font-medium`)
- Use `person.daysSinceLastTouch` for the day count

---

## Task 4 — Add Leadership Link to Sidebar

In `components/sidebar.tsx`, add a Leadership nav item visible only to admin role.

The sidebar already has Dashboard, Pipeline, People. Add after People:

```tsx
{session.role === "admin" && (
  <NavItem href="/leadership" icon={BarChart2} label="Leadership" />
)}
```

Import `BarChart2` from lucide-react. Use whatever NavItem pattern is already in the sidebar.

---

## Task 5 — Admin Panel: System Settings + User Management

**File:** `app/admin/page.tsx`

### Access control

```typescript
const session = await getSession();
if (!session || session.role !== "admin") redirect("/");
```

### Layout (tab-based)

```tsx
<div className="px-6 py-6 space-y-6">
  <h1 className="text-xl font-semibold text-navy">Admin Panel</h1>
  <Tabs defaultValue="system">
    <TabsList>
      <TabsTrigger value="system">System Settings</TabsTrigger>
      <TabsTrigger value="users">Users</TabsTrigger>
      <TabsTrigger value="lead-sources">Lead Sources</TabsTrigger>
    </TabsList>
    <TabsContent value="system"><SystemSettingsTab config={config} /></TabsContent>
    <TabsContent value="users"><UsersTab users={users} /></TabsContent>
    <TabsContent value="lead-sources"><LeadSourcesTab sources={sources} /></TabsContent>
  </Tabs>
</div>
```

Use `Tabs` from `@/components/ui/tabs` (shadcn).

Data fetching:
```typescript
const [config, users, sources] = await Promise.all([
  ds.getSystemConfig(),
  ds.getUsers(),
  ds.getPicklistValues("leadSources"),
]);
```

All tab content components are in `components/admin/`.

---

## Task 6 — Admin Panel: System Settings Tab

**File:** `components/admin/system-settings-tab.tsx` — `"use client"`

Form with:
- Company Name (text input)
- AUM Baseline ($) (number input)
- AUM Target ($) (number input)

Save button calls `PATCH /api/admin/system-config` with `{ companyName, aumBaseline, aumTarget }`.

After save: `router.refresh()` + brief "Saved ✓" inline confirmation.

**New API route:** `app/api/admin/system-config/route.ts`
```typescript
// PATCH
const session = await requireSession(request);
if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
const body = await request.json();
const config = await ds.updateSystemConfig(body);
return NextResponse.json(config);
```

---

## Task 7 — Admin Panel: Users Tab

**File:** `components/admin/users-tab.tsx` — `"use client"`

### Display

Table of all users: Full Name | Username | Role | Status (Active/Inactive) | Actions

Actions per row:
- **Edit** (pencil inline) — inline form to change Full Name and Role
- **Deactivate / Reactivate** button (red/green)

### Add User form (inline, below table)

Collapsed by default — `+ Add User` button expands it.

Fields: Full Name, Username, Role (select: rep/marketing/admin), Password (text, `type="password"`)

On save: `POST /api/admin/users` with body, then `router.refresh()`.

**New API routes:** `app/api/admin/users/route.ts`
```typescript
// POST — create user
// requireSession + admin check
// body: { fullName, username, role, password }
// → ds.createUser(body)
```

`app/api/admin/users/[userId]/route.ts`
```typescript
// PATCH — update user
// body: { fullName?, role?, isActive? }
// → ds.updateUser(userId, body)
```

**Role label mapping:** `{ rep: "Rep", marketing: "Marketing", admin: "Admin" }`

---

## Task 8 — Admin Panel: Lead Sources Tab

**File:** `components/admin/lead-sources-tab.tsx` — `"use client"`

### Display

Ordered list of current lead source chips (reuse visual from LeadSourcePicker — just a pill for each).

Each row: [chip label] [category] [× remove] (remove is disabled if count > 0 — show tooltip "In use by X prospects")

### Add new source

Inline form below list: Label input + Category select (Referral/Network/Event/Direct) → Save.
Key is auto-generated from label: `label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")`.

On save: `POST /api/admin/lead-sources` → `ds.updatePicklistValues("leadSources", newList)` → `router.refresh()`.

**Note:** In the mock provider, `updatePicklistValues` is a no-op (constants are static). The tab still renders correctly — just no persistence between server restarts. Add a `// TODO: Zoho provider writes to Zoho picklist` comment.

**New API route:** `app/api/admin/lead-sources/route.ts`
```typescript
// PATCH — body: { values: { key, label, category }[] }
// requireSession + admin check
// → ds.updatePicklistValues("leadSources", values)
```

---

## Task 9 — Add Admin Link to Sidebar

In `components/sidebar.tsx`, add an Admin nav item visible only to admin role.

```tsx
{session.role === "admin" && (
  <NavItem href="/admin" icon={Settings} label="Admin" />
)}
```

Import `Settings` from lucide-react.

---

## Completion Check

After all 9 tasks:
1. `npm run build` — zero TypeScript errors
2. `npx playwright test e2e/leadership-admin.spec.ts` — all tests pass
3. Output: `LEADERSHIP_ADMIN_COMPLETE`
