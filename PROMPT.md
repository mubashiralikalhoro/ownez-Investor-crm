# OwnEZ CRM — Phase 1 Build

You are building a custom CRM for OwnEZ Capital's HNW investor pipeline. This is a greenfield Next.js project. Build it task by task, verify each piece, commit, and continue.

## On Every Iteration

```
1. Does `package.json` exist?
   NO  → Start at Task 1 in the implementation plan (scaffold project)
   YES → Continue to step 2

2. Does `npm run dev` start without errors?
   NO  → Fix the build errors first
   YES → Continue to step 3

3. Do tests pass? Run: npx vitest run 2>/dev/null
   FAILURES → Fix failing tests
   NO TESTS YET → That's fine, continue to step 4
   ALL PASS → Continue to step 4

4. Read docs/TESTING-PHASE1.md — find the FIRST section that is NOT fully satisfied
   (Sections are numbered 0-15, in dependency order)

5. Read the corresponding Task in docs/superpowers/plans/2026-03-17-phase1-foundation-core-loop.md
   (Task numbers roughly map to Testing sections)

6. Implement what's needed to satisfy that testing section

7. Verify:
   - Run any test commands from the testing doc
   - Check the app in dev server if it's a UI section
   - Ensure no TypeScript errors

8. Commit with a descriptive message:
   git add [specific files]
   git commit -m "feat: [what you built]"

9. Move to the next failing section. Repeat from step 4.

10. When ALL of these are true:
    - npm run build succeeds with zero errors
    - npx vitest run — all tests pass
    - Every section (0-15) in TESTING-PHASE1.md is satisfied
    Output: <promise>PHASE1_VERIFIED</promise>
```

## Reference Files (READ these, they are your source of truth)

| File | What it contains |
|------|-----------------|
| `DESIGN-SPEC.md` | Full product specification — data model, views, business logic, design language |
| `CLAUDE.md` | Project conventions and key rules |
| `reference.jsx` | Original React prototype with ALL mock data (12 prospects, 3 funded, 30+ timeline entries) — port this data to the mock provider |
| `docs/superpowers/plans/2026-03-17-phase1-foundation-core-loop.md` | Detailed implementation plan — 13 tasks with file structure, code patterns, exact file paths |
| `docs/TESTING-PHASE1.md` | 200+ verification checkpoints organized in 16 sections — this is your acceptance criteria |

## Tech Stack

- **Next.js** (App Router) with TypeScript
- **Tailwind CSS** + **shadcn/ui** components
- **Geist** font (sans + mono)
- **bcryptjs** for password hashing
- **jose** for JWT session tokens
- **vitest** for unit tests

## Design Rules (MANDATORY — apply to every component you build)

### Colors
- **Navy `#0b2049`** — sidebar/nav, headers
- **Gold `#e8ba30`** — THE ONLY accent color. If it's gold, you can interact with it. CTAs, active states, badges, links.
- **White/light gray `#fafafa`** — workspace background (NOT pure white)
- **Red `#ef4444`** — EXCLUSIVELY for stale/overdue alerts. Never use red for anything else.
- **Green `#22c55e`** — EXCLUSIVELY for healthy/funded indicators. Never use green for anything else.
- **No other colors.** Discipline.

### Typography
- Geist Sans for all UI text
- Geist Mono for code/IDs if needed
- Tabular/monospaced numbers on all dollar columns (font-variant-numeric: tabular-nums)
- Dollar formatting: $1,500,000 → "$1.5M", $250,000 → "$250K"

### Components
- Pill-shaped buttons (border-radius: 9999px / rounded-full)
- Whitespace creates hierarchy — no borders where spacing works alone
- Gold = action. Everything interactive is gold. Non-interactive = gray/navy.
- No hover-only information — everything critical visible by default (touch-friendly)

### Architecture
- **Server Components by default.** Only add `'use client'` when you need interactivity (forms, state, event handlers).
- **Data Service Layer (`lib/data.ts`)** is the single abstraction point. UI components NEVER import from `lib/providers/` directly.
- **Mock provider** stores data in memory. Resets on server restart (acceptable for V1).
- All dates use **Central Time** (`America/Chicago`).

