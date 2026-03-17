# Phase 1 Testing & Verification — Ralph Loop Prompt

**Goal:** Verify that the OwnEZ CRM Phase 1 implementation is complete, correct, and matches the design spec. Fix anything broken. Build anything missing. When everything passes, you're done.

**Completion Promise:** When ALL verification sections below pass, output:
```
<promise>PHASE1_VERIFIED</promise>
```

**Do NOT output the promise until every single check passes.** If something fails, fix it, re-verify, and continue.

---

## How to Use This Document

You are in a Ralph Loop. Each iteration:
1. Read this document top to bottom
2. Assess current state — what exists, what works, what's broken
3. Pick the **first failing section** and fix it
4. Run the verification commands for that section
5. If it passes, commit and move to the next section
6. If ALL sections pass, output the completion promise

**Reference files (read these for context):**
- `DESIGN-SPEC.md` — source of truth for all requirements
- `CLAUDE.md` — project conventions (design language, tech stack, key rules)
- `docs/superpowers/plans/2026-03-17-phase1-foundation-core-loop.md` — implementation plan with file structure, types, and code patterns
- `reference.jsx` — original React prototype with all mock data to port

**Key design rules (from CLAUDE.md):**
- Navy (`#0b2049`) sidebar/nav, Gold (`#e8ba30`) sole accent, White/gray workspace
- Red (`#ef4444`) stale/overdue ONLY, Green healthy/funded ONLY
- Pill-shaped buttons, generous whitespace
- Geist font, tabular numbers for dollar columns
- Data Service Layer (`lib/data.ts`) is the single abstraction point — UI never calls data directly
- Mock provider ships with V1 — all features must work without Zoho
- All dates in Central Time (CT)

---

## Section 0: Project Foundation

### 0.1 Project Initializes and Runs

```bash
npm install
npm run dev
```

**Verify:**
- [ ] `package.json` exists with Next.js, TypeScript, Tailwind CSS as dependencies
- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts dev server on localhost:3000 without errors
- [ ] No TypeScript compilation errors in terminal

**If project is not initialized:** Follow Task 1 in the implementation plan. Run `npx create-next-app@latest`, install dependencies, set up shadcn/ui.

### 0.2 Core Dependencies Installed

```bash
npm ls geist bcryptjs jose
npm ls -D vitest @types/bcryptjs
```

**Verify:**
- [ ] `geist` — Geist font family
- [ ] `bcryptjs` — password hashing
- [ ] `jose` — JWT tokens
- [ ] `vitest` — test runner (dev dep)
- [ ] `@types/bcryptjs` — TypeScript types (dev dep)

**If missing:** `npm install geist bcryptjs jose && npm install -D vitest @types/bcryptjs`

### 0.3 shadcn/ui Initialized

**Verify:**
- [ ] `components/ui/` directory exists with shadcn components
- [ ] `lib/utils.ts` exists with `cn()` utility
- [ ] At minimum these components exist: `button`, `badge`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `select`, `separator`, `table`, `tabs`, `tooltip`

**If missing:** Run `npx shadcn@latest init` then `npx shadcn@latest add button badge card dialog dropdown-menu input label select separator table tabs tooltip scroll-area`

### 0.4 Design Tokens

**Verify in `app/globals.css`:**
- [ ] `--color-navy: #0b2049` defined
- [ ] `--color-gold: #e8ba30` defined
- [ ] `--color-alert-red: #ef4444` defined
- [ ] `--color-healthy-green: #22c55e` defined
- [ ] Activity type colors defined (email blue, call green, meeting purple, note amber, stage gray)
- [ ] `--radius-pill: 9999px` defined
- [ ] Background is `#fafafa` (light gray, not pure white)

### 0.5 Geist Font Loaded

**Verify in `app/layout.tsx`:**
- [ ] Geist Sans imported from `geist/font/sans`
- [ ] Geist Mono imported from `geist/font/mono`
- [ ] Font CSS variables applied to `<html>` element
- [ ] `font-sans` utility class set on `<body>`

---

## Section 1: TypeScript Types & Constants

### 1.1 Types File

