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
- System ships with mock data; IT team can switch to live Zoho by implementing one provider file

---

## 2. Data Model (5 Objects)

### 2.1 Person (Unified — replaces Prospect + External Contact)

Every individual in the system exists once. A person can have multiple roles: Prospect, Referrer, Related Contact, Funded Investor. This eliminates duplicates and surfaces the full relationship network.

| Field | Type | Required | Notes |
|---|---|---|---|
| Full Name | Text | Yes | |
| Email | Email | No | |
| Phone | Phone | No | |
| Organization | Lookup: Organization | No | Link to parent org |
| Roles | Multi-select | Yes | Prospect, Referrer, Related Contact, Funded Investor |
| **Prospect-role fields (visible when role includes Prospect):** | | | |
| Pipeline Stage | Picklist | Yes | 11 values — see Section 3 |
| Initial Investment Target ($) | Currency | No | Dollar amount prospect has indicated |
| Growth Target ($) | Currency | No | Longer-term target if they scale up |
| Committed Amount ($) | Currency | No | Verbal commitment — populate at Soft Commit+ |
| Next Action Type | Picklist | Yes | Follow Up, Schedule Meeting, Send Document, Request Info, Make Introduction, Internal Review, Other |
| Next Action Detail | Text (250 chars) | Yes | Specific context: "Q3 performance deck" |
| Next Action Date | Date | Yes | Date the next action is due |
| Days Since Last Touch | Auto-calculated | Auto | Computed live from latest Activity date |
| Lead Source | Picklist | Yes | 10 values — see Section 4.2 |
| Assigned Rep | Lookup: User | Yes | Primary owner of the relationship |
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

Calculated as the number of days since the most recent Activity Log entry for a prospect. Computed on display, not stored.

### 5.3 Stage Change Auto-Log

When a prospect's stage changes, the system automatically creates an Activity Log entry:
- Type: Stage Change
- Detail: "Stage updated from [Old] to [New]"
- Date: today
- Logged By: current user

### 5.4 Funded Transition Flow

When stage → Funded:
1. **Entity already linked:** Dialog shows dropdown of linked Funding Entities. Select one.
2. **No entity yet:** Dialog includes inline "Create Funding Entity" form (Entity Name, Entity Type) + investment fields (Amount, Date, Track).
3. Creates Funded Investment record under the selected/created entity.
4. Prospect stage moves to Funded.

### 5.5 Nurture Re-engagement

When stage → Nurture, Re-engage Date is required. On that date, the prospect automatically appears in the "Today's Actions" widget: "Re-engage: [Name] — parked since [date]."

### 5.6 Zoho-Side Automations (IT Checklist)

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
| `/leadership` | Leadership Dashboard | Eric, Efri | AUM, funnel, source ROI |
| `/admin` | Admin Panel | Eric, Efri | System configuration |
| `/login` | Login | All | Auth gate |

**Mobile "Search" tab** maps to `/people` — a global search overlay that searches across all People regardless of role.

### 6.2 Chad's Daily Dashboard (`/`)

**Row 1: Quick Stats Bar** — 4 cards:
1. Active Pipeline Count — prospects not in Nurture/Dead/Funded
2. Pipeline Value ($) — sum of Initial Investment Target across active pipeline
3. Committed ($) — sum of Committed Amount where stage is Soft Commit, Commitment Processing, or KYC (excludes Funded — those are counted in Funded YTD)
4. Funded YTD ($) — sum from Funded Investment records

**Row 2 Left (60%): Today's Actions**
- Prospects where Next Action Date = today, sorted by dollar value descending
- Also includes Nurture prospects where Re-engage Date = today
- Columns: Name, Company, Stage, Initial Investment, Next Action Type + Detail
- Click row → `/person/[id]`

**Row 2 Right (40%): Needs Attention**
- Stale Flag = true OR Next Action Date < today (overdue)
- Red indicator dot on each record
- Visually distinct (red-tinted border)
- Columns: Name, Stage, Days Idle, Next Action, Next Action Date
- Sorted by severity (most overdue first)

### 6.3 Pipeline View (`/pipeline`)

Full sortable table of all active pipeline records (excluding Nurture and Dead).

