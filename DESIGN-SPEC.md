# OwnEZ Capital — HNW Investor CRM
## Design Specification

**Version:** 1.0
**Date:** 2026-03-17
**Author:** Eric Gewirtzman + Claude
**Status:** Draft — pending review

---

## 1. Overview

OwnEZ Capital ($60M AUM, targeting $105M) needs a purpose-built CRM for managing high-net-worth investor relationships from first contact through funded status. The capital-raising team (Chad Cormier — Investment Relationship Manager, Ken Warsaw — Marketing Manager) requires a system that is fast, intuitive, and barrier-free for daily use.

### 1.1 Why Not Zoho's UI

The Zoho CRM backend is already configured with the required modules and automations. However, Zoho's native interface is cumbersome and creates friction that discourages consistent data entry. This project builds a **custom frontend** that uses Zoho as the database via API, giving the sales team an interface designed specifically for their workflow.

### 1.2 Architecture

```
Custom Frontend (Next.js on Vercel)
        │
        ▼
  Data Service Layer (lib/data.ts)
        │
        ├── Provider: Mock (lib/providers/mock.ts) ← ships with V1
        └── Provider: Zoho (lib/providers/zoho.ts) ← IT team builds
                │
                ▼
          Zoho CRM REST API
```

- **Next.js** — server-side API routes act as the Zoho API proxy (tokens never exposed to browser)
- **Data Service Layer** — single abstraction point. One env var (`DATA_PROVIDER=mock|zoho`) switches between mock data and live Zoho. Zero UI code changes.
- **Vercel deployment** — push to git, live in 60 seconds

### 1.3 Success Criteria

- Chad can log all investor contacts, pipeline stages, next actions, and activity notes within 30 minutes of going live
- Eric can open the Leadership Dashboard and see total pipeline value, AUM progress toward $105M, source attribution, and red flags in under 60 seconds
- Stale/overdue indicators are always accurate (computed live, not batch)
- System is usable without any training beyond a 10-minute walkthrough
- Chad can log an activity from his phone in under 15 seconds
- Chad can complete his entire morning routine — check dashboard, make 5 calls, log all of them with next actions, advance 2 stages — in under 10 minutes without feeling like "data entry"
- On desktop, Chad can do a full activity log + next action update without touching the mouse
- System ships with mock data; IT team can switch to live Zoho by implementing one provider file

---

## 2. Data Model (5 Objects)

### 2.1 Person (Unified — replaces Prospect + External Contact)

Every individual in the system exists once. A person can have multiple roles: Prospect, Referrer, Related Contact, Funded Investor. This eliminates duplicates and surfaces the full relationship network.

| Field | Type | Required | Notes |
|---|---|---|---|
| Full Name | Text | Yes | |
| Created Date | Date | Auto | Auto-set on record creation. Not editable. |
| Email | Email | No | |
| Phone | Phone | No | |
| Organization | Lookup: Organization | No | Link to parent org |
| Roles | Multi-select | Yes | Prospect, Referrer, Related Contact, Funded Investor |
| **Prospect-role fields (visible when role includes Prospect):** | | | |
| Pipeline Stage | Picklist | Yes | 11 values — see Section 3 |
| Initial Investment Target ($) | Currency | No | Dollar amount prospect has indicated |
| Growth Target ($) | Currency | No | Longer-term target if they scale up |
| Committed Amount ($) | Currency | No | Verbal commitment — populate at Soft Commit+ |
| Commitment Date | Date | Auto | Auto-set when Committed Amount is first entered or changed |
| Next Action Type | Picklist | Yes | Follow Up, Schedule Meeting, Send Document, Request Info, Make Introduction, Internal Review, Other |
| Next Action Detail | Text (250 chars) | Yes | Specific context: "Q3 performance deck" |
| Next Action Date | Date | Yes | Date the next action is due |
| Stage Changed Date | Date | Auto | Auto-updated on every stage change. Enables pipeline velocity reporting without scanning activity log. |
| Days Since Last Touch | Auto-calculated | Auto | Computed live from latest Activity date. Excludes Stage Change and Reassignment activity types — only real interactions count (calls, emails, meetings, notes, texts, LinkedIn, WhatsApp, documents). |
| Lead Source | Picklist | Yes | 10 values — see Section 4.2 |
| Assigned Rep | Lookup: User | Yes | Primary owner of the relationship. Admin-only to change after creation (see Section 5.6). |
| Collaborators | Multi-select: User | No | Other team members involved |
| Notes | Long Text | No | Freeform context |
| Lost/Dead Reason | Picklist | Conditional | Required when stage = Dead. Values: Not Accredited, Not Interested, Ghosted, Timing, Went Elsewhere, Other |
| Stale Flag | Auto-calculated | Auto | Computed live — see Section 5.1 |
| Re-engage Date | Date | Conditional | Required when stage = Nurture. Surfaces prospect in Today's Actions on this date. |
| **External Contact-role fields (visible when role includes Referrer or Related Contact):** | | | |
| Contact Type | Picklist | No | CPA, Attorney, Wealth Advisor, Spouse, Existing Investor, Other |
| Contact Company | Text | No | Where this person works (distinct from Organization) |

**Referrer relationship:** When a Person is a Referrer, a separate link record connects them to the Prospect(s) they referred. This allows the same person to be both a Referrer and a Prospect.

**Related Contact relationship:** A link record connects a Person (as Related Contact) to a Prospect, with a Role description (e.g., "CPA — managing entity structure").

### 2.2 Organization

| Field | Type | Required | Notes |
|---|---|---|---|
| Name | Text | Yes | "Calloway Family Office" |
| Type | Picklist | No | Family Office, Wealth Management, Corporate, Individual/None |
| Notes | Long Text | No | |

### 2.3 Funding Entity

| Field | Type | Required | Notes |
|---|---|---|---|
| Entity Name | Text | Yes | "Calloway Family Trust", "RJC Holdings LLC" |
| Entity Type | Picklist | Yes | LLC, LLP, Trust, Individual, Corporation, Other |
| Person | Lookup: Person | Yes | The prospect behind this entity |
| Status | Picklist | Yes | Active, Pending Setup, Inactive |
| EIN / Tax ID | Text | No | For reference only |
| Notes | Long Text | No | Attorney info, setup status |

**Timing:** Funding Entities can be added at any point in the pipeline. Not required until the Funded transition. A gentle nudge (not a blocker) appears at Commitment Processing and KYC stages if no entity is linked.

### 2.4 Activity Log (Child of Person)

| Field | Type | Required | Notes |
|---|---|---|---|
| Person | Lookup: Person | Yes | Parent record |
| Activity Type | Picklist | Yes | See Section 4.3 |
| Source | Auto | Auto | Manual, Zoho Telephony, O365 Sync |
| Date | Date | Yes | Default: today |
| Time | Time | No | |
| Outcome | Toggle | Yes | Connected (default) or Attempted. Attempted = no meaningful two-way exchange (voicemail, no-show, no reply). |
| Detail / Summary | Long Text | Yes | What happened |
| Documents Attached | File Upload | No | PDFs, decks, etc. |
| Logged By | Lookup: User | Auto | Auto-populated from logged-in user |
| Annotation | Long Text | No | For adding notes to auto-synced activities |

