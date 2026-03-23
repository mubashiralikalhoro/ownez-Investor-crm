# CLAUDE.md — OwnEZ HNW Investor CRM

## Project Overview
Custom Next.js CRM frontend for OwnEZ Capital's HNW investor pipeline. Uses Neon Postgres as interim database (Zoho CRM integration planned). See `DESIGN-SPEC.md` for the complete specification.

## Tech Stack
- **Framework:** Next.js (App Router) on Vercel
- **Styling:** Tailwind CSS + shadcn/ui components
- **Data Layer:** Abstracted provider pattern (mock for dev, Neon Postgres for production, Zoho API future)
- **ORM:** Drizzle ORM + @neondatabase/serverless
- **Auth:** JWT login with bcrypt passwords

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
- The Data Service Layer (`lib/data.ts`) is the single abstraction point — UI never calls providers directly
- Production uses `DATA_PROVIDER=neon` (Neon Postgres). Mock provider available for dev/testing.
- Mobile-first for Dashboard and Quick Log views
- Every reusable entity (People, Organizations, Funding Entities) uses autocomplete-or-create pattern
- All dates use Central Time (CT)
- Committed Amount = verbal target; Funded Amount = rollup from Funded Investment records only

## Local Development
- `npm run dev` to start Next.js dev server
- Set `DATA_PROVIDER=neon` in `.env.local` for real database, or `mock` for in-memory dev data
- `npx tsx --env-file=.env.local scripts/test-provider.ts` — run 33 provider tests
- `npx tsx --env-file=.env.local scripts/seed-demo-data.ts` — seed demo data for presentations
- `npx tsx --env-file=.env.local scripts/clean-neon-data.ts` — wipe business data, keep config