**Columns:** Name, Company, Stage, Initial Investment ($), Growth Target ($), Lead Source, Touches (activity count), Days Idle, Next Action, Next Action Date, Stale Flag (icon)

**Filters (bar above table):** Stage dropdown, Source dropdown, Stale Only toggle, Rep filter

**Default sort:** Next Action Date ascending (most urgent first)

**Sorting:** Click any column header to sort. Visual indicator for active sort column + direction.

**Row click:** Opens `/person/[id]`

**Design notes:**
- Dollar amounts right-aligned, formatted with $ and K/M abbreviation
- Next Action and Next Action Date must be visible on every row — these are Chad's primary navigation tool
- Stale/overdue indicators visually prominent (red dot or highlight)

### 6.4 Person Detail (`/person/[id]`)

#### 6.4.1 Header Panel
Name, Organization (linked), Stage (editable dropdown with confirmation), Investment Target, Committed Amount, Next Action Type + Detail, Next Action Date, Stale flag. Click-to-call (📞) and click-to-email (✉️) next to phone/email.

#### 6.4.2 Stage Progression Bar
Visual 9-step horizontal bar, current stage highlighted. Click a stage → confirmation dialog → auto-logs Stage Change activity. Nurture and Dead shown as separate actions (not in the bar).

#### 6.4.3 Organization Section
Linked Organization (if any). Autocomplete-or-create. Shows other prospects in the same org.

#### 6.4.4 Funding Entities Panel
List of linked entities (name, type, status). Add button uses autocomplete-or-create. Nudge message at Commitment Processing / KYC if empty. Not required until Funded transition.

#### 6.4.5 Related Contacts Panel
List of related people (name, role, company, phone/email). Add uses autocomplete-or-create from the unified People pool. Same person can appear as Related Contact on multiple prospects.

#### 6.4.6 Referrer
Single field showing who referred this prospect. Autocomplete-or-create from People pool. Shows referrer's other referrals for context.

#### 6.4.7 Quick Log (Default Activity Entry)
Always visible above timeline. Single text input, type and hit Enter:

```
💬 Quick log: Called Robert, discussed returns... [↵ Enter]
                                      [+ More options]
```

- Type defaults to "Note"
- Date defaults to now
- "+ More options" expands full form: Activity Type, Date, Time, Detail, Attachments
- After submit: entry appears at top of timeline, Days Since Last Touch resets

#### 6.4.8 Activity Timeline
Reverse-chronological list of all Activity Log entries.

**Entry anatomy:**
- Type icon (color-coded: blue=email, green=call, purple=meeting, amber=note, gray=stage change)
- Date and time
- Who logged it (important with multiple contributors)
- Detail text
- Attached documents (clickable)
- Auto-synced entries show ⚡AUTO badge + "Add notes" annotation prompt

**Stage changes** render as timeline dividers, not cards:
```
─── ➡️ Pitch → Active Engagement · Feb 5, 2026 ───
```

**Filter pills above timeline:**
```
[All] [Calls] [Emails] [Meetings] [Notes] [Docs] [Stage Changes] [Auto ⚡]
```

#### 6.4.9 Prospect Fields (Editable)
All remaining prospect fields available for inline editing: Investment Target, Growth Target, Committed Amount, Lead Source, Rep, Collaborators, Notes, Lost/Dead Reason.

### 6.5 Leadership Dashboard (`/leadership`)

Eric's view. Read-only.

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

### 6.7 Admin Panel (`/admin`)

Eric/Efri only.

**Sections:**
1. **User Management** — add/edit/deactivate users, assign role template, per-user permission overrides
2. **Role Templates** — define permission sets (Rep, Marketing, Admin). Each permission has three states per user: Inherited (from role), Override: Allow, Override: Deny
3. **Pipeline Stage Config** — edit stage names, idle thresholds, ordering
4. **Lead Source Management** — add/remove/rename (autocomplete-or-create aware)
5. **Activity Type Management** — add/remove/rename
6. **Data Hygiene** — merge duplicate People, Organizations, Referrers. Auto-detection of similar entries (fuzzy match). One-click merge with cascade to all linked records. Rename with global update.
7. **System Settings** — AUM baseline ($60M), AUM target ($105M), default rep assignment, company name