### 2.5 Funded Investment (Child of Funding Entity)

| Field | Type | Required | Notes |
|---|---|---|---|
| Funding Entity | Lookup: Entity | Yes | Which LLC/Trust funded |
| Person | Lookup: Person | Yes | Denormalized for querying |
| Amount Invested ($) | Currency | Yes | Actual funded amount |
| Investment Date | Date | Yes | |
| Track | Picklist | Yes | Maintain / Grow |
| Growth Target ($) | Currency | Conditional | Required if Track = Grow |
| Next Check-in Date | Date | Yes | |
| Notes | Long Text | No | |

**Important:** Committed Amount (on Person) is the verbal/target number. Actual funded amount is always the rollup from Funded Investment records. These are intentionally separate — the gap between committed and funded is useful information.

---

## 3. Pipeline Stages

11 values: 9 active stages + 2 parking lots.

| Stage | Definition | Idle Threshold | Stale Alert |
|---|---|---|---|
| Prospect | Identified but not yet contacted. Research phase. | 10 days | Yes |
| Initial Contact | First outreach made. Awaiting response. | 5 days | Yes |
| Discovery | Discovery meeting scheduled or completed. | 5 days | Yes |
| Pitch | Full deck presented. Waiting for response. | 7 days | Yes |
| Active Engagement | Post-pitch dialogue. Investor doing diligence. | 14 days | Yes |
| Soft Commit | Verbal commitment received with dollar amount. | 5 days | Yes |
| Commitment Processing | Sub docs in progress. Entity/attorney review. | 5 days | Yes |
| KYC / Docs | Moved to Agora for KYC. Waiting on docs. | 3 days | Yes |
| Funded | Wire received. Active LP. | None — creates Funded Investment | No |
| Nurture | Parked — not dead, not active. Re-engage Date required. | No auto-alert | No |
| Dead / Lost | Disqualified or withdrew. Lost/Dead Reason required. | No alert | No |

Stage thresholds and labels are configurable via the admin panel.

---

## 4. Picklist Values

### 4.1 Next Action Types

Follow Up, Schedule Meeting, Send Document, Request Info, Make Introduction, Internal Review, Other

### 4.2 Lead Sources

Velocis Network, CPA Referral, Legacy Event, LinkedIn, Ken — DBJ List, Ken — Event Follow-up, Tolleson WM, M&A Attorney, Cold Outreach, Other

Configurable via admin panel.

### 4.3 Activity Types

| Type | Manual Log | Auto-Sync (V2) |
|---|---|---|
| Call | Yes | Zoho Telephony |
| Email | Yes | O365 Sync |
| Meeting | Yes | No |
| Note | Yes | No |
| Text Message | Yes | No |
| LinkedIn Message | Yes | No |
| WhatsApp | Yes | No |
| Stage Change | Auto on stage change | N/A |
| Document Sent | Yes | No |
| Document Received | Yes | No |
| Reassignment | Auto on rep change | N/A |

Configurable via admin panel.

### 4.4 Other Picklists

- **Entity Type:** LLC, LLP, Trust, Individual, Corporation, Other
- **Lost/Dead Reason:** Not Accredited, Not Interested, Ghosted, Timing, Went Elsewhere, Other
- **Track:** Maintain, Grow
- **Organization Type:** Family Office, Wealth Management, Corporate, Individual/None
- **Contact Type:** CPA, Attorney, Wealth Advisor, Spouse, Existing Investor, Other
- **Funding Entity Status:** Active, Pending Setup, Inactive
- **Related Contact Role:** CPA, Attorney, Wealth Advisor, Spouse, Co-Decision Maker, Other

---

## 5. Business Logic & Automations

### 5.1 Stale Flag (Computed Live)

**Logic:** `daysIdle >= stageThreshold AND (nextActionDate IS NULL OR nextActionDate <= today) AND stage is active (not Nurture/Dead/Funded)`

Computed on every page load from activity data. No scheduled batch job needed — always accurate.

**Key rule:** A future Next Action Date suppresses the stale flag. Marcus Johnson at 12 days idle with a March 1 next action is NOT stale. A missing Next Action Date does NOT suppress — if there's no scheduled action and idle time exceeds threshold, the record is stale.

### 5.2 Days Since Last Touch (Computed Live)

Calculated as the number of days since the most recent *real interaction* Activity Log entry for a prospect. **Excludes** Activity Type = "Stage Change" and "Reassignment" — these are audit trail entries, not engagement signals. Only calls, emails, meetings, notes, texts, LinkedIn, WhatsApp, and document activities count as touches. Computed on display, not stored.

### 5.3 Stage Change Auto-Log

When a prospect's stage changes, the system automatically creates an Activity Log entry:
- Type: Stage Change
- Detail: "Stage updated from [Old] to [New]"
- Date: today
- Logged By: current user

**Post-stage-change prompt:** After the stage change confirms, a contextual inline prompt appears showing the fields most likely to need updating: Next Action Type, Next Action Detail, Next Action Date, and Investment Target — pre-filled with current values. User can confirm with one click (Enter) if nothing changed, or update inline. This prevents the "advanced the stage but forgot to update the plan" drift that kills CRM data quality within weeks.

### 5.4 Funded Transition Flow

When stage → Funded:
1. **Entity already linked:** Dialog shows dropdown of linked Funding Entities. Select one.
2. **No entity yet:** Dialog includes inline "Create Funding Entity" form (Entity Name, Entity Type) + investment fields (Amount, Date, Track).
3. Creates Funded Investment record under the selected/created entity.
4. Prospect stage moves to Funded.

### 5.5 Nurture Re-engagement

When stage → Nurture, Re-engage Date is required. On that date, the prospect automatically appears in the "Today's Actions" widget: "Re-engage: [Name] — parked since [date]."

### 5.6 Rep Reassignment (Admin Only)

Only Admins (Eric, Efri) can change the Assigned Rep on a prospect. This is intentionally restricted to prevent confusion about ownership.

**When Assigned Rep changes:**
1. System auto-logs an Activity: Type = "Reassignment", Detail = "Reassigned from [Old Rep] to [New Rep]", Logged By = admin who made the change
2. The post-change prompt fires showing Next Action Type, Detail, and Date — admin confirms or updates on behalf of the new rep
3. All existing data stays intact: activity history, next action, stage, relationships — nothing is lost or reset
4. The prospect immediately appears on the new rep's dashboard. The "New" badge shows if the new rep hasn't logged activity on this prospect yet.
5. The old rep loses ownership but can still view the prospect (per their role permissions). If they were a Collaborator, that remains.

**Reassignment does NOT:**
- Reset Days Since Last Touch (Reassignment is excluded from touch calculation)
- Change the pipeline stage
- Remove Collaborators
- Delete or modify any activity history

### 5.7 Zoho-Side Automations (IT Checklist)

