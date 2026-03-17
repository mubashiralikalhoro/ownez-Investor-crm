# CLAUDE.md — OwnEZ HNW Investor CRM

## Project Overview
Custom Next.js CRM frontend for OwnEZ Capital's HNW investor pipeline. Uses Zoho CRM as the database via API. See `DESIGN-SPEC.md` for the complete specification.

## Tech Stack
- **Framework:** Next.js (App Router) on Vercel
- **Styling:** Tailwind CSS + shadcn/ui components
- **Data Layer:** Abstracted provider pattern (mock for V1, Zoho API for V2)
- **Auth:** Simple login V1, Zoho OAuth V2

## Design Language
- **Navy** (`#0b2049`) — sidebar/nav, headers
- **Gold** (`#e8ba30`) — sole accent color, CTAs, active states
- **White/light gray** — workspace background
- **Red** (`#ef4444`) — stale/overdue alerts only
- **Green** — healthy/funded indicators only
- Jony Ive simplicity. If Chad can't tell what to do next in 2 seconds, the design has failed.
- Pill-shaped buttons, generous whitespace, no borders where spacing works alone.

## Key Rules
- Always read `DESIGN-SPEC.md` before making architecture decisions
- The Data Service Layer (`lib/data.ts`) is the single abstraction point — UI never calls Zoho directly
- Mock provider ships with V1 — all features must work without Zoho connection
- Mobile-first for Dashboard and Quick Log views
- Every reusable entity (People, Organizations, Funding Entities) uses autocomplete-or-create pattern
- All dates use Central Time (CT)
- Committed Amount = verbal target; Funded Amount = rollup from Funded Investment records only

## Local Development
- `npm run dev` to start Next.js dev server
- Mock data provider is default (`DATA_PROVIDER=mock`)