---

## 7. Roles & Permissions

### 7.1 Role Templates

| Capability | Rep | Marketing | Admin |
|---|---|---|---|
| View all prospects/pipeline | Yes | Yes | Yes |
| Create new prospect | Yes | No | Yes |
| Edit prospect fields | Yes | No | Yes |
| Change pipeline stage | Yes | No | Yes |
| Log activity (all types) | Yes | Note + Doc Received only | Yes |
| Attach documents | Yes | Yes | Yes |
| Edit Next Action | Yes | No | Yes |
| View leadership dashboard | No | No | Yes |
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
- Open app → dashboard
- Tap prospect (or search)
- Quick log input → type note → Enter
- Done

**2. Daily Cockpit** — Morning briefing on the go:
- Today's Actions — who to call, in order
- Needs Attention — anything on fire
- Tap prospect → see context, tap phone number to call

### 10.2 Mobile Layout

| Desktop | Mobile |
|---|---|
| Sidebar nav | Bottom tab bar: Dashboard, Search, + Log |
| Pipeline table (10 columns) | Card list (name, stage, next action, stale dot) |
| Prospect detail side panels | Stacked panels, quick log pinned to bottom |
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
- Sample auto-synced activities (with ⚡AUTO badge) to demonstrate telephony/email integration appearance

Data persists in memory during session. Resets on page reload (acceptable for demo/review purposes).

### 12.2 Zoho Provider

IT team implements against the same interface. See Section 13 for the full integration checklist.

---

## 13. Zoho Integration Checklist (for IT Team)

### Phase 1: Zoho Backend Setup

- [ ] Confirm Zoho CRM edition (Professional+ required for custom modules and API access)
- [ ] Confirm existing org status — fresh or existing? Check for field name conflicts
- [ ] Create/verify user accounts: Chad Cormier, Ken Warsaw, Eric Gewirtzman, Efri Argaman

**Custom Modules:**
- [ ] Create "People" module (or repurpose Contacts) with all fields from Section 2.1
- [ ] Create "Organizations" module with fields from Section 2.2
- [ ] Create "Funding Entities" module with fields from Section 2.3
- [ ] Create "Activity Log" custom related list under People with fields from Section 2.4
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
- [ ] Set environment variables: `DATA_PROVIDER=zoho`, `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ORG_ID`
- [ ] Test each endpoint: CRUD people, activities, funded investments, dashboard stats

### Phase 3: Communication Integrations

**Zoho Telephony (Click-to-Call):**
- [ ] Confirm Zoho PhoneBridge is active and configured
- [ ] Expose call log data via API (direction, duration, recording URL, timestamp, linked contact)
- [ ] Implement click-to-call endpoint that triggers Zoho telephony API
- [ ] Map auto-captured calls to Activity Log entries with Source = "Zoho Telephony"

**Office 365 Email Sync:**
- [ ] Configure Zoho ↔ O365 email integration
- [ ] Match incoming/outgoing emails by prospect email address
- [ ] Expose matched emails via API as Activity Log entries with Source = "O365 Sync"
- [ ] Include email subject, body preview, and attachments

**Deduplication:**
- [ ] If Chad manually logs a call AND Zoho captures it automatically, prevent duplicate entries (match by timestamp ±5 min + same prospect)

### Phase 4: Zoho-Side Automations

- [ ] Daily overdue email to Chad (7 AM CT) — prospects where Next Action Date < today and stage is active
- [ ] Funded alert email to Eric — triggered when stage field changes to Funded
- [ ] (Optional) Weekly pipeline summary email to Eric

### Phase 5: Auth Migration (Zoho OAuth)

See Section 8.2 for detailed migration steps.

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
| **Empty** | Contextual empty state. Pipeline with no prospects: "No active prospects yet — add your first one." Needs Attention with no flags: green "Pipeline Healthy" indicator. Timeline with no activities: "No activity logged yet." |

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
- Two-way email sync display in V1 (mock samples only)
- Live Zoho telephony integration in V1 (mock samples only)
- Investor portal / investor-facing access
- DocuSign or subscription document workflow
- Payment processing
- Zoho Books or accounting integration
- Native mobile app (responsive web handles mobile use cases)

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