These run in Zoho, not in the frontend:
- Daily overdue email to Chad (7 AM CT) — prospects where Next Action Date < today
- Funded alert email to Eric — triggered when stage changes to Funded

---

## 6. Views & Screens

### 6.1 Routes

| Route | View | Users | Purpose |
|---|---|---|---|
| `/` | Chad's Daily Dashboard | Chad, Ken | Morning briefing |
| `/pipeline` | Pipeline View | Chad, Ken | Full workhorse table |
| `/person/[id]` | Person Detail | Chad, Ken | Edit record, log activity |
| `/people` | People Directory | All | Search all people (prospects, contacts, referrers) |
| `/leadership` | Leadership Dashboard | Eric, Efri, Ken (partial) | AUM, funnel, source ROI. Ken sees Source Attribution + Top Referrers only. |
| `/admin` | Admin Panel | Eric, Efri | System configuration |
| `/login` | Login | All | Auth gate |

**Mobile "Search" tab** maps to `/people` — a global search overlay that searches across all People regardless of role.

### 6.2 Chad's Daily Dashboard (`/`)

**Last Viewed Bar (persistent, all screens):**
Compact bar at the top of every screen: `Last: Robert Calloway · Active Engagement · 📞 Quick log...`
Shows the most recently viewed prospect. Tapping the Quick Log area focuses the text field — Chad can log an activity without navigating back to the prospect's detail page. Tapping the name opens Person Detail. On mobile, this bar is especially critical — it eliminates the "find the prospect I just called" step. Resets when Chad views a different prospect.

**Row 0: Today's Momentum** (single line, below nav, above stats):
```
Today: 8 activities logged · 2 stages advanced · 1 new prospect added
```
Auto-updating, resets daily at midnight CT. Factual mirror of effort — no gamification, no judgment. The difference between a system that takes from Chad (data entry) and one that sees him.

**Row 1: Quick Stats Bar** — 4 cards:
1. Active Pipeline Count — prospects not in Nurture/Dead/Funded
2. Pipeline Value ($) — sum of Initial Investment Target across active pipeline
3. Committed ($) — sum of Committed Amount where stage is Soft Commit, Commitment Processing, or KYC (excludes Funded — those are counted in Funded YTD)
4. Funded YTD ($) — sum from Funded Investment records

**Row 2 Left (60%): Today's Actions**
- Prospects where Next Action Date = today (or selected range), sorted by dollar value descending
- Also includes Nurture prospects where Re-engage Date falls within the selected range
- **Date toggle:** **Today | Tomorrow | This Week** — default is Today. Lets Chad prep for upcoming days without leaving the dashboard.
- Columns: Name, Company, Stage, Initial Investment, Next Action Type + Detail
- **"New" badge:** Prospects created by someone other than the Assigned Rep show a gold "New" badge for the first 24 hours or until the Assigned Rep logs their first activity on the record (whichever comes first). This is the handoff signal — when Ken or Eric creates a prospect and assigns it to Chad, it's immediately visible as something new that needs his attention.
- Click row → `/person/[id]`
- **Empty state (all actions complete):** "All caught up." followed by directional context: "[N] prospects need attention" (links to Needs Attention if any exist), or if Needs Attention is also empty: "Pipeline healthy — next action is [Name] on [date]." The system always answers "what should I do now?"

**Row 2 Right (40%): Needs Attention**
- Stale Flag = true OR Next Action Date < today (overdue)
- Red indicator dot on each record
- Visually distinct (red-tinted border)
- Columns: Name, Stage, Days Idle, Next Action, Next Action Date
- Sorted by severity (most overdue first)

**Row 3: Recent Activity (collapsible, collapsed by default)**
- Reverse-chronological feed of all activities across all prospects, last 7 days
- Columns: Date/Time, Person (linked), Activity Type, Outcome, Detail (truncated), Logged By
- Filterable by rep (Admin sees all, rep defaults to own)
- Serves three purposes: Chad's end-of-day "did I miss anyone?" check, Eric's lightweight oversight without micromanaging, and onboarding context for a new rep inheriting relationships

### 6.3 Pipeline View (`/pipeline`)

Full sortable table of all active pipeline records (excluding Nurture and Dead).

**Columns:** Name, Company, Stage, Initial Investment ($), Growth Target ($), Lead Source, Touches (activity count), Days Idle, Next Action, Next Action Date, Stale Flag (icon)

**Filters (bar above table):** Stage dropdown, Source dropdown, Stale Only toggle, Rep filter

**Default sort:** Next Action Date ascending (most urgent first)

**Sorting:** Click any column header to sort. Visual indicator for active sort column + direction.

**Row click:** Opens `/person/[id]`

**Pinned Prospects:**
Chad can pin up to 10 prospects to the top of Pipeline View (star icon on each row). Pinned prospects always appear above the separator line regardless of sort order or filters. One click to pin/unpin. Pin state is per-user (stored in user preferences, not on the prospect record). Transforms Pipeline View from "here's your entire world" to "here's what you're focused on this week, and everything else is below."

**Inline row actions** (hover on desktop, swipe on mobile):
1. **Quick Log** — compact inline text input opens directly on the row. Type, Enter, confirm Next Action, done. User never leaves Pipeline View. Identical behavior to Person Detail Quick Log (including smart prefix detection, outcome detection, and the Next Action prompt).
2. **Advance Stage** — one-click to move to the next sequential stage (e.g., Pitch → Active Engagement). Fires the post-stage-change prompt inline. For non-sequential moves (Nurture, Dead, skip stages), user must open Person Detail.
3. **Pin/Unpin** — star icon toggle.

**Design notes:**
- Dollar amounts right-aligned, formatted with $ and K/M abbreviation
- Next Action and Next Action Date must be visible on every row — these are Chad's primary navigation tool
- Stale/overdue indicators visually prominent (red dot or highlight)

### 6.4 Person Detail (`/person/[id]`)

Two-zone layout: a fixed **Cockpit** (always visible, never scrolls off) and a scrollable **Detail Zone** below it. Chad lives in the cockpit — it contains everything he needs for a call. The detail zone is the filing cabinet for occasional reference and editing.

#### Cockpit (Fixed Top Zone)

**6.4.1 Identity Bar**
Name, Organization (linked), Stage badge (color-coded), Investment Target, Stale indicator (red dot if stale).

**Click-to-call (📞):** Next to phone number. With Zoho provider: triggers Zoho PhoneBridge API to place the call (see Section 13 Phase 3). With mock provider: opens `tel:` link (native phone dialer on mobile, system default on desktop). Both create a Call activity entry.

**Click-to-email (✉️):** Next to email. Opens `mailto:` link. User manually logs the activity or it's captured via O365 sync (Zoho provider).

**6.4.2 Next Action Bar**
Next Action Type + Detail + Date — editable inline, always visible. This is Chad's primary "what am I supposed to do?" signal. Date input uses quick-pick chips (see Section 6.9).

**6.4.3 Recent Snapshot**
Last 3 activities — compact format: type icon + date + first line of detail, truncated. Not the full timeline — a glance. Purpose: "Oh right, I sent him the deck on the 12th." Gives Chad instant context before a call without scrolling.