**Verify `lib/types.ts` exists with:**
- [ ] `Person` interface — includes `createdDate`, `stageChangedDate`, `commitmentDate`, `pipelineStage`, `nextActionType`, `nextActionDetail`, `nextActionDate`, `roles` (multi-select), `lostReason`, `reengageDate`
- [ ] `Organization` interface — `id`, `name`, `type`, `notes`
- [ ] `FundingEntity` interface — `entityName`, `entityType`, `personId`, `status`
- [ ] `Activity` interface — includes `outcome` field (`"connected" | "attempted"`), `source` field (`"manual" | "zoho_telephony" | "o365_sync"`), `activityType` that includes `"reassignment"`
- [ ] `FundedInvestment` interface — `amountInvested`, `track` (`"maintain" | "grow"`), `fundingEntityId`
- [ ] `User` interface — `id`, `username`, `fullName`, `role` (`"rep" | "marketing" | "admin"`)
- [ ] `PersonWithComputed` extends Person with `daysSinceLastTouch`, `isStale`, `isOverdue`, `activityCount`, `organizationName`, `assignedRepName`, `referrerName`
- [ ] `DashboardStats` interface — `activePipelineCount`, `pipelineValue`, `committedValue`, `fundedYTD`
- [ ] `PipelineStage` type with all 11 values (prospect through dead)
- [ ] `DataService` or `PeopleFilters`, `ActivityFilters`, `RecentActivityFilters`, `PaginatedResult` types defined

### 1.2 Constants File

**Verify `lib/constants.ts` exists with:**
- [ ] `PIPELINE_STAGES` array — 11 stages with `key`, `label`, `idleThreshold`, `order`
- [ ] Correct idle thresholds: Prospect=10, Initial Contact=5, Discovery=5, Pitch=7, Active Engagement=14, Soft Commit=5, Commitment Processing=5, KYC=3, Funded/Nurture/Dead=null
- [ ] `COMMITTED_STAGES` — soft_commit, commitment_processing, kyc_docs
- [ ] `TOUCH_ACTIVITY_TYPES` — excludes stage_change and reassignment
- [ ] `NEXT_ACTION_TYPES` — 7 values
- [ ] `LEAD_SOURCES` — 10 values including "Ken — DBJ List", "Ken — Event Follow-up"
- [ ] `ACTIVITY_TYPES` — 11 values including reassignment, with icons and colors
- [ ] `TIMEZONE` = `"America/Chicago"`

---

## Section 2: Utility Functions

### 2.1 Stale Flag Computation

**Run:** `npx vitest run lib/__tests__/stale.test.ts`

**Verify ALL pass:**
- [ ] `computeDaysSinceLastTouch` returns null when no activities
- [ ] `computeDaysSinceLastTouch` excludes `stage_change` activities from touch count
- [ ] `computeDaysSinceLastTouch` excludes `reassignment` activities from touch count
- [ ] `computeDaysSinceLastTouch` computes correct days from most recent real touch
- [ ] `computeIsStale` returns false for nurture/dead/funded stages
- [ ] `computeIsStale` returns false when idle days below threshold
- [ ] `computeIsStale` returns true when idle exceeds threshold and no future next action
- [ ] `computeIsStale` returns false when future next action date suppresses stale
- [ ] `computeIsStale` returns true when next action date is in the past
- [ ] `computeIsOverdue` returns true when next action date < today for active stage
- [ ] `computeIsOverdue` returns false when next action date = today
- [ ] `computeIsOverdue` returns false for dead/funded stages

**If tests don't exist or fail:** Implement `lib/stale.ts` and `lib/__tests__/stale.test.ts` per Task 3 in the implementation plan.

### 2.2 Smart Detection

**Run:** `npx vitest run lib/__tests__/smart-detection.test.ts`

**Verify ALL pass:**
- [ ] `detectActivityType("Called Robert, discussed returns")` → `"call"`
- [ ] `detectActivityType("Emailed Sandra the deck")` → `"email"`
- [ ] `detectActivityType("Sent email with performance data")` → `"email"`
- [ ] `detectActivityType("Met with Robert at Ascension")` → `"meeting"`
- [ ] `detectActivityType("Texted David about timing")` → `"text_message"`
- [ ] `detectActivityType("LinkedIn message about the fund")` → `"linkedin_message"`
- [ ] `detectActivityType("Sent deck and one-pager")` → `"document_sent"`
- [ ] `detectActivityType("Sent PPM to attorney")` → `"document_sent"`
- [ ] `detectActivityType("Received docs from attorney")` → `"document_received"`
- [ ] `detectActivityType("Good conversation about the market")` → `"note"` (default)
- [ ] Case-insensitive: `"CALLED Robert"` → `"call"`
- [ ] `detectOutcome("Called Robert, left voicemail")` → `"attempted"`
- [ ] `detectOutcome("Called, no answer")` → `"attempted"`
- [ ] `detectOutcome("Emailed, no response yet")` → `"attempted"`
- [ ] `detectOutcome("Called Robert, discussed returns")` → `"connected"` (default)

