# Dashboard Cockpit Redesign

**Date:** 2026-03-17
**Status:** Approved
**Author:** Eric Gewirtzman + Claude

---

## Problem

The current dashboard presents four vertically stacked sections (stats cards, today's actions table, needs attention table, recent activity) that all look the same. The "Needs Attention" table with 9 overdue rows dominates the viewport, making the whole page feel like a wall of problems. Chad has to mentally merge two separate lists to figure out what to do first. This is the opposite of a pilot's cockpit — it's overwhelming, not orienting.

## Design Principles

1. **One answer to "what do I do right now?"** — the dashboard is a to-do list, not an analytical view
2. **Minimal scrolling** — the dashboard fits in one viewport for typical loads (up to ~8 items). If the queue exceeds 8 rows, show the first 8 with a "Show N more" link to expand.
3. **Forward-looking** — show what needs to happen, not what already happened
4. **Stats are context, not action** — they belong in the periphery, not the headline

## Decisions Made

- **Hero-first**: the single most important action is the #1 visual element
- **Unified action queue**: "Today's Actions" and "Needs Attention" merge into one prioritized list — no separate sections
- **Stats demoted**: moved from prominent top cards to a compact footer bar
- **Priority logic**: overdue first (days overdue desc, dollar tiebreaker), then stale-but-not-overdue (days idle desc), then due today (dollar desc), then nurture re-engage. Deduplicated by person ID.
- **Today's Momentum dropped**: the auto-updating activity counter ("8 activities logged...") felt like surveillance, not support. Removed entirely.
- **Log Activity is independent**: opens with prospect search/autocomplete — not pre-bound to the hero card's prospect
- **Stage badges are not clickable**: name is the only clickable element per row, links to person detail
- **Stale prospects included**: prospects with `isStale === true` (idle beyond stage threshold with no future action date) appear in the queue alongside overdue and due-today items
- **Collaborating section dropped**: the spec's "Collaborating" section (prospects where Chad is a collaborator but not owner) is not shown on the cockpit dashboard — this is Chad's personal action list, not a shared view. Collaborating prospects remain accessible via Pipeline view.
- **Date toggle dropped**: the Today/Tomorrow/This Week toggle is removed — the cockpit shows what needs action *now* (overdue + due today). Chad can prep for upcoming days via Pipeline view sorted by Next Action Date.
- **Last Viewed Bar deferred**: the persistent Last Viewed Bar (DESIGN-SPEC Section 6.11) is a global feature that sits above the dashboard header. It is not part of this redesign — it will be implemented separately as a layout-level component.
- **"New" badge preserved**: prospects with the "New" badge (created by someone other than assigned rep, < 24h or no activity logged) show the gold "New" badge in both hero card and action queue rows

## Layout (5 zones, top to bottom)

```
┌─────────────────────────────────────────────────────┐
│  HEADER BAR                                         │
│  "Dashboard"              [+ Prospect] [Log Activity]│
├─────────────────────────────────────────────────────┤
│                                                     │
│  HERO CARD — #1 priority                            │
│  Name · Company · Stage · $Amount                   │
│  "Next action detail here"                          │
│  ● Overdue 19d                          [Open →]    │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ACTION QUEUE — everything else, ranked             │
│  2. Name   Stage   $Amt   Urgency   Next action     │
│  3. Name   Stage   $Amt   Urgency   Next action     │
│  4. Name   Stage   $Amt   Urgency   Next action     │
│                                                     │
├─────────────────────────────────────────────────────┤
│  ▸ Recent Activity (N) — collapsed by default       │
├─────────────────────────────────────────────────────┤
│  Pipeline: 10 │ Value: $3.4M │ Committed: $1.1M │ Funded: $850K │
└─────────────────────────────────────────────────────┘
```

### Zone 1: Header Bar

- Page title "Dashboard" on the left
- Two action buttons on the right:
  - **"+ Prospect"** — outlined/secondary pill button, opens Create Prospect slide-out sheet
  - **"Log Activity"** — gold pill button (primary CTA), opens Quick Log slide-out sheet with prospect search/autocomplete as the first field (no pre-selection)
- On small screens, button labels condense to compact text
- Keyboard shortcuts: `N` for new prospect, `L` for quick log

### Zone 2: Hero Card

The single most important action Chad needs to take right now.

- **Name**: large (text-xl/2xl), semibold, navy — the most prominent element
- **Context line**: company, stage badge, dollar amount — secondary, muted
- **Next action detail**: displayed as a clear instruction
- **Urgency tag**: bottom-left — red "Overdue Xd" pill or neutral "Due today" pill
- **"Open →"**: bottom-right, links to `/person/[id]`
- **Visual treatment**: single card with subtle navy-tinted left border (priority marker), generous padding, white background
- **"New" badge**: gold "New" pill if prospect was created by someone other than assigned rep within 24h and rep hasn't logged activity yet
- **Empty state**: transforms to calm green (#22c55e / healthy-green) — "All caught up. Next action is [Name] on [date]."

### Zone 3: Action Items Queue

Section renamed from "Up next" / "Action Queue" to **"Action Items"** in implementation.

Compact ranked list of remaining actions. No table headers — the pattern is self-evident from the hero card.

Each row shows:
- **Rank number** (left anchor)
- **Name** — semibold, navy, clickable → `/person/[id]`
- **Stage badge** — small, same style as current
- **Dollar amount** — tabular nums
- **Urgency tag** — inline pill, red "Overdue Xd" or neutral "Due today"
- **Next action detail** — muted text, truncated if long
- **"New" badge** — gold "New" pill, same rules as hero card

**Overflow**: show first 8 rows. If more exist, a "Show N more" link expands the full list.

**Count badge**: "(N actions)" shown subtly near the section — Chad knows scope at a glance.

**Sorting (matches priority logic):**
1. Overdue items first (days overdue descending, dollar value tiebreaker)
2. Stale-but-not-overdue items (days idle descending)
3. Due today items (dollar value descending)
4. Nurture re-engage items last

**Row interaction:**
- Hover highlights row, cursor pointer
- Click name → person detail
- Subtle dividers between rows (border-b)

### Zone 4: Recent Activity (unchanged)

- Collapsed by default, same as current implementation
- Collapsible/expandable toggle
- Serves as end-of-day audit tool
- Filterable by rep

### Zone 5: Stats Bar (Footer)

Single horizontal bar replacing the 4 large stat cards.

```
Pipeline: 10  │  Value: $3.4M  │  Committed: $1.1M  │  Funded YTD: $850K
```

- Each stat: label (muted, small) + value (semibold, navy)
- Separated by subtle vertical dividers
- No subtitles — labels are sufficient
- Positioned at the bottom of the content area (not fixed to viewport)

## What Changes From Current Implementation

| Current | New |
|---------|-----|
| Stats bar (4 large cards) at top | Compact stats footer at bottom |
| "Today's Actions" table section | Merged into unified action queue |
| "Needs Attention" table section | Merged into unified action queue |
| No hero element | Hero card — #1 priority |
| Today's Momentum bar (spec, not yet built) | Dropped — felt like surveillance |
| Separate sections with table headers | Headerless compact rows |
| Full-width stacked layout | Fits in one viewport, no scrolling |
| No persistent action buttons | "+ Prospect" and "Log Activity" in header |
| Gold "+" button (spec, top-right of Row 1) | Replaced by "+ Prospect" pill in header bar |
| Today/Tomorrow/This Week date toggle | Dropped — cockpit shows overdue + today only |
| Collaborating section (spec, not yet built) | Dropped — cockpit is owner-only action list |
| Today's Momentum bar (spec, not yet built) | Dropped — felt like surveillance |

## What Does NOT Change

- Recent Activity section (behavior unchanged)
- Sidebar navigation (desktop)
- All underlying data service methods
- Keyboard shortcuts (N, L, arrow keys, Enter) — note: `L` is extended to work from the dashboard header (currently only works on Person Detail and Pipeline View)
- Last Viewed Bar (global feature, implemented separately at layout level)

## Implementation Status (as of 2026-03-18)

**Built and shipped:**
- Hero card with priority logic
- Action Items queue (max 8, "Show N more" overflow)
- Stats footer (4-column grid, label stacked above value)
- "+ Prospect" slide-out sheet (Create Prospect form)
- "Log Activity" slide-out sheet (prospect search + quick log form)
- Mobile: bottom tab bar (Dashboard, Pipeline, People)
- Mobile: full-width layout, responsive padding, two-line action queue rows
- Smart activity type detection (`lib/smart-detection.ts`)
- Smart outcome detection

**Person Detail also redesigned in this session** (see DESIGN-SPEC Section 6.4):
- Quick Log moved up to primary action zone (after Identity)
- Recent Snapshot removed
- Timeline redesigned (vertical line, simplified entries, 5 filter pills, inline stage markers)
- Next Action edit mode refactored to separate EditNextAction component
- Post-log success banner + page reload pattern

## Data Requirements

No new data service methods needed. The redesign uses the same data already fetched:
- `getDashboardStats()` → stats footer
- `getPeople({ roles: ["prospect"] })` → hero card + action queue (filtered and sorted client-side)
- `getRecentActivities({ limit: 20 })` → recent activity (unchanged)
- `getUsers()` → recent activity rep filter (unchanged)

## Priority Scoring Logic

```typescript
// Unified priority list: overdue → stale → due today → nurture re-engage
// Deduplicated by person ID
function getActionQueue(people: PersonWithComputed[], today: string) {
  const seen = new Set<string>();
  const result: PersonWithComputed[] = [];

  function addUnique(list: PersonWithComputed[]) {
    for (const p of list) {
      if (!seen.has(p.id)) { seen.add(p.id); result.push(p); }
    }
  }

  // 1. Overdue: nextActionDate < today (most overdue first, then by dollar value)
  const overdue = people
    .filter(p => p.nextActionDate && p.nextActionDate < today && p.pipelineStage !== "dead")
    .sort((a, b) => {
      const aDays = daysBetween(a.nextActionDate!, today);
      const bDays = daysBetween(b.nextActionDate!, today);
      if (bDays !== aDays) return bDays - aDays;
      return (b.initialInvestmentTarget ?? 0) - (a.initialInvestmentTarget ?? 0);
    });
  addUnique(overdue);

  // 2. Stale but not overdue: isStale === true, not already captured above
  const stale = people
    .filter(p => p.isStale && p.pipelineStage !== "dead")
    .sort((a, b) => (b.daysSinceLastTouch ?? 0) - (a.daysSinceLastTouch ?? 0));
  addUnique(stale);

  // 3. Due today (sorted by dollar value)
  const dueToday = people
    .filter(p => p.nextActionDate === today && p.pipelineStage !== "dead")
    .sort((a, b) => (b.initialInvestmentTarget ?? 0) - (a.initialInvestmentTarget ?? 0));
  addUnique(dueToday);

  // 4. Nurture re-engage today
  const reengageToday = people
    .filter(p => p.pipelineStage === "nurture" && p.reengageDate === today);
  addUnique(reengageToday);

  return result;
}
```

## Design Language

Follows existing CLAUDE.md / DESIGN-SPEC.md guidelines:
- Navy (#0b2049) — headings, names, card borders
- Gold (#e8ba30) — primary CTA button only
- Red (#ef4444) — overdue urgency tags only
- White/light gray — background
- Pill-shaped buttons, generous whitespace
- Geist Sans throughout