**6.4.4 Quick Log**
Always visible at the bottom of the cockpit. Single text input, type and hit Enter:

```
💬 Quick log: Called Robert, discussed returns... [↵ Enter]
```

- **Smart prefix detection:** Activity type auto-detected from what Chad types:
  - `Called...` / `Spoke with...` → Call
  - `Emailed...` / `Sent email...` → Email
  - `Met with...` / `Meeting...` → Meeting
  - `Texted...` → Text Message
  - `LinkedIn...` / `DM'd...` → LinkedIn Message
  - `Sent deck...` / `Sent PPM...` → Document Sent
  - `Received docs...` → Document Received
  - Anything else → Note (default)
  - Type badge updates in real-time as Chad types. One tap to override if detection is wrong.
- **Smart outcome detection:** Auto-sets Outcome to "Attempted" if text contains "voicemail," "no answer," "didn't pick up," "left message," or "no response." Connected stays default for everything else.
- Date defaults to now
- "+ More options" expands full form: Activity Type, Date, Time, Outcome, Detail, Attachments
- After submit: entry appears at top of Recent Snapshot, Days Since Last Touch resets

**Post-activity flow (continuous, no navigation):**

After Quick Log submit, a compact inline prompt replaces the Quick Log area:

```
Next action? [Follow Up ▾] [Send Q3 deck     ] [Tomorrow ▾]  [✓ Confirm]
                                          [↑ Advance to Active Engagement?]
```

1. **Next Action prompt:** Pre-filled with current values. Edit or hit Enter to keep. Not skippable — this prevents CRM decay.
2. **Advance Stage shortcut:** Below the Next Action fields, a link: "Advance to [Next Stage]?" One tap → stage advances, prompt updates to show post-stage-change fields. The entire post-activity workflow — log, update next action, advance stage — happens in one continuous flow.
3. After confirming, Quick Log resets and is ready for the next entry.

#### Detail Zone (Scrollable Below Cockpit)

**6.4.5 Activity Timeline**
Full reverse-chronological list of all Activity Log entries.

**Entry anatomy:**
- Type icon (color-coded: blue=email, green=call, purple=meeting, amber=note, gray=stage change)
- Outcome badge (small "Attempted" tag on non-connected activities — Connected doesn't show a badge since it's the default)
- Date and time
- Who logged it (important with multiple contributors)
- Detail text
- Attached documents (clickable)
- Auto-synced entries show ⚡AUTO badge + "Add notes" annotation prompt

**Stage changes** render as timeline dividers, not cards:
```
─── ➡️ Pitch → Active Engagement · Feb 5, 2026 ───
```

**Reassignments** also render as timeline dividers:
```
─── 🔄 Reassigned: Chad Cormier → New Rep · Mar 15, 2026 ───
```

**Filter pills above timeline:**
```
[All] [Calls] [Emails] [Meetings] [Notes] [Docs] [Stage Changes] [Auto ⚡]
```

**6.4.6 Stage Progression Bar**
Visual 9-step horizontal bar, current stage highlighted. Click a stage → confirmation dialog → auto-logs Stage Change activity → fires post-stage-change prompt. Nurture and Dead shown as separate actions (not in the bar).

**6.4.7 Organization Section**
Linked Organization (if any). Autocomplete-or-create. Shows other prospects in the same org.

**6.4.8 Funding Entities Panel**
List of linked entities (name, type, status). Add button uses autocomplete-or-create. Nudge message at Commitment Processing / KYC if empty. Not required until Funded transition.

**6.4.9 Related Contacts Panel**
List of related people (name, role, company, phone/email). Add uses autocomplete-or-create from the unified People pool. Same person can appear as Related Contact on multiple prospects.

**6.4.10 Referrer**
Single field showing who referred this prospect. Autocomplete-or-create from People pool. Shows referrer's other referrals for context.

**6.4.11 Background Notes**
Collapsible section, visually de-emphasized. For static context only: accreditation details, personal interests, family situation, preferences. Placeholder text: *"Background context — use Quick Log for activities."* Intentionally positioned and styled to prevent misuse as an activity log substitute.

**6.4.12 Prospect Fields (Editable)**
All remaining prospect fields available for inline editing: Investment Target, Growth Target, Committed Amount, Lead Source, Collaborators, Lost/Dead Reason. Assigned Rep is visible but only editable by Admins (see Section 5.6).

### 6.5 Leadership Dashboard (`/leadership`)

Eric's view. Read-only. Ken has partial access — sees only Source Attribution and Top Referrers sections (his campaign performance data). All other sections (AUM bar, Funnel, Red Flags) are Admin-only.

**Row 1: AUM Progress Bar**
Horizontal bar: $60M baseline → current ($60M + funded from system) → $105M target. Shows % complete and dollar amount. Both endpoints labeled. Baseline ($60M) and target ($105M) are configurable in admin.

**Row 2 Left: Funnel Chart**
Horizontal bar chart. Stages on Y-axis, count on X-axis. Green for late-stage (Soft Commit → KYC), gray for early stage.

**Row 2 Right: Source Attribution Table**
Columns: Lead Source, Count, Total Initial Investment ($), Total Funded ($). Sorted by Total Initial Investment descending.

**Row 3 Left: Top Referrers**
Table: Referrer Name, Referrals Count, Pipeline Value, Funded Value. Shows the relationship network that's driving capital.

**Row 3 Right: Red Flags Panel**
Stale Flag = true OR overdue. Investor name, Stage, Days Idle, Next Action. Green "Pipeline Healthy" indicator when empty.

### 6.6 People Directory (`/people`)

Global search and browse for all people in the system — prospects, referrers, related contacts, funded investors.

**Search bar** at top — fuzzy search by name, company, email, phone.

**Results** show: Name, Roles (badges), Organization, Contact Type/Company (if external contact), Stage (if prospect). Click → `/person/[id]`.

**Filters:** Role (Prospect, Referrer, Related Contact, Funded Investor), Organization.

On mobile, this is the "Search" tab in the bottom navigation. Opens as a full-screen search with large tap targets.

### 6.7 Create Prospect Flow

**Entry points:** Gold "+" button on Dashboard (top-right of Row 1) and Pipeline View (top-right of filter bar). On mobile: floating action button (bottom-right). Visible only to users with "Create new prospect" permission.

**Minimum viable form (one screen, no tabs):**

| Field | Required | Default |
|---|---|---|
| Full Name | Yes | — |
| Phone | No | — |
| Email | No | — |
| Lead Source | Yes | — |
| Next Action Type | Yes | "Follow Up" |
| Next Action Detail | Yes | — |
| Next Action Date | Yes | Tomorrow |
| Assigned Rep | Yes | Current user |

Pipeline Stage auto-sets to "Prospect." All other fields (Organization, Investment Target, etc.) are filled in later on Person Detail.

**Autocomplete-or-create fires on Full Name** — if a matching Person already exists, the system shows the match with a badge: "Already exists as [Referrer/Contact]" → selecting adds the Prospect role. This prevents duplicates at the point of entry.