### Activity Smart Detection
Quick Log auto-detects activity type from text prefixes:
- "Called..." → Call | "Emailed..."/"Sent email..." → Email | "Met with..." → Meeting
- "Texted..." → Text | "LinkedIn..." → LinkedIn | "Sent deck..."/"Sent PPM..." → Document Sent
- "Received docs..." → Document Received | Anything else → Note (default)

Auto-detects outcome: "voicemail", "no answer", "no response" → Attempted. Everything else → Connected.

### Stale Flag Logic
- `daysIdle >= stageThreshold AND (nextActionDate IS NULL OR nextActionDate <= today) AND stage is active`
- Days Since Last Touch EXCLUDES stage_change and reassignment activities
- Future nextActionDate suppresses stale flag

### Key UI Patterns
- **Person Detail: Two-zone layout** — fixed Cockpit (identity, next action, recent 3 activities, quick log) + scrollable Detail Zone (timeline, stage bar, org, entities, contacts, referrer, notes, fields)
- **Quick Log → Next Action prompt** — after every activity log, non-skippable prompt to confirm/update next action. This is the #1 most important UX mechanism.
- **Date Quick-Pick chips** — [Today] [Tomorrow] [+3d] [Mon] [Fri] [+1w] [+2w] + calendar fallback. Everywhere a date is entered.
- **Autocomplete-or-create** — for Organizations, Referrers, Related Contacts, Funding Entities

## Mock Data to Port (from reference.jsx)

### 12 Prospects
1. Robert Calloway — Active Engagement, $500K, Velocis Network
2. Sandra Kim — Soft Commit, $250K committed, CPA Referral
3. David Thornton — Discovery, $500K, M&A Attorney
4. Patricia Wells — Pitch, $750K, Legacy Event
5. Marcus Johnson — Active Engagement, $300K, LinkedIn
6. James Whitfield — Commitment Processing, $500K committed, Velocis Network
7. Angela Torres — KYC/Docs, $350K committed, CPA Referral
8. Richard Huang — Prospect, no amounts, Ken — DBJ List
9. William Grant — Initial Contact, Tolleson WM
10. Catherine Blake — Nurture, $200K, Legacy Event (re-engage April 15)
11. Thomas Park — Dead, Not Accredited, Cold Outreach
12. Rachel Adams — Active Engagement, $250K, Ken — Event Follow-up

### 3 Funded Investors
1. Steven Morrison — $500K, maintain track
2. Lisa Chang — $100K, grow track (target $400K)
3. Daniel Reeves — $250K, grow track (target $250K more)

### 4 Users
1. Chad Cormier — rep (password: password123)
2. Ken Warsaw — marketing (password: password123)
3. Eric Gewirtzman — admin (password: password123)
4. Efri Argaman — admin (password: password123)

### External Contacts (as People with referrer/related_contact roles)
- Mike Lawson — CPA, referrer for Sandra Kim
- Tolleson Advisor — Wealth Advisor, referrer for William Grant
- Attorney for Whitfield — Related Contact
- Mrs. Calloway — Spouse, Related Contact for Robert
- At least 1 more to reach 5 external contacts

### Auto-Synced Sample Activities (3+)
- Include at least 3 activities with Source = "zoho_telephony" or "o365_sync"
- These demonstrate the ⚡AUTO badge appearance
- Mix of Connected and Attempted outcomes

## Dashboard Stats (expected values for verification)

- Active Pipeline Count: 9 (excludes Nurture, Dead, Funded)
- Pipeline Value: sum of initialInvestmentTarget across active 9
- Committed: Sandra $250K + Whitfield $500K + Torres $350K = $1,100,000 (stages: soft_commit, commitment_processing, kyc_docs ONLY)
- Funded YTD: Morrison $500K + Chang $100K + Reeves $250K = $850,000

## What You Are NOT Building (deferred to later phases)

- Leadership Dashboard, Admin Panel, Reports (Phase 2)
- Mobile-responsive layout, bottom nav (Phase 3)
- Create Prospect form, inline pipeline actions, Last Viewed bar, pinned prospects, keyboard shortcuts, Today's Momentum, Today/Tomorrow/This Week toggle, "New" badge (Phase 4)
- Zoho provider (separate IT team effort)

Focus exclusively on what's in the implementation plan and testing document.