**If tests don't exist or fail:** Implement `lib/smart-detection.ts` and `lib/__tests__/smart-detection.test.ts` per Task 3 in the implementation plan.

### 2.3 Formatting Utilities

**Verify `lib/format.ts` exists with:**
- [ ] `formatCurrency(1500000)` → `"$1.5M"`
- [ ] `formatCurrency(250000)` → `"$250K"`
- [ ] `formatCurrency(null)` → `"—"`
- [ ] `getTodayCT()` returns ISO date in Central Time
- [ ] `formatDate("2026-03-17")` → `"Mar 17, 2026"`
- [ ] `formatRelativeDate` handles Today, Tomorrow, Overdue, In Xd
- [ ] `computeDateOffset` handles today, tomorrow, +3d, next_mon, next_fri, +1w, +2w

---

## Section 3: Data Service Layer + Mock Provider

### 3.1 Data Service Interface

**Verify `lib/data.ts` exists with:**
- [ ] `DataService` interface (or imported from types) with methods for: getPeople, getPerson, createPerson, updatePerson, searchPeople, getActivities, getRecentActivities, createActivity, getFundingEntities, createFundingEntity, getOrganizations, searchOrganizations, createOrganization, getFundedInvestments, getDashboardStats, getUsers, getUserByUsername, getReferrerForProspect, getRelatedContacts, addReferrer, addRelatedContact, getReferrals
- [ ] `getDataService()` function that loads provider based on `DATA_PROVIDER` env var
- [ ] Default is `"mock"`

### 3.2 Mock Provider Data Completeness