**After creation:** Redirects to the new Person Detail page where Chad can add more context. If the creator is not the Assigned Rep (e.g., Ken creates and assigns to Chad), the "New" badge appears on Chad's dashboard immediately.

### 6.8 Admin Panel (`/admin`)

Eric/Efri only.

**Sections:**
1. **User Management** — add/edit/deactivate users, assign role template, per-user permission overrides
2. **Role Templates** — define permission sets (Rep, Marketing, Admin). Each permission has three states per user: Inherited (from role), Override: Allow, Override: Deny
3. **Pipeline Stage Config** — edit stage names, idle thresholds, ordering
4. **Lead Source Management** — add/remove/rename (autocomplete-or-create aware)
5. **Activity Type Management** — add/remove/rename
6. **Data Hygiene** — merge duplicate People, Organizations, Referrers. Auto-detection of similar entries (fuzzy match). One-click merge with cascade to all linked records. Rename with global update.
7. **System Settings** — AUM baseline ($60M), AUM target ($105M), default rep assignment, company name

### 6.9 Date Quick-Pick Chips

Everywhere a Next Action Date is entered — Quick Log prompt, post-stage-change prompt, Create Prospect form, inline pipeline edit, Person Detail — the date input shows quick-pick chips before the calendar:

```
[Today] [Tomorrow] [+3d] [Mon] [Fri] [+1w] [+2w]  📅
```

One tap, done. The calendar icon (📅) opens a full date picker for specific dates, but most of the time Chad never needs it. "Mon" and "Fri" resolve to the next upcoming Monday/Friday. Chips are contextual to CT timezone.

### 6.10 Keyboard Shortcuts (Desktop)

The core loop — find, log, update, advance — should be achievable without touching the mouse.

| Shortcut | Action | Context |
|---|---|---|
| `/` | Focus global search | Any screen |
| `L` | Focus Quick Log input | Person Detail, Pipeline View (selected row) |
| `Enter` | Submit Quick Log → auto-focuses Next Action prompt | Quick Log |
| `Enter` | Confirm Next Action | Next Action prompt |
| `S` | Advance to next stage (opens confirmation) | Person Detail |
| `P` | Pin/unpin prospect | Pipeline View (selected row) |
| `↑` `↓` | Navigate rows | Pipeline View, Dashboard lists |
| `Enter` | Open selected row | Pipeline View, Dashboard lists |
| `Esc` | Back / dismiss prompt / close dialog | Any screen |
| `N` | Open Create Prospect form | Dashboard, Pipeline View |

**Full keyboard loop example:** `/ → robert → Enter → L → Called Robert, reviewed Q3 numbers → Enter → Enter → done.` Full activity log + next action update, zero mouse.

Shortcuts are discoverable via a `?` overlay (press `?` on any screen to see available shortcuts).

### 6.11 Last Viewed Bar (Global)

See Section 6.2 — the Last Viewed Bar is defined there as it appears on every screen. It persists across navigation: if Chad views Robert Calloway, then goes to Pipeline View, the bar still shows Robert with Quick Log access. This is the critical "I just hung up the phone" optimization.

---

## 7. Roles & Permissions

### 7.1 Role Templates

| Capability | Rep | Marketing | Admin |
|---|---|---|---|
| View all prospects/pipeline | Yes | Yes | Yes |
| Create new prospect | Yes | No | Yes |
| Edit prospect fields | Yes | No | Yes |
| Change pipeline stage | Yes | No | Yes |
| Reassign prospect rep | No | No | Yes |
| Log activity (all types) | Yes | Note + Doc Received only | Yes |
| Attach documents | Yes | Yes | Yes |
| Edit Next Action | Yes | No | Yes |
| View leadership dashboard | No | No | Yes |
| View Source Attribution & Referrer reports | No | Yes | Yes |
| Admin panel access | No | No | Yes |
| Manage users & roles | No | No | Yes |

### 7.2 Per-User Overrides

Admin can override any permission for a specific user. Example: Ken gets "Create new prospect" enabled because he's sourcing leads at events, even though the Marketing template defaults to No.

Overridden permissions show a visual indicator in the admin panel so Eric knows what's custom vs. inherited.

### 7.3 Collaborator Behavior

The Assigned Rep is the primary owner — responsible for Next Action. Collaborators are team members also involved in the relationship.

- **Dashboard:** Prospects where a user is a collaborator appear in a separate "Collaborating" section below Today's Actions (collapsed by default). They do NOT appear in the main Today's Actions or Needs Attention widgets — those are owner-only.
- **Pipeline View:** Filterable by "My Prospects" (owner), "Collaborating", or "All". Default is "All".
- **Permissions:** Collaborators have the same edit permissions as their role allows — being a collaborator does not grant or restrict anything beyond their role template + overrides.
- **Notifications:** Collaborators see stage changes and stale flags for their shared prospects, but are not responsible for resolving them.

### 7.4 Permission Storage

V1: User authentication (username/password/role) lives in the `USERS` env var. Permission overrides and role template definitions live in the **data layer** (mock provider stores them in memory alongside other data; Zoho provider stores them in a Zoho custom module or settings). This separation ensures:
- Auth concerns (who can log in) are in env config
- Authorization concerns (what they can do) are in the data layer where the admin panel can read/write them

---

## 8. Authentication

### 8.1 V1: Simple Login

- Users stored in environment variable: `USERS=chad:hashedpassword:rep,ken:hashedpassword:marketing,eric:hashedpassword:admin`
- Login screen: email/username + password
- Session: httpOnly encrypted cookie
- Middleware checks session on every route, redirects to `/login` if missing
- Role from session determines UI capabilities

### 8.2 V2 Migration: Zoho OAuth

**Prerequisites:**
- All users must have Zoho accounts
- Zoho OAuth application registered in Zoho API Console

**Migration steps:**
1. Register OAuth app in Zoho API Console (Server-based Application)
2. Configure redirect URI: `https://[production-domain]/api/auth/callback/zoho`
3. Set scopes: `ZohoCRM.modules.ALL`, `ZohoCRM.users.READ`
4. Implement NextAuth.js with custom Zoho provider:
   - Authorization URL: `https://accounts.zoho.com/oauth/v2/auth`
   - Token URL: `https://accounts.zoho.com/oauth/v2/token`
   - User info: `https://accounts.zoho.com/oauth/v2/userinfo` (OpenID)
5. Map Zoho user email to app user record → assign role
6. Store Zoho access token in session — reuse for API calls (no separate API credentials)
7. Implement refresh token rotation for automatic token renewal
8. Remove `USERS` env var and simple login route
9. Update middleware to check Zoho session validity

**Rollback plan:** Keep simple login code behind a feature flag during migration. If Zoho OAuth has issues, revert via env var `AUTH_PROVIDER=simple|zoho`.

---

## 9. Design Language

### 9.1 Aesthetic Direction

"Jony Ive meets Bloomberg Terminal" — institutional trust with radical simplicity.

Loosely derived from the OwnEZ brand (www.ownez.com):
- **Navy** (`#0b2049`) — sidebar/nav, headers
- **Gold** (`#e8ba30`) — sole accent color. If it's gold, you can interact with it. CTAs, active states, badges.
- **White/light gray** — workspace background
- **Red** (`#ef4444`) — exclusively for stale/overdue alerts
- **Green** — exclusively for "healthy" / funded indicators
- No other colors. Discipline.

### 9.2 Typography

One clean sans-serif (system or loaded). Tight, functional.
- Tabular/monospaced numbers for dollar columns — perfect alignment
- Tight tracking on large headings
- Generous line-height on body text

### 9.3 Principles

- **Whitespace creates hierarchy.** No borders where spacing alone works.
- **Every element earns its place.** If Chad can't tell what to do next in 2 seconds, the design has failed.
- **Gold = action.** Buttons, links, interactive elements. Everything else is informational.
- **Pill-shaped buttons.** Generous border-radius, matching OwnEZ website.
- **No hover-only information.** Everything critical is visible by default (touch-friendly).

---

## 10. Mobile Experience

### 10.1 Mobile-First Views

Two workflows are primary on mobile:

**1. Quick Log** — Chad logs an activity from his phone in <15 seconds:
- Open app → Last Viewed bar shows the prospect he just called → tap Quick Log
- Type note (smart prefix detects activity type) → Enter
- Confirm/update Next Action (date quick-pick chips for thumb-friendly selection) → Enter
- Done — 2 taps + 2 Enters, no searching required
- **Alternate path** if Last Viewed isn't the right prospect: Dashboard → tap prospect (or Search tab → find prospect) → Quick Log

**2. Daily Cockpit** — Morning briefing on the go:
- Today's Momentum line — quick sense of progress
- Today's Actions (with Today/Tomorrow/This Week toggle) — who to call, in order
- Needs Attention — anything on fire
- Tap prospect → Cockpit zone shows context + Quick Log, no scrolling needed to start working

### 10.2 Mobile Layout

| Desktop | Mobile |
|---|---|
| Sidebar nav | Bottom tab bar: Dashboard, Search |
| Last Viewed bar (top) | Last Viewed bar (top, same behavior) |
| Pipeline table (10 columns) | Card list (name, stage, next action, stale dot, pin star) |
| Person Detail: cockpit + detail zone | Cockpit zone fills viewport, detail zone scrolls below. Quick Log pinned to bottom of cockpit. |
| Date picker | Quick-pick chips (large tap targets) + calendar fallback |
| Full activity form | Quick log always visible, full form behind "more" |

### 10.3 Not Mobile-Optimized

- Leadership Dashboard (desktop use case)
- Admin Panel (desktop only)
- Full prospect field editing (complex forms)

---

## 11. Autocomplete-or-Create Pattern

### 11.1 Where It Applies

| Entity | Autocomplete-or-Create | Admin Merge |
|---|---|---|
| Person (as Referrer) | Yes — searches all People | Yes |
| Person (as Related Contact) | Yes — searches all People | Yes |
| Person (as new Prospect) | Yes — if exists, offers "convert to prospect" | Yes |
| Organization | Yes — fuzzy match by name | Yes |
| Funding Entity | Yes — scoped to prospect's entities | Yes |

### 11.2 Behavior

1. **User types 2+ characters** → system shows matching existing entries (fuzzy match)
2. **Existing match:** click to select. Contact info pre-populated. Done.
3. **No match:** "Create new [entity]" option at bottom → inline form (name + key fields)
4. **Person already exists in different role:** system shows badge "Already exists as [Prospect/Contact]" → selecting adds the new role without duplicating

### 11.3 Fuzzy Matching

- Levenshtein distance for typo tolerance
- Case-insensitive
- Ignores common suffixes (LLC, Inc, Trust, LLP)
- Matches on first name, last name, or company

### 11.4 Admin Merge (Data Hygiene)

- Auto-detection of similar entries flagged in admin panel
- One-click merge: select canonical name, all linked records update
- Rename: global update cascades everywhere
- Merge history logged for audit

---

## 12. Data Service Interface

Both providers (mock and Zoho) implement this interface:

```typescript
interface DataService {
  // People
  getPeople(filters?: PeopleFilters): Promise<PaginatedResult<Person>>
  getPerson(id: string): Promise<Person>
  createPerson(data: CreatePersonInput): Promise<Person>
  updatePerson(id: string, data: UpdatePersonInput): Promise<Person>
  deactivatePerson(id: string): Promise<void>
  searchPeople(query: string): Promise<Person[]> // fuzzy search for autocomplete
  findDuplicatePeople(): Promise<DuplicateGroup[]>

  // Referrer relationships
  addReferrer(prospectId: string, referrerId: string): Promise<void>
  removeReferrer(prospectId: string, referrerId: string): Promise<void>
  getReferrals(referrerId: string): Promise<Person[]> // prospects this person referred

  // Related Contact relationships
  addRelatedContact(prospectId: string, contactId: string, role: string): Promise<void>
  removeRelatedContact(prospectId: string, contactId: string): Promise<void>
  getRelatedContacts(prospectId: string): Promise<RelatedContactLink[]>

  // Organizations
  getOrganizations(): Promise<Organization[]>
  getOrganization(id: string): Promise<Organization>
  createOrganization(data: CreateOrgInput): Promise<Organization>
  updateOrganization(id: string, data: UpdateOrgInput): Promise<Organization>
  searchOrganizations(query: string): Promise<Organization[]>
  findDuplicateOrgs(): Promise<DuplicateGroup[]>

  // Funding Entities
  getFundingEntities(personId: string): Promise<FundingEntity[]>
  createFundingEntity(data: CreateEntityInput): Promise<FundingEntity>
  updateFundingEntity(id: string, data: UpdateEntityInput): Promise<FundingEntity>

  // Activities
  getActivities(personId: string, filters?: ActivityFilters): Promise<Activity[]>
  getRecentActivities(filters?: RecentActivityFilters): Promise<Activity[]> // cross-prospect feed, filterable by rep and date range
  createActivity(personId: string, data: CreateActivityInput): Promise<Activity>
  annotateActivity(activityId: string, note: string): Promise<Activity>

  // Funded Investments
  getFundedInvestments(filters?: FundedFilters): Promise<FundedInvestment[]>
  createFundedInvestment(data: CreateFundedInput): Promise<FundedInvestment>
  updateFundedInvestment(id: string, data: UpdateFundedInput): Promise<FundedInvestment>

  // Dashboard aggregations
  getDashboardStats(): Promise<DashboardStats>
  getLeadershipStats(): Promise<LeadershipStats>
  getTopReferrers(limit?: number): Promise<ReferrerStats[]>

  // Reports
  getPipelineSummary(filters?: ReportFilters): Promise<PipelineReportRow[]>
  getActivityExport(filters?: ActivityReportFilters): Promise<Activity[]>
  getLostAnalysis(): Promise<LostAnalysisRow[]>
  getSourceROI(): Promise<SourceROIRow[]>
  exportToCsv(reportName: string, filters?: ReportFilters): Promise<string> // returns CSV string

  // Users & Auth
  getUsers(): Promise<User[]>
  createUser(data: CreateUserInput): Promise<User>
  updateUser(id: string, data: UpdateUserInput): Promise<User>
  deactivateUser(id: string): Promise<void>
  getUserPermissions(userId: string): Promise<ResolvedPermissions> // role + overrides merged

  // Picklist administration
  getPicklistValues(field: string): Promise<PicklistValue[]>
  updatePicklistValues(field: string, values: PicklistValue[]): Promise<void>

  // System config
  getSystemConfig(): Promise<SystemConfig>
  updateSystemConfig(data: UpdateConfigInput): Promise<SystemConfig>

  // Data hygiene
  mergePeople(keepId: string, mergeIds: string[]): Promise<Person>
  mergeOrganizations(keepId: string, mergeIds: string[]): Promise<Organization>
}

// Pagination support (mock provider can ignore, Zoho provider must implement)
interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
```