**Verify `lib/providers/mock.ts` has all sample data from `reference.jsx`:**
- [ ] **12 Prospects:** Robert Calloway (Active Engagement, $500K), Sandra Kim (Soft Commit, $250K committed), David Thornton (Discovery, $500K), Patricia Wells (Pitch, $750K), Marcus Johnson (Active Engagement, $300K), James Whitfield (Commitment Processing, $500K committed), Angela Torres (KYC, $350K committed), Richard Huang (Prospect), William Grant (Initial Contact), Catherine Blake (Nurture, $200K), Thomas Park (Dead), Rachel Adams (Active Engagement, $250K)
- [ ] **3 Funded Investors:** Steven Morrison ($500K maintain), Lisa Chang ($100K grow), Daniel Reeves ($250K grow)
- [ ] **Organizations:** Calloway Family Office, Kim Holdings, Thornton Capital, Wells Family Trust (at minimum)
- [ ] **Funding Entities:** At least 6 entities linked to prospects
- [ ] **30+ Activity Log entries** ported from reference.jsx TIMELINE data — with dates, types, details, and document names
- [ ] **3+ Auto-synced activities** with Source = "zoho_telephony" or "o365_sync" and ⚡AUTO appearance
- [ ] **Mix of outcomes:** Some activities have outcome = "attempted" (e.g., William Grant's voicemail)
- [ ] **Referrer relationships** present (e.g., CPA referral for Sandra Kim)
- [ ] **Related contacts** present (e.g., attorney for Whitfield, Mrs. Calloway as spouse)
- [ ] **New fields populated:** `createdDate` on all persons, `stageChangedDate` on prospects, `commitmentDate` on Sandra Kim/Whitfield/Torres
- [ ] **4 Users:** Chad Cormier (rep), Ken Warsaw (marketing), Eric Gewirtzman (admin), Efri Argaman (admin) — with password hashes for "password123"

### 3.3 Mock Provider Methods Work

**Write a quick smoke test or verify via app:**
- [ ] `getPeople()` returns all 15 people with computed fields
- [ ] `getPeople({ pipelineStages: ["active_engagement"] })` returns Robert, Marcus, Rachel
- [ ] `getPeople({ staleOnly: true })` returns prospects where isStale = true
- [ ] `getPerson("id-of-robert")` returns Robert with `daysSinceLastTouch`, `isStale`, `isOverdue`, `activityCount` computed
- [ ] `searchPeople("calloway")` returns Robert Calloway
- [ ] `getActivities("id-of-robert")` returns activities sorted reverse-chronological
- [ ] `getRecentActivities({ limit: 10 })` returns cross-prospect activities
- [ ] `createActivity(personId, data)` adds activity and it appears in subsequent `getActivities` call
- [ ] `getDashboardStats()` returns correct totals:
  - `activePipelineCount` = 9 (excludes Nurture, Dead, Funded)
  - `pipelineValue` = sum of initialInvestmentTarget across active pipeline
  - `committedValue` = sum of committedAmount for soft_commit + commitment_processing + kyc_docs stages
  - `fundedYTD` = sum of amountInvested from FundedInvestment records ($850K)
- [ ] `getUserByUsername("chad")` returns user with passwordHash

### 3.4 .env.local

**Verify:**
- [ ] `.env.local` exists with `DATA_PROVIDER=mock`
- [ ] `.env*.local` is in `.gitignore`

---

## Section 4: Authentication

### 4.1 Auth Utilities

**Verify `lib/auth.ts` exists with:**
- [ ] `createSession(user)` — creates JWT token with userId, username, fullName, role
- [ ] `getSession()` — reads httpOnly cookie, verifies JWT, returns session payload or null
- [ ] `requireSession()` — throws if no session
- [ ] Session cookie is httpOnly, secure in production, sameSite=lax, 7-day expiry

### 4.2 Login Page

**Navigate to `localhost:3000/login`**

**Verify:**
- [ ] Login page renders: "OwnEZ Capital" brand text, "Sign In" heading
- [ ] Two inputs: Username and Password
- [ ] Gold pill-shaped "Sign In" button
- [ ] Enter `chad` / `password123` → redirects to `/` (dashboard)
- [ ] Enter `wrong` / `wrong` → shows "Invalid credentials" error in red
- [ ] After login, refreshing the page keeps you logged in (session persists)

### 4.3 Auth Middleware

**Verify:**
- [ ] `middleware.ts` exists at project root
- [ ] Navigating to `/` without session → redirects to `/login`
- [ ] Navigating to `/pipeline` without session → redirects to `/login`
- [ ] Navigating to `/person/some-id` without session → redirects to `/login`
- [ ] `/login` page loads without redirect loop
- [ ] Static assets (`/_next/*`) load without being blocked

### 4.4 Logout

**Verify:**
- [ ] Logout button/link exists in the sidebar
- [ ] Clicking logout → clears session cookie → redirects to `/login`
- [ ] After logout, cannot access protected routes

---

## Section 5: App Shell (Sidebar + Layout)

### 5.1 Sidebar Navigation

**Login as `chad` (rep role). Verify:**
- [ ] Navy (`#0b2049`) sidebar on the left, ~170-180px wide
- [ ] "OwnEZ Capital" brand text at top of sidebar
- [ ] Navigation items: Dashboard, Pipeline, People
- [ ] Leadership and Admin are NOT visible (rep role)
- [ ] Active route highlighted with gold text
- [ ] Current user name shown at bottom of sidebar
- [ ] Sign out link/button at bottom

**Login as `eric` (admin role). Verify:**
- [ ] All nav items visible: Dashboard, Pipeline, People, Leadership, Admin
- [ ] Leadership and Admin links are present

**Login as `ken` (marketing role). Verify:**
- [ ] Dashboard, Pipeline, People visible
- [ ] Leadership visible (Ken has partial access per spec)
- [ ] Admin NOT visible

### 5.2 Layout

- [ ] Sidebar is fixed, doesn't scroll with content
- [ ] Main content area fills remaining width
- [ ] Background is light gray (`#fafafa`), not pure white
- [ ] Content area scrolls independently

---

## Section 6: Dashboard

### 6.1 Stats Bar (4 Cards)

**Login as chad, navigate to `/`. Verify:**
- [ ] 4 stat cards in a row
- [ ] Card 1: "Active Pipeline" — count of prospects not in Nurture/Dead/Funded (should be 9)
- [ ] Card 2: "Pipeline Value" — sum of initialInvestmentTarget across active pipeline, formatted with $ and K/M abbreviation
- [ ] Card 3: "Committed" — sum of committedAmount for Soft Commit + Commitment Processing + KYC stages only (Sandra $250K + Whitfield $500K + Torres $350K = $1.1M)
- [ ] Card 4: "Funded YTD" — sum from FundedInvestment records ($850K)
- [ ] Dollar values use tabular-nums for alignment
- [ ] Cards have white background, subtle styling (not heavy borders)

### 6.2 Today's Actions

**Verify:**
- [ ] Shows prospects where nextActionDate = today (relative to CT)
- [ ] Also shows Nurture prospects where reengageDate = today
- [ ] Sorted by dollar value descending
- [ ] Columns: Name, Company, Stage, Initial Investment, Next Action Type + Detail
- [ ] Click a row → navigates to `/person/[id]`
- [ ] **Empty state:** When no actions due today, shows "All caught up." with directional context — either "[N] prospects need attention" linking to Needs Attention, or "Pipeline healthy — next action is [Name] on [date]"

### 6.3 Needs Attention

**Verify:**
- [ ] Shows prospects where isStale = true OR isOverdue = true
- [ ] Red indicator dot on each record
- [ ] Red-tinted border on the panel
- [ ] Columns: Name, Stage, Days Idle, Next Action, Next Action Date
- [ ] Sorted by severity (most overdue first)
- [ ] Marcus Johnson should appear (12 days idle in Active Engagement, threshold = 14... check if stale based on next action date)
- [ ] Patricia Wells should appear (5 days idle in Pitch with threshold 7, check next action date)
- [ ] **Empty state:** Green "Pipeline Healthy" indicator when no records

### 6.4 Recent Activity (Collapsible)

**Verify:**
- [ ] Section exists below Today's Actions / Needs Attention
- [ ] Collapsed by default — click to expand
- [ ] Shows reverse-chronological feed across all prospects, last 7 days
- [ ] Each entry shows: Date/Time, Person name (linked), Activity Type, Outcome, Detail (truncated), Logged By
- [ ] Filterable by rep

---

## Section 7: Pipeline View

**Navigate to `/pipeline`. Verify:**

### 7.1 Table Structure

- [ ] Full table with columns: Name, Company, Stage, Initial Investment, Growth Target, Lead Source, Touches, Days Idle, Next Action, Next Action Date, Stale Flag (icon)
- [ ] Only shows active pipeline (excludes Nurture, Dead, Funded)
- [ ] Should show 9 prospects
- [ ] Dollar amounts are right-aligned with tabular-nums and K/M formatting
- [ ] Stage shown as a badge
- [ ] Stale/overdue records show red dot indicator

### 7.2 Sorting

- [ ] Default sort: Next Action Date ascending (most urgent first)
- [ ] Click column header → sorts by that column
- [ ] Visual indicator (arrow/chevron) shows active sort column + direction
- [ ] Click same column again → reverses sort direction

### 7.3 Filters

- [ ] Filter bar above table with: Stage dropdown, Source dropdown, Stale Only toggle, Rep filter
- [ ] Stage filter: Select "Active Engagement" → shows only Robert, Marcus, Rachel
- [ ] Source filter: Select "Velocis Network" → shows Robert, Whitfield
- [ ] Stale Only toggle → shows only stale/overdue prospects
- [ ] Filters can be combined
- [ ] Clear/reset button

### 7.4 Row Interaction

- [ ] Click any row → navigates to `/person/[id]`
- [ ] Rows have hover state

---

## Section 8: Person Detail — Cockpit Zone

**Navigate to Robert Calloway's person detail page. Verify:**

### 8.1 Two-Zone Layout

- [ ] Page has a fixed top zone (Cockpit) that doesn't scroll away
- [ ] Below the cockpit is a scrollable Detail Zone
- [ ] Cockpit contains: Identity Bar, Next Action Bar, Recent Snapshot, Quick Log

### 8.2 Identity Bar

- [ ] Name: "Robert Calloway" (prominent, large)
- [ ] Organization: "Calloway Family Office" (linked/clickable)
- [ ] Stage badge: "Active Engagement" (color-coded)
- [ ] Investment Target: "$500K"
- [ ] Stale indicator: red dot if stale, absent if not
- [ ] Phone number with 📞 click-to-call (opens `tel:` link)
- [ ] Email with ✉️ click-to-email (opens `mailto:` link)

### 8.3 Next Action Bar

- [ ] Shows current: Next Action Type + Detail + Date
- [ ] All three are inline-editable
- [ ] Date input uses DateQuickPick chips: [Today] [Tomorrow] [+3d] [Mon] [Fri] [+1w] [+2w] + calendar icon
- [ ] Changing a value and confirming persists to mock data (verify by refreshing)

### 8.4 Recent Snapshot

- [ ] Shows last 3 activities in compact format
- [ ] Each shows: type icon + date + first line of detail (truncated)
- [ ] If fewer than 3 activities, shows what's available
- [ ] For a prospect with no activities: "No activity logged yet."

### 8.5 Quick Log

- [ ] Text input visible: placeholder like "Quick log: Called Robert, discussed..."
- [ ] Type "Called Robert, discussed Q3 returns":
  - [ ] Activity type badge updates in real-time to "Call" (smart prefix detection)
  - [ ] Badge color matches call color (green)
- [ ] Type "Left voicemail, no answer":
  - [ ] Outcome auto-detects as "Attempted"
- [ ] Type "Good meeting today":
  - [ ] Defaults to "Note" type
  - [ ] Outcome stays "Connected"
- [ ] "+ More options" link/button exists — clicking expands full form: Activity Type dropdown, Date, Time, Outcome toggle, Detail textarea, Attachments
- [ ] Press Enter to submit:
  - [ ] Activity entry appears at top of Recent Snapshot
  - [ ] Activity appears in the Activity Timeline (Detail Zone)
  - [ ] Days Since Last Touch resets

### 8.6 Next Action Prompt (Post-Activity)

- [ ] After Quick Log submit, a compact prompt appears
- [ ] Shows pre-filled: Next Action Type, Detail, Date (current values)
- [ ] Date uses DateQuickPick chips
- [ ] Enter to confirm without changes (one keypress)
- [ ] Can edit any field and then confirm
- [ ] "Advance to [Next Stage]?" link appears below the fields
- [ ] Clicking advance link → stage change confirmation → stage updates → prompt updates with post-stage-change fields
- [ ] After confirming, Quick Log resets and is ready for next entry
- [ ] Prompt is NOT skippable — it always appears after Quick Log submit

---

## Section 9: Person Detail — Detail Zone

### 9.1 Activity Timeline

**Scroll below the cockpit. Verify:**
- [ ] Full reverse-chronological list of all activities for this person
- [ ] Each entry shows: type icon (color-coded), date/time, who logged it, detail text
- [ ] Outcome badge: "Attempted" tag on non-connected activities (Connected shows no badge since it's the default)
- [ ] Stage changes render as timeline dividers: `─── ➡️ Pitch → Active Engagement · Feb 5, 2026 ───`
- [ ] Auto-synced entries show ⚡AUTO badge
- [ ] Auto-synced entries show "Add notes" annotation prompt
- [ ] Filter pills above timeline: [All] [Calls] [Emails] [Meetings] [Notes] [Docs] [Stage Changes] [Auto ⚡]
- [ ] Clicking a filter shows only that type
- [ ] Attached documents listed and clickable (or at least shown)

### 9.2 Stage Progression Bar

- [ ] Visual 9-step horizontal bar (Prospect through Funded)
- [ ] Current stage highlighted (gold or similar)
- [ ] Nurture and Dead shown as separate actions below/beside the bar
- [ ] Click a different stage → confirmation dialog appears
- [ ] Confirming → stage changes, auto-logs Stage Change activity, post-stage-change prompt fires
- [ ] Post-stage-change prompt shows: Next Action Type, Detail, Date, Investment Target (pre-filled)

### 9.3 Organization Section

- [ ] Shows linked organization name
- [ ] Shows other prospects in the same org (if any)
- [ ] Autocomplete-or-create: typing 2+ chars shows matching orgs
- [ ] "Create new organization" option at bottom when no match

### 9.4 Funding Entities Panel

- [ ] Lists linked entities with: name, type, status
- [ ] Add button opens autocomplete-or-create (scoped to prospect's entities)
- [ ] For prospects at Commitment Processing or KYC with no entity: shows gentle nudge message (not a blocker)

### 9.5 Related Contacts Panel

- [ ] Lists related people with: name, role, company, phone/email
- [ ] Add uses autocomplete-or-create from People pool
- [ ] For Robert Calloway: should show Mrs. Calloway (Spouse) if mock data includes her

### 9.6 Referrer Section

- [ ] Shows who referred this prospect (if anyone)
- [ ] Autocomplete-or-create from People pool
- [ ] Shows referrer's other referrals for context

### 9.7 Background Notes

- [ ] Collapsible section, visually de-emphasized (at bottom)
- [ ] Placeholder: "Background context — use Quick Log for activities."
- [ ] Editable textarea when expanded
- [ ] Clearly NOT positioned as an activity log

### 9.8 Prospect Fields (Editable)

- [ ] Investment Target — inline-editable, dollar format
- [ ] Growth Target — inline-editable, dollar format
- [ ] Committed Amount — inline-editable. When changed, Commitment Date auto-sets to today
- [ ] Lead Source — dropdown
- [ ] Collaborators — multi-select from users
- [ ] Lost/Dead Reason — dropdown (only visible/required when stage = Dead)
- [ ] Assigned Rep — visible but NOT editable (admin-only per spec)

---

## Section 10: People Directory

**Navigate to `/people`. Verify:**

- [ ] Search bar at top — large, prominent
- [ ] Typing "calloway" finds Robert Calloway
- [ ] Typing "mike" finds Mike Lawson (CPA, external contact)
- [ ] Results show: Name, Roles (badges like "Prospect", "Referrer"), Organization, Stage (if prospect)
- [ ] Click a result → navigates to `/person/[id]`
- [ ] Role filter: selecting "Referrer" shows only people with referrer role
- [ ] All 15+ people searchable (prospects + external contacts + funded investors)

---

## Section 11: Error, Loading, and Empty States

### 11.1 Loading States

- [ ] Dashboard shows skeleton placeholders while loading (pulse animation, not spinners)
- [ ] Pipeline shows skeleton rows while loading
- [ ] Person Detail shows skeleton layout while loading

### 11.2 Error States

- [ ] Navigating to `/person/nonexistent-id` shows "Prospect not found" or 404 (NOT a blank screen)
- [ ] Dashboard stat cards show "—" on individual failures without blocking rest of page
- [ ] "Something went wrong — try again." with retry button on errors

### 11.3 Empty States

- [ ] Pipeline with filters that match nothing: "No prospects match your filters"
- [ ] Activity Timeline with no entries: "No activity logged yet."
- [ ] Funding Entities with none linked: shows add button, no confusing blank
- [ ] Needs Attention with nothing stale: green "Pipeline Healthy" indicator
- [ ] Today's Actions complete: directional "All caught up" message per spec

---

## Section 12: Visual Design Compliance

### 12.1 Color System

- [ ] Sidebar/nav: Navy (`#0b2049`)
- [ ] All CTAs, active states, badges: Gold (`#e8ba30`)
- [ ] Workspace background: White/light gray (`#fafafa`)
- [ ] Stale/overdue indicators: Red (`#ef4444`) ONLY — red is not used elsewhere
- [ ] Healthy/funded indicators: Green — green is not used elsewhere
- [ ] No other accent colors used. Discipline.

### 12.2 Typography

- [ ] Geist Sans for all body text
- [ ] Tabular/monospaced numbers on dollar columns (perfect alignment)
- [ ] Tight tracking on large headings
- [ ] Generous line-height on body text

### 12.3 Components

- [ ] Buttons are pill-shaped (rounded-full / border-radius: 9999px)
- [ ] Generous whitespace — spacing creates hierarchy, not borders
- [ ] Gold = action. Interactive elements use gold. Non-interactive elements use gray/navy.
- [ ] No hover-only information — everything critical visible by default

---

## Section 13: Role-Based Access Control

### 13.1 Rep (Chad)

- [ ] Can view all prospects/pipeline
- [ ] Can edit prospect fields
- [ ] Can change pipeline stage
- [ ] Can log all activity types
- [ ] Can edit Next Action
- [ ] CANNOT see Leadership dashboard
- [ ] CANNOT see Admin panel
- [ ] CANNOT reassign prospect rep (field visible but not editable)

### 13.2 Marketing (Ken)

- [ ] Can view all prospects/pipeline
- [ ] CANNOT create new prospect (unless override granted — check mock data)
- [ ] CANNOT edit prospect fields
- [ ] Can log Note + Doc Received only
- [ ] Can see Leadership page (Source Attribution + Top Referrers only — or shows placeholder if Leadership not built in Phase 1)
- [ ] CANNOT see Admin panel

### 13.3 Admin (Eric)

- [ ] Can do everything
- [ ] Can see Leadership and Admin nav items
- [ ] Can reassign prospect rep

---

## Section 14: Full Workflow End-to-End

### 14.1 Chad's Morning Routine

Run through this entire flow without errors:

1. [ ] Login as chad / password123
2. [ ] Dashboard loads with stats, Today's Actions, Needs Attention
3. [ ] Click Robert Calloway from Today's Actions (or pick any prospect)
4. [ ] Person Detail Cockpit loads: identity, next action, recent snapshot, quick log
5. [ ] Type in Quick Log: "Called Robert, discussed Q3 returns. Interested in Fund V details."
6. [ ] Verify badge shows "Call" type
7. [ ] Press Enter → activity logged
8. [ ] Next Action prompt appears with current values pre-filled
9. [ ] Change Next Action Date to Tomorrow (click chip) → press Enter
10. [ ] Quick Log resets, ready for next entry
11. [ ] Scroll down → Activity Timeline shows the new entry at top with Call icon, detail text, "Chad Cormier" as logger
12. [ ] Navigate back to Dashboard → verify stats are consistent (no errors)
13. [ ] Navigate to Pipeline → verify Robert's row reflects updated Days Idle and Next Action Date
14. [ ] Navigate to People → search "calloway" → Robert appears → click → back to person detail

### 14.2 Stage Change Flow

1. [ ] On Robert Calloway's detail page, click "Soft Commit" on the stage progression bar
2. [ ] Confirmation dialog appears
3. [ ] Confirm → stage changes to Soft Commit
4. [ ] Stage Change activity auto-logged in timeline: "Stage updated from Active Engagement to Soft Commit"
5. [ ] Post-stage-change prompt appears showing Next Action + Investment Target
6. [ ] Update Committed Amount to $500,000 and confirm
7. [ ] Commitment Date auto-sets to today
8. [ ] Navigate to Dashboard → Committed stat card includes Robert's $500K

### 14.3 Session Persistence

1. [ ] Perform actions as chad
2. [ ] Hard refresh browser (F5 / Ctrl+R)
3. [ ] Still logged in, data persists in mock provider (within session)
4. [ ] Logout → login → mock data resets (expected for V1 mock)

---

## Section 15: All Tests Pass

**Run full test suite:**

```bash
npx vitest run
```

**Verify:**
- [ ] All unit tests pass (stale computation, smart detection, formatting)
- [ ] Zero test failures
- [ ] No TypeScript compilation errors

**Run build:**

```bash
npm run build
```

**Verify:**
- [ ] Build completes without errors
- [ ] No TypeScript errors in build output

---

## Completion Checklist

Before outputting the completion promise, verify EVERY item:

- [ ] Section 0: Project runs, dependencies installed, design tokens set
- [ ] Section 1: Types and constants complete
- [ ] Section 2: All utility tests pass
- [ ] Section 3: Mock provider has all data, all methods work
- [ ] Section 4: Auth flow works (login, session, logout, middleware)
- [ ] Section 5: Sidebar renders correctly per role
- [ ] Section 6: Dashboard stats, Today's Actions, Needs Attention, Recent Activity
- [ ] Section 7: Pipeline table with sorting, filtering, stale indicators
- [ ] Section 8: Person Detail cockpit — identity, next action, snapshot, Quick Log with smart detection, Next Action prompt
- [ ] Section 9: Detail zone — timeline, stage bar, org, entities, contacts, referrer, notes, fields
- [ ] Section 10: People Directory with search and role filters
- [ ] Section 11: Loading, error, and empty states
- [ ] Section 12: Visual design matches navy/gold/white system
- [ ] Section 13: Role-based access enforced
- [ ] Section 14: Full workflows complete without errors
- [ ] Section 15: All tests pass, build succeeds

**When ALL of the above are verified:**

```
<promise>PHASE1_VERIFIED</promise>
```