### 12.1 Mock Provider

Ships with V1. Contains all sample data from the reference JSX prototype:
- 12 prospects with full stage histories
- 3 funded investors with maintain/grow tracks
- 30+ timeline entries (calls, emails, meetings, stage changes)
- Sample organizations, funding entities, referrer relationships
- Sample auto-synced activities (with ⚡AUTO badge and Source = "Zoho Telephony" or "O365 Sync") demonstrating the full integration appearance
- Activity entries include Outcome field (mix of Connected and Attempted) to demonstrate the distinction
- Commitment Date populated on prospects with Committed Amounts

**Mock integration behavior:** The mock provider simulates the Zoho integrations so the full UI is reviewable without a Zoho connection:
- **Click-to-call (📞):** Opens `tel:` link (native dialer on mobile). After returning to the app, a mock Call activity is pre-populated in Quick Log with type = Call. On Zoho provider, this would trigger PhoneBridge instead.
- **Auto-synced entries:** Mock data includes sample telephony call logs and O365 email entries that display identically to how real Zoho-synced entries would appear — ⚡AUTO badge, Source field, Outcome, annotation prompt.
- All UI elements (badges, filters, timeline rendering) work identically on mock and Zoho providers. The provider switch is invisible to the user.

Data persists in memory during session. Resets on page reload (acceptable for demo/review purposes).

### 12.2 Zoho Provider

IT team implements against the same interface. See Section 13 for the full integration checklist.

---

## 13. Zoho Integration Checklist (for IT Team)

> **Context for IT:** This frontend is the *only* interface the sales team uses. Zoho is the database and automation engine — users never log into Zoho's UI. Every field listed below must be exposed via API so the frontend can read/write it. The frontend handles all display, workflow prompts, and computed fields (stale flags, days idle) — Zoho just stores and syncs.

### Phase 1: Zoho Backend Setup

- [ ] Confirm Zoho CRM edition (Professional+ required for custom modules and API access)
- [ ] Confirm existing org status — fresh or existing? Check for field name conflicts
- [ ] Create/verify user accounts: Chad Cormier, Ken Warsaw, Eric Gewirtzman, Efri Argaman

**Custom Modules:**
- [ ] Create "People" module (or repurpose Contacts) with all fields from Section 2.1
  - [ ] Include `Commitment Date` field (Date type) — auto-set by frontend when Committed Amount changes, but Zoho must store it
  - [ ] Include `Committed Amount` (Currency) — verbal target, distinct from funded rollup
- [ ] Create "Organizations" module with fields from Section 2.2
- [ ] Create "Funding Entities" module with fields from Section 2.3
- [ ] Create "Activity Log" custom related list under People with fields from Section 2.4
  - [ ] Include `Outcome` field (picklist: Connected, Attempted) — new field, tracks whether two-way exchange occurred
  - [ ] Include `Source` field (picklist: Manual, Zoho Telephony, O365 Sync) — distinguishes user-logged vs. auto-captured entries
- [ ] Create "Funded Investments" module with fields from Section 2.5

**Relationships:**
- [ ] People → Organization (lookup)
- [ ] Funding Entity → People (lookup)
- [ ] Activity Log → People (lookup)
- [ ] Funded Investment → Funding Entity (lookup)
- [ ] Funded Investment → People (denormalized lookup)
- [ ] Referrer relationship: People → People (many-to-many via junction module or multi-select)
- [ ] Related Contact relationship: People → People with role field

**Picklists:**
- [ ] Pipeline Stage — 11 values from Section 3
- [ ] Lead Source — 10 values from Section 4.2
- [ ] Activity Type — 10 values from Section 4.3
- [ ] Next Action Type — 7 values from Section 4.1
- [ ] Activity Outcome — 2 values (Connected, Attempted)
- [ ] Entity Type — 6 values (LLC, LLP, Trust, Individual, Corporation, Other)
- [ ] Lost/Dead Reason — 6 values
- [ ] Track — 2 values (Maintain, Grow)
- [ ] Organization Type — 4 values
- [ ] Contact Type — 6 values
- [ ] Funding Entity Status — 3 values

### Phase 2: API Integration

- [ ] Generate Zoho API OAuth client (Self Client type for server-to-server)
- [ ] Record Client ID, Client Secret, Refresh Token
- [ ] Set required scopes: `ZohoCRM.modules.ALL`, `ZohoCRM.settings.ALL`, `ZohoCRM.users.READ`
- [ ] Implement `lib/providers/zoho.ts` matching the DataService interface (Section 12)
- [ ] Map Zoho module API names to interface methods
- [ ] Handle Zoho pagination (200 records per page)
- [ ] Handle Zoho rate limits (API credits per day based on edition)
- [ ] Implement `getRecentActivities()` — cross-prospect query sorted by date descending, filterable by user and date range (powers the Dashboard Recent Activity feed)
- [ ] Set environment variables: `DATA_PROVIDER=zoho`, `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ORG_ID`
- [ ] Test each endpoint: CRUD people, activities, funded investments, dashboard stats

### Phase 3: Communication Integrations

**Zoho Telephony (Click-to-Call):**

> **Flow:** Chad taps 📞 on a prospect → frontend calls `/api/call/initiate` → backend triggers Zoho PhoneBridge API with prospect's phone number → Zoho places the call via configured telephony provider → call happens → Zoho auto-captures call log → frontend reads it as an Activity Log entry on next load.

- [ ] Confirm Zoho PhoneBridge is active and configured with telephony provider (RingCentral, Twilio, etc.)
- [ ] Implement click-to-call API endpoint: frontend sends prospect ID + phone number → backend calls Zoho PhoneBridge `make_call` API
- [ ] Confirm Zoho auto-captures call logs (direction, duration, recording URL, timestamp, linked contact)
- [ ] Expose call logs via API as Activity Log entries with Source = "Zoho Telephony"
- [ ] Auto-set Outcome field on telephony entries: Connected if duration > 30s, Attempted if ≤ 30s (configurable threshold)
- [ ] Map call recording URL to the Activity Log so it's playable/downloadable from the frontend timeline

**Office 365 Email Sync:**

> **Flow:** Zoho's native O365 integration syncs emails bidirectionally. Emails matched to a prospect by email address appear as Activity Log entries in the frontend. The frontend only *reads* these — Zoho handles all sync logic.

- [ ] Configure Zoho ↔ O365 email integration (Zoho Mail Integration or Zoho SalesInbox)
- [ ] Confirm email matching: incoming/outgoing emails matched to People records by email address
- [ ] Expose matched emails via API as Activity Log entries with Source = "O365 Sync"
- [ ] Include: email subject, body preview (first 500 chars), direction (inbound/outbound), attachments
- [ ] Auto-set Outcome field: Connected if email is a reply in a thread (indicates two-way), Attempted if outbound with no reply within 48h
- [ ] Ensure email activities include timestamp (sent/received time) mapped to Activity Log Date + Time fields

**Deduplication:**
- [ ] If Chad manually logs a call AND Zoho captures it automatically, prevent duplicate entries (match by timestamp ±5 min + same prospect)
- [ ] Same for emails: if Chad manually logs "Sent Q3 deck" and O365 sync captures the same email, deduplicate (match by timestamp ±5 min + same prospect + Source differs)

### Phase 4: Zoho-Side Automations

- [ ] Daily overdue email to Chad (7 AM CT) — prospects where Next Action Date < today and stage is active
- [ ] Funded alert email to Eric — triggered when stage field changes to Funded
- [ ] (Optional) Weekly pipeline summary email to Eric

### Phase 5: Auth Migration (Zoho OAuth)

See Section 8.2 for detailed migration steps.

### IT Team Notes: Fields Computed by Frontend (Not Stored in Zoho)

The following are calculated live by the frontend and do **not** need corresponding Zoho fields:

- **Days Since Last Touch** — computed from latest Activity Log date
- **Stale Flag** — computed from idle days vs. stage threshold + Next Action Date (see Section 5.1)
- **Pipeline Value, Committed total, Funded YTD** — aggregated from stored fields at query time
- **Commitment Date** — *is* stored in Zoho (set by frontend when Committed Amount changes), but the *trigger logic* lives in the frontend, not a Zoho workflow

The following **are** stored in Zoho and written by the frontend:
- **Commitment Date** — Date field, written whenever Committed Amount changes
- **Activity Outcome** — Picklist (Connected/Attempted), written on every activity creation
- **Activity Source** — Picklist (Manual/Zoho Telephony/O365 Sync), auto-set based on origin

---

## 14. Reports

Accessible from the Leadership Dashboard via a "Reports" tab/section. Reports are derived from existing data service methods and rendered as filterable tables with a **CSV export button** (browser-side generation). No separate `/reports` route — reports live within the Leadership Dashboard to keep navigation simple.

| Report | Description | Access |
|---|---|---|
| Pipeline Summary | All active prospects by stage with dollar values and next actions | Eric, Chad |
| Activity Log Export | Full activity history, filterable by date range and type | Eric |
| Funded Investors | All funded investments with amounts, dates, entities, track status | Eric |
| Lost Analysis | Dead/Lost records with reason codes and dollar value lost | Eric |
| Source ROI | Source attribution by count and dollar value — pipeline and funded | Eric |
| Referrer Network | Top referrers by referral count, pipeline value, and funded value | Eric |

---

## 15. Error & Loading States

Every view must handle three states consistently:

| State | Treatment |
|---|---|
| **Loading** | Skeleton placeholders matching the layout shape. No spinners. Stat cards show animated pulse bars, table rows show gray blocks. |
| **Error** | Inline error message with retry button. "Something went wrong — try again." Never a blank screen. Dashboard stat cards show "—" on individual failures without blocking the rest. |
| **Empty** | Contextual empty state with direction. Pipeline with no prospects: "No active prospects yet — add your first one." Needs Attention with no flags: green "Pipeline Healthy" indicator. Today's Actions complete: "All caught up" + link to next priority (see 6.2). Timeline with no activities: "No activity logged yet." Every empty state answers "what should I do now?" — never just a dead end. |

**Zoho token expiry (V2):** If an API call returns 401, silently refresh the token and retry once. If refresh fails, redirect to login with message: "Your session expired — please sign in again."

---

## 16. Timezone Handling

All date comparisons (Next Action Date vs. "today", Re-engage Date, stale flag calculations) use **Central Time (CT)** — the team's operating timezone. This is configurable in System Settings (admin panel) for future multi-timezone support.

Dates are stored as date-only values (no time component) in the data layer. "Today" is always resolved in the configured timezone, not UTC or the browser's local timezone.

Activity Log timestamps (date + time) are stored in CT and displayed in CT. If multi-timezone support is needed later, store as UTC and convert on display.

---

## 17. Fund / Opportunity Tracking

The Funded Investment record (Section 2.5) does not include a field for which OwnEZ fund or opportunity the investment is allocated to. This is intentional for V1 — fund/opportunity tracking is handled in Agora (the compliance system of record).

If this needs to change in the future, add a "Fund" picklist to the Funded Investment record (e.g., "Fund IV", "Fund V", "Fund VI") managed via admin panel. The Leadership Dashboard's AUM progress bar would then support per-fund filtering.

---

## 18. Out of Scope (V1)

- Agora API integration (deferred)
- Investor portal / investor-facing access
- DocuSign or subscription document workflow
- Payment processing
- Zoho Books or accounting integration
- Native mobile app (responsive web handles mobile use cases)
- Post-funded investor management workflows (re-investment, track management — to be decided: Zoho native or future module)

**In scope (full UI ships with mock V1, live integration via Zoho provider):**
- **O365 email sync display** — Zoho handles the sync, frontend displays synced emails as Activity Log entries with Source = "O365 Sync". Mock V1 ships with realistic sample entries showing the full UI: ⚡AUTO badge, email subject/preview, Outcome, annotation prompt. Switching to Zoho provider activates live sync — zero UI changes.
- **Zoho telephony click-to-call** — Frontend shows 📞 button on all prospects. Mock V1 opens native dialer (`tel:` link) and pre-populates a Call activity. Zoho provider triggers PhoneBridge API instead, and call logs flow back automatically. The UI is identical in both modes.

---

## 19. Mock Data Inventory (Ships with V1)

The following sample data ships with the application for demo and review purposes, derived from the reference JSX prototype:

- **12 Prospects** across all pipeline stages (including Nurture and Dead)
- **3 Funded Investors** (1 Maintain track, 2 Grow track)
- **4 Organizations** (Calloway Family Office, Kim Holdings, etc.)
- **6 Funding Entities** (various LLCs and Trusts)
- **30+ Activity Log entries** (calls, emails, meetings, stage changes, documents)
- **5 External Contacts** (referrers and related contacts — CPAs, attorneys, spouses)
- **3 Auto-synced sample activities** (demonstrating telephony and email integration appearance)
- **Representative referrer relationships** showing the network effect

All data is realistic and internally consistent with the pipeline stages, dates, and relationships described in the original PRD.
